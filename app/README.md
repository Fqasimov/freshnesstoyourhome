# Freshness To Your Home — customer app

Vue 3 + Capacitor. One codebase, real iOS and Android apps.

## Running it

```bash
npm install
cp .env.example .env      # VITE_API_URL must point at the API
npm run dev
```

There is deliberately no default API URL. A build that forgets to set one fails
at startup rather than quietly pointing somewhere wrong and appearing to work
during App Store review.

## Native builds

```bash
npx cap add ios           # once; macOS + Xcode
npx cap add android       # once; Android Studio
npm run ios               # build, sync, open Xcode
npm run android           # build, sync, open Android Studio
```

`ios/` and `android/` are generated and not committed —
`capacitor.config.json` plus `resources/` regenerate them.

## How it is put together

```
src/api/client.js     fetch wrapper, keychain token storage, error types
src/stores/           auth, catalogue, cart  (Pinia)
src/i18n.js           AZ / RU / EN, 92 keys each, Azerbaijani default
src/views/            one file per screen
src/assets/products/  the 54 product photos, bundled
public/fonts/         Cormorant + Onest, bundled
```

### Things that are the way they are on purpose

**The basket holds ids and quantities, never prices.** Totals come from the
server's own quote endpoint, so the figure on the basket screen is the figure
that will be charged. A basket that adds up its own prices will eventually
disagree with the server, and the customer will be right to be annoyed.

**The token never touches `localStorage`.** It lives in the platform keychain.
The secure-storage plugin quietly falls back to `localStorage` in a browser,
which is the thing this avoids, so the fallback is refused — on the web the
session is in memory only and ends on reload.

**Fonts are bundled, not fetched.** A customer on a slow connection should not
wait on Google, and a shop app should not tell a third party every time it is
opened. Cormorant and Onest both carry Cyrillic and Latin Extended, which is
what makes the Azerbaijani schwa (ə) and the Russian alphabet render in the
real face. **Verify any replacement covers `ə Ə ş Ş ğ Ğ ı İ ç Ç ö Ö ü Ü`
before adopting it.**

**Hash routing, not history.** Capacitor serves from the device filesystem,
where nothing rewrites unknown paths to `index.html`.

**Weighed goods step in half-kilos.** Asking someone to type `0.5` on a phone
to buy half a kilo of cheese is a bad screen.

**The catalogue is cached on the device** so the shop paints instantly and
works in a lift. It is never used to price an order — a stale cache costs a
corrected total, not a wrong bill.

## Tests

```bash
npm run journey
```

Drives the built app in a real browser against a real API: browse, basket,
sign in, profile, address, order, language switch. It needs the API running
with `MAIL_MAILER=log` so the sign-in code can be read back, and the built app
served on :8080.

It exists because three real bugs here were invisible to unit tests — a cached
response coming back the wrong shape on the second request only, a public
endpoint answering in English to an Azerbaijani app, and a token landing in
`localStorage`.
