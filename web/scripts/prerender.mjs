/**
 * A plain HTML page for every product, and a sitemap that lists them.
 *
 *   node scripts/prerender.mjs [distDir]
 *
 * The shop is one Vue app, so on its own every address answers with the same
 * empty index.html and the product only appears once the script runs. Google
 * does run scripts, eventually, but it ranks what it can read straight away —
 * so this writes dist/mehsul/{slug}.html for each product: the shop's own
 * index.html with the product's title, description, canonical address, Open
 * Graph card and schema.org Product data in the head, and its name, photo,
 * price and description in the body. The app replaces that body the moment it
 * starts, so a customer sees the live page; deploy/website.htaccess serves the
 * file for /mehsul/{slug}.
 *
 * Products come from the live API (VITE_API_URL, or PRERENDER_API). When it
 * cannot be reached, the bundled shared/catalogue.json stands in, as it does
 * for the site itself — unless PRERENDER_LIVE_ONLY=1. The deploy sets that
 * when it runs this a second time, after migrations, against the live API: if
 * the API does not answer then, the pages from the build are left as they are
 * rather than replaced with the bundled prices.
 *
 * Run after `npm run build` (the postbuild step does it), and again by the
 * deploy against the live API once the database is up to date.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assignSlugs, categorySlug } from '../src/data/slug.js'
import {
  CATALOGUE, SITE_NAME, categoryDescription, categoryTitle, crumbsJsonLd, itemListJsonLd,
  own, productDescription, productJsonLd, productTitle, textBlocks,
} from '../src/data/productSchema.js'

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = resolve(process.argv[2] ?? join(webRoot, 'dist'))
const SITE = (process.env.SITE_URL ?? `https://${process.env.DOMAIN ?? 'freshness.az'}`).replace(/\/$/, '')
const API = (process.env.PRERENDER_API ?? process.env.VITE_API_URL ?? '').replace(/\/$/, '')
const LIVE_ONLY = process.env.PRERENDER_LIVE_ONLY === '1'

const say = msg => console.log(`prerender: ${msg}`)

/* ── The catalogue ──────────────────────────────────────────────────────── */

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
        id: c.id, slug: c.slug ?? null, name: c.name?.az ?? c.id,
        indexed: c.is_indexed !== false, page: pageOf(c),
      })),
      collections: (data.collections ?? []).map(c => ({
        slug: c.slug, name: c.name?.az ?? c.slug, indexed: c.is_indexed !== false, page: pageOf(c),
        products: c.products ?? [], sets: c.bundles ?? [],
        updated: c.updated_at ? String(c.updated_at).slice(0, 10) : null,
      })),
      sets: (data.bundles ?? []).map(b => ({ id: b.id, name: b.name?.az ?? b.id, price: (b.price_minor ?? 0) / 100 })),
      products: data.products.map(p => ({
        id: p.id,
        slug: p.slug || null,
        cat: p.category_id,
        price: p.price_minor / 100,
        regular: (p.regular_price_minor ?? p.price_minor) / 100,
        weighed: Boolean(p.is_weight_based),
        name: p.name?.az ?? p.name?.en ?? p.id,
        desc: p.description?.az ?? '',
        unit: p.unit_label?.az ?? '',
        images: [p.image_url, ...(p.gallery ?? []).map(g => g.image_url)].filter(Boolean),
        bundled: p.image ?? `${p.id}.jpg`,
        updated: p.updated_at ? String(p.updated_at).slice(0, 10) : null,
      })),
    }
  } catch (e) {
    say(`could not read ${API}/api/catalogue (${e.message})`)
    return null
  }
}

function bundled () {
  const data = JSON.parse(readFileSync(join(webRoot, '..', 'shared', 'catalogue.json'), 'utf8'))
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
      name: p.translations?.az?.name ?? p.id,
      desc: p.translations?.az?.description ?? '',
      unit: p.translations?.az?.unit_label ?? '',
      images: [],
      bundled: `${p.id}.jpg`,
      updated: null,
    }))
  return {
    source: 'shared/catalogue.json (bundled copy)',
    categories: data.categories.map(c => ({ id: c.id, slug: null, name: c.names?.az ?? c.id, indexed: true, page: {} })),
    collections: [],
    sets: [],
    products,
  }
}

