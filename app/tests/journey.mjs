/**
 * The customer journey, end to end, against a real API.
 *
 * Browse -> basket -> sign in -> profile -> address -> order, in a 390px
 * viewport. It drives the built app in a real browser rather than mocking the
 * network, which is the only way to catch the class of bug that unit tests
 * cannot see: a cached response coming back the wrong shape, a public endpoint
 * answering in the wrong language, a token landing somewhere it should not.
 *
 * Needs three things running:
 *   1. the API            cd backend && php artisan serve
 *   2. MAIL_MAILER=log    so the sign-in code can be read back
 *   3. the built app      npm run build && (cd dist && python3 -m http.server 8080)
 *
 * Then:  npm run journey
 */

import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const LOG = '/home/user/freshnesstoyourhome/backend/storage/logs/laravel.log'
const APP = 'http://127.0.0.1:8080/'
// A fresh customer each run, so the journey always starts from registration
// rather than from whatever state a previous run left behind.
const EMAIL = `e2e.${Date.now()}@example.com`

/** Read the most recent sign-in code out of the mail log. */
function latestCode () {
  if (!existsSync(LOG)) return null
  const txt = readFileSync(LOG, 'utf8')
  // The markdown mail renders the code as a heading inside the panel.
  const all = [...txt.matchAll(/^\s*#\s*(\d{6})\s*$/gm)].map(m => m[1])
  return all.length ? all[all.length - 1] : null
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },      // iPhone 14 Pro
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()

const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))


/** In-app navigation. A full reload would end the web session by design. */
async function go (page, hash) {
  await page.evaluate(h => { window.location.hash = h }, hash)
  await page.waitForTimeout(700)
}

const step = async (name, fn) => {
  try { await fn(); console.log('  ok   ' + name) }
  catch (e) { console.log('  FAIL ' + name + ' :: ' + e.message.split('\n')[0]); throw e }
}

console.log('\n— browse —')
await page.goto(APP, { waitUntil: 'networkidle' })

await step('shop renders products from the API', async () => {
  await page.waitForSelector('.card', { timeout: 10000 })
  const n = await page.locator('.card').count()
  if (n < 10) throw new Error('only ' + n + ' cards')
  console.log('       ' + n + ' product cards')
})

await step('azerbaijani is the default language', async () => {
  const txt = await page.locator('.chip').first().textContent()
  if (!txt.includes('Hamısı')) throw new Error('first chip is ' + txt)
})

await step('the schwa renders in the real face', async () => {
  const f = await page.locator('.card__name').first().evaluate(el =>
    getComputedStyle(el).fontFamily)
  if (!/Cormorant/.test(f)) throw new Error('font is ' + f)
})

await step('weighed goods are flagged per-kg', async () => {
  const n = await page.locator('.card__flag').count()
  if (n === 0) throw new Error('no per-kg flags')
  console.log('       ' + n + ' weighed lines flagged')
})

await page.screenshot({ path: (process.env.SHOTS ?? '/tmp') + '/shot-shop.png' })

console.log('\n— basket —')
await step('adding a weighed item steps in half-kilos', async () => {
  await page.locator('.card').first().locator('.add').click()
  await page.waitForSelector('.stepper')
  const q = await page.locator('.card').first().locator('.stepper span').textContent()
  if (q.trim() !== '0.5 kg') throw new Error('qty shows ' + q)
})

await step('the running basket bar appears', async () => {
  await page.waitForSelector('.shop__bar', { timeout: 4000 })
})

await step('basket is priced by the server', async () => {
  await page.locator('.shop__bar').click()
  await page.waitForURL(u => u.hash.startsWith('#/basket'))
  await page.waitForSelector('.row__total', { timeout: 8000 })
  const total = await page.locator('.row__total').last().textContent()
  console.log('       total: ' + total.trim())
  if (!/AZN/.test(total)) throw new Error('no total rendered')
})

await step('a weighed basket shows an estimate and a ceiling', async () => {
  const note = await page.locator('.basket__weighed').textContent()
  if (!/\d/.test(note)) throw new Error('no ceiling shown')
  console.log('       ' + note.trim().slice(0, 90).replace(/\s+/g, ' '))
})

await step('the basket lists items in the app language', async () => {
  const name = await page.locator('.basket__name').first().textContent()
  if (!/[əğışçöü]/i.test(name)) throw new Error('basket not in Azerbaijani: ' + name)
  console.log('       ' + name.trim())
})

await page.screenshot({ path: (process.env.SHOTS ?? '/tmp') + '/shot-basket.png' })

