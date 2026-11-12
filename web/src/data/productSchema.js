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
  az: {
    tail: 'Bakıda çatdırılma hər gün 10:00–22:00.', home: 'Ana səhifə', catalogue: 'Kataloq', deliv: 'Bakıda çatdırılma',
    catTitle: n => `${n} Bakıda — çatdırılma`, catDesc: (n, k, lo, hi) => `${n}: ${k} məhsul, qiymətlər ${lo}–${hi} ₼. Bakıda çatdırılma hər gün 10:00–22:00.`,
    sections: 'Bölmələr', all: 'Bütün məhsullar', more: 'Bu bölmədən daha', also: 'Bununla birlikdə alırlar',
    others: 'Digər bölmələr', faq: 'Tez-tez verilən suallar', out: 'Hazırda yoxdur', allIn: n => `“${n}” bölməsinin bütün məhsulları`,
    delivery: 'Bakı və Bakı ətrafına çatdırılma — həftənin 7 günü, 10:00–22:00. Sifariş:',
    notFound: 'Səhifə tapılmadı', notFoundP: 'Bu ünvanda heç nə yoxdur — ola bilsin, link köhnədir.', search: 'Məhsul axtarın', go: 'Axtar',
    homeH1: 'Bakıda premium balıq, kürü və pendir çatdırılması',
  },
  ru: {
    tail: 'Доставка по Баку ежедневно 10:00–22:00.', home: 'Главная', catalogue: 'Каталог', deliv: 'доставка по Баку',
    catTitle: n => `${n} в Баку — доставка`, catDesc: (n, k, lo, hi) => `${n}: ${k} товаров, цены ${lo}–${hi} ₼. Доставка по Баку ежедневно 10:00–22:00.`,
    sections: 'Разделы', all: 'Все товары', more: 'Ещё из этого раздела', also: 'С этим покупают',
    others: 'Другие разделы', faq: 'Частые вопросы', out: 'Нет в наличии', allIn: n => `Все товары раздела «${n}»`,
    delivery: 'Доставка по Баку и пригородам — 7 дней в неделю, 10:00–22:00. Заказ:',
    notFound: 'Страница не найдена', notFoundP: 'По этому адресу ничего нет — возможно, ссылка устарела.', search: 'Поиск товаров', go: 'Найти',
    homeH1: 'Доставка премиальной рыбы, икры и сыров в Баку',
  },
  en: {
    tail: 'Delivery in Baku daily 10:00–22:00.', home: 'Home', catalogue: 'Catalogue', deliv: 'delivery in Baku',
    catTitle: n => `${n} in Baku — delivery`, catDesc: (n, k, lo, hi) => `${n}: ${k} products, ${lo}–${hi} ₼. Delivery in Baku daily 10:00–22:00.`,
    sections: 'Sections', all: 'All products', more: 'More from this section', also: 'Often bought together',
    others: 'Other sections', faq: 'Frequently asked questions', out: 'Out of stock', allIn: n => `All products in “${n}”`,
    delivery: 'Delivery across Baku and its suburbs — 7 days a week, 10:00–22:00. Order:',
    notFound: 'Page not found', notFoundP: 'There is nothing at this address — the link may be out of date.', search: 'Search products', go: 'Search',
    homeH1: 'Premium fish, caviar and cheese delivered in Baku',
  },
}
export const words = lang => WORDS[lang] ?? WORDS.az

const BRAND = 'Freshness'

/* The home page's own head, per language — the Azerbaijani one is also
   written into index.html. A visitor who arrived on another page still gets
   it when they go home. */
export const HOME = {
  az: {
    title: 'Qızıl balıq, kürü, burrata çatdırılması Bakıda | Freshness',
    desc: 'Hisə verilmiş qızıl balıq, qırmızı və qara kürü, burrata, mozzarella və Avropa pendirləri, təzə balıq və dəniz məhsulları — Bakıda hər gün 10:00–22:00 çatdırılma.',
  },
  ru: {
    title: 'Лосось, икра, буррата с доставкой по Баку | Freshness',
    desc: 'Копчёный лосось, красная и чёрная икра, буррата, моцарелла и европейские сыры, свежая рыба и морепродукты — доставка по Баку ежедневно 10:00–22:00.',
  },
  en: {
    title: 'Smoked salmon, caviar & burrata delivery in Baku | Freshness',
    desc: 'Smoked salmon, red and black caviar, burrata, mozzarella and European cheeses, fresh fish and seafood — delivered across Baku every day, 10:00–22:00.',
  },
  image: 'https://freshness.az/og-image.png',
}

