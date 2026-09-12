# Freshness To Your Home

Premium food delivery in Baku — website, customer app, and the API behind both.

```
web/       The public website (Vue 3 + Vite). Browsing and the catalogue.
app/       The customer app (Expo + React Native) for iOS and Android.
backend/   The API (Laravel 13 + Postgres). Auth, catalogue, orders.
```

One repository, because the three share a catalogue. Keeping the app somewhere
else would mean maintaining 54 products and their prices in two places, and
they would drift — the only question is when.

## The three things worth knowing before reading the code

**Prices live in the database, not in the code.** The catalogue used to be a
JavaScript file. With an app in the picture that would have meant three copies
of every price — website bundle, app bundle, server — and changing the price of
salmon would have needed an App Store review. Products, categories, zones and
all three translations are rows now. `backend/database/data/catalogue.json` is
the reviewable seed source; the database is the authority.

**The client never decides what anything costs.** A request says which product
and how many. The server prices it from its own tables. Every app bundle is on
a customer's own phone and can be modified, so any total that arrives from a
client is a number somebody chose.

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

# Website
cd web && npm install && npm run dev

# App
cd app && npm install
cp .env.example .env                     # point EXPO_PUBLIC_API_URL at the API
npx expo start                           # scan the QR with Expo Go
```

For sign-in codes in development, set `MAIL_MAILER=log` and read the code out
of `backend/storage/logs/laravel.log`.

## Tests

```bash
cd backend && php artisan test           # 78 tests, 466 assertions
cd app && npm run typecheck              # tsc --noEmit
cd app && npm run journey                # the customer journey in a browser
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
