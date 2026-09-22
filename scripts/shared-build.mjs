/**
 * What the website and the app share, and how each one gets its copy.
 *
 * ------------------------------------------------------------------------
 * The rule: anything true of the business rather than of a screen is written
 * ONCE, in shared/, and every file below is generated from it. A colour, a
 * delivery fee, the shop's phone number — change it in shared/ and both
 * surfaces change together. Never edit a generated file; the next `npm run
 * sync` overwrites it and `npm run check` fails the build in the meantime.
 *
 * Why generate rather than import shared/ directly: Vite would manage it, but
 * Metro only watches the app's own folder, and a build step that works on one
 * surface and not the other is exactly the drift this exists to prevent. A
 * generated file is also readable in the editor where it is used, which an
 * import from three directories up is not.
 *
 * What is deliberately NOT here:
 *   - Prices, names and availability. Those live in the database and reach
 *     both surfaces through /api/catalogue already; putting them here as well
 *     would create a second truth.
 *   - Layout, type scale and spacing. A phone at arm's length and a desktop
 *     page do not want the same numbers, and pretending they do is how a
 *     shared token ends up overridden everywhere it is used.
 * ------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => JSON.parse(readFileSync(join(ROOT, 'shared', name), 'utf8'))

export const shared = {
  brand: read('brand.json'),
  tokens: read('tokens.json'),
  delivery: read('delivery.json'),
  catalogue: read('catalogue.json'),
}

/* Checks the data has to pass before a single file is written from it. Each
   one is here because getting it wrong is silent: a duplicate id shadows a
   listing, a sort that restarts per category drops a pantry item among the
   smoked fish, a missing translation renders blank in one language only, and
   a photograph nobody filed leaves a grey rectangle on two surfaces at once. */
export function validate () {
  const errors = []
  const { products, categories, bundles } = shared.catalogue
  const ids = new Set()
  const catIds = new Set(categories.map(c => c.id))

  let previous = 0
  for (const p of products) {
    if (ids.has(p.id)) errors.push(`two listings share the id "${p.id}"`)
    ids.add(p.id)
    if (!catIds.has(p.category_id)) errors.push(`"${p.id}" is in category "${p.category_id}", which does not exist`)
    if (!(p.price_minor > 0)) errors.push(`"${p.id}" has no price`)
    if (p.sort <= previous) errors.push(`"${p.id}" has sort ${p.sort}, which does not follow ${previous} — products are served ordered by sort alone, across every category`)
    previous = p.sort
    for (const l of ['az', 'ru', 'en']) {
      if (!p.translations?.[l]?.name) errors.push(`"${p.id}" has no ${l} name`)
      if (!p.translations?.[l]?.unit_label) errors.push(`"${p.id}" has no ${l} unit`)
    }
    if (!existsSync(join(ROOT, 'shared/products', p.id + '.jpg'))) {
      errors.push(`"${p.id}" has no photograph in shared/products`)
    }
  }

  for (const b of bundles ?? []) {
    for (const item of b.items ?? []) {
      if (!ids.has(item.product_id)) errors.push(`bundle "${b.id}" contains "${item.product_id}", which is not a listing`)
    }
  }

  const zoneIds = new Set()
  for (const z of shared.delivery.zones) {
    if (zoneIds.has(z.id)) errors.push(`two delivery areas share the id "${z.id}"`)
    zoneIds.add(z.id)
    if (!(z.fee?.length === 2) || z.fee[0] > z.fee[1]) errors.push(`delivery area "${z.id}" has a fee that is not a [low, high] pair`)
    for (const l of ['az', 'ru', 'en']) if (!z[l]) errors.push(`delivery area "${z.id}" has no ${l} name`)
  }

  if (errors.length) {
    throw new Error('shared/ will not generate:\n\n  ' + errors.join('\n  ') + '\n')
  }
}

