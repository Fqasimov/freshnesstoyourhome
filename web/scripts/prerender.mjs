/**
 * A plain HTML page for every page of the shop, in every language, and a
 * sitemap that lists them.
 *
 *   node scripts/prerender.mjs [distDir]
 *
 * The shop is one Vue app, so on its own every address answers with the same
 * empty index.html and the page only appears once the script runs. Google
 * does run scripts, eventually, but it ranks what it can read straight away —
 * so this writes each page as the shop's own index.html with that page's
 * title, description, canonical address, language versions (hreflang), Open
 * Graph card and schema.org data in the head, and its words, prices and links
 * in the body. The app replaces that body the moment it starts, so a customer
 * sees the live page; deploy/website.htaccess serves the files:
 *
 *   /                      index.html            /ru, /en       pages/{ru,en}/index.html
 *   /kataloq               pages/kataloq.html    /ru/kataloq    pages/ru/kataloq.html
 *   /kataloq/{slug}        pages/kataloq/…       /ru/kataloq/…  pages/ru/kataloq/…
 *   /mehsul/{slug}         mehsul/{slug}.html    /ru/mehsul/…   pages/ru/mehsul/…
 *
 * Products come from the live API (VITE_API_URL, or PRERENDER_API). When it
 * cannot be reached, the bundled shared/catalogue.json stands in, as it does
 * for the site itself — unless PRERENDER_LIVE_ONLY=1. The deploy sets that
 * when it runs this a second time, after migrations, against the live API: if
 * the API does not answer then, the pages from the build are left as they are
 * rather than replaced with the bundled prices.
 *
 * Run after `npm run build` (the postbuild step does it), and again by the
 * deploy against the live API once the database is up to date. index.html is
 * itself rewritten (it is the Azerbaijani home page), so the untouched build
 * output is kept beside it as .prerender-shell.html for the second run.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assignSlugs, categorySlug } from '../src/data/slug.js'
import { LANGS, OG_LOCALE, alternates, withLang } from '../src/data/locale.js'
import {
  CATALOGUE, HOME, SITE_NAME, articleJsonLd, categoryDescription, categoryTitle, crumbsJsonLd, faqJsonLd, inLang,
  itemListJsonLd, own, ownFaq, productDescription, productJsonLd, productTitle, textBlocks, words,
} from '../src/data/productSchema.js'

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = resolve(process.argv[2] ?? join(webRoot, 'dist'))
const SITE = (process.env.SITE_URL ?? `https://${process.env.DOMAIN ?? 'freshness.az'}`).replace(/\/$/, '')
const API = (process.env.PRERENDER_API ?? process.env.VITE_API_URL ?? '').replace(/\/$/, '')
const LIVE_ONLY = process.env.PRERENDER_LIVE_ONLY === '1'
// The shop's Google Business Profile, once it exists: the Store's map link.
const GBP = process.env.GBP_URL ?? ''

const say = msg => console.log(`prerender: ${msg}`)

/* ── The catalogue ──────────────────────────────────────────────────────── */

/* A page's own words from the API, as { seo_title: {az, ru, en}, … }. */
const pageOf = x => Object.fromEntries(['seo_title', 'seo_description', 'h1', 'intro', 'body', 'faq'].map(f => [f, x[f] ?? {}]))
/* A {az, ru, en} map with empty values dropped. */
const map = x => Object.fromEntries(Object.entries(x ?? {}).filter(([, v]) => typeof v === 'string' && v.trim()))

const liveProduct = p => ({
  id: p.id,
  slug: p.slug || null,
  cat: p.category_id,
  price: p.price_minor / 100,
  regular: (p.regular_price_minor ?? p.price_minor) / 100,
  weighed: Boolean(p.is_weight_based),
  unitKind: p.unit_kind,
  unitQty: Number(p.unit_qty) || 1,
  popular: Boolean(p.is_popular),
  name: { ...map(p.name), az: p.name?.az ?? p.name?.en ?? p.id },
  desc: map(p.description),
  long: map(p.long_description),
  unit: map(p.unit_label),
  brand: p.brand || null,
  gtin: p.gtin || null,
  inStock: p.in_stock !== false,
  reviews: p.reviews ?? null,
  images: [p.image_url, ...(p.gallery ?? []).map(g => g.image_url)].filter(Boolean),
  srcset: (p.image_set ?? []).map(v => `${v.url} ${v.w}w`).join(', '),
  bundled: p.image ?? `${p.id}.jpg`,
  updated: p.updated_at ? String(p.updated_at).slice(0, 10) : null,
})

