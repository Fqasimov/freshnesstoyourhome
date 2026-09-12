# Running it on your phone

**This app is Vue 3 + Capacitor, not Expo.** There is no Metro bundler and no
React Native runtime, so Expo Go cannot open it and a QR from Expo will not
work. The equivalent — open it on your phone in seconds, no build, live reload
— is the Vite dev server over your wifi. That is step 3 below.

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
npm run dev
```

Vite prints two addresses:

```
  ➜  Local:   http://localhost:5174/
  ➜  Network: http://192.168.1.14:5174/     ← this one
```

Put that **Network** address in `.env` as the API host too, using the same IP:

```
VITE_API_URL=http://192.168.1.14:8000
```

Restart `npm run dev` after changing it — Vite bakes the value in at build
time. Then open the Network URL in Safari or Chrome on your phone. Same wifi,
no cable, live reload on save.

On iOS, Share → **Add to Home Screen** gets you a full-screen icon that behaves
almost exactly like the built app.

Two things that will bite you here and are already handled: the API binds to
`0.0.0.0` (step 1) so it is reachable off-machine, and CORS accepts private
LAN origins outside production — a phone's origin is `http://192.168.x.x:5174`,
which no fixed list could predict. Production keeps the strict exact-match
list.

### Signing in on the web

The token is deliberately held in memory only on the web, never in
`localStorage` — the secure-storage plugin falls back to `localStorage` in a
browser and that is the thing it exists to avoid. **So a page reload signs you
out.** That is correct behaviour, not a bug: on the real iOS and Android builds
the token goes to the platform keychain and the session persists properly.

## 4. The real native apps

When you want the actual iOS/Android builds:

```bash
cd app
npx cap add ios          # once; needs macOS and Xcode
npx cap add android      # once; needs Android Studio
npm run ios              # or: npm run android
```

`ios/` and `android/` are generated and not committed —
`capacitor.config.json` and `resources/` regenerate them.

## Tests

```bash
cd backend && php artisan test     # 78 tests, 466 assertions
cd app && npm run journey          # the full customer journey in a browser
```

`npm run journey` needs the API running with `MAIL_MAILER=log` and the built
app served on :8080.
