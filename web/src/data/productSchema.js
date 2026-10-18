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

/**
 * The tab title and the snippet under it. Name first — it is what was searched
 * for — then the price, then where it is delivered.
 *
 * @param {{name:string, price:number, unit?:string, desc?:string}} p
 */
export function productTitle (p) {
  return `${p.name} — ${shortPrice(p.price)} ₼ | Bakıya çatdırılma | ${SITE_NAME}`
}

export function productDescription (p) {
  const unit = p.unit ? ` (${p.unit})` : ''
  const lead = `${p.name}${unit} — ${shortPrice(p.price)} ₼.`
  const tail = 'Bakı və ətrafına çatdırılma hər gün 10:00–22:00.'
  const room = 158 - lead.length - tail.length - 2
  const body = room > 30 && p.desc ? ` ${clip(asSentences(p.desc), room)}` : ''
  return `${lead}${body} ${tail}`
}

/**
 * schema.org Product + BreadcrumbList.
 *
 * @param {{
 *   url:string, name:string, desc?:string, images:string[], price:number,
 *   sku:string, category?:string, weighed?:boolean, site:string,
 *   categoryUrl?:string,
 * }} p
 */
export function productJsonLd (p) {
  const offer = {
    '@type': 'Offer',
    url: p.url,
    priceCurrency: 'AZN',
    price: price2(p.price),
    availability: 'https://schema.org/InStock',
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

  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana səhifə', item: `${p.site}/` },
      { '@type': 'ListItem', position: 2, name: 'Kataloq', item: `${p.site}/kataloq` },
      { '@type': 'ListItem', position: 3, name: p.name, item: p.url },
    ],
  }

  return [product, crumbs]
}