async function live () {
  if (!API) return null
  try {
    const res = await fetch(`${API}/api/catalogue`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data.products) || !data.products.length) throw new Error('no products')
    return {
      source: `${API}/api/catalogue`,
      categories: (data.categories ?? []).map(c => ({
        id: c.id, slug: c.slug ?? null, name: { ...map(c.name), az: c.name?.az ?? c.id },
        indexed: c.is_indexed !== false, page: pageOf(c),
      })),
      collections: (data.collections ?? []).map(c => ({
        slug: c.slug, name: { ...map(c.name), az: c.name?.az ?? c.slug }, indexed: c.is_indexed !== false, page: pageOf(c),
        products: c.products ?? [], sets: c.bundles ?? [],
        updated: c.updated_at ? String(c.updated_at).slice(0, 10) : null,
      })),
      sets: (data.bundles ?? []).map(b => ({ id: b.id, name: { ...map(b.name), az: b.name?.az ?? b.id }, price: (b.price_minor ?? 0) / 100 })),
      // Out of stock products keep their pages, marked so (OutOfStock).
      products: [...data.products.map(liveProduct), ...(data.unavailable ?? []).map(p => ({ ...liveProduct(p), inStock: false }))],
      zones: (data.zones ?? []).map(z => z.name?.az).filter(Boolean),
      redirects: data.redirects && typeof data.redirects === 'object' ? data.redirects : {},
      categoryRedirects: data.category_redirects && typeof data.category_redirects === 'object' ? data.category_redirects : {},
      articles: (data.articles ?? []).map(a => ({ ...a, updated: a.updated_at ? String(a.updated_at).slice(0, 10) : a.published_on })),
    }
  } catch (e) {
    say(`could not read ${API}/api/catalogue (${e.message})`)
    return null
  }
}

function bundled () {
  const data = JSON.parse(readFileSync(join(webRoot, '..', 'shared', 'catalogue.json'), 'utf8'))
  const tr = (p, f) => Object.fromEntries(LANGS.map(l => [l, p.translations?.[l]?.[f]]).filter(([, v]) => v))
  const products = data.products
    .filter(p => p.is_active !== false)
    .sort((a, b) => a.sort - b.sort)
    .map(p => ({
      id: p.id,
      slug: null,
      cat: p.category_id,
      price: p.price_minor / 100,
      regular: p.price_minor / 100,
      weighed: p.unit_kind === 'kg',
      unitKind: p.unit_kind,
      unitQty: Number(p.unit_qty) || 1,
      popular: Boolean(p.is_popular),
      name: { ...tr(p, 'name'), az: p.translations?.az?.name ?? p.id },
      desc: tr(p, 'description'),
      long: {},
      unit: tr(p, 'unit_label'),
      brand: null,
      gtin: null,
      inStock: true,
      images: [],
      bundled: `${p.id}.jpg`,
      updated: null,
    }))
  return {
    source: 'shared/catalogue.json (bundled copy)',
    categories: data.categories.map(c => ({ id: c.id, slug: null, name: { ...map(c.names), az: c.names?.az ?? c.id }, indexed: true, page: {} })),
    collections: [],
    sets: [],
    products,
    zones: [],
    redirects: {},
    categoryRedirects: {},
    articles: [],
  }
}

/* ── Building a page ────────────────────────────────────────────────────── */

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const money = n => {
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? String(r) : r.toFixed(2)
}

/* The bundled photographs are in dist/assets under a hashed name:
   smoked-salmon.jpg → assets/smoked-salmon-AbC123xy.jpg. */
