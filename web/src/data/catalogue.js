/* Freshness To Your Home — catalogue
   ------------------------------------------------------------------
   The listings themselves are in shared/catalogue.json, which also seeds the
   database and feeds the app's offline copy — write a listing once and it
   reaches all three. catalogue.generated.js is that file in this page's own
   shape; never edit it by hand.

   None of it is the source of truth. Prices, names and availability live in
   the database and arrive from /api/catalogue, the same public endpoint the
   mobile app uses, so changing a price is a row update rather than a redeploy.

   The bundled copy is what renders on first paint and what the page falls back
   to when the API cannot be reached, so a customer never meets an empty shop.
   Treat any disagreement with the API as the API being right.

   PRODUCTS and CATEGORIES are reactive arrays mutated in place, so every
   component that already imports them updates when the real catalogue lands
   without any of them needing to know where it came from. */

import { reactive, ref } from 'vue'
import {
  CATEGORIES as BUNDLED_CATEGORIES,
  PRODUCTS as BUNDLED_PRODUCTS,
  SETS as BUNDLED_SETS,
} from './catalogue.generated'

/* The shop's own details live in shared/brand.json, where the app reads them
   too. Re-exported from here so the many components that already import
   CONTACT from the catalogue keep working. */
export { CONTACT } from './brand'

export const CATEGORIES = reactive(BUNDLED_CATEGORIES.map(c => ({ ...c })))

/* unit.qty is in the unit's base measure; unit.kind drives the per-kg badge */
export const PRODUCTS = reactive(BUNDLED_PRODUCTS.map(p => ({ ...p })))

/* Vite resolves every product photo at build time, so each one gets a
   hashed, cache-busted URL and a missing file fails the build instead of
   404-ing in production. */
const PHOTOS = import.meta.glob('../assets/products/*.jpg', { eager: true, import: 'default' })

PRODUCTS.forEach(p => {
  const hit = PHOTOS[`../assets/products/${p.id}.jpg`]
  if (!hit && import.meta.env.DEV) console.warn(`[catalogue] no photo for "${p.id}"`)
  p.img = hit
})

/* Bundles sold at a discount to the sum of their parts. `off` is the
   percentage taken off that sum; the contents and the discount are in
   shared/catalogue.json. */
export const SETS = reactive(BUNDLED_SETS.map(b => ({ ...b })))

/* Money, rounded to the cent and printed without trailing zeroes. */
/* A whole number stays clean — the price list reads like a poster, not a
   receipt — but anything with qəpik in it gets both digits. "71.5 AZN" looks
   like a typo, and this figure ends up in the message a customer sends the
   shop. */
export const money = n => {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

/* A per-kilo reference price, but only where it tells the customer
   something — a 400 gr tin is worth comparing, a single fish is not. */
/* What a set costs, before and after its discount. */
export function setPricing (set) {
  const items = set.items.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean)
  /* Bundles from the API carry a quantity per line — two loaves, one tin. The
     bundled fallback sets have none, so the default keeps their arithmetic
     exactly as it was. */
  const qty = id => set.qty?.[id] ?? 1
  const full = items.reduce((sum, p) => sum + p.price * qty(p.id), 0)
  const price = Math.round(full * (1 - set.off / 100))
  return { items, full, price, saving: full - price }
}

export function perKg (p) {
  const u = p.unit
  if (u.kind === 'g') return p.price / (u.qty / 1000)
  if (u.kind === 'kg' && u.qty !== 1) return p.price / u.qty
  return null
}

/* ─────────────────────────────────────────────────────────────────────────
   The real catalogue
   ───────────────────────────────────────────────────────────────────────── */

/** True while the page is showing the bundled copy rather than live data. */
export const catalogueStale = ref(true)

const API = import.meta.env.VITE_API_URL

/**
 * Translate the API's shape into the one this site already speaks.
 *
 * Deliberately an adapter rather than a rewrite of every component: the site
 * was built against this shape, it reads well, and the only thing that had to
 * change is where the numbers come from.
 *
 * Money arrives in qəpik as an integer — which is how it is stored, computed
 * and charged. It is divided here only to be displayed; nothing on this page
 * adds prices up any more.
 */
