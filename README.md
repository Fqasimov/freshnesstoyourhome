# Freshness To Your Home

Premium food delivery in Baku — website, customer app, and the API behind both.

```
web/       The public website (Vue 3 + Vite). Browsing and the catalogue.
app/       The customer app (Expo + React Native) for iOS and Android.
backend/   The API (Laravel 12, PHP 8.2+; Postgres or MySQL). Auth, catalogue, orders.
shared/    Everything the three must agree on, written once.
scripts/   sync.mjs regenerates from shared/; check.mjs fails when it is stale.
```

One repository, because the three share a catalogue — and one repository was
not enough on its own. They drifted anyway: the app shipped thirty-two fewer
product photographs than the website, nineteen listings existed on the website
and nowhere else, and the app offered two placeholder delivery areas where the
website offered fifty-one. `shared/` is the answer, and `shared/README.md` is
the one page to read before changing anything that appears in more than one
place.

```bash
npm run sync     # after editing anything in shared/
npm run check    # run by the website's tests, the app's typecheck, every build
```

## The four things worth knowing before reading the code

**Prices live in the database, not in the code.** The catalogue used to be a
JavaScript file. With an app in the picture that would have meant three copies
of every price — website bundle, app bundle, server — and changing the price of
salmon would have needed an App Store review. Products, categories, zones and
all three translations are rows now. `shared/catalogue.json` is the reviewable
seed source; the database is the authority.

Both clients read it from the same public endpoint. The website keeps a bundled
copy as an offline fallback and says so in `web/README.md`, but it is a
fallback — not a second source of truth.

**The client never decides what anything costs.** A request says which product
and how many. The server prices it from its own tables. Every app bundle is on
a customer's own phone and can be modified, so any total that arrives from a
client is a number somebody chose.

**Anything true of the business rather than of a screen is written once.** The
palette, the shop's phone number, the fifty-one delivery areas, the listings
and the product photographs live in `shared/`, and a generator writes a file
for each surface in the language that surface already speaks. Nothing imports
across the boundary: Vite would manage it, Metro would not, and a shared layer
that works on the website and not on the app is the drift it was meant to
prevent. `npm run check` fails while a generated file is stale or hand-edited.

**Most of this catalogue is sold by the kilo, and a kilo is never exactly a
kilo.** An order carries a server-priced estimate and a stated tolerance; the
courier records what the scales said; the server re-prices from the unit price
already on the order. Without that split, every weighed order is an argument at
the door.

## Running it

**To get it on your phone: `./scripts/dev.sh`.** One command — database, seed,
a development customer with its sign-in code, the API on your LAN, and Expo's
QR for Expo Go. `DEV.md` explains each step and what to do when one fails.


```bash
# API
cd backend
cp .env.example .env
php artisan key:generate
php artisan freshness:generate-keys      # prints BLIND_INDEX_KEY for .env
php artisan migrate --seed
php artisan serve

# Website (and the admin panel — /admin.html in dev; a real build moves it
# to /cms, so a crawler or a guess never finds it at the obvious name — see
# DEPLOY.md)
cd web && npm install && npm run dev

# App
cd app && npm install
cp .env.example .env                     # point EXPO_PUBLIC_API_URL at the API
npx expo start                           # scan the QR with Expo Go
```

For sign-in codes in development, set `MAIL_MAILER=log` and read the code out
of `backend/storage/logs/laravel.log`.

### The admin panel

Add your address to `ADMIN_EMAILS` in `backend/.env`, then open `/admin.html`
in development, or `/cms` on a real build, and sign in with an emailed code.
No other address can: the panel's sign-in sends nothing to an address that is
not on that line, and only its tokens open the admin routes. There is no HTTP
route that changes who is on it. See DEPLOY.md.

## Tests

```bash
cd backend && composer test              # 122 tests, 596 assertions
cd app && npm run typecheck              # tsc --noEmit
cd app && npm run journey                # the customer journey in a browser
cd web && npm run test:api               # the site against a real API
```

The backend suite runs on sqlite by default and is also green against Postgres.
It covers the paths that would hurt rather than chasing coverage: client-set
prices being ignored, sign-in code brute force and replay, cross-customer order
and address access, self-promotion to admin, the weighing arithmetic, and that
personal data is genuinely unreadable in the tables.

`npm run journey` drives the built app in a real browser against a real API. It
is there because three of the bugs found during this build were invisible to
unit tests: a cached response coming back the wrong shape on the second request
only, a public endpoint answering in the wrong language, and a token landing in
`localStorage`.

## Building the app

```bash
cd app
npx eas build --profile preview --platform all       # internal testers
npx eas build --profile production --platform all    # the stores
npx eas submit --profile production --platform ios
```

EAS builds iOS in the cloud, so a Mac is not required. `eas.json` holds the
development / preview / production profiles and the API URL each points at.
`ios/` and `android/` are generated and not committed — `app.config.ts` and
`app/assets/` regenerate them.

## Before this goes to a store

See `DEPLOY.md` for the full list. The four that block a launch:

1. **Delivery zones carry a zero fee.** Placeholders, seeded so the structure
   exists. Set the real areas and prices.
2. **The three bundles were invented during design.** Seeded inactive on
   purpose — an unconfirmed discount in an app is a real transaction.
3. **Hero text, about text and the logo are still placeholders** on the
   website, and the store icon is upscaled from a 320px mark.
4. **Apple and Google developer accounts take calendar time.** Google Play
   makes new personal accounts run 14 days of closed testing before production
   access. Start both now, not when the code is done.
