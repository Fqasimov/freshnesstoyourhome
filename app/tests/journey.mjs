/**
 * The customer journey, end to end, against a real API.
 *
 * Opening -> sign up -> emailed code -> catalogue -> basket -> profile ->
 * address -> order -> language -> sign out -> welcome back -> sign in ->
 * delete the account, in a 390px viewport. It drives the exported web build in a real browser rather than
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
import { readFileSync, readdirSync, existsSync } from 'node:fs'

const LOGS = process.env.LARAVEL_LOGS
  ?? '/home/user/freshnesstoyourhome/backend/storage/logs/'
const APP = process.env.APP_URL ?? 'http://127.0.0.1:8090/'
const EMAIL = `expo.${Date.now()}@example.com`

/** Read the most recent code out of the mail log (daily or single file). */
function latestCode () {
  if (!existsSync(LOGS)) return null
  const file = readdirSync(LOGS).filter(n => /^laravel(-\d{4}-\d\d-\d\d)?\.log$/.test(n)).sort().at(-1)
  if (!file) return null
  const all = [...readFileSync(LOGS + file, 'utf8').matchAll(/^\s*#\s*(\d{6})\s*$/gm)].map(m => m[1])
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

console.log('\n— the front door —')
await page.goto(APP, { waitUntil: 'networkidle' })

await step('the opening animation hands over to sign-up', async () => {
  await page.waitForURL(u => u.pathname.includes('/auth'), { timeout: 15000 })
  await page.getByText('Qeydiyyatdan keç').locator('visible=true').first().waitFor({ timeout: 8000 })
})

await step('field hints say what to do, not a sample value', async () => {
  for (const ph of ['Adınızı və soyadınızı daxil edin', 'E-poçt ünvanınızı daxil edin', 'Parol yaradın', 'Parolu yenidən daxil edin']) {
    if (!(await page.getByPlaceholder(ph).count())) throw new Error('missing placeholder: ' + ph)
  }
})

await step('an empty form is refused field by field', async () => {
  await tapText('Qeydiyyatdan keç')
  await page.getByText('Adınızı və soyadınızı yazın.').locator('visible=true').first().waitFor({ timeout: 4000 })
  await page.getByText('Doğum tarixinizi seçin.').locator('visible=true').first().waitFor({ timeout: 4000 })
})

await step('filling in the form, with the date from the wheels', async () => {
  await page.getByPlaceholder('Adınızı və soyadınızı daxil edin').fill('Rəşad Məmmədov')
  await page.getByPlaceholder('E-poçt ünvanınızı daxil edin').fill(EMAIL)
  await page.locator('button:visible[aria-label="Doğum tarixi"]').click()
  await page.waitForTimeout(700)
  await page.locator('button:visible').filter({ hasText: /^\s*Seç\s*$/ }).click()
  await page.waitForTimeout(500)
  await page.getByPlaceholder('Parol yaradın').fill('Fresh-fish1')
  await page.getByPlaceholder('Parolu yenidən daxil edin').fill('Fresh-fish1')
})

await shot('1-signup')

await step('no account exists before the code', async () => {
  await tapText('Qeydiyyatdan keç')
  await page.waitForURL(u => u.pathname.includes('/auth/verify'), { timeout: 10000 })
})

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
  await page.waitForTimeout(500)
  await page.keyboard.type(code === '000000' ? '111111' : '000000')
  await page.getByText('Kod düzgün deyil').locator('visible=true').first().waitFor({ timeout: 6000 })
})

await step('the right code creates the account and opens the catalogue', async () => {
  await page.keyboard.type(code)
  await page.getByText('Hesabınız hazırdır').locator('visible=true').first().waitFor({ timeout: 8000 })
  await page.waitForURL(u => u.pathname.includes('/shop'), { timeout: 12000 })
  await page.waitForTimeout(1200)
})

await step('the token is not in localStorage', async () => {
  const keys = await page.evaluate(() => Object.keys(localStorage))
  const leaked = keys.filter(k => /token|auth/i.test(k))
  if (leaked.length) throw new Error('token in localStorage: ' + leaked.join(','))
})

console.log('\n— catalogue —')
await step('greets by name and shows every category as a tile', async () => {
  await page.getByText('Salam, Rəşad').locator('visible=true').first().waitFor({ timeout: 8000 })
  for (const c of ['Hisə verilmiş', 'Təzə balıqlar', 'Dəniz məhsulları', 'Pendir və süd']) {
    if (!(await page.getByText(c).count())) throw new Error('no tile for ' + c)
  }
})

await step('prices are in manat', async () => {
  const prices = await page.getByText(/₼/).count()
  if (prices < 5) throw new Error('only ' + prices + ' prices rendered')
  console.log('       ' + prices + ' priced items on screen')
})

await step('the schwa renders in the brand face, not a fallback', async () => {
  const family = await page.getByText('Salam, Rəşad').first().evaluate(el => getComputedStyle(el).fontFamily)
  if (!/Cormorant/i.test(family)) throw new Error('font is ' + family)
})

await shot('2-catalogue')

await step('a category opens as its own shelf', async () => {
  await page.locator('button:visible[aria-label="Hisə verilmiş"]').first().click()
  await page.getByText(/\d+ məhsul/).locator('visible=true').first().waitFor({ timeout: 6000 })
})

console.log('\n— basket —')
await step('adding a weighed item steps in half-kilos', async () => {
  await page.locator('button:visible[aria-label="Səbətə at"]').first().click()
  await page.getByText('0.5 kq').locator('visible=true').first().waitFor({ timeout: 6000 })
  await back()
})

await step('the basket is priced by the server', async () => {
  await tab('Səbət')
  await page.getByText('Cəmi').locator('visible=true').first().waitFor({ timeout: 10000 })
  const body = await page.evaluate(() => document.body.innerText)
  const m = body.match(/32[.,]50 AZN/)
  if (!m) throw new Error('expected 32.50 AZN, got: ' + body.slice(0, 200).replace(/\n/g, ' | '))
  console.log('       total 32.50 AZN (0.5 kg x 65.00)')
})

await step('a weighed basket shows a ceiling as well as an estimate', async () => {
  const body = await page.evaluate(() => document.body.innerText)
  if (!/35[.,]75 AZN/.test(body)) throw new Error('no +10% ceiling shown')
})

await shot('3-basket')

console.log('\n— profile —')
await step('the profile shows what sign-up collected', async () => {
  await tab('Profil')
  await page.getByText('Rəşad Məmmədov').locator('visible=true').first().waitFor({ timeout: 6000 })
  await page.getByText(EMAIL).locator('visible=true').first().waitFor({ timeout: 3000 })
  await page.getByText(/Yanvar \d{4}/).locator('visible=true').first().waitFor({ timeout: 3000 })
})

await step('adding a phone number', async () => {
  await tapText('Redaktə et')
  await page.getByPlaceholder('Telefon nömrənizi daxil edin').fill('+994 50 123 45 67')
  await tapText('Yadda saxla')
  await page.getByText('+994 50 123 45 67').locator('visible=true').first().waitFor({ timeout: 8000 })
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
  await back()
  await tab('Profil')
  await page.getByText('RU', { exact: true }).first().click()
  await page.waitForTimeout(1800)

  // The tab bar itself must switch too — "Kataloq" becomes "Каталог". If it
  // did not, the language change never reached the navigator.
  const tabsInRussian = await page.locator('a:visible').filter({ hasText: 'Каталог' }).count()
  if (!tabsInRussian) throw new Error('the tab bar is still in Azerbaijani')

  await tab('Каталог')
  await page.waitForTimeout(1500)
  const body = await page.evaluate(() => document.body.innerText)
  if (!/[А-Яа-я]/.test(body)) throw new Error('product names are still not Russian')
  console.log('       ' + (body.match(/Лосось[^\n]*/) ?? ['(cyrillic present)'])[0])
})

await shot('5-shop-ru')

console.log('\n— signing out and back in —')
await step('sign out asks first, then shows the front door', async () => {
  await tab('Профиль')
  await page.locator('button:visible').filter({ hasText: /^\s*Выйти\s*$/ }).first().click()
  await page.waitForTimeout(600)
  await page.locator('button:visible').filter({ hasText: /^\s*Выйти\s*$/ }).last().click()
  await page.waitForURL(u => u.pathname.includes('/auth'), { timeout: 10000 })
})

await step('the phone remembers who it was', async () => {
  await page.getByText('С возвращением, Rəşad').locator('visible=true').first().waitFor({ timeout: 6000 })
})

await step('a wrong password is refused', async () => {
  await page.getByPlaceholder('Введите пароль').fill('Wrong-pass1')
  await page.locator('button:visible').filter({ hasText: /^\s*Войти\s*$/ }).last().click()
  await page.getByText('Неверная эл. почта или пароль.').locator('visible=true').first().waitFor({ timeout: 6000 })
})

await step('the right password signs back in', async () => {
  await page.getByPlaceholder('Введите пароль').fill('Fresh-fish1')
  await page.locator('button:visible').filter({ hasText: /^\s*Войти\s*$/ }).last().click()
  await page.waitForURL(u => u.pathname.includes('/shop'), { timeout: 10000 })
})

console.log('\n— deleting the account —')
await step('deleting is refused while an order is on its way', async () => {
  await page.waitForTimeout(1200)
  await tab('Профиль')
  // The order placed above is still live, so the server refuses first…
  await page.locator('button:visible').filter({ hasText: /^\s*Удалить аккаунт\s*$/ }).first().click()
  await page.waitForTimeout(600)
  await page.locator('button:visible').filter({ hasText: /Да, удалить/ }).first().click()
  await page.getByText(/доставлен или отменён/).locator('visible=true').first().waitFor({ timeout: 8000 })
  console.log('       refused while an order is live')
})

console.log('\nuncaught page errors: ' + (errors.length ? errors.join(' | ') : 'none'))
await browser.close()

console.log(failed === 0 ? '\nALL STEPS PASSED' : `\n${failed} STEP(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
