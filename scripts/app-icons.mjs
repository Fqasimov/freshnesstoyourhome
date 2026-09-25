// Writes app/components/icons.generated.ts from the website's Bootstrap Icons.
// Run from the repository root after `npm ci` in web/: node scripts/app-icons.mjs
import fs from 'node:fs'
const dir = new URL('../web/node_modules/bootstrap-icons/icons/', import.meta.url).pathname
const names = ['grid','grid-fill','basket3','basket3-fill','receipt','receipt-cutoff','person','person-fill','person-circle','search','geo-alt','geo-alt-fill','chevron-left','chevron-right','chevron-down','x-lg','x-circle-fill','eye','eye-slash','check-lg','check-circle-fill','circle','envelope','envelope-check','lock','shield-lock','calendar3','calendar-event','box-arrow-right','trash3','google','apple','arrow-right','arrow-left','plus-lg','dash-lg','sliders','sort-down','arrow-down-up','snow','clock','truck','star-fill','fire','globe2','file-earmark-text','telephone','pencil','arrow-clockwise','heart','shop','headset','whatsapp','info-circle','person-check','stars','bag','bag-check','house','exclamation-circle','key','egg-fried','cup-hot','basket','tag','percent','lightning-charge-fill','patch-check-fill','box-seam','shield-check','three-dots']
const out = {}
for (const n of names) {
  const f = dir + n + '.svg'
  if (!fs.existsSync(f)) { console.error('missing', n); continue }
  const svg = fs.readFileSync(f, 'utf8')
  const paths = [...svg.matchAll(/<path([^>]*)\/>/g)].map(m => {
    const d = m[1].match(/ d="([^"]+)"/)[1]
    const rule = /fill-rule="evenodd"/.test(m[1]) ? 1 : 0
    return rule ? [d, 1] : [d]
  })
  if (/<(circle|rect|ellipse)/.test(svg)) console.error('non-path in', n)
  out[n] = paths
}
const body = `// Generated from bootstrap-icons (the website's icon set) — the path data of
// the icons the app uses. To add one, add its name to the list in
// scripts/app-icons.mjs and run it again (node scripts/app-icons.mjs).
/* eslint-disable */
export const ICONS = ${JSON.stringify(out, null, 0).replace(/\],"/g, '],\n  "')} as const satisfies Record<string, ReadonlyArray<readonly [string] | readonly [string, 1]>>
`
fs.writeFileSync(new URL('../app/components/icons.generated.ts', import.meta.url), body)
console.log(Object.keys(out).length)
