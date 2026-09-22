/**
 * The customer journey, end to end, against a real API.
 *
 * Browse -> basket -> sign in -> profile -> address -> order, in a 390px
 * viewport. It drives the exported web build in a real browser rather than
 * mocking the network, which is the only way to catch the class of bug unit
 * tests cannot see: a cached response coming back the wrong shape, a public
 * endpoint answering in the wrong language, a token landing somewhere it
 * should not.
 *
 * React Native Web renders plain divs with generated class names, so every
 * assertion here is by visible text — which is also what a customer sees.
 *
 * Needs three things running:
 *   1. the API            cd backend && php artisan serve
 *   2. MAIL_MAILER=log    so the sign-in code can be read back
 *   3. the exported app   npx expo export --platform web
 *                         (cd dist && python3 -m http.server 8090)
 *
 * Then:  npm run journey
 */
import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'node:fs'

const LOG = process.env.LARAVEL_LOG
  ?? '/home/user/freshnesstoyourhome/backend/storage/logs/laravel.log'
const APP = process.env.APP_URL ?? 'http://127.0.0.1:8090/'
const EMAIL = `expo.${Date.now()}@example.com`

/** Read the most recent sign-in code out of the mail log. */
function latestCode () {
  if (!existsSync(LOG)) return null
  const all = [...readFileSync(LOG, 'utf8').matchAll(/^\s*#\s*(\d{6})\s*$/gm)].map(m => m[1])
  return all.at(-1) ?? null
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()

const errors = []
page.on('pageerror', e => errors.push(e.message))

let failed = 0
const step = async (name, fn) => {
  try { await fn(); console.log('  ok   ' + name) }
  catch (e) { failed++; console.log('  FAIL ' + name + ' :: ' + e.message.split('\n')[0]); throw e }
}

/**
 * Tap a button by its label.
 *
 * Two things make this fiddly, and both come from how the app really renders.
 *
 * It targets the <button> React Native Web emits, not the text node inside it:
 * a plain getByText can resolve to a large ancestor container whose text
 * happens to include the label, and clicking its centre lands on background —
 * the tap silently does nothing and the failure surfaces several steps later.
 *
 * And it only considers VISIBLE buttons. A stack navigator keeps earlier
 * screens mounted, so the same label often exists on a screen underneath the
 * one on show.
 */
const tapText = async (text) => {
  const button = page.locator('button:visible').filter({ hasText: text }).first()
  if (await button.count()) { await button.click(); return }
  await page.getByText(text, { exact: false }).locator('visible=true').first().click()
}

/**
 * Move between tabs the way a customer does.
 *
 * Never page.goto() after signing in: on web the token is held in memory only
 * — by design, because a browser has no keychain — so a reload ends the
 * session and the rest of the journey would run signed out.
 */
const tab = async (label) => {
  // React Navigation renders the bottom tabs as anchors on web, not buttons.
  // (role=tab is no good either — the category chips carry it too.)
  const link = page.locator('a:visible').filter({ hasText: label }).last()
  if (await link.count()) await link.click()
  else await page.locator('button:visible').filter({ hasText: label }).last().click()
  await page.waitForTimeout(1800)
}

/**
 * The app bar's back chevron.
 *
 * Not page.goBack(): that is a real browser navigation, which reloads the page
 * and ends the in-memory web session.
 */
const back = async () => {
  await page.locator('button:visible[aria-label="Back"]').first().click()
  await page.waitForTimeout(1600)
}

const shot = n => page.screenshot({ path: (process.env.SHOTS ?? '/tmp') + `/expo-${n}.png` })

console.log('\n— browse —')
await page.goto(APP, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

await step('the shop renders the catalogue from the API', async () => {
  await page.getByText('Hisə verilmiş qızıl balıq').first().waitFor({ timeout: 15000 })
  const prices = await page.getByText(/AZN/).count()
  if (prices < 5) throw new Error('only ' + prices + ' prices rendered')
  console.log('       ' + prices + ' priced items on screen')
})

await step('Azerbaijani is the default language', async () => {
  await page.getByText('Hamısı').first().waitFor({ timeout: 5000 })
})

await step('the schwa renders in Cormorant, not a fallback', async () => {
  const family = await page.getByText('Hisə verilmiş qızıl balıq').first()
    .evaluate(el => getComputedStyle(el).fontFamily)
  if (!/Cormorant/i.test(family)) throw new Error('font is ' + family)
})

await step('weighed goods are flagged per-kg', async () => {
  const n = await page.getByText('KQ-A GÖRƏ').count()
  if (n === 0) throw new Error('no per-kg flags')
  console.log('       ' + n + ' weighed lines flagged')
})

await shot('1-shop')

console.log('\n— basket —')
await step('adding a weighed item steps in half-kilos', async () => {
  await page.getByText('+', { exact: true }).first().click()
  await page.getByText('0.5 kg').first().waitFor({ timeout: 6000 })
})

await step('the basket is priced by the server', async () => {
  await tab('Səbət')
  await page.getByText('Cəmi').first().waitFor({ timeout: 10000 })
  const body = await page.evaluate(() => document.body.innerText)
  const m = body.match(/32[.,]50 AZN/)
  if (!m) throw new Error('expected 32.50 AZN, got: ' + body.slice(0, 200).replace(/\n/g, ' | '))
  console.log('       total 32.50 AZN (0.5 kg x 65.00)')
})

await step('a weighed basket shows a ceiling as well as an estimate', async () => {
  const body = await page.evaluate(() => document.body.innerText)
  if (!/35[.,]75 AZN/.test(body)) throw new Error('no +10% ceiling shown')
  console.log('       ceiling 35.75 AZN')
})

await step('the basket lists items in the app language', async () => {
  const body = await page.evaluate(() => document.body.innerText)
  if (!/Hisə verilmiş qızıl balıq/.test(body)) throw new Error('basket is not in Azerbaijani')
})

await shot('2-basket')

console.log('\n— sign in —')
await step('checkout sends an anonymous customer to sign in', async () => {
  await tapText('Sifarişi tamamla')
  await page.waitForURL(u => u.pathname.includes('sign-in'), { timeout: 8000 })
})

await step('requesting a code', async () => {
  await page.getByPlaceholder('ad@example.com').fill(EMAIL)
  await tapText('Kodu göndər')
  await page.getByText('Kodu yazın').waitFor({ timeout: 10000 })
})

await shot('3-code')

let code
await step('the code arrives by email', async () => {
  for (let i = 0; i < 25 && !code; i++) {
    code = latestCode()
    if (!code) await page.waitForTimeout(300)
  }
  if (!code) throw new Error('no code in the mail log')
  console.log('       code ' + code)
})

await step('a wrong code is refused', async () => {
  await page.getByPlaceholder('000000').fill('000000')
  await tapText('Daxil ol')
  await page.waitForTimeout(1800)
  const body = await page.evaluate(() => document.body.innerText)
  if (!/kod düzgün deyil/i.test(body)) throw new Error('no rejection shown')
})

await step('the right code signs in', async () => {
  await page.getByPlaceholder('000000').fill(code)
  await tapText('Daxil ol')
  await page.waitForURL(u => !u.pathname.includes('sign-in'), { timeout: 12000 })
  console.log('       landed on ' + new URL(page.url()).pathname)
})

await step('the token is not in localStorage', async () => {
  const keys = await page.evaluate(() => Object.keys(localStorage))
  const leaked = keys.filter(k => /token|auth/i.test(k))
  if (leaked.length) throw new Error('token in localStorage: ' + leaked.join(','))
  console.log('       localStorage: ' + (keys.join(', ') || '(none)'))
})

console.log('\n— profile —')
await step('checkout refuses until a name and phone are on file', async () => {
  // Sign-in lands on /checkout, which is a stack screen outside the tabs, so
  // there is no tab bar here — the way through is the button checkout itself
  // offers when the profile is incomplete.
  await page.waitForTimeout(2500)
  const body = await page.evaluate(() => document.body.innerText)
  if (!/ad və telefon/i.test(body)) throw new Error('no incomplete-profile warning')
})

await step('saving a name and phone', async () => {
  await tapText('Profil')
  await page.waitForTimeout(2200)
  const inputs = page.locator('input:visible')
  await inputs.nth(0).fill('Rəşad Məmmədov')
  await inputs.nth(1).fill('+994 50 123 45 67')
  await tapText('Yadda saxla')
  await page.waitForTimeout(2000)
})

console.log('\n— address + order —')
await step('adding a delivery address', async () => {
  await tapText('Ünvanlarım')
  await page.waitForTimeout(1800)
  await tapText('Ünvan əlavə et')
  await page.waitForTimeout(1200)
  // Ad, Küçə, Qeyd, Xəritə linki, Ərazi axtarışı — in that order.
  const inputs = page.locator('input:visible')
  await inputs.nth(1).fill('Nizami küçəsi 28, mənzil 14')
  await inputs.nth(3).fill('https://maps.app.goo.gl/JourneyTestPin')
  await tapText('Yadda saxla')
  await page.waitForTimeout(2500)
})

/* The shop covers fifty-one areas and charges a range for two thirds of them.
   Both facts come from shared/delivery.json, which the website reads too, so
   this is the app's half of a promise made in one place. */
await step('the area picker offers every area, with its fee', async () => {
  await tapText('Ünvan əlavə et')
  await page.waitForTimeout(1200)

  const body = await page.evaluate(() => document.body.innerText)
  const fees = body.match(/\d+(–\d+)? AZN/g) ?? []
  if (fees.length < 40) throw new Error('only ' + fees.length + ' areas offered')
  if (!fees.some(f => /–/.test(f))) throw new Error('no area shows a fee as a range')
  console.log('       ' + fees.length + ' areas, e.g. ' + fees.slice(0, 3).join(', '))
})

await step('searching finds an area by any of its three names', async () => {
  const search = page.locator('input:visible').nth(4)

  await search.fill('shuval')            // the English spelling of Şüvəlan
  await page.waitForTimeout(600)
  const found = await page.evaluate(() => document.body.innerText)
  if (!/Şüvəlan/.test(found)) throw new Error('typing "shuval" did not find Şüvəlan')
  if (!/20–25 AZN/.test(found)) throw new Error('Şüvəlan is not shown as 20–25')
  if (!/məsafədən asılıdır|zavisit|depends on the distance/i.test(found)) {
    // Only after it is chosen; selecting it is what the note is attached to.
    await page.getByText('Şüvəlan', { exact: false }).locator('visible=true').first().click()
    await page.waitForTimeout(400)
    const picked = await page.evaluate(() => document.body.innerText)
    if (!/məsafədən asılıdır/.test(picked)) throw new Error('no range warning on a range area')
  }

  await search.fill('qqqq')
  await page.waitForTimeout(500)
  const none = await page.evaluate(() => document.body.innerText)
  if (!/Belə ərazi tapılmadı/.test(none)) throw new Error('no "nothing found" note')

  await tapText('İmtina')
  await page.waitForTimeout(800)
})

await step('placing the order', async () => {
  // Addresses is a stack screen with no tab bar, so step back into the tabs
  // before switching to the basket.
  await back()
  await tab('Səbət')
  await tapText('Sifarişi tamamla')
  await page.waitForTimeout(3000)
  await tapText('Sifarişi təsdiqlə')
  await page.waitForURL(u => /\/orders\//.test(u.pathname), { timeout: 15000 })
  console.log('       ' + new URL(page.url()).pathname)
})

await step('the order screen shows a code and a status track', async () => {
  await page.waitForTimeout(2000)
  const body = await page.evaluate(() => document.body.innerText)
  const m = body.match(/FR-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}/)
  if (!m) throw new Error('no order code on screen')
  if (!/Qəbul edildi/.test(body)) throw new Error('no status track')
  console.log('       order ' + m[0])
})

await shot('4-order')

console.log('\n— language —')
await step('switching to Russian changes product names', async () => {
  // The order screen is a stack screen with no tab bar.
  // The order screen is a stack screen with no tab bar.
  await back()
  await tab('Profil')
  await page.getByText('RU', { exact: true }).first().click()
  await page.waitForTimeout(1800)

  // The tab bar itself must switch too — "Mağaza" becomes "Магазин". If it
  // did not, the language change never reached the navigator.
  const tabsInRussian = await page.locator('a:visible').filter({ hasText: 'Магазин' }).count()
  if (!tabsInRussian) throw new Error('the tab bar is still in Azerbaijani')

  await tab('Магазин')
  await page.waitForTimeout(1500)
  const body = await page.evaluate(() => document.body.innerText)
  if (!/[А-Яа-я]/.test(body)) throw new Error('product names are still not Russian')
  console.log('       ' + (body.match(/Лосось[^\n]*/) ?? ['(cyrillic present)'])[0])
})

await shot('5-shop-ru')

console.log('\nuncaught page errors: ' + (errors.length ? errors.join(' | ') : 'none'))
await browser.close()

console.log(failed === 0 ? '\nALL STEPS PASSED' : `\n${failed} STEP(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
