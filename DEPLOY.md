# Going live

The code is ready before the paperwork is. Read the first section today.

## Start these now — they are the long pole

**Google Play.** $25, once. A new **personal** developer account must run 14
days of closed testing with 12 testers before production access unlocks. An
organization account skips the tester requirement but still needs identity
verification. Either way this is a hard two-week wall that runs in parallel
with development, so open the account before the app is finished, not after.

**Apple.** $99/year. If the account is registered as an organization it needs a
D-U-N-S number, which takes its own week or two in Azerbaijan.

**Decide whose account publishes this.** If Freshness To Your Home belongs to
an employer and the app ships under a personal account, the app lives in that
personal account. Moving it later is a transfer process with real friction.

## Store requirements the code already covers

- **In-app account deletion** — Apple Guideline 5.1.1(v). Profile → delete.
- **No in-app purchase conflict** — physical goods are exempt, and nothing is
  charged in the app anyway.
- **Browsing without an account** — an app that is a login wall until you
  register is the shape Guideline 4.2 rejects.
- **Push notifications for order status** — the substantive answer to 4.2's
  "this should be a website", and the permission is asked for after the first
  order rather than at launch, which is what reviewers expect to see.
- **A notification never carries personal data** — order code and status only,
  because a notification body lands on a locked screen. There is a test holding
  it to that.

## Still needed for review

- **A better logo.** The store icon is generated from `logo-mark.png`, which is
  320×320. Upscaled to the required 1024×1024 it is soft, and a soft icon is a
  visible quality problem on a store listing. Supply the mark at 1024 or larger
  and re-run `app/resources` generation.
- **An EAS project id for push.** `eas init` once. Notifications work in Expo
  Go without it but not in a real build, and the failure reads like a network
  error rather than a missing id.
- **A push test on a real device** before submission: `php artisan
  freshness:push-test <email>`. Push never works on a simulator, and Apple's
  and Google's credentials live with Expo — nothing else tells you they are
  wrong.
- **Screenshots** at every required size, for both stores.
- **A privacy policy on a public URL.** Required by both. It has to match what
  the app really collects: name, email, phone, delivery address, order history.
- **App Privacy labels** (Apple) and the **Data Safety form** (Play), filled in
  accurately.
- **A demo account for reviewers.** Sign-in is by email code, so the reviewer
  cannot sign in without receiving mail. Either supply a mailbox they can read
  or arrange a review account whose code is fixed — and if you do the latter,
  make it a build-time flag that cannot be set in production.

## Business decisions that block launch

These are now all editable in the admin panel rather than in code — a price or a
delivery fee is a row update, visible on the next request, not a release.


- **Delivery zones carry a zero fee and no minimum.** Seeded as placeholders so
  the structure exists. A zero fee becomes a real decision the moment an order
  is taken.
- **The three bundles were invented while designing the website.** Seeded
  inactive on purpose. On a web page an unconfirmed discount is a placeholder;
  in an app it is a transaction someone pays for.
- **The weight tolerance is set to 10%** (`WEIGHT_TOLERANCE_PERCENT`). This is
  what the customer is told their bill may move by. Confirm it is the number
  the business actually wants to stand behind.
- **Tuna loin is priced lower per kilo than frozen tuna** on the original
  board. Probably a transcription error on the poster; worth checking with
  whoever sets prices.

## Building from a clone

`npm run build` in `web/` runs `npm run sync` first, which regenerates
everything derived from `shared/` — including the product photographs, which
are gitignored under `web/src/assets/products` because `shared/products` is the
only copy in the repository. **Build from a full clone, not from `web/`
alone**, or the sync has nothing to read and the build fails on the missing
images. The app's `export:web` does the same. `npm run check` at the root says
whether anything is out of step without writing.

## Shared hosting with no shell (how freshnesstoyourhome.az is deployed)

The live site is on a shared cPanel account where SSH logs in but the shell is
switched off, so nothing can be run on the server — not `composer`, not
`artisan`. Everything that normally happens there is done before upload:

```bash
DOMAIN=freshnesstoyourhome.az scripts/package-deploy.sh
```

That builds two zips in `deploy-out/`:

