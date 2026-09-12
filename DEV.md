# Running it on your phone

## The short version

```bash
./scripts/dev.sh
```

From the repository root, on **your own machine**. It sets up the database,
seeds the catalogue, creates a development customer and prints its sign-in
code, starts the API on your LAN, points the app at it, and hands over to Expo
— which prints the QR. Scan it with **Expo Go**. Ctrl-C stops everything.

If it cannot work out your LAN address, tell it:

```bash
LAN_IP=192.168.1.14 ./scripts/dev.sh
```

> **The QR has to come from your machine, not from a Claude session.**
> Expo's QR encodes `exp://<this-machine's-LAN-IP>:8081`. A cloud container has
> no address on your wifi, and its egress proxy blocks ngrok, so it cannot
> tunnel out either. Even if the bundler were reachable, the Laravel API runs
> beside it with no public ingress — the app would open and then fail every
> request. Run the script locally and the QR in your terminal is the real one.

The rest of this file is what the script does, in case you want to run the
steps yourself or something goes wrong.

## 1. The API

```bash
cd backend
cp .env.example .env
php artisan key:generate
php artisan freshness:generate-keys      # paste BLIND_INDEX_KEY into .env
```

For local work sqlite is the least setup — no server to install:

```bash
# in .env
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/backend/database/database.sqlite
```

```bash
touch database/database.sqlite
php artisan migrate --seed

# --host=0.0.0.0 so your phone can reach it, not just your laptop
php artisan serve --host=0.0.0.0 --port=8000
```

Postgres is what production uses and the test suite is green against both.
Switch when you deploy; sqlite is fine for building screens.

## 2. The dummy account

```bash
php artisan freshness:dev-user
```

```
  email   dev@freshnesstoyourhome.az
  code    774522
  role    customer
  name    Rəşad Məmmədov
  phone   +994501234567
```

Type the email, then the code, into the app. The account arrives with a name,
a phone and a default address already set, so checkout works immediately.

The code lasts 10 minutes — run the command again for a fresh one. Running it
twice reuses the same account and kills the previous code.

Useful variants:

```bash
php artisan freshness:dev-user --token                        # also print an API token for curl
php artisan freshness:dev-user --role=courier \
  --email=courier@freshnesstoyourhome.az                      # someone who can weigh orders
php artisan freshness:dev-user --email=someone@else.az        # a second customer
```

**The command refuses to run outside local and testing.** It mints a working
sign-in code, which is a back door anywhere else, and there is a test that
holds it to that.

## 3. Open it on your phone

```bash
cd app
cp .env.example .env
npm install
npx expo start
```

Scan the QR with **Expo Go** (App Store / Play Store). Same wifi, no cable,
live reload on save.

### The thing that catches everyone

`EXPO_PUBLIC_API_URL` must be your machine's **LAN address**, not `localhost`.
On the phone, `localhost` means *the phone*, so the app will look for an API
that is not there and every screen will sit empty.

Expo prints the address when it starts:

```
› Metro waiting on exp://192.168.1.14:8081
```

Take that IP and put it in `app/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.14:8000
```

Then restart `npx expo start` — the value is inlined at bundle time, so an
edit without a restart changes nothing.

Two things already handled for you: the API binds to `0.0.0.0` (step 1) so it
is reachable off-machine, and CORS accepts private LAN origins outside
production. Production keeps the strict exact-match list.

### What Expo Go cannot tell you

Expo Go bundles **its own** native modules, not yours. Things that work there
can still break in a real build — native config, permissions, push. Before you
believe anything about native behaviour, do a preview build:

```bash
npx eas build --profile preview --platform android
```

## 4. The real native apps

When you want the actual iOS/Android builds:

```bash
cd app
npx eas login
npx eas init                                          # once, links the project
npx eas build --profile production --platform all
npx eas submit --profile production --platform ios
```

EAS builds iOS in the cloud, so no Mac is needed. `ios/` and `android/` are
generated and not committed — `app.config.ts` and `assets/` regenerate them.

## Tests

```bash
cd backend && php artisan test     # 78 tests, 466 assertions
cd app && npm run typecheck        # tsc --noEmit
cd app && npm run journey          # the full customer journey in a browser
```

`npm run journey` exports the app for web and drives it in a real browser. It
needs the API running with `MAIL_MAILER=log`, and the export served on :8090 —
the header of `app/tests/journey.mjs` has the exact commands.
