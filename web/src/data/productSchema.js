/* What Google reads about one product, in one place.

   Used twice: by web/scripts/prerender.mjs, which writes it into the plain
   HTML copy of each product page at build time, and by the product page
   itself, which rewrites it with the live price once the app is running.
   Plain functions over plain values, so Node and the browser share them. */

export const SITE_NAME = 'Freshness To Your Home'

const clip = (text, max) => {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`
}

/* A description is written as lines ("Rusiya istehsalı", "Premium keyfiyyət").
   Run together for a snippet, each needs its full stop. */
export const asSentences = text => String(text ?? '')
  .split(/\n+/).map(l => l.trim()).filter(Boolean)
  .map(l => (/[.!?…:;]$/.test(l) ? l : `${l}.`)).join(' ')

const price2 = n => (Math.round(Number(n) * 100) / 100).toFixed(2)
const shortPrice = n => {
  const r = Math.round(Number(n) * 100) / 100
  return Number.isInteger(r) ? String(r) : r.toFixed(2)
}

/* The words around a product's own name, in the page's language. */
const WORDS = {
  az: { tail: 'Bakıda çatdırılma hər gün 10:00–22:00.', home: 'Ana səhifə', catalogue: 'Kataloq',
    catTitle: n => `${n} Bakıda — çatdırılma`, catDesc: (n, k, lo, hi) => `${n}: ${k} məhsul, qiymətlər ${lo}–${hi} ₼. Bakıda çatdırılma hər gün 10:00–22:00.` },
  ru: { tail: 'Доставка по Баку ежедневно 10:00–22:00.', home: 'Главная', catalogue: 'Каталог',
    catTitle: n => `${n} в Баку — доставка`, catDesc: (n, k, lo, hi) => `${n}: ${k} товаров, цены ${lo}–${hi} ₼. Доставка по Баку ежедневно 10:00–22:00.` },
  en: { tail: 'Delivery in Baku daily 10:00–22:00.', home: 'Home', catalogue: 'Catalogue',
    catTitle: n => `${n} in Baku — delivery`, catDesc: (n, k, lo, hi) => `${n}: ${k} products, ${lo}–${hi} ₼. Delivery in Baku daily 10:00–22:00.` },
}
export const words = lang => WORDS[lang] ?? WORDS.az

const BRAND = 'Freshness'

/* The home page's own head — the same words index.html carries, so a visitor
   who arrived on another page still gets them when they go home. */
export const HOME = {
  title: 'Qızıl balıq, kürü, burrata çatdırılması Bakıda | Freshness',
  desc: 'Hisə verilmiş qızıl balıq, qırmızı və qara kürü, burrata, mozzarella və Avropa pendirləri, təzə balıq və dəniz məhsulları — Bakıda hər gün 10:00–22:00 çatdırılma.',
  image: 'https://freshness.az/og-image.png',
}

/* The catalogue page's own head — shared with the build's plain copy. */
export const CATALOGUE = {
  title: 'Kataloq — balıq, kürü və pendir çatdırılması | Freshness',
  desc: 'Kataloq: hisə verilmiş qızıl balıq, qırmızı və qara kürü, burrata, mozzarella, parmezan, təzə balıq və dəniz məhsulları. Qiymətlər ₼ ilə, Bakıda çatdırılma.',
}
const MAX_TITLE = 60

/* Up to 60 characters, so Google shows it whole: the brand goes first if it
   does not fit, the price stays, and only then is the name shortened. */
function fitTitle (main, suffix) {
  const full = `${main}${suffix} | ${BRAND}`
  if (full.length <= MAX_TITLE) return full
  if (`${main}${suffix}`.length <= MAX_TITLE) return `${main}${suffix}`
  return `${clip(main, MAX_TITLE - suffix.length)}${suffix}`
}

/**
 * The tab title and the snippet under it. Name first — it is what was searched
 * for — then the price, then where it is delivered.
 *
 * @param {{name:string, price:number, unit?:string, desc?:string}} p
 */
export function productTitle (p) {
  return fitTitle(p.name, ` — ${shortPrice(p.price)} ₼`)
}

export function productDescription (p, lang = 'az') {
  const unit = p.unit ? ` (${p.unit})` : ''
  const lead = `${p.name}${unit} — ${shortPrice(p.price)} ₼.`
  const tail = words(lang).tail
  const room = 158 - lead.length - tail.length - 2
  const body = room > 30 && p.desc ? ` ${clip(asSentences(p.desc), room)}` : ''
  return `${lead}${body} ${tail}`
}

/** A category page's title and snippet. */
export function categoryTitle (name, lang = 'az') {
  return fitTitle(words(lang).catTitle(name), '')
}
export function categoryDescription (name, prices, lang = 'az') {
  const lo = shortPrice(Math.min(...prices)), hi = shortPrice(Math.max(...prices))
  return words(lang).catDesc(name, prices.length, lo, hi)
}

/** schema.org ItemList for a category page: its products, in order. */
export function itemListJsonLd (name, urls) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: urls.map((url, i) => ({ '@type': 'ListItem', position: i + 1, url })),
  }
}

/** schema.org BreadcrumbList from [name, url] pairs. */
export function crumbsJsonLd (pairs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: pairs.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  }
}

/**
 * schema.org Product + BreadcrumbList.
 *
 * @param {{
 *   url:string, name:string, desc?:string, images:string[], price:number,
 *   sku:string, category?:string, weighed?:boolean, site:string,
 *   categoryUrl?:string, inStock?:boolean, lang?:string,
 * }} p
 */
export function productJsonLd (p) {
  const offer = {
    '@type': 'Offer',
    url: p.url,
    priceCurrency: 'AZN',
    price: price2(p.price),
    availability: p.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: SITE_NAME },
    areaServed: { '@type': 'City', name: 'Bakı' },
  }
  // Sold by the kilo: the price is for one kilogram, and says so.
  if (p.weighed) {
    offer.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      price: price2(p.price),
      priceCurrency: 'AZN',
      referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'KGM' },
    }
  }

  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    url: p.url,
    ...(p.images?.length ? { image: p.images } : {}),
    ...(p.desc ? { description: clip(asSentences(p.desc), 500) } : {}),
    ...(p.category ? { category: p.category } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: offer,
  }

  const w = words(p.lang)
  const crumbs = crumbsJsonLd([
    [w.home, `${p.site}/`],
    [w.catalogue, `${p.site}/kataloq`],
    ...(p.category && p.categoryUrl ? [[p.category, p.categoryUrl]] : []),
    [p.name, p.url],
  ])

  return [product, crumbs]
}

/* A page's own field in this language, or null — the template then applies.
   Only the language asked for: an Azerbaijani title on the Russian page
   would be worse than the Russian template. */
export const own = (page, field, lang) => {
  const v = page?.[field]?.[lang]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/* A page text as blocks: blank lines separate paragraphs, a line starting
   "## " is a subheading. Plain text only — never HTML from the panel. */
export function textBlocks (body) {
  return String(body ?? '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
    .map(b => (b.startsWith('## ') ? { h: b.slice(3).trim() } : { p: b.replace(/\s*\n\s*/g, ' ') }))
}
