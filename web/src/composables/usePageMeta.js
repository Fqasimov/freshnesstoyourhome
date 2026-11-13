import { productDescription, productJsonLd, productTitle } from '../data/productSchema'
import { productPath } from '../data/slug'
import { OG_LOCALE, alternates, withLang } from '../data/locale'
import { lang } from './useI18n'

/* The parts of <head> that change from page to page: the canonical address,
   the Open Graph card a shared link shows, and on a product page its
   structured data. index.html holds the home page's own values; these are
   swapped in place rather than duplicated. */

const ROBOTS_DEFAULT = 'index, follow, max-image-preview:large'

function meta (attr, key) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  return el
}

function link (rel) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  return el
}

const absolute = src => (src ? new URL(src, location.origin).href : null)

/* The other languages of this page: one <link rel="alternate" hreflang>
   each, plus x-default. Replaced as a set on every page. */
function setAlternates (path) {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove())
  if (!path) return
  for (const [hreflang, href] of alternates(location.origin, path)) {
    const el = document.createElement('link')
    el.rel = 'alternate'
    el.hreflang = hreflang
    el.href = href
    document.head.appendChild(el)
  }
}

/** Any page: where it really lives, and the card a shared link shows.
    `path` is the page's address without a language ("/kataloq"); the
    canonical is its version in the current language. */
export function setPageHead ({ path, title, desc }) {
  const url = `${location.origin}${withLang(path, lang.value)}`
  link('canonical').href = url
  meta('property', 'og:url').content = url
  meta('property', 'og:locale').content = OG_LOCALE[lang.value]
  setAlternates(path)
  if (title) meta('property', 'og:title').content = title
  if (desc) meta('property', 'og:description').content = desc
}

/**
 * A product page. Called again whenever the live catalogue changes the price
 * or the visitor changes language, so what Google renders matches the page.
 */
export function setProductMeta (p, { name, desc, unit, category, categoryPath, lang: l = 'az' }) {
  const path = productPath(p)
  const url = `${location.origin}${withLang(path, l)}`
  const facts = { name, price: p.price, unit, desc }
  const title = productTitle(facts, l)
  const description = productDescription(facts, l)

  document.title = title
  meta('name', 'description').content = description
  meta('name', 'robots').content = ROBOTS_DEFAULT
  setPageHead({ path, title, desc: description })
  meta('property', 'og:type').content = 'product'

  const images = [p.img, ...(p.gallery ?? []).map(g => g.url)].filter(Boolean).map(absolute)
  if (images[0]) {
    meta('property', 'og:image').content = images[0]
    meta('name', 'twitter:image').content = images[0]
  }

  const [product, crumbs] = productJsonLd({
    url, name, desc, images, price: p.price, sku: p.id, category, lang: l,
    categoryUrl: categoryPath ? `${location.origin}${withLang(categoryPath, l)}` : undefined,
    homeUrl: `${location.origin}${withLang('/', l)}`, catalogueUrl: `${location.origin}${withLang('/kataloq', l)}`,
    weighed: Boolean(p.weighed), site: location.origin,
    brand: p.brand, gtin: p.gtin, unitKind: p.weighed ? 'kg' : null, unitQty: p.unitQty, unitLabel: unit,
    inStock: p.inStock !== false, reviews: p.reviews,
  })
  setLd('ld-product', product)
  setLd('ld-crumbs', crumbs)
}

/** Leaving a product page, or arriving at one that does not exist. */
export function clearProductMeta ({ missing = false } = {}) {
  setLd('ld-product', null)
  setLd('ld-crumbs', null)
  meta('property', 'og:type').content = 'website'
  // A product taken off sale: tell search engines to drop the page rather
  // than keep showing a dead listing.
  meta('name', 'robots').content = missing ? 'noindex' : ROBOTS_DEFAULT
}

/** Whether search engines should index this page. A search result or a
    missing page should not be; everything else should. */
export function setRobots (index = true) {
  meta('name', 'robots').content = index ? ROBOTS_DEFAULT : 'noindex, follow'
}

/** Structured data under its own id, replaced in place; null removes it.
    The build writes the same ids, so the page never carries two copies. */
export function setLd (id, data) {
  let el = document.getElementById(id)
  if (!data) { el?.remove(); return }
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}