- **website.zip** — the built site, with the API address baked in, the panel
  at `cms/`, and a cache-headers `.htaccess`. Extract into `public_html/`.
- **backend.zip** — extract it in the **home directory**. It holds two
  things: the API in `~/freshness/backend` (with `vendor/` installed and no
  `.env`) plus the seed data in `~/freshness/shared`; and the API's front door
  in `~/public_html/server/`, which is Laravel's `index.php` pointed back at
  `~/freshness/backend` (`deploy/split-index.php`) plus the one-time installer
  under a random name. The API answers at `https://DOMAIN/server/api/...` —
  no subdomain, no extra DNS, no second certificate, and the site and the API
  share one origin. Laravel reads its base path from the script's location,
  so the routes need no prefix. `API_MODE=subdomain` builds for `api.DOMAIN`
  instead, if that is ever wanted.

  The split is there because this host only lets a domain point **inside**
  `public_html`, and the backend must not be there: `.env` holds the database
  password and the keys, and anything under `public_html` can be requested by
  URL. With the split, nothing under `public_html` is secret.

  When extracting `website.zip`, never empty `public_html` first: `server/`
  lives there too, and the API's front door would go with it.

The installer (`deploy/installer.php`) does in a browser what `DEV.md` does
in a terminal: checks PHP and extensions, tests the database (MySQL/MariaDB or
PostgreSQL — whichever the cPanel account offers), writes `.env`
with fresh keys and the one admin address, migrates, seeds and links storage.
It will not overwrite an existing `.env`, stops working 48 hours after
install, and deletes itself when told to.

Choices that follow from having no shell, all written into that `.env`:

- **`QUEUE_CONNECTION=sync`.** No long-running worker is possible, so sign-in
  mail goes out inside the request. Half a second slower; nothing to babysit.
- **Mail over the host's own SMTP** (a cPanel email account) rather than
  Resend — one fewer signup, and cPanel publishes SPF/DKIM for its own domains.
- **No `config:cache` / `route:cache`.** Cached config ignores later `.env`
  edits, and with no shell there would be no way to clear it.

**MySQL works as well as PostgreSQL.** Nothing in the schema is
Postgres-specific; the whole suite passes against MariaDB 10.11 with
`DB_CONNECTION=mysql`.

**PHP 8.2 or newer.** The host offers only PHP 8.2, so the backend runs on
Laravel 12 rather than 13 (13 needs 8.3), and `composer.json` sets
`config.platform.php` to 8.2.0 so a later `composer update` cannot pull in a
package that needs more. The one development-only package that required 8.3,
`laravel/pao`, is gone; PHPUnit is on 11 for the same reason.

Checked three ways: all 156 tests pass on Laravel 12; every file of our own
code parses with PHP 8.2's own parser (which does reject 8.3 syntax); and the
lock's platform check demands 8.2, so Composer vouches for everything in
`vendor/`. The test suite itself could not be run on 8.2 here — the only 8.2
available in the build sandbox is a WebAssembly build that crashes on start.

**PHP 8.2 stops receiving security fixes on 31 December 2026.** Ask the host
for 8.3 or newer before then. Moving back up is `config.platform.php` and the
Laravel constraint in `composer.json`, then a `composer update`.

To ship a change later: `DOMAIN=freshnesstoyourhome.az scripts/package-deploy.sh`
(add `INSTALL=1` only for a brand-new server — that is the one package that
carries the installer). Upload and extract `backend.zip` in the home folder,
**then open the database-update page it prints**
(`/server/upgrade-<random>.php`), press the button, and it runs any new
migrations and deletes itself. Then `website.zip` into `public_html`.
`.env`, `storage/` and the database are not in either zip, so they survive.

### Automatic deploys (GitHub Actions → FTP)

`.github/workflows/deploy.yml` runs on every push to the default branch:
backend tests, website build and drift check, then `STAGE_OUT=… package-deploy.sh`
lays out the home folder, FTP-Deploy-Action syncs `~/freshness` (only what
changed), `POST /api/deploy/migrate` runs migrations, `~/public_html` is
synced, and a smoke test checks the shop, the API and that `.env` is still
403. A failing test stops it before anything is uploaded.

