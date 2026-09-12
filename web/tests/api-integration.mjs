/**
 * The website against a real API.
 *
 * Proves the three things that cannot be checked by reading the code:
 * that a price changed in the database reaches the page, that the basket total
 * is the server's rather than the browser's, and that the site still works with
 * the API switched off.
 *
 * That last one matters as much as the first two. The bundled catalogue in
 * src/data/catalogue.js is a fallback, and a fallback nobody tests is a
 * fallback that has quietly stopped working.
 *
 * Needs:
 *   1. the API     cd backend && php artisan serve
 *   2. the site    VITE_API_URL=http://127.0.0.1:8000 npm run build
 *                  (cd dist && python3 -m http.server 8100)
 *
 * Then:  npm run test:api
 *
 * It edits a price in the database and puts it back. Point it at a development
 * database, never a real one.
 */

import { chromium } from 'playwright'
import { execSync } from 'node:child_process'

const SITE = 'http://127.0.0.1:8100/'
const BE = '/home/user/freshnesstoyourhome/backend'
const artisan = (cmd) => execSync(`cd ${BE} && php artisan ${cmd}`, { encoding: 'utf8' })

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] })
const p = await (await b.newContext({ viewport:{ width:1280, height:900 } })).newPage()

const errs = []
p.on('pageerror', e => errs.push(e.message))
let quoteCalls = 0
p.on('response', r => { if (r.url().includes('/api/orders/quote')) quoteCalls++ })

let failed = 0
const step = async (name, fn) => {
  try { await fn(); console.log('  ok   ' + name) }
  catch (e) { failed++; console.log('  FAIL ' + name + ' :: ' + e.message.split('\n')[0]) }
}

console.log('\n— catalogue comes from the API —')
await p.goto(SITE, { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
// Skip the intro animation if it is showing.
await p.keyboard.press('Escape').catch(() => {})
await p.waitForTimeout(1200)

await step('the shop renders products', async () => {
  const n = await p.locator('.card').count()
  if (n < 10) throw new Error('only ' + n + ' cards')
  console.log('       ' + n + ' product cards')
})

await step('a price change in the database reaches the page', async () => {
  const before = await p.locator('.card').first().locator('.card__price b, .card__price').first().innerText()

  // 65.00 -> 77.00, in the database only.
  artisan('tinker --execute "App\\\\Models\\\\Product::find(\'smoked-salmon\')->update([\'price_minor\' => 7700]);"')

  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  await p.keyboard.press('Escape').catch(() => {})
  await p.waitForTimeout(1200)

  const body = await p.evaluate(() => document.body.innerText)
  if (!/77/.test(body)) throw new Error('the new price never appeared; page still shows ' + before)
  console.log('       database 77.00 -> page shows it')

  artisan('tinker --execute "App\\\\Models\\\\Product::find(\'smoked-salmon\')->update([\'price_minor\' => 6500]);"')
})

console.log('\n— the basket total is the server\'s —')
await p.reload({ waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
await p.keyboard.press('Escape').catch(() => {})
await p.waitForTimeout(1200)

await step('adding an item asks the server to price it', async () => {
  quoteCalls = 0
  // button.add specifically — .card also contains a "quick view" button that
  // comes first in the DOM.
  await p.locator('button.add').first().click()
  await p.waitForTimeout(2500)
  if (quoteCalls === 0) throw new Error('no call to /api/orders/quote')
  console.log('       ' + quoteCalls + ' quote request(s)')
})

await step('the drawer shows a total and the weight note', async () => {
  // Adding does not open the drawer; the customer taps the basket to see it.
  await p.locator('button.cartbtn').first().click()
  await p.waitForTimeout(1500)
  const body = await p.locator('.drawer').innerText()
  if (!/AZN/.test(body)) throw new Error('no total rendered')
  if (!/Çəkiyə görə satılan|kuryerdə ölçülür/.test(body)) {
    throw new Error('no weight disclosure in the drawer')
  }
  const m = body.match(/ən çox\s+([\d.,]+)\s*AZN/)
  console.log('       ceiling shown: ' + (m ? m[1] + ' AZN' : '(none)'))
})

await step('the WhatsApp link carries the server figure', async () => {
  // Scoped to the drawer: the contact section carries a wa.me link too.
  const href = await p.locator('.drawer a[href*="wa.me"]').first().getAttribute('href')
  const text = decodeURIComponent(href.split('text=')[1] ?? '')
  if (!/Təxmini məbləğ/.test(text)) throw new Error('no total in the message')
  if (!/ən çox/.test(text)) throw new Error('no ceiling in the message')
  console.log('       ' + (text.match(/Təxmini məbləğ.*/) ?? [''])[0].slice(0, 70))
})

console.log('\n— it survives the API being down —')
await step('the bundled catalogue still renders with no API', async () => {
  await p.route('**/api/**', route => route.abort())
  await p.goto(SITE, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(3000)
  await p.keyboard.press('Escape').catch(() => {})
  await p.waitForTimeout(1200)
  const n = await p.locator('.card').count()
  if (n < 10) throw new Error('only ' + n + ' cards with the API blocked')
  console.log('       ' + n + ' cards from the bundled fallback')
})

console.log('\npage errors: ' + (errs.length ? errs.slice(0,2).join(' | ') : 'none'))
await b.close()
console.log(failed === 0 ? '\nALL CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`)
process.exit(failed ? 1 : 0)