function photoIndex () {
  const dir = join(dist, 'assets')
  const index = new Map()
  if (!existsSync(dir)) return index
  for (const file of readdirSync(dir)) {
    const m = file.match(/^(.+)-[A-Za-z0-9_-]{8}(\.(?:jpe?g|png|webp))$/)
    if (m) index.set(`${m[1]}${m[2]}`, `/assets/${file}`)
  }
  return index
}

function setMeta (html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`index.html no longer has ${pattern} — update prerender.mjs`)
  return html.replace(pattern, replacement)
}

/* JSON inside <script> must not be able to close the tag it sits in. The ids
   are the ones the running app writes, so it replaces these rather than
   adding a second copy. */
const ldScript = (obj, id) => `<script type="application/ld+json"${id ? ` id="${id}"` : ''}>${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

/**
 * index.html with this page's own head and a plain body.
 *
 * `path` is the page's address without a language ("/kataloq"): the page is
 * written for `lang`, and its other languages are listed as alternates.
 */
function shell (template, { lang, path, title, desc, type = 'website', image, robots, ld = [], body, head = '' }) {
  let html = template
  html = setMeta(html, /<html lang="[a-z]+" data-lang="[a-z]+">/, `<html lang="${lang}" data-lang="${lang}">`)
  html = setMeta(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = setMeta(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
  if (robots) html = setMeta(html, /<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`)
  if (path) {
    const url = `${SITE}${withLang(path, lang)}`
    html = setMeta(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`)
    html = setMeta(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`)
    const links = alternates(SITE, path).map(([l, href]) => `<link rel="alternate" hreflang="${l}" href="${esc(href)}">`)
    html = setMeta(html, /<link rel="canonical"[^>]*>/, m => `${m}\n${links.join('\n')}`)
  } else {
    html = html.replace(/<link rel="canonical" href="[^"]*">\n?/, '')
  }
  html = setMeta(html, /<meta property="og:locale" content="[^"]*">/,
    [`<meta property="og:locale" content="${OG_LOCALE[lang]}">`, ...LANGS.filter(l => l !== lang).map(l => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`)].join('\n'))
  html = setMeta(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
  html = setMeta(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
  html = setMeta(html, /<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${type}">`)
  if (image) {
    html = setMeta(html, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}">`)
    html = html.replace(/<meta property="og:image:(?:width|height)" content="[^"]*">\n?/g, '')
    html = setMeta(html, /<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${esc(image)}">`)
  }
  html = setMeta(html, /<script type="application\/ld\+json" id="ld-store">[\s\S]*?<\/script>/, ldScript(storeJsonLd(lang), 'ld-store'))
  if (head) html = setMeta(html, /<\/head>/, `${head}\n</head>`)
  const scripts = ld.filter(([, obj]) => obj)
  if (scripts.length) html = setMeta(html, /<\/head>/, `${scripts.map(([id, obj]) => ldScript(obj, id)).join('\n')}\n</head>`)
  return setMeta(html, /<div id="app"><\/div>/, `<div id="app"><main class="prerendered wrap">\n${body}\n</main></div>`)
}

/* Everything below is for one language at a time. */
const T = (obj, l) => inLang(obj, l)
const href = (path, l) => esc(withLang(path, l))
const abs = (path, l) => `${SITE}${withLang(path, l)}`

const productLinks = (list, l) =>
  `<ul>${list.map(o => `<li><a href="${href(`/mehsul/${o.slug}`, l)}">${esc(T(o.name, l))}</a> — ${money(o.price)} ₼${o.inStock ? '' : ` (${esc(words(l).out)})`}</li>`).join('')}</ul>`
const textHtml = body => textBlocks(body).map(b => (b.h ? `<h2>${esc(b.h)}</h2>` : `<p>${esc(b.p)}</p>`)).join('\n')
const faqHtml = (pairs, l) => (pairs.length
  ? `<section><h2>${esc(words(l).faq)}</h2>${pairs.map(x => `<h3>${esc(x.q)}</h3><p>${esc(x.a)}</p>`).join('\n')}</section>`
  : '')
const categoryLinks = (cats, l) =>
  `<ul>${cats.map(c => `<li><a href="${href(`/kataloq/${c.slug}`, l)}">${esc(T(c.name, l))}</a> <span>${c.count}</span></li>`).join('')}</ul>`
const crumbsNav = (l, trail) => {
  const w = words(l)
  const parts = [`<a href="${href('/', l)}">${esc(w.home)}</a>`, ...trail.map(([name, path]) => (path ? `<a href="${href(path, l)}">${esc(name)}</a>` : esc(name)))]
  return `<nav aria-label="breadcrumb">${parts.join(' › ')}</nav>`
}
const crumbsLd = (l, trail) => crumbsJsonLd([[words(l).home, abs('/', l)], ...trail.map(([name, path]) => [name, abs(path, l)])])
const deliveryLine = l => `<p>${esc(words(l).delivery)} <a href="tel:+994503521919">+994 50 352 19 19</a>.</p>`

/* The shop itself, as schema.org GroceryStore, on every page. */
let storeFacts = { min: 3.9, max: 220, zones: [] }
function storeJsonLd (l) {
  const home = HOME[l] ?? HOME.az
  return {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    '@id': `${SITE}/#store`,
    name: SITE_NAME,
    url: abs('/', l),
    logo: `${SITE}/favicon-512.png`,
    image: [`${SITE}/og-image.png`],
    description: home.desc,
    telephone: '+994503521919',
    email: 'info@freshness.az',
    priceRange: `${money(storeFacts.min)}–${money(storeFacts.max)} ₼`,
    currenciesAccepted: 'AZN',
    paymentAccepted: 'Cash, Credit Card',
    address: { '@type': 'PostalAddress', addressLocality: 'Bakı', addressCountry: 'AZ' },
    areaServed: [
      { '@type': 'City', name: 'Bakı' },
      ...storeFacts.zones.map(name => ({ '@type': 'Place', name })),
    ],
    ...(GBP ? { hasMap: GBP } : {}),
    sameAs: ['https://www.instagram.com/freshnesstoyourhome/', ...(GBP ? [GBP] : [])],
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '10:00',
      closes: '22:00',
    }],
  }
}

