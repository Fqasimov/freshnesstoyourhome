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

## The admin panel

`npm run build` in `web/` now produces two pages: `index.html` (the shop) and
`admin.html` (the panel). Both are static files with no server-side rendering,
so the hosting story does not change — but two things are worth doing:

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

Appointing the first admin is a console command on the server:

```bash
php artisan freshness:promote you@example.com admin
```

The account has to exist first — sign in once as a customer, then promote. This
is deliberately not a button anywhere.

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