console.log('\n— sign in —')
await step('checkout sends an anonymous customer to sign in', async () => {
  await page.locator('button:has-text("Sifarişi tamamla")').click()
  await page.waitForURL(u => u.hash.startsWith('#/sign-in'), { timeout: 5000 })
})

await step('requesting a code', async () => {
  await page.fill('input[type=email]', EMAIL)
  await page.locator('button:has-text("Kodu göndər")').click()
  await page.waitForSelector('.signin__code', { timeout: 8000 })
})

await page.screenshot({ path: (process.env.SHOTS ?? '/tmp') + '/shot-signin.png' })

let code
await step('the code arrives by email', async () => {
  for (let i = 0; i < 20 && !code; i++) {
    code = latestCode()
    if (!code) await page.waitForTimeout(300)
  }
  if (!code) throw new Error('no code in the mail log')
  console.log('       code: ' + code)
})

await step('a wrong code is refused', async () => {
  await page.fill('.signin__code', '000000')
  await page.locator('button:has-text("Daxil ol")').click()
  await page.waitForSelector('.field__error', { timeout: 6000 })
})

await step('the right code signs in', async () => {
  await page.fill('.signin__code', code)
  await page.locator('button:has-text("Daxil ol")').click()
  await page.waitForURL(u => !u.hash.includes('sign-in'), { timeout: 8000 })
  console.log('       landed on ' + new URL(page.url()).hash)
})

await step('the token is not in localStorage', async () => {
  const keys = await page.evaluate(() => Object.keys(localStorage))
  const leaked = keys.filter(k => /token|auth/i.test(k))
  if (leaked.length) throw new Error('token in localStorage: ' + leaked.join(','))
  console.log('       localStorage keys: ' + (keys.join(',') || '(none)'))
})

console.log('\n— profile —')
await step('checkout refuses until a name and phone are on file', async () => {
  await go(page, '#/checkout')
  await page.waitForSelector('.note--warn', { timeout: 6000 })
  const t = await page.locator('.note--warn').first().textContent()
  if (!/ad və telefon/i.test(t)) throw new Error('wrong warning: ' + t)
})

await step('saving a name and phone', async () => {
  await go(page, '#/profile')
  await page.waitForSelector('input[autocomplete=name]')
  await page.fill('input[autocomplete=name]', 'Rəşad Məmmədov')
  await page.fill('input[type=tel]', '+994 50 123 45 67')
  await page.locator('button:has-text("Yadda saxla")').click()
  await page.waitForTimeout(1200)
})

console.log('\n— address + order —')
await step('adding a delivery address', async () => {
  await go(page, '#/profile/addresses')
  await page.locator('button:has-text("Ünvan əlavə et")').click()
  await page.waitForSelector('input[autocomplete="street-address"]')
  await page.fill('input[autocomplete="street-address"]', 'Nizami küçəsi 28, mənzil 14')
  await page.locator('button:has-text("Yadda saxla")').click()
  await page.waitForSelector('.addr', { timeout: 8000 })
})

await step('placing the order', async () => {
  await go(page, '#/checkout')
  await page.waitForSelector('.option.is-on', { timeout: 8000 })
  const btn = page.locator('button:has-text("Sifarişi təsdiqlə")')
  await btn.waitFor({ timeout: 6000 })
  if (await btn.isDisabled()) throw new Error('confirm button disabled')
  await btn.click()
  await page.waitForURL(u => /^#\/\orders\//.test(u.hash), { timeout: 12000 })
  console.log('       ' + new URL(page.url()).hash)
})

await step('the order screen shows a code and a status track', async () => {
  await page.waitForSelector('.track__step', { timeout: 6000 })
  const code = await page.locator('.topbar__title').textContent()
  if (!/^FR-/.test(code.trim())) throw new Error('order code is ' + code)
  console.log('       order ' + code.trim())
})

await page.screenshot({ path: (process.env.SHOTS ?? '/tmp') + '/shot-order.png' })

console.log('\n— language —')
await step('switching to Russian changes product names', async () => {
  await go(page, '#/profile')
  await page.locator('.chip:has-text("RU")').click()
  await page.waitForTimeout(600)
  await go(page, '#/shop')
  await page.waitForSelector('.card__name')
  const name = await page.locator('.card__name').first().textContent()
  if (!/[А-Яа-я]/.test(name)) throw new Error('still not Russian: ' + name)
  console.log('       ' + name.trim())
})

await step('no horizontal overflow at 390px', async () => {
  const w = await page.evaluate(() => document.documentElement.scrollWidth)
  if (w > 390) throw new Error('scrollWidth ' + w)
})

console.log('\nconsole errors: ' + (errors.length ? errors.join(' | ') : 'none'))
await browser.close()
console.log('\nALL STEPS PASSED')