function homePage (template, l, ctx) {
  const home = HOME[l] ?? HOME.az
  const w = words(l)
  const popular = ctx.products.filter(p => p.popular && p.inStock).slice(0, 12)
  // The hero's first photograph is the largest thing on the page: ask for it
  // before the script that places it has even loaded.
  const hero = ctx.photos.get('salmon-carpaccio.webp')
  return shell(template, {
    lang: l, path: '/', title: home.title, desc: home.desc,
    head: hero ? `<link rel="preload" as="image" href="${esc(hero)}" fetchpriority="high">` : '',
    body: `<h1>${esc(w.homeH1)}</h1>
<p>${esc(home.desc)}</p>
<section><h2>${esc(w.sections)}</h2>${categoryLinks(ctx.shelves, l)}</section>
${popular.length ? `<section><h2>${esc(w.all)}</h2>${productLinks(popular, l)}<p><a href="${href('/kataloq', l)}">${esc(w.catalogue)} →</a></p></section>` : ''}
${deliveryLine(l)}`,
  })
}

function productPage (template, p, l, ctx) {
  const path = `/mehsul/${p.slug}`
  const w = words(l)
  const cat = ctx.categories.find(c => c.id === p.cat)
  const name = T(p.name, l), desc = T(p.desc, l), unit = T(p.unit, l)
  const facts = { name, price: p.price, unit, desc }
  const [product, crumbs] = productJsonLd({
    url: abs(path, l), name, desc, images: p.images, price: p.price, sku: p.id, lang: l,
    category: cat ? T(cat.name, l) : undefined, categoryUrl: cat ? abs(`/kataloq/${cat.slug}`, l) : undefined,
    homeUrl: abs('/', l), catalogueUrl: abs('/kataloq', l),
    weighed: p.weighed, site: SITE, brand: p.brand, gtin: p.gtin, inStock: p.inStock, reviews: p.reviews,
    unitKind: p.unitKind, unitQty: p.unitQty, unitLabel: unit,
  })
  const related = ctx.products.filter(o => o.cat === p.cat && o.id !== p.id && o.inStock).slice(0, 8)
  const also = ctx.products.filter(o => o.cat !== p.cat && o.popular && o.inStock).slice(0, 4)
  const lines = s => String(s ?? '').split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('\n')
  const longText = p.long[l] ?? ''
  return shell(template, {
    lang: l, path, title: productTitle(facts, l), desc: productDescription(facts, l), type: 'product',
    image: p.images[0] ?? `${SITE}/og-image.png`,
    ld: [['ld-product', product], ['ld-crumbs', crumbs]],
    body: `${crumbsNav(l, [[w.catalogue, '/kataloq'], ...(cat ? [[T(cat.name, l), `/kataloq/${cat.slug}`]] : []), [name]])}
<article>
<h1>${esc(name)}</h1>
${p.images[0] ? `<img src="${esc(p.images[0])}"${p.srcset ? ` srcset="${esc(p.srcset)}" sizes="(max-width: 800px) 100vw, 600px"` : ''} alt="${esc(name)}" width="600" height="600" fetchpriority="high">` : ''}
<p><strong>${money(p.price)} ₼</strong>${p.regular > p.price ? ` <s>${money(p.regular)} ₼</s>` : ''}${unit ? ` · ${esc(unit)}` : ''}${p.inStock ? '' : ` — ${esc(w.out)}`}</p>
${p.brand ? `<p>${esc(p.brand)}</p>` : ''}
${lines(desc)}
${lines(longText)}
${deliveryLine(l)}
</article>
${p.reviews?.count ? `<section><h2>${esc(w.reviews)} — ${p.reviews.rating}/5 (${p.reviews.count})</h2>${(p.reviews.latest ?? []).map(r => `<p><strong>${esc(r.name)}</strong> ${r.rating}/5${r.text ? ` — ${esc(r.text)}` : ''}</p>`).join('\n')}</section>` : ''}
${related.length ? `<section><h2>${esc(w.more)}</h2>${productLinks(related, l)}</section>` : ''}
${also.length ? `<section><h2>${esc(w.also)}</h2>${productLinks(also, l)}</section>` : ''}
${cat ? `<p><a href="${href(`/kataloq/${cat.slug}`, l)}">${esc(w.allIn(T(cat.name, l)))} →</a></p>` : ''}`,
  })
}