function adaptProduct (p) {
  return {
    id: p.id,
    cat: p.category_id,
    price: p.price_minor / 100,
    priceMinor: p.price_minor,
    unit: {
      en: p.unit_label?.en ?? '',
      az: p.unit_label?.az ?? '',
      ru: p.unit_label?.ru ?? '',
      kind: p.unit_kind,
      qty: Number(p.unit_qty) || 1,
    },
    en: p.name?.en ?? p.id,
    az: p.name?.az ?? p.name?.en ?? p.id,
    ru: p.name?.ru ?? p.name?.en ?? p.id,
    popular: Boolean(p.is_popular),
    weighed: Boolean(p.is_weight_based),
    den: p.description?.en ?? '',
    daz: p.description?.az ?? '',
    dru: p.description?.ru ?? '',
    /* A photograph uploaded in the admin panel wins; otherwise the picture
       that ships in this bundle. Removing an upload therefore restores the
       original rather than leaving a gap, and a product added today — which
       has no bundled picture at all — shows the one that was uploaded with
       it. */
    img: p.image_url ?? PHOTOS[`../assets/products/${p.image ?? p.id + '.jpg'}`] ?? null,
  }
}

/**
 * A bundle, in the shape the sets section already speaks.
 *
 * The API sends only bundles that are switched on *and* whose every product is
 * in stock, so anything arriving here is genuinely orderable today.
 */
function adaptBundle (b) {
  return {
    id: b.id,
    off: Number(b.discount_percent) || 0,
    items: (b.items ?? []).map(i => i.product_id),
    qty: Object.fromEntries((b.items ?? []).map(i => [i.product_id, Number(i.qty) || 1])),
    en: b.name?.en ?? b.id,
    az: b.name?.az ?? b.name?.en ?? b.id,
    ru: b.name?.ru ?? b.name?.en ?? b.id,
    den: b.description?.en ?? '',
    daz: b.description?.az ?? '',
    dru: b.description?.ru ?? '',
    /* A photograph of the set itself, when the shop has taken one. Null
       otherwise, and the card falls back to the strip of its products —
       which is what every set has looked like until now. */
    img: b.image_url ?? null,
  }
}

/** The API has no "everything" row and no counts; the page wants both. */
function adaptCategories (apiCategories, products) {
  const count = id => products.filter(p => p.cat === id).length
  const pad = n => String(n).padStart(2, '0')

  return [
    { id: 'all', en: 'Everything', az: 'Hamısı', ru: 'Всё', kicker: pad(products.length) },
    ...apiCategories.map(c => ({
      id: c.id,
      en: c.name?.en ?? c.id,
      az: c.name?.az ?? c.name?.en ?? c.id,
      ru: c.name?.ru ?? c.name?.en ?? c.id,
      kicker: pad(count(c.id)),
    })),
  ]
}

/**
 * Fetch the live catalogue and swap it in.
 *
 * Never throws and never blocks the page: if the API is unreachable the
 * bundled copy stays on screen and `catalogueStale` stays true. A shop that
 * shows yesterday's prices is worth more than a shop that shows nothing —
 * which is also why nothing here awaits before the first paint.
 */
export async function loadCatalogue () {
  if (!API) {
    // No API configured — a plain static build of the marketing site. The
    // bundled catalogue is all there is, and that is a valid way to deploy it.
    return
  }

  try {
    const response = await fetch(`${API}/api/catalogue`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return

    const data = await response.json()
    if (!Array.isArray(data.products) || data.products.length === 0) return

    const products = data.products.map(adaptProduct)

    // Mutated in place, so every component already holding a reference to
    // these arrays re-renders without being told.
    PRODUCTS.splice(0, PRODUCTS.length, ...products)
    CATEGORIES.splice(0, CATEGORIES.length, ...adaptCategories(data.categories ?? [], products))

    /* Emptied when the API sends no bundles, rather than falling back to the
       ones in this file. Those three sets and their discounts were invented
       during design and ship switched off; showing them because the shop has
       not switched any on yet would be advertising a price nobody agreed to.
       The admin panel is what turns them on. */
    SETS.splice(0, SETS.length, ...(data.bundles ?? []).map(adaptBundle))

    catalogueStale.value = false
  } catch {
    // Offline, blocked, or CORS. The bundled copy stands.
  }
}