/* A page's own words from the API, as { seo_title: {az, ru, en}, … }. */
const pageOf = x => Object.fromEntries(['seo_title', 'seo_description', 'h1', 'body'].map(f => [f, x[f] ?? {}]))

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

/* index.html with this page's own head and a plain body. */
function shell (template, { title, desc, url, type = 'website', image, robots, ld = [], body }) {
  let html = template
  html = setMeta(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = setMeta(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
  if (robots) html = setMeta(html, /<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`)
  if (url) {
    html = setMeta(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`)
    html = setMeta(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`)
  } else {
    html = html.replace(/<link rel="canonical" href="[^"]*">\n?/, '')
  }
  html = setMeta(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
  html = setMeta(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
  html = setMeta(html, /<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${type}">`)
  if (image) {
    html = setMeta(html, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}">`)
    html = html.replace(/<meta property="og:image:(?:width|height)" content="[^"]*">\n?/g, '')
    html = setMeta(html, /<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${esc(image)}">`)
  }
  if (ld.length) html = setMeta(html, /<\/head>/, `${ld.map(([id, obj]) => ldScript(obj, id)).join('\n')}\n</head>`)
  return setMeta(html, /<div id="app"><\/div>/, `<div id="app"><main class="prerendered wrap">\n${body}\n</main></div>`)
}

const catUrl = c => `${SITE}/kataloq/${c.slug}`
const productLinks = list =>
  `<ul>${list.map(o => `<li><a href="/mehsul/${esc(o.slug)}">${esc(o.name)}</a> — ${money(o.price)} ₼</li>`).join('')}</ul>`
const textHtml = body => textBlocks(body).map(b => (b.h ? `<h2>${esc(b.h)}</h2>` : `<p>${esc(b.p)}</p>`)).join('\n')
const categoryLinks = cats =>
  `<ul>${cats.map(c => `<li><a href="/kataloq/${esc(c.slug)}">${esc(c.name)}</a> <span>${c.count}</span></li>`).join('')}</ul>`

function productPage (template, p, ctx) {
  const url = `${SITE}/mehsul/${p.slug}`
  const cat = ctx.categories.find(c => c.id === p.cat)
  const facts = { name: p.name, price: p.price, unit: p.unit, desc: p.desc }
  const [product, crumbs] = productJsonLd({
    url, name: p.name, desc: p.desc, images: p.images, price: p.price, sku: p.id,
    category: cat?.name, categoryUrl: cat ? catUrl(cat) : undefined, weighed: p.weighed, site: SITE,
  })
  const related = ctx.products.filter(o => o.cat === p.cat && o.id !== p.id).slice(0, 8)
  const paras = String(p.desc).split(/\n+/).map(s => s.trim()).filter(Boolean)
  return shell(template, {
    title: productTitle(facts), desc: productDescription(facts), url, type: 'product',
    image: p.images[0] ?? `${SITE}/og-image.png`,
    ld: [['ld-product', product], ['ld-crumbs', crumbs]],
    body: `<nav aria-label="breadcrumb"><a href="/">Ana səhifə</a> › <a href="/kataloq">Kataloq</a>${cat ? ` › <a href="/kataloq/${esc(cat.slug)}">${esc(cat.name)}</a>` : ''} › ${esc(p.name)}</nav>
<article>
<h1>${esc(p.name)}</h1>
${p.images[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}" width="600" height="600" fetchpriority="high">` : ''}
<p><strong>${money(p.price)} ₼</strong>${p.regular > p.price ? ` <s>${money(p.regular)} ₼</s>` : ''}${p.unit ? ` · ${esc(p.unit)}` : ''}</p>
${paras.map(line => `<p>${esc(line)}</p>`).join('\n')}
<p>Bakı və Bakı ətrafına çatdırılma — həftənin 7 günü, 10:00–22:00. Sifariş: <a href="tel:+994503521919">+994 50 352 19 19</a>.</p>
</article>
${related.length ? `<section><h2>Bu bölmədən daha</h2>${productLinks(related)}</section>` : ''}`,
  })
}

function cataloguePage (template, ctx) {
  return shell(template, {
    title: CATALOGUE.title, desc: CATALOGUE.desc, url: `${SITE}/kataloq`,
    ld: [['ld-crumbs', crumbsJsonLd([['Ana səhifə', `${SITE}/`], ['Kataloq', `${SITE}/kataloq`]])]],
    body: `<nav aria-label="breadcrumb"><a href="/">Ana səhifə</a> › Kataloq</nav>
<h1>Kataloq</h1>
<section><h2>Bölmələr</h2>${categoryLinks(ctx.shelves)}</section>
<section><h2>Bütün məhsullar</h2>${productLinks(ctx.products)}</section>`,
  })
}

function categoryPage (template, c, ctx) {
  const items = ctx.products.filter(p => p.cat === c.id)
  const h1 = own(c.page, 'h1', 'az') ?? c.name
  return shell(template, {
    title: own(c.page, 'seo_title', 'az') ?? categoryTitle(c.name),
    desc: own(c.page, 'seo_description', 'az') ?? categoryDescription(c.name, items.map(p => p.price)),
    url: catUrl(c), robots: c.indexed ? null : 'noindex, follow',
    image: items.find(p => p.images[0])?.images[0],
    ld: [
      ['ld-list', itemListJsonLd(c.name, items.map(p => `${SITE}/mehsul/${p.slug}`))],
      ['ld-crumbs', crumbsJsonLd([['Ana səhifə', `${SITE}/`], ['Kataloq', `${SITE}/kataloq`], [c.name, catUrl(c)]])],
    ],
    body: `<nav aria-label="breadcrumb"><a href="/">Ana səhifə</a> › <a href="/kataloq">Kataloq</a> › ${esc(c.name)}</nav>
<h1>${esc(h1)}</h1>
${productLinks(items)}
${textHtml(own(c.page, 'body', 'az'))}
<section><h2>Digər bölmələr</h2>${categoryLinks(ctx.shelves.filter(o => o.id !== c.id))}</section>`,
  })
}

function collectionPage (template, c, ctx) {
  const items = c.products.map(id => ctx.products.find(p => p.id === id)).filter(Boolean)
  const sets = c.sets.map(id => ctx.sets.find(s => s.id === id)).filter(Boolean)
  const url = `${SITE}/kataloq/${c.slug}`
  const prices = [...items.map(p => p.price), ...sets.map(s => s.price)]
  return shell(template, {
    title: own(c.page, 'seo_title', 'az') ?? categoryTitle(c.name),
    desc: own(c.page, 'seo_description', 'az') ?? (prices.length ? categoryDescription(c.name, prices) : c.name),
    url, robots: c.indexed ? null : 'noindex, follow',
    image: items.find(p => p.images[0])?.images[0],
    ld: [
      ['ld-list', itemListJsonLd(c.name, items.map(p => `${SITE}/mehsul/${p.slug}`))],
      ['ld-crumbs', crumbsJsonLd([['Ana səhifə', `${SITE}/`], ['Kataloq', `${SITE}/kataloq`], [c.name, url]])],
    ],
    body: `<nav aria-label="breadcrumb"><a href="/">Ana səhifə</a> › <a href="/kataloq">Kataloq</a> › ${esc(c.name)}</nav>
<h1>${esc(own(c.page, 'h1', 'az') ?? c.name)}</h1>
${sets.length ? `<ul>${sets.map(s => `<li>${esc(s.name)} — ${money(s.price)} ₼</li>`).join('')}</ul>` : ''}
${productLinks(items)}
${textHtml(own(c.page, 'body', 'az'))}`,
  })
}

/* The answer to an address that does not exist (deploy/website.htaccess sends
   it with a 404). It is the app's own page, so a product added since the last
   build still opens; Google is told not to index it. */
function notFoundPage (template, ctx) {
  return shell(template, {
    title: 'Səhifə tapılmadı | Freshness', desc: 'Bu ünvanda səhifə yoxdur. Kataloqdan məhsul seçin.',
    robots: 'noindex, follow',
    body: `<h1>Səhifə tapılmadı</h1>
<p>Bu ünvanda heç nə yoxdur — ola bilsin, link köhnədir.</p>
<form action="/kataloq" method="get" role="search"><input type="search" name="q" placeholder="Məhsul axtarın" aria-label="Məhsul axtarın"> <button>Axtar</button></form>
<section><h2>Bölmələr</h2>${categoryLinks(ctx.shelves)}</section>
<p><a href="/">Ana səhifə</a></p>`,
  })
}

function sitemap (ctx) {
  // A product's <lastmod> is when it last changed in the panel; pages with no
  // such date carry none rather than one that moves every night.
  const newest = list => list.map(p => p.updated).filter(Boolean).sort().pop()
  const url = (loc, freq, priority, lastmod) =>
    `  <url>\n    <loc>${esc(loc)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url(`${SITE}/`, 'weekly', '1.0', newest(ctx.products)),
    url(`${SITE}/kataloq`, 'daily', '0.9', newest(ctx.products)),
    ...ctx.shelves.filter(c => c.indexed).map(c => url(catUrl(c), 'weekly', '0.9', newest(ctx.products.filter(p => p.cat === c.id)))),
    ...ctx.collections.filter(c => c.indexed).map(c => url(`${SITE}/kataloq/${c.slug}`, 'weekly', '0.8', c.updated)),
    ...ctx.products.map(p => url(`${SITE}/mehsul/${p.slug}`, 'weekly', '0.8', p.updated)),
    url(`${SITE}/privacy/`, 'yearly', '0.3'),
    '</urlset>',
    '',
  ].join('\n')
}

/* ── Run ────────────────────────────────────────────────────────────────── */

const templatePath = join(dist, 'index.html')
if (!existsSync(templatePath)) throw new Error(`prerender: ${templatePath} does not exist — build first`)
const template = readFileSync(templatePath, 'utf8')

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
const made = assignSlugs(ctx.products, p => p.name, p => p.unit)
ctx.products.forEach((p, i) => { p.slug ||= made[i] })
ctx.categories.forEach(c => { c.slug ||= categorySlug({ id: c.id, az: c.name }) })

/* Each slug becomes a file name. The server only stores clean ones, but a
   file name is no place to find out it did not. */
const SAFE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const unsafe = [...ctx.products, ...ctx.categories, ...ctx.collections].filter(x => !SAFE.test(x.slug))
if (unsafe.length) say(`skipped, not a clean slug: ${unsafe.map(x => x.id).join(', ')}`)
ctx.products = ctx.products.filter(p => SAFE.test(p.slug))
ctx.categories = ctx.categories.filter(c => SAFE.test(c.slug))
ctx.collections = ctx.collections.filter(c => SAFE.test(c.slug) && !ctx.categories.some(k => k.slug === c.slug))

/* The categories with something on them — an empty shelf gets no page. */
ctx.shelves = ctx.categories
  .map(c => ({ ...c, count: ctx.products.filter(p => p.cat === c.id).length }))
  .filter(c => c.count > 0)

const photos = photoIndex()
for (const p of ctx.products) {
  if (!p.images.length && photos.has(p.bundled)) p.images = [`${SITE}${photos.get(p.bundled)}`]
}

for (const dir of ['mehsul', 'pages']) rmSync(join(dist, dir), { recursive: true, force: true })
for (const dir of ['mehsul', 'pages/kataloq']) mkdirSync(join(dist, dir), { recursive: true })
for (const p of ctx.products) writeFileSync(join(dist, 'mehsul', `${p.slug}.html`), productPage(template, p, ctx))
for (const c of ctx.shelves) writeFileSync(join(dist, 'pages', 'kataloq', `${c.slug}.html`), categoryPage(template, c, ctx))
for (const c of ctx.collections) writeFileSync(join(dist, 'pages', 'kataloq', `${c.slug}.html`), collectionPage(template, c, ctx))
writeFileSync(join(dist, 'pages', 'kataloq.html'), cataloguePage(template, ctx))
writeFileSync(join(dist, '404.html'), notFoundPage(template, ctx))
writeFileSync(join(dist, 'sitemap.xml'), sitemap(ctx))

say(`${ctx.products.length} product pages, ${ctx.shelves.length} category pages, ${ctx.collections.length} collection pages, the catalogue, 404.html and sitemap.xml from ${ctx.source} (${SITE_NAME})`)
