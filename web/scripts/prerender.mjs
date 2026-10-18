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
import { assignSlugs } from '../src/data/slug.js'
import { productDescription, productJsonLd, productTitle, SITE_NAME } from '../src/data/productSchema.js'

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
      categories: Object.fromEntries((data.categories ?? []).map(c => [c.id, c.name?.az ?? c.id])),
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
    }))
  return {
    source: 'shared/catalogue.json (bundled copy)',
    categories: Object.fromEntries(data.categories.map(c => [c.id, c.names?.az ?? c.id])),
    products,
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

/* JSON inside <script> must not be able to close the tag it sits in. */
const ldScript = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

function page (template, p, ctx) {
  const url = `${SITE}/mehsul/${p.slug}`
  const category = ctx.categories[p.cat] ?? ''
  const facts = { name: p.name, price: p.price, unit: p.unit, desc: p.desc }
  const title = productTitle(facts)
  const description = productDescription(facts)
  const image = p.images[0] ?? `${SITE}/og-image.png`

  let html = template
  html = setMeta(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = setMeta(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
  html = html.replace(/<meta name="keywords" content="[^"]*">\n?/, '')
  html = setMeta(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`)
  html = setMeta(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`)
  html = setMeta(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
  html = setMeta(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(description)}">`)
  html = setMeta(html, /<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="product">')
  html = setMeta(html, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}">`)
  html = html.replace(/<meta property="og:image:(?:width|height)" content="[^"]*">\n?/g, '')
  html = setMeta(html, /<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${esc(image)}">`)

  const [product, crumbs] = productJsonLd({
    url, name: p.name, desc: p.desc, images: p.images, price: p.price, sku: p.id,
    category, weighed: p.weighed, site: SITE,
  })
  html = setMeta(html, /<\/head>/, `${ldScript(product)}\n${ldScript(crumbs)}\n</head>`)

  const related = ctx.products.filter(o => o.cat === p.cat && o.id !== p.id).slice(0, 8)
  const paras = String(p.desc).split(/\n+/).map(s => s.trim()).filter(Boolean)
  const body = `<div id="app"><main class="prerendered wrap">
<nav><a href="/">Ana səhifə</a> › <a href="/kataloq">Kataloq</a>${category ? ` › ${esc(category)}` : ''}</nav>
<article>
<h1>${esc(p.name)}</h1>
${p.images[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}" width="600" height="600">` : ''}
<p><strong>${money(p.price)} ₼</strong>${p.regular > p.price ? ` <s>${money(p.regular)} ₼</s>` : ''}${p.unit ? ` · ${esc(p.unit)}` : ''}</p>
${paras.map(line => `<p>${esc(line)}</p>`).join('\n')}
<p>Bakı və Bakı ətrafına çatdırılma — həftənin 7 günü, 10:00–22:00. Sifariş: <a href="tel:+994503521919">+994 50 352 19 19</a>.</p>
</article>
${related.length ? `<section><h2>Bu bölmədən daha</h2><ul>${related.map(o => `<li><a href="/mehsul/${esc(o.slug)}">${esc(o.name)}</a> — ${money(o.price)} ₼</li>`).join('')}</ul></section>` : ''}
</main></div>`
  html = setMeta(html, /<div id="app"><\/div>/, body)
  return html
}

function sitemap (products) {
  // No <lastmod>: the build cannot know when a product last changed, and
  // Google stops trusting a date that moves every night.
  const url = (loc, freq, priority) =>
    `  <url>\n    <loc>${esc(loc)}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url(`${SITE}/`, 'weekly', '1.0'),
    url(`${SITE}/kataloq`, 'daily', '0.9'),
    ...products.map(p => url(`${SITE}/mehsul/${p.slug}`, 'weekly', '0.8')),
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

/* Each slug becomes a file name. The server only stores clean ones, but a
   file name is no place to find out it did not. */
const SAFE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const unsafe = ctx.products.filter(p => !SAFE.test(p.slug))
if (unsafe.length) say(`skipped, not a clean slug: ${unsafe.map(p => p.id).join(', ')}`)
ctx.products = ctx.products.filter(p => SAFE.test(p.slug))

const photos = photoIndex()
for (const p of ctx.products) {
  if (!p.images.length && photos.has(p.bundled)) p.images = [`${SITE}${photos.get(p.bundled)}`]
}

const outDir = join(dist, 'mehsul')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
for (const p of ctx.products) {
  writeFileSync(join(outDir, `${p.slug}.html`), page(template, p, ctx))
}
writeFileSync(join(dist, 'sitemap.xml'), sitemap(ctx.products))

say(`${ctx.products.length} product pages and sitemap.xml from ${ctx.source} (${SITE_NAME})`)