/* The catalogue page's own head — shared with the build's plain copy. */
export const CATALOGUE = {
  az: {
    title: 'Kataloq — balıq, kürü və pendir çatdırılması | Freshness',
    desc: 'Kataloq: hisə verilmiş qızıl balıq, qırmızı və qara kürü, burrata, mozzarella, parmezan, təzə balıq və dəniz məhsulları. Qiymətlər ₼ ilə, Bakıda çatdırılma.',
  },
  ru: {
    title: 'Каталог — рыба, икра и сыры с доставкой | Freshness',
    desc: 'Каталог: копчёный лосось, красная и чёрная икра, буррата, моцарелла, пармезан, свежая рыба и морепродукты. Цены в ₼, доставка по Баку.',
  },
  en: {
    title: 'Catalogue — fish, caviar and cheese delivery | Freshness',
    desc: 'Catalogue: smoked salmon, red and black caviar, burrata, mozzarella, parmesan, fresh fish and seafood. Prices in ₼, delivery across Baku.',
  },
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
 * The tab title and the snippet under it. Name and pack size first — they are
 * what was searched for — then the price, where it is delivered and the
 * brand, each dropped in turn from the end while the whole is over 60
 * characters. A short name ("Levrek") so gets the full line.
 *
 * @param {{name:string, price:number, unit?:string, desc?:string}} p
 */
export function productTitle (p, lang = 'az') {
  const name = String(p.name ?? '').trim()
  // The pack size, unless the name already carries it ("Kürü 200 q").
  const unit = p.unit && !/\d/.test(name) ? ` ${String(p.unit).trim()}` : ''
  const price = ` — ${shortPrice(p.price)} ₼`
  const deliv = words(lang).deliv
  for (const t of [
    `${name}${unit}${price} | ${deliv} | ${BRAND}`,
    `${name}${unit}${price} | ${deliv}`,
    `${name}${unit}${price} | ${BRAND}`,
    `${name}${unit}${price}`,
    `${name}${price} | ${BRAND}`,
    `${name}${price}`,
  ]) if (t.length <= MAX_TITLE) return t
  return `${clip(name, MAX_TITLE - price.length)}${price}`
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

/** The same page's head in another language falls back to Azerbaijani. */
export const inLang = (obj, lang) => obj?.[lang] || obj?.az || ''
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
    // The maker's brand from the panel; the shop's own goods carry its name.
    brand: { '@type': 'Brand', name: p.brand || SITE_NAME },
    ...(gtinKey(p.gtin) ? { [gtinKey(p.gtin)]: p.gtin } : {}),
    ...(weightOf(p) ? { weight: weightOf(p) } : {}),
    offers: offer,
  }

  const w = words(p.lang)
  const home = p.homeUrl ?? `${p.site}/`
  const crumbs = crumbsJsonLd([
    [w.home, home],
    [w.catalogue, p.catalogueUrl ?? `${p.site}/kataloq`],
    ...(p.category && p.categoryUrl ? [[p.category, p.categoryUrl]] : []),
    [p.name, p.url],
  ])

  return [product, crumbs]
}

/* The schema.org property a barcode goes under, by its length. */
const gtinKey = g => ({ 8: 'gtin8', 12: 'gtin12', 13: 'gtin13', 14: 'gtin14' })[String(g ?? '').length] ?? null

/* What one unit weighs, when the unit is a weight: unit_kind kg, or a
   label in grams/kilos ("200 q", "0.93 kq"). Pieces and litres have none. */
function weightOf (p) {
  if (p.unitKind === 'kg' && p.unitQty) return { '@type': 'QuantitativeValue', value: Number(p.unitQty), unitCode: 'KGM' }
  // A range ("700–800 q") is not one weight.
  if (/\d\s*[–-]\s*\d/.test(String(p.unitLabel ?? ''))) return null
  const m = String(p.unitLabel ?? '').match(/(\d+(?:[.,]\d+)?)\s*(q|qr|gr|g|г|kq|kg|кг)(?!\p{L})/iu)
  if (!m) return null
  const kilo = /^(kq|kg|кг)$/i.test(m[2])
  return { '@type': 'QuantitativeValue', value: Number(m[1].replace(',', '.')), unitCode: kilo ? 'KGM' : 'GRM' }
}

/** schema.org FAQPage from [{ q, a }]; null when there is nothing to ask. */
export function faqJsonLd (pairs) {
  const list = (pairs ?? []).filter(x => x?.q && x?.a)
  if (!list.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
  }
}

/* A page's own field in this language, or null — the template then applies.
   Only the language asked for: an Azerbaijani title on the Russian page
   would be worse than the Russian template. */
export const own = (page, field, lang) => {
  const v = page?.[field]?.[lang]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/* The page's questions in this language (never another one's). */
export const ownFaq = (page, lang) => (Array.isArray(page?.faq?.[lang]) ? page.faq[lang].filter(x => x?.q && x?.a) : [])

/* A page text as blocks: blank lines separate paragraphs, a line starting
   "## " is a subheading. Plain text only — never HTML from the panel. */
export function textBlocks (body) {
  return String(body ?? '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
    .map(b => (b.startsWith('## ') ? { h: b.slice(3).trim() } : { p: b.replace(/\s*\n\s*/g, ' ') }))
}