It stays off until it is given the keys:

1. cPanel → **FTP Accounts** → add `deploy@freshnesstoyourhome.az`, strong
   password, **Directory: the home folder itself** (clear the suggested
   `public_html/…` so the box ends at `/home/freshdcg/`). If cPanel will not
   allow that, use the main cPanel FTP login instead.
2. Generate a deploy token and put it in the server's `.env` as
   `DEPLOY_TOKEN=…` (32+ characters; the endpoint does not exist otherwise).
3. GitHub → the repository → Settings → Secrets and variables → Actions:
   - Secrets: `FTP_SERVER` (the FTP host from cPanel → FTP Accounts →
     Configure FTP Client), `FTP_USERNAME`, `FTP_PASSWORD`, `DEPLOY_TOKEN`
     (the same value as in `.env`).
   - Variables: `DEPLOY_ENABLED` = `true`.
4. Actions → Deploy → **Run workflow** for the first run. It uploads
   everything once (vendor/ is thousands of files — allow 15–30 minutes);
   later runs send only what changed.

Never deployed: `.env`, `storage/logs`, `storage/framework`, uploaded
photos, the `public_html/server/storage` link — the action only removes
files it uploaded itself. Revoking it is deleting the FTP account.

### App updates without a store review (EAS Update)

`.github/workflows/app-update.yml` publishes the app's code to the
`production` update channel on every push that touches `app/`, `shared/` or
`scripts/`. Installed apps download it in the background and use it from the
next launch. The runtime version is the native **fingerprint**, so an update
only reaches builds with an identical native side; anything native (a new
library with native code, a permission, an SDK upgrade) needs `eas build` and
a store release instead. Store builds carry the channel from `eas.json`.

Off until: the Expo project ID is in `app/app.config.ts`, the repository
secret `EXPO_TOKEN` exists (expo.dev → Account settings → Access tokens), and
the repository variable `APP_UPDATES_ENABLED` is `true`. Nothing reaches a
phone until a store build with updates enabled is installed on it.

The app's product photographs are generated from `shared/products` like the
website's, so `app/package.json` runs the sync in `eas-build-post-install` —
without it a cloud build fails on the missing images.

### Google and Apple sign-in in the app

The buttons are built and the server checks every token it is handed
(`SocialTokenVerifier`: signature, issuer, and that it was made for *this*
app). Until the ids below exist, the server answers "not available yet" and
the Google button says so; email + password + code works regardless.