function cataloguePage (template, l, ctx) {
  const page = CATALOGUE[l] ?? CATALOGUE.az
  const w = words(l)
  return shell(template, {
    lang: l, path: '/kataloq', title: page.title, desc: page.desc,
    ld: [['ld-crumbs', crumbsLd(l, [[w.catalogue, '/kataloq']])]],
    body: `${crumbsNav(l, [[w.catalogue]])}
<h1>${esc(w.catalogue)}</h1>
<section><h2>${esc(w.sections)}</h2>${categoryLinks(ctx.shelves, l)}</section>
<section><h2>${esc(w.all)}</h2>${productLinks(ctx.products, l)}</section>`,
  })
}

/* A category or a collection: the same page with different products. */
function listPage (template, l, ctx, { slug, name, page, indexed, items, sets = [], others = [] }) {
  const path = `/kataloq/${slug}`
  const w = words(l)
  const title = T(name, l)
  const prices = [...items.map(p => p.price), ...sets.map(s => s.price)]
  const faq = ownFaq(page, l)
  return shell(template, {
    lang: l, path,
    title: own(page, 'seo_title', l) ?? categoryTitle(title, l),
    desc: own(page, 'seo_description', l) ?? (prices.length ? categoryDescription(title, prices, l) : title),
    robots: indexed ? null : 'noindex, follow',
    image: items.find(p => p.images[0])?.images[0],
    ld: [
      ['ld-list', itemListJsonLd(title, items.map(p => abs(`/mehsul/${p.slug}`, l)))],
      ['ld-crumbs', crumbsLd(l, [[w.catalogue, '/kataloq'], [title, path]])],
      ['ld-faq', faqJsonLd(faq)],
    ],
    body: `${crumbsNav(l, [[w.catalogue, '/kataloq'], [title]])}
<h1>${esc(own(page, 'h1', l) ?? title)}</h1>
${textHtml(own(page, 'intro', l))}
${sets.length ? `<ul>${sets.map(s => `<li>${esc(T(s.name, l))} — ${money(s.price)} ₼</li>`).join('')}</ul>` : ''}
${productLinks(items, l)}
${textHtml(own(page, 'body', l))}
${faqHtml(faq, l)}
${others.length ? `<section><h2>${esc(w.others)}</h2>${categoryLinks(others, l)}</section>` : ''}`,
  })
}

