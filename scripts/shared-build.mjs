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
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => JSON.parse(readFileSync(join(ROOT, 'shared', name), 'utf8'))

export const shared = {
  brand: read('brand.json'),
  tokens: read('tokens.json'),
  delivery: read('delivery.json'),
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
]