**Google** — Google Cloud console → APIs & Services → Credentials:
1. OAuth consent screen: app name, support email, the privacy URL.
2. Create an OAuth client of type **Web application** (its id is what the
   phone's token is issued for).
3. Create one of type **Android**: package `az.freshnesstoyourhome.app` and
   the SHA-1 of the signing key (`npx eas credentials` shows it; Play Console
   → App integrity shows Google's app-signing SHA-1 too — add both).
4. For iPhone later: one of type **iOS**, bundle `az.freshnesstoyourhome.app`.

Then:
- EAS build variables (expo.dev → project → Environment variables):
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and for iOS
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `GOOGLE_IOS_URL_SCHEME`
  (the "iOS URL scheme" Google shows, `com.googleusercontent.apps.…`).
- Server `.env`: `GOOGLE_CLIENT_IDS=` the web, Android and iOS client ids,
  comma-separated.

**Apple** — iPhone only (Apple does not offer it inside Android apps). In the
Apple Developer account, enable "Sign in with Apple" on the app id
`az.freshnesstoyourhome.app`; EAS picks the capability up from
`usesAppleSignIn`. Server `.env`: `APPLE_CLIENT_IDS=az.freshnesstoyourhome.app`.
The App Store requires Apple sign-in whenever Google sign-in is offered.

The Google and Apple libraries are native, so they arrive with the first
store build, not over the air.

**Sanctum runs stateless.** The panel and the app send a bearer token; nothing
uses cookies. `bootstrap/app.php` therefore does not call
`statefulApi()` at all — it once called `statefulApi(false)`, which Laravel
reads as "on", and with the site and API on one origin every sign-in from
`/cms` died with a 419. `StatelessApiTest` holds it, and it runs outside the
`testing` environment on purpose, because Laravel skips the CSRF check there.

## The admin panel

`npm run build` in `web/` produces two pages: `index.html` (the shop) at the
site root and `cms/index.html` (the panel) — a postbuild step moves it there
from `admin.html`, which is what Vite actually names the entry it builds; see
`web/scripts/place-cms.mjs`. Both are static files with no server-side
rendering, so the hosting story does not change — but two things are worth
doing:

- **Do not link to it.** It carries `noindex, nofollow` and `referrer:
  no-referrer`, and the API refuses non-admins with a 404, but there is no
  reason to help anyone find it.
- **Put it behind the office IP, or on its own hostname,** if the host makes
  that cheap. The role check is the control; network scoping is the belt.

**Two things must be right before photo uploads work**, and both fail quietly:

```bash
php artisan storage:link      # public/storage -> storage/app/public
```

and `APP_URL` in the API's `.env` must be the API's real public address. Every
photo URL is built from it, so if it still says `http://localhost` in
production, every uploaded photograph 404s on the website and in the app while
the admin panel looks perfectly fine. The path is what is stored; the URL is
computed on read, so correcting `APP_URL` fixes every existing photo at once.

Uploaded photographs live in `storage/app/public/products`. That directory has
to be on **persistent** storage — a container filesystem that resets on deploy
takes the shop's product photography with it — and it belongs in the backup
alongside the database, because the database only holds the filenames.

**Who gets in is one line in the server's `.env`:**

```
ADMIN_EMAILS=info@freshnesstoyourhome.az
```

The installer asks for it. Only an address on that line gets a code at
`/cms`; any other address typed there gets the same polite answer and nothing
else — no mail, no account, no row. Changing the line needs the server's
files, so a leaked panel session cannot add a second admin. Comma-separate to
add a person; delete an address and that person is out on their next click.

Getting in takes all three of: the address on that line, a code from its
inbox, and a token from the panel's own sign-in (`/api/auth/panel/*`). The
shop's sign-in hands out tokens that open the shop and nothing else, so the
admin's phone, signed in to the shop, is not a way into the panel. A panel
session lasts 12 hours (`ADMIN_TOKEN_TTL_HOURS`); a shop session 60 days.
`AdminAccess` holds the rule and `PanelAuthTest` holds it in place.

**And a second factor.** After the emailed code, the panel asks for the
6-digit code from an authenticator app (Google Authenticator, Microsoft
Authenticator, 1Password, Aegis — RFC 6238 TOTP). The first sign-in shows a
QR code to scan (drawn in the browser; the secret never goes to a QR
service) and hands out eight one-time recovery codes, shown once. The emailed
code alone only earns a five-minute, five-try ticket for that step — no
token exists until both are right. Each app code works once. Every panel
sign-in is written to the journal with its IP and browser.

Lost phone and recovery codes? That is a server-access job, on purpose:
cPanel → phpMyAdmin → the shop database → SQL:

```sql
UPDATE users SET two_factor_secret = NULL, two_factor_confirmed_at = NULL,
  two_factor_recovery_codes = NULL, two_factor_last_step = NULL
WHERE role = 'admin';
```

The next sign-in enrols again. Do it straight away: until the app is
enrolled, the inbox alone is the key.

`freshness:promote` still appoints couriers, and refuses to make admins.

## Security on hostinq.az — what is in place and how to check it

**Layout.** The Laravel code, `.env` and `vendor/` live in `~/freshness`, outside
`public_html`; only a four-line `index.php` sits in `public_html/server`. The
host will not let a domain point outside `public_html`, which is why it is
split rather than re-rooted. `~/freshness/.htaccess` denies everything in case
that folder is ever moved somewhere reachable.

**Web server rules**, tested against Apache 2.4 with `AllowOverride All` (what
cPanel and LiteSpeed honour):

- `public_html/.htaccess` (`deploy/website.htaccess`): HTTPS redirect (except
  `/.well-known`, which AutoSSL needs), no directory listings, dotfiles and
  code-checkout files refused, no PHP outside `/server`, and for the HTML a
  Content-Security-Policy that allows scripts from our own origin only —
  no inline script, no eval, no third party. That CSP is what stands between
  an injected string and the panel's session token. Also X-Frame-Options,
  nosniff, Referrer- and Permissions-Policy, COOP, and HSTS over HTTPS.
- `public_html/server/.htaccess` (`backend/public/.htaccess`): the same deny
  list, and **only `index.php` and the random-named installer/upgrade pages
  may run as PHP**. Under `storage/` only `.jpg/.jpeg/.png/.webp` are served.
- `storage/app/public/.htaccess`: the upload folder's own rule — anything but
  an image is refused, images are served with `CSP: default-src 'none';
  sandbox`. It holds even with the parent rules removed.

Uploads are also re-encoded (`App\Support\StoredImage`): the bytes are
decoded to pixels and written out as a fresh JPEG under a UUID name, so a
payload appended to an image, a polyglot, EXIF (with its GPS) and SVG do not
survive. The file type is read from the bytes, not the name or header.

**Client IPs.** `TRUSTED_PROXIES` is empty by default: on shared hosting the
server talks to the visitor directly, and trusting `X-Forwarded-For` from
anyone let every visitor pick their own IP and walk past every per-IP rate
limit (it used to default to `*` — **delete that line from an older `.env`**).
Behind Cloudflare set `TRUSTED_PROXIES=cloudflare`: the header is then
believed only from Cloudflare's own ranges (`App\Support\CloudflareIps`).
`TrustedProxyTest` holds both.

**Rate limits** (`AppServiceProvider`): the panel's door allows 10 requests
per 10 minutes per IP *and* 10 per 10 minutes per address; codes are further
limited per address, per IP and globally (`LoginCodeService`); a ticket for
the app code dies after 5 wrong tries.

**Audit journal.** Every admin write, and every panel sign-in, is a row with
actor, role, action, before/after values, IP and browser. Rows are chained:
each carries an HMAC of itself and the row before, keyed from `APP_KEY`, so a
row edited or deleted in the middle — by anyone holding only the database —
breaks the chain. The Journal page checks it on every visit and shows the
count (the chain cannot show rows cut off the end; a count that goes down
does). `AuditChainTest`.

**Database.** cPanel → *Remote MySQL*: keep the list empty, so MySQL answers
only on the server itself. One database user for the app, on the one
database. It needs CREATE/ALTER/INDEX/DROP/REFERENCES for the upgrade page's
migrations as well as SELECT/INSERT/UPDATE/DELETE; ALL PRIVILEGES on that one
database amounts to the same. Back up the database from cPanel → Backup,
together with `APP_KEY`/`BLIND_INDEX_KEY` kept elsewhere.

### Checking it from any computer

Every line should print the number shown:

```bash
D=https://freshnesstoyourhome.az
curl -s -o /dev/null -w '%{http_code}  .env\n'               $D/.env                     # 403
curl -s -o /dev/null -w '%{http_code}  .git\n'               $D/.git/config              # 403
curl -s -o /dev/null -w '%{http_code}  api .env\n'           $D/server/.env              # 403
curl -s -o /dev/null -w '%{http_code}  stray php\n'          $D/server/test.php          # 403
curl -s -o /dev/null -w '%{http_code}  php in uploads\n'     $D/server/storage/x.php     # 403
curl -s -o /dev/null -w '%{http_code}  upload listing\n'     $D/server/storage/          # 403
curl -s -o /dev/null -w '%{http_code}  http redirect\n'      http://freshnesstoyourhome.az/  # 301
curl -sI $D/cms/ | grep -i content-security-policy       # present, script-src 'self'
curl -s -H 'X-Forwarded-For: 1.2.3.4' -o /dev/null -w '%{http_code}\n' -X POST \
  -H 'Content-Type: application/json' -d '{"email":"x@example.com"}' \
  $D/server/api/auth/panel/request-code   # run it 5 times: 429 by the 4th, whatever the header says
```

On Windows PowerShell use `curl.exe` instead of `curl`.

### Cloudflare in front (free plan) — optional, recommended

1. Cloudflare → *Add a site* → `freshnesstoyourhome.az` → Free. Let it import
   the DNS records, then compare them with cPanel → *Zone Editor* before
   switching: the `mail`, `webmail` and MX records, and the SPF/DKIM TXT
   records, must all be there, with `mail`/`webmail` set to **DNS only**
   (grey cloud) or email stops.
2. At online.az, replace the hostinq.az nameservers with the two Cloudflare
   gives you.
3. Cloudflare → SSL/TLS → **Full (strict)** (the AutoSSL certificate is
   valid, so strict works). Edge Certificates → Always Use HTTPS on.
4. In `.env`: `TRUSTED_PROXIES=cloudflare`.
5. **Access (Zero Trust, free up to 50 users)** → Applications → Add →
   Self-hosted. Domain `freshnesstoyourhome.az`, and add three paths: `cms`,
   `server/api/admin`, `server/api/auth/panel`. Policy: *Allow* → Emails →
   the admin address. Login method: One-time PIN (or Google). Now a visitor
   to /cms meets Cloudflare's sign-in before a byte reaches hostinq.az — and
   the panel's API paths are behind it too, so it cannot be walked around by
   calling the API directly.

   It is a layer, not the lock: on shared hosting the server's own IP still
   answers requests that skip Cloudflare, and the panel's own two factors are
   what hold there.

### Considered and left out, on purpose

- **Cookie sessions (Sanctum SPA mode) instead of a bearer token.** The shop,
  the panel and the mobile app share one token-based API. With the site and
  API on one origin, switching on Sanctum's stateful mode puts CSRF checks on
  the shop's own requests too — exactly the 419 outage recorded above. What a
  cookie would buy is that injected script could not read the token; the CSP
  above stops script from being injected, the panel token lives in
  `sessionStorage` (gone with the tab), is admin-only and expires in 12 hours.
- **Cloudflare Turnstile on the login.** Its job is keeping bots from making
  a form send mail. The panel's form sends nothing to any address but the
  admin's, is rate-limited per IP and per address, and Cloudflare Access (if
  set up) sits in front of it. Easy to add later if the logs ever show a need.
- **An observer that audits every model save.** Admin writes are audited in
  the controllers, where the actor and the reason are known; seeders and
  price syncs from `shared/` are deliberate code changes and belong in git.

## Infrastructure

**Database.** Managed Postgres, not reachable from the internet. The API should
be the only thing that can open a connection. Give the application its own
non-superuser role.

**API.** Any PHP 8.3+ host — Fly.io, Railway, Hetzner with Forge, DigitalOcean.
Frankfurt is the closest low-latency region to Baku. A queue worker must be
running (`php artisan queue:work`) or no sign-in code is ever sent.

**Mail.** A transactional provider (SES, Resend, Postmark, Brevo) on a domain
with SPF, DKIM and DMARC. At this volume it is effectively free. Deliverability
is the whole product here — sign-in codes are the only way into the app.

**Secrets.** `APP_KEY` and `BLIND_INDEX_KEY` in the platform's secret store,
not a file on disk. Back both up somewhere that is not the database backup.
Losing `APP_KEY` makes every encrypted column permanently unreadable; losing
`BLIND_INDEX_KEY` makes every customer unfindable by email. Neither is
recoverable.

**Before the first real order:**

```bash
php artisan config:cache
php artisan route:cache
php artisan migrate --force
```

and confirm `APP_DEBUG=false`, `APP_ENV=production`, and that
`CORS_ALLOWED_ORIGINS` lists only the real website.

## Realistic timeline

Assuming content is final and nothing goes wrong:

| | |
|---|---|
| Store accounts, verification | start today, 1–2 weeks in parallel |
| Delivery zones, prices, bundles confirmed | business decision |
| Push notifications | 3–5 days |
| Store assets, privacy policy, forms | 3–5 days |
| Play closed testing gate | 14 days (personal accounts) |
| Review, allowing for a rejection | ~1 week |

**Six to eight weeks to live on both stores.** The two-week Play gate is the
piece that runs in parallel only if the account exists — which is why it is the
first thing in this document.