const categoryPage = (template, c, l, ctx) => listPage(template, l, ctx, {
  slug: c.slug, name: c.name, page: c.page, indexed: c.indexed,
  items: ctx.products.filter(p => p.cat === c.id),
  others: ctx.shelves.filter(o => o.id !== c.id),
})

const collectionPage = (template, c, l, ctx) => listPage(template, l, ctx, {
  slug: c.slug, name: c.name, page: c.page, indexed: c.indexed,
  items: c.products.map(id => ctx.products.find(p => p.id === id && p.inStock)).filter(Boolean),
  sets: c.sets.map(id => ctx.sets.find(s => s.id === id)).filter(Boolean),
})

/* Recipes: the list and one page each. Text only in the languages it was
   written in; another language's page shows the Azerbaijani text. */
const articleCover = (a, ctx) => (a.products ?? []).map(id => ctx.products.find(p => p.id === id)?.images[0]).find(Boolean)

function recipesPage (template, l, ctx) {
  const w = words(l)
  return shell(template, {
    lang: l, path: '/resept', title: `${w.recipesH1} | Freshness`, desc: w.recipesDesc,
    ld: [['ld-crumbs', crumbsLd(l, [[w.recipes, '/resept']])]],
    body: `${crumbsNav(l, [[w.recipes]])}
<h1>${esc(w.recipesH1)}</h1>
<p>${esc(w.recipesDesc)}</p>
<ul>${ctx.articles.map(a => `<li><a href="${href(`/resept/${a.slug}`, l)}">${esc(T(a.title, l))}</a>${T(a.summary, l) ? ` — ${esc(T(a.summary, l))}` : ''}</li>`).join('')}</ul>`,
  })
}

function articlePage (template, a, l, ctx) {
  const w = words(l)
  const path = `/resept/${a.slug}`
  const title = T(a.title, l)
  const desc = T(a.seo_description, l) || T(a.summary, l) || title
  const items = (a.products ?? []).map(id => ctx.products.find(p => p.id === id)).filter(Boolean)
  const image = articleCover(a, ctx)
  return shell(template, {
    lang: l, path, title: T(a.seo_title, l) || `${title} | Freshness`, desc, type: 'article', image,
    ld: [
      ['ld-article', articleJsonLd({ url: abs(path, l), title, desc, image, published: a.published_on, modified: a.updated, lang: l })],
      ['ld-crumbs', crumbsLd(l, [[w.recipes, '/resept'], [title, path]])],
      ['ld-list', items.length ? itemListJsonLd(title, items.map(p => abs(`/mehsul/${p.slug}`, l))) : null],
    ],
    body: `${crumbsNav(l, [[w.recipes, '/resept'], [title]])}
<article>
<h1>${esc(title)}</h1>
${T(a.summary, l) ? `<p>${esc(T(a.summary, l))}</p>` : ''}
${textHtml(T(a.body, l))}
</article>
${items.length ? `<section><h2>${esc(w.inArticle)}</h2>${productLinks(items, l)}</section>` : ''}`,
  })
}

/* The answer to an address that does not exist (deploy/website.htaccess sends
   it with a 404). It is the app's own page, so a product added since the last
   build still opens; Google is told not to index it. */
function notFoundPage (template, ctx) {
  const w = words('az')
  return shell(template, {
    lang: 'az', title: `${w.notFound} | Freshness`, desc: 'Bu ünvanda səhifə yoxdur. Kataloqdan məhsul seçin.',
    robots: 'noindex, follow',
    body: `<h1>${esc(w.notFound)}</h1>
<p>${esc(w.notFoundP)}</p>
<form action="/kataloq" method="get" role="search"><input type="search" name="q" placeholder="${esc(w.search)}" aria-label="${esc(w.search)}"> <button>${esc(w.go)}</button></form>
<section><h2>${esc(w.sections)}</h2>${categoryLinks(ctx.shelves, 'az')}</section>
<p><a href="/">${esc(w.home)}</a></p>`,
  })
}