const banner = (source, comment = '//') => {
  const lines = [
    'Generated from ' + source + ' — do not edit.',
    '',
    'Change the source and run `npm run sync` at the repository root. Editing',
    'this file directly makes the website and the app disagree, which is the',
    'one thing this arrangement exists to prevent; `npm run check` catches it.',
  ]
  if (comment === '/*') return '/*\n' + lines.map(l => ' * ' + l).join('\n').replace(/ +$/gm, '') + '\n */\n'
  return lines.map(l => (l ? comment + ' ' + l : comment)).join('\n') + '\n'
}

const colours = () => Object.entries(shared.tokens.colour)

/** Prose out of a JSON string, wrapped so a generated comment stays readable. */
const wrap = (text, width = 74) => {
  const out = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > width) { out.push(line); line = word }
    else line = line ? line + ' ' + word : word
  }
  if (line) out.push(line)
  return out
}

/* ---------- the generated files ------------------------------------------ */

export const FILES = [
  {
    path: 'web/src/styles/tokens.css',
    build: () => {
      const rows = colours().map(([, c]) => {
        const pad = ' '.repeat(Math.max(1, 14 - c.css.length))
        const line = `  ${c.css}:${pad}${c.value};`
        if (!c.note) return line
        const w = wrap(c.note, 70)
        return w.map((l, i) => (i === 0 ? '  /* ' : '     ') + l).join('\n') + ' */\n' + line
      })
      return banner('shared/tokens.json', '/*') +
        '\n:root{\n' + rows.join('\n') + '\n}\n'
    },
  },

  {
    path: 'app/theme/palette.ts',
    build: () => {
      const rows = colours().map(([, c]) => {
        const line = `  ${c.app}: '${c.value}',`
        return c.note ? wrap(c.note, 70).map(l => '  // ' + l).join('\n') + '\n' + line : line
      })
      return banner('shared/tokens.json') +
        '\nexport const color = {\n' + rows.join('\n') + '\n} as const\n' +
        '\nexport type ColorName = keyof typeof color\n'
    },
  },

  {
    path: 'web/src/data/brand.js',
    build: () => {
      const b = shared.brand
      return banner('shared/brand.json') +
        '\nexport const CONTACT = ' + JSON.stringify({
          name: b.name, phone: b.phone, phoneDisplay: b.phoneDisplay,
          whatsapp: b.whatsapp, instagram: b.instagram,
          hours: b.hours, city: b.city,
        }, null, 2).replace(/"([A-Za-z]\w*)":/g, '$1:').replace(/"/g, "'") + '\n' +
        '\n/* Where the map opens before a pin exists. */\n' +
        `export const MAP_CENTRE = { lat: ${b.mapCentre.lat}, lng: ${b.mapCentre.lng}, zoom: ${b.mapCentre.zoom} }\n` +
        '\nexport const mapsUrl = () =>\n' +
        '  `https://www.google.com/maps/@${MAP_CENTRE.lat},${MAP_CENTRE.lng},${MAP_CENTRE.zoom}z`\n'
    },
  },

  {
    path: 'app/lib/brand.ts',
    build: () => {
      const b = shared.brand
      const l = (o) => `{ az: '${o.az}', ru: '${o.ru}', en: '${o.en}' }`
      return banner('shared/brand.json') +
        '\nexport const CONTACT = {\n' +
        `  name: '${b.name}',\n  phone: '${b.phone}',\n  phoneDisplay: '${b.phoneDisplay}',\n` +
        `  whatsapp: '${b.whatsapp}',\n  instagram: '${b.instagram}',\n` +
        `  hours: ${l(b.hours)},\n  city: ${l(b.city)},\n} as const\n` +
        '\n/* Where the map opens before a pin exists. */\n' +
        `export const MAP_CENTRE = { lat: ${b.mapCentre.lat}, lng: ${b.mapCentre.lng}, zoom: ${b.mapCentre.zoom} } as const\n` +
        '\nexport const mapsUrl = () =>\n' +
        '  `https://www.google.com/maps/@${MAP_CENTRE.lat},${MAP_CENTRE.lng},${MAP_CENTRE.zoom}z`\n'
    },
  },

  {
    path: 'web/src/data/delivery.js',
    build: () => {
      const rows = shared.delivery.zones.map(z =>
        `  { id: '${z.id}', fee: [${z.fee[0]}, ${z.fee[1]}], az: '${z.az}', ru: '${z.ru}', en: '${z.en}' },`)
      return banner('shared/delivery.json') + `
import { reactive } from 'vue'

/* ${wrap(shared.delivery._fee, 72).join('\n   ')}

   ${wrap(shared.delivery._order, 72).join('\n   ')}

   Like the catalogue, this is the bundled copy rather than the last word: when
   the Zonalar tab carries real numbers, the fee the API quotes for a zone_id
   wins over anything written here.

   ${wrap(shared.delivery._names, 72).join('\n   ')} */

export const ZONES = reactive([
${rows.join('\n')}
])

export const zoneById = id => ZONES.find(z => z.id === id) || null

/* '5' for a flat fee, '15–20' for a range. An en dash, not a hyphen: this is a
   span of numbers, not a compound word. */
export const feeText = zone =>
  !zone ? '' : zone.fee[0] === zone.fee[1] ? \`\${zone.fee[0]}\` : \`\${zone.fee[0]}–\${zone.fee[1]}\`
`
    },
  },

  {
    path: 'app/lib/zones.ts',
    build: () => {
      const rows = shared.delivery.zones.map(z =>
        `  { id: '${z.id}', fee: [${z.fee[0]}, ${z.fee[1]}], az: '${z.az}', ru: '${z.ru}', en: '${z.en}' },`)
      return banner('shared/delivery.json') + `
/* ${wrap(shared.delivery._fee, 72).join('\n   ')}

   ${wrap(shared.delivery._order, 72).join('\n   ')}

   The server is still the authority: /api/catalogue returns the real zones and
   a single fee_minor each, and that is what an order is priced on. This list
   is what the picker shows before the network answers, and the only place a
   RANGE can be told to a customer honestly — the server's one integer cannot
   say '20–25'.

   ${wrap(shared.delivery._names, 72).join('\n   ')} */

export type SharedZone = {
  id: string
  /** [low, high] in whole manats. Equal ends mean a flat fee. */
  fee: readonly [number, number]
  az: string
  ru: string
  en: string
}

export const ZONES: readonly SharedZone[] = [
${rows.join('\n')}
] as const

export const zoneById = (id: string | null | undefined): SharedZone | null =>
  ZONES.find(z => z.id === id) ?? null

/** '5' for a flat fee, '15–20' for a range. An en dash: a span, not a compound. */
export const feeText = (zone: SharedZone | null | undefined): string =>
  !zone ? '' : zone.fee[0] === zone.fee[1] ? String(zone.fee[0]) : \`\${zone.fee[0]}–\${zone.fee[1]}\`

export const isRange = (zone: SharedZone | null | undefined): boolean =>
  Boolean(zone && zone.fee[0] !== zone.fee[1])
`
    },
  },

  {
    path: 'web/src/data/catalogue.generated.js',
    build: () => {
      const { categories, products, bundles } = shared.catalogue
      const count = id => products.filter(p => p.category_id === id).length
      const pad = n => String(n).padStart(2, '0')
      const q = str => "'" + String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"

      const cats = [
        `  { id: 'all', en: 'Everything', az: 'Hamısı', ru: 'Всё', kicker: '${pad(products.length)}' },`,
        ...categories.map(c =>
          `  { id: ${q(c.id)}, en: ${q(c.names.en)}, az: ${q(c.names.az)}, ru: ${q(c.names.ru)}, kicker: '${pad(count(c.id))}' },`),
      ]

      const prods = products.map(p => {
        const t = p.translations
        const unit = `{ en: ${q(t.en.unit_label)}, az: ${q(t.az.unit_label)}, ru: ${q(t.ru.unit_label)}, kind: ${q(p.unit_kind)}, qty: ${p.unit_qty} }`
        return `  { id: ${q(p.id)}, cat: ${q(p.category_id)}, price: ${p.price_minor / 100}, unit: ${unit},\n` +
          `    en: ${q(t.en.name)}, az: ${q(t.az.name)}, ru: ${q(t.ru.name)}${p.is_popular ? ', popular: true' : ''},\n` +
          `    den: ${q(t.en.description)},\n    daz: ${q(t.az.description)},\n    dru: ${q(t.ru.description)} },`
      })

      const sets = bundles.map(b => {
        const t = b.translations
        const items = b.items.map(i => q(i.product_id)).join(', ')
        const qty = b.items.some(i => i.qty !== 1)
          ? `, qty: { ${b.items.map(i => `${q(i.product_id)}: ${i.qty}`).join(', ')} }` : ''
        return `  { id: ${q(b.id)}, off: ${b.discount_percent}, items: [${items}]${qty},\n` +
          `    en: ${q(t.en.name)}, az: ${q(t.az.name)}, ru: ${q(t.ru.name)},\n` +
          `    den: ${q(t.en.description)},\n    daz: ${q(t.az.description)},\n    dru: ${q(t.ru.description)} },`
      })

      return banner('shared/catalogue.json') + `
/* The bundled catalogue: what renders on first paint and what a customer with
   no signal sees. It is a FALLBACK — the database is the authority, and
   loadCatalogue() in catalogue.js replaces all of this the moment
   /api/catalogue answers. The same file seeds that database and feeds the
   app's own offline copy, so a listing written once reaches all three. */

export const CATEGORIES = [
${cats.join('\n')}
]

export const PRODUCTS = [
${prods.join('\n')}
]

/* Bundles sold at a discount to the sum of their parts. \`off\` is the
   percentage taken off that sum. */
export const SETS = [
${sets.join('\n')}
]
`
    },
  },

  {
    path: 'app/lib/fallbackCatalogue.ts',
    build: () => {
      const { categories, products } = shared.catalogue
      const q = str => "'" + String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
      const map = (a, b, c) => `{ az: ${q(a)}, ru: ${q(b)}, en: ${q(c)} }`

      const cats = categories.map(c =>
        `  { id: ${q(c.id)}, name: ${map(c.names.az, c.names.ru, c.names.en)} },`)

      const prods = products.map(p => {
        const t = p.translations
        return `  {\n    id: ${q(p.id)}, category_id: ${q(p.category_id)}, price_minor: ${p.price_minor}, currency: 'AZN',\n` +
          `    unit_kind: ${q(p.unit_kind)}, unit_qty: ${p.unit_qty}, is_weight_based: ${p.unit_kind !== 'pc'}, is_popular: ${Boolean(p.is_popular)}, image: null,\n` +
          `    name: ${map(t.az.name, t.ru.name, t.en.name)},\n` +
          `    unit_label: ${map(t.az.unit_label, t.ru.unit_label, t.en.unit_label)},\n` +
          `    description: ${map(t.az.description, t.ru.description, t.en.description)},\n  },`
      })

      const zones = shared.delivery.zones.map(z =>
        `  { id: ${q(z.id)}, name: ${map(z.az, z.ru, z.en)}, fee_minor: ${z.fee[0] * 100}, min_order_minor: 0 },`)

      return banner('shared/catalogue.json and shared/delivery.json') + `
import type { CatalogueResponse } from './api'

/* What the shop looks like before the network has ever answered.
 *
 * The app used to have nothing here: a first run with no signal — on a plane,
 * in a lift, on a new phone in a shop with bad reception — showed an empty
 * catalogue and no way to tell that it was empty for the wrong reason. This is
 * the same bundled copy the website carries, generated from the same file.
 *
 * It is a FALLBACK. The moment /api/catalogue answers, every figure here is
 * replaced and the result cached; an order is priced by the server regardless,
 * so a stale line costs a corrected total rather than a wrong bill.
 *
 * The zone fees are the LOW end of each area's range — the app shows a range
 * from lib/zones.ts where it can, and this field has room for one number only.
 */
export const FALLBACK_CATALOGUE: CatalogueResponse = {
  currency: 'AZN',
  delivery: { open: '10:00', close: '22:00', lead_days: 1, weight_tolerance_percent: 10, code_ttl_minutes: 10 },

  categories: [
${cats.join('\n')}
  ],

  products: [
${prods.join('\n')}
  ],

  zones: [
${zones.join('\n')}
  ],
}
`
    },
  },
]
