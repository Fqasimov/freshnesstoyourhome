import { productDescription, productJsonLd, productTitle } from '../data/productSchema'
import { productPath } from '../data/slug'

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

/** Any page: where it really lives, and the card a shared link shows. */
export function setPageHead ({ path, title, desc }) {
  const url = `${location.origin}${path}`
  link('canonical').href = url
  meta('property', 'og:url').content = url
  if (title) meta('property', 'og:title').content = title
  if (desc) meta('property', 'og:description').content = desc
}

/**
 * A product page. Called again whenever the live catalogue changes the price
 * or the visitor changes language, so what Google renders matches the page.
 */
export function setProductMeta (p, { name, desc, unit, category }) {
  const path = productPath(p)
  const url = `${location.origin}${path}`
  const facts = { name, price: p.price, unit, desc }
  const title = productTitle(facts)
  const description = productDescription(facts)

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

  let ld = document.getElementById('ld-product')
  if (!ld) {
    ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'ld-product'
    document.head.appendChild(ld)
  }
  ld.textContent = JSON.stringify(productJsonLd({
    url, name, desc, images, price: p.price, sku: p.id, category,
    weighed: Boolean(p.weighed), site: location.origin,
  }))
}

/** Leaving a product page, or arriving at one that does not exist. */
export function clearProductMeta ({ missing = false } = {}) {
  document.getElementById('ld-product')?.remove()
  meta('property', 'og:type').content = 'website'
  // A product taken off sale: tell search engines to drop the page rather
  // than keep showing a dead listing.
  meta('name', 'robots').content = missing ? 'noindex' : ROBOTS_DEFAULT
}