function sitemap (ctx) {
  // A product's <lastmod> is when it last changed in the panel; pages with no
  // such date carry none rather than one that moves every night.
  const newest = list => list.map(p => p.updated).filter(Boolean).sort().pop()
  const entry = (path, freq, priority, lastmod, images = []) => LANGS.map(l => [
    '  <url>',
    `    <loc>${esc(abs(path, l))}</loc>`,
    ...alternates(SITE, path).map(([hl, h]) => `    <xhtml:link rel="alternate" hreflang="${hl}" href="${esc(h)}"/>`),
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    `    <changefreq>${freq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    ...images.map(src => `    <image:image><image:loc>${esc(src)}</image:loc></image:image>`),
    '  </url>',
  ].join('\n'))
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entry('/', 'weekly', '1.0', newest(ctx.products)),
    ...entry('/kataloq', 'daily', '0.9', newest(ctx.products)),
    ...ctx.shelves.filter(c => c.indexed).flatMap(c => entry(`/kataloq/${c.slug}`, 'weekly', '0.9', newest(ctx.products.filter(p => p.cat === c.id)))),
    ...ctx.collections.filter(c => c.indexed).flatMap(c => entry(`/kataloq/${c.slug}`, 'weekly', '0.8', c.updated)),
    ...ctx.products.flatMap(p => entry(`/mehsul/${p.slug}`, 'weekly', '0.8', p.updated, p.images.slice(0, 3))),
    ...(ctx.articles.length ? entry('/resept', 'weekly', '0.6', ctx.articles.map(a => a.updated).filter(Boolean).sort().pop()) : []),
    ...ctx.articles.flatMap(a => entry(`/resept/${a.slug}`, 'monthly', '0.6', a.updated)),
    '  <url>\n    <loc>' + esc(`${SITE}/privacy/`) + '</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>',
    '</urlset>',
    '',
  ].join('\n')
}

/* Old product addresses → 301 to the current one, written into the site's
   .htaccess between its markers (the deploy runs this on the staged copy). */
function writeRedirects (redirects, categoryRedirects = {}) {
  const file = join(dist, '.htaccess')
  if (!existsSync(file)) return 0
  const htaccess = readFileSync(file, 'utf8')
  const START = '# @product-redirects', END = '# @end-product-redirects'
  if (!htaccess.includes(START) || !htaccess.includes(END)) {
    say('.htaccess has no redirect markers — old product addresses not redirected')
    return 0
  }
  const rules = Object.entries(redirects)
    .filter(([from, to]) => SAFE.test(from) && SAFE.test(to) && from !== to)
    .map(([from, to]) => `  RewriteRule ^((ru|en)/)?mehsul/${from}/?$ /$1mehsul/${to} [R=301,L]`)
    .concat(Object.entries(categoryRedirects)
      .filter(([from, to]) => SAFE.test(from) && SAFE.test(to) && from !== to)
      .map(([from, to]) => `  RewriteRule ^((ru|en)/)?kataloq/${from}/?$ /$1kataloq/${to} [R=301,L]`))
  const block = [START, ...rules, `  ${END}`].join("\n")
  writeFileSync(file, htaccess.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block))
  return rules.length
}

/* ── Run ────────────────────────────────────────────────────────────────── */

const indexPath = join(dist, 'index.html')
const shellPath = join(dist, '.prerender-shell.html')
if (!existsSync(indexPath)) throw new Error(`prerender: ${indexPath} does not exist — build first`)
// The build's own index.html, before this script made it the home page.
const template = readFileSync(existsSync(shellPath) ? shellPath : indexPath, 'utf8')
writeFileSync(shellPath, template)

let ctx = await live()
if (!ctx) {
  if (LIVE_ONLY) {
    say('no live catalogue — the pages from the build stay as they are')
    process.exit(0)
  }
  ctx = bundled()
}

/* A catalogue without slugs (the bundled copy, or a server from before they
   existed) gets them by the server's own rule, in the shop's own order. */
const made = assignSlugs(ctx.products, p => p.name.az, p => p.unit.az ?? '')
ctx.products.forEach((p, i) => { p.slug ||= made[i] })
ctx.categories.forEach(c => { c.slug ||= categorySlug({ id: c.id, az: c.name.az }) })

/* Each slug becomes a file name. The server only stores clean ones, but a
   file name is no place to find out it did not. */
const SAFE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const unsafe = [...ctx.products, ...ctx.categories, ...ctx.collections].filter(x => !SAFE.test(x.slug))
if (unsafe.length) say(`skipped, not a clean slug: ${unsafe.map(x => x.id ?? x.slug).join(', ')}`)
ctx.products = ctx.products.filter(p => SAFE.test(p.slug))
ctx.categories = ctx.categories.filter(c => SAFE.test(c.slug))
ctx.collections = ctx.collections.filter(c => SAFE.test(c.slug) && !ctx.categories.some(k => k.slug === c.slug))
ctx.articles = (ctx.articles ?? []).filter(a => SAFE.test(a.slug) && a.title?.az)

/* The categories with something on them — an empty shelf gets no page. */
ctx.shelves = ctx.categories
  .map(c => ({ ...c, count: ctx.products.filter(p => p.cat === c.id).length }))
  .filter(c => c.count > 0)

const photos = photoIndex()
ctx.photos = photos
for (const p of ctx.products) {
  if (!p.images.length && photos.has(p.bundled)) p.images = [`${SITE}${photos.get(p.bundled)}`]
}

const prices = ctx.products.map(p => p.price).filter(n => n > 0)
storeFacts = { min: Math.min(...prices), max: Math.max(...prices), zones: ctx.zones }

/* Where each language's files go: Azerbaijani where they always were. */
const dir = (l, ...rest) => (l === 'az' ? join(dist, ...rest) : join(dist, 'pages', l, ...rest.map(r => r.replace(/^pages\/?/, ''))))
const write = (file, html) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, html) }

for (const d of ['mehsul', 'pages']) rmSync(join(dist, d), { recursive: true, force: true })
let count = 0
for (const l of LANGS) {
  for (const p of ctx.products) write(l === 'az' ? join(dist, 'mehsul', `${p.slug}.html`) : join(dist, 'pages', l, 'mehsul', `${p.slug}.html`), productPage(template, p, l, ctx))
  for (const c of ctx.shelves) write(dir(l, 'pages', 'kataloq', `${c.slug}.html`), categoryPage(template, c, l, ctx))
  for (const c of ctx.collections) write(dir(l, 'pages', 'kataloq', `${c.slug}.html`), collectionPage(template, c, l, ctx))
  write(dir(l, 'pages', 'kataloq.html'), cataloguePage(template, l, ctx))
  if (ctx.articles.length) {
    write(dir(l, 'pages', 'resept.html'), recipesPage(template, l, ctx))
    for (const a of ctx.articles) write(dir(l, 'pages', 'resept', `${a.slug}.html`), articlePage(template, a, l, ctx))
  }
  write(l === 'az' ? indexPath : join(dist, 'pages', l, 'index.html'), homePage(template, l, ctx))
  count += ctx.products.length + ctx.shelves.length + ctx.collections.length + 2 + (ctx.articles.length ? ctx.articles.length + 1 : 0)
}
write(join(dist, '404.html'), notFoundPage(template, ctx))
write(join(dist, 'sitemap.xml'), sitemap(ctx))
const redirected = writeRedirects(ctx.redirects ?? {}, ctx.categoryRedirects ?? {})

say(`${count} pages in ${LANGS.length} languages (${ctx.products.length} products, ${ctx.shelves.length} categories, ${ctx.collections.length} collections, ${ctx.articles.length} articles), 404.html, sitemap.xml${redirected ? `, ${redirected} redirects` : ''} from ${ctx.source} (${SITE_NAME})`)
