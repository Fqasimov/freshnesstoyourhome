# Security

What this system defends against, how, and what is still outstanding. Written
to be read in order; the last section is the part that is not done.

## The threat that shapes everything

Every copy of the app is on a customer's own phone. It can be decompiled,
modified, and pointed at the API by hand. So the app is not a security control
and is never treated as one: every rule that matters is enforced on the server,
and the app's version of that rule exists only to save a round trip.

The clearest expression of this is `StoreOrderRequest`. There is nowhere in its
shape to put a price. No subtotal, no total, no discount, no delivery fee — a
request says which product and how many, and the server prices it from its own
tables. `PricingAuthorityTest` sends a basket stuffed with every price field a
hostile client might try and asserts that all of them are ignored.

## Authentication

Three ways in for customers: an emailed six-digit code, email and password,
and Google or Apple. Every one of them ends at the emailed code or at the
provider, never at the password alone:

- **Sign-up and password reset finish only with the code.** Nothing is
  written to `users` until it is typed back, and the form is bound to a
  ticket held by the device that sent it (`RegistrationService`), so someone
  else's form for your address cannot be confirmed by your code. A new
  password ends every existing session.
- **Passwords** are bcrypt, need eight characters with upper and lower case,
  a digit and a symbol, and are rate limited per IP and per address. An
  unknown address costs the same hash check as a known one.
- **Google and Apple** ID tokens are checked against the provider's keys,
  issuer, our client ids and expiry. A new provider identity joins an
  existing account only when the provider owns the mailbox (Apple, Gmail, a
  Google Workspace domain) and the account is a customer's; otherwise the
  person signs in the old way first. A non-Gmail address Google "verified"
  once may belong to someone else now.

The code carries most of the weight, and four things hold it:

- **The code is stored only as a bcrypt hash.** Six digits is a small search
  space; a fast hash here would be recoverable from a database copy in
  milliseconds while the code was still live.
- **Wrong guesses are counted and the code dies** after `LOGIN_CODE_MAX_ATTEMPTS`.
  A million possibilities and five tries is 1 in 200,000 per code, and the code
  expires within minutes regardless. The attempt is spent in one conditional
  `UPDATE` *before* the hash is compared: counted afterwards, a burst of
  parallel guesses all saw "tries left" during the slow bcrypt check. The
  per-address guess limiter uses the normalised address, so `A@x.az` and
  `a@x.az` share one bucket.
- **Issuing is budgeted three ways** — per address, per IP, and globally. They
  answer different attacks: mailbombing one person, harvesting many addresses
  from one client, and an attacker with many IPs, which the first two cannot
  see. Without the global cap this endpoint is a mail cannon pointed at
  strangers, sent from our domain and charged to our reputation. The global
  budget is kept twice — for addresses with an account and for new ones — so
  flooding the form with made-up addresses cannot stop existing customers
  signing in, and a full budget mails the admins (once an hour).
- **A code belongs to the request that asked for it.** Each request gets a
  ticket back (the sign-up form's ticket, or `request` from request-code), and
  the code works only with it. A stranger asking for a code to the same
  address can therefore neither kill the owner's code nor guess at it. Asking
  again *with the same ticket* kills the old code, so a resend does not widen
  the window a guesser is shooting into.
- **The admin panel's codes live apart.** Panel codes are filed under their
  own key with their own budgets. Before, anyone could ask the *shop* for a
  code to the admin's address five times an hour, spend its budget, kill the
  code just mailed for the panel, and keep the admin out indefinitely. Within
  the panel the address budget and guess limiter are counted per source, with
  a looser cap from anywhere once the authenticator app is set up — a guessed
  email code alone reaches only the second factor. Keyed on the (public)
  address alone, ten requests every ten minutes kept the admin out for good.
- **What is still a lever.** A customer's own code budget (five an hour) is
  counted from anywhere, because it is also the bound on guessing: each code
  is a fresh chance at the account. A stranger can spend it to delay a *new*
  code for somebody, though not kill one they already hold, and the password
  sign-in limit works the same way. Closing that needs a CAPTCHA in front of
  the forms (e.g. Cloudflare Turnstile), not a looser budget.

The response is identical whether the address belongs to a customer, has never
been seen, or has just run out of budget. Anything more specific makes the
endpoint an oracle for "does this person shop here".

Verification failures are equally undifferentiated: wrong, expired, already
used, out of attempts and blocked all return the same message. Each distinct
message is a fact about somebody else's account.

## Personal data

Names, email addresses, phone numbers, delivery addresses and the address
snapshot on every order are encrypted at rest with AES-256-GCM. A stolen copy
of this database is a list of opaque blobs.

Encrypted columns cannot be searched, so each one that needs a lookup carries a
**blind index** — a keyed HMAC of the normalised value. Three details matter:

- It is an HMAC, not a bare hash. A plain SHA-256 of an email address is
  reversible by guessing addresses; without the key, an HMAC is not.
- The key is **not** `APP_KEY`. One leaked key should not cost both
  confidentiality and searchability.
- Normalisation happens before hashing, or the same address in different case
  becomes two accounts.

The delivery **zone** is the one part of an address deliberately left in the
clear, because the delivery fee and the minimum-order rule are computed from
it. Everything that identifies a household is not.

## Authorization

`role` is not fillable on the model and appears in no request shape. It is
written only by `User::promote()`, which no HTTP route reaches. Both halves
matter — a whitelist in the controller and a guard on the model — so that
neither one being edited by mistake is enough to hand out an admin account.

The admin panel does not change this. `/api/admin/*` is gated on `role:admin`
alone — a courier moves orders and records weights, and has no business editing
the price list — and there is **no admin route that touches a role**. Staff are
appointed by `freshness:promote`, a console command, so appointing one needs
access to the server rather than a stolen session; a test asserts that no
route whose name mentions roles or promotion has appeared. The panel also
cannot block a staff account or its own, which would otherwise let one admin
lock out another over HTTP.

Every query for a customer's own data is scoped through the relation
(`$request->user()->orders()`), never `Order::find()`. Somebody else's id
therefore does not exist rather than being forbidden, and the failure is a 404.
Staff routes return 404 to a customer too: a 403 would confirm the route exists
and that they are merely the wrong kind of person to use it.

## Tokens

The API is stateless and bearer-token authenticated. There is no session
cookie, so there is no CSRF surface and nothing for a malicious site to ride —
which is why `supports_credentials` is false in `config/cors.php` and must stay
false. `allowed_origins` is an explicit list, never a wildcard.

On the device the token lives in the platform keychain (iOS Keychain, Android
Keystore), never in `localStorage`. The secure-storage plugin falls back to
`localStorage` in a browser, which is exactly what this avoids, so the fallback
is refused: on the web the token is held in memory for the life of the page and
the session ends on reload. That is the correct trade for a surface with no
safe place to keep it.

Blocking an account revokes its tokens, and `EnsureNotBlocked` re-checks on
every authenticated request — revocation alone races with a token issued
moments earlier.

Every signed-in route is rate limited (`throttle:api`), an account holds at
most 20 addresses and 10 devices for push, and website orders — which need
no account — have a ceiling for the whole day as well as per source. Past
it the website still sends the order on WhatsApp, just without a code. A
request to a protected route without a token is a plain 401: Laravel's
default redirect to a `login` route that does not exist used to make it a
500, with a stack trace written to the log before any limit ran.

Before any of that, `App\Support\FloodGuard` counts every client address in
a locked file before Laravel boots — 40 requests per 10 seconds, 120 a
minute — and turns a flood away with a 429 for five minutes. A refusal
inside Laravel costs a boot and a database write, so enough of them take a
shared server down by themselves; this one costs a file read. A flood spread
over many addresses is Cloudflare's job (DEPLOY.md, "Floods").

The admin panel is a browser, which has no keychain. Its token lives in
`sessionStorage`: scoped to the one tab, gone when it closes, and never shared
with another tab on a machine in the shop. `localStorage` would outlive the
person using it. A Sanctum session cookie would be better against XSS and would
bring a CSRF surface with it — a trade worth making only if the panel ever
renders untrusted HTML, which it does not; Vue escapes every customer-supplied
string it displays.

## Uploaded photographs

An upload form is the widest door in an admin panel: it takes a file from
outside and puts it on the server's own disk, under the server's own domain,
where a stored payload reaches whoever opens the page next.

**Nothing that arrives is stored.** The file is decoded into a bitmap and
written out again as a fresh JPEG, so what lands on disk is bytes this server
wrote. A JPEG with a script appended is still a valid JPEG — `getimagesize`
reads the header and is happy, and every "check the MIME type" defence passes
it — but only the pixels survive re-encoding. There is a test that appends
`<?php system($_GET["c"]); ?>` to a real image, uploads it, and asserts the
stored bytes do not contain it.

Three things fall out of that, all of which matter:

- **EXIF is dropped**, and EXIF on a phone photograph carries GPS coordinates.
  A shop that publishes the exact spot each product was photographed is
  publishing its supplier list and its home address.
- **The filename is ours** — a UUID. The uploaded name is never used, so
  `../../.env` and `x.php.jpg` are not interesting.
- **SVG is refused outright.** It is a document format that can carry script,
  and there is no version of "sanitised SVG" worth defending on a domain where
  stored XSS reaches the admin session.

Products and sets both go through this, into separate directories. The
directory is a parameter of the one function that writes files, but only from a
fixed list — a caller that could name the directory could write anywhere the
disk reaches — and deletion refuses any path outside those directories.

Size is capped at 8 MB and pixel count before decoding at 50 megapixels — a
decompression bomb is a few kilobytes of file that becomes gigabytes of memory,
and checking after decoding is too late. Uploads have their own rate limiter,
because an upload costs disk and image decoding where the rest of the admin API
costs a query. `image_file` is not fillable on either model, so no edit endpoint can
point a product or a set at an arbitrary file.

## What the admin panel can see, and what it records

Names, phone numbers, addresses and email addresses are encrypted at rest. An
admin token that could page through all of them in the clear would undo that:
the encryption would still be perfect and the data would still be gone.

So the customer list shows **masked** contact details (`de•@example.com`,
`••••••4341`) and nothing that identifies a person beyond a name. Full details
come from the single-customer view, one at a time, and every one of those views
writes a `customer.view` row to `admin_audits`. Phoning a customer about a late
order is normal; reading four hundred numbers in an afternoon is not, and only a
record of the looking tells them apart.

`admin_audits` is append-only, like `order_events`: no `updated_at`, no route
that writes twice, and no route that deletes. It records the actor, the role
they held at the time, the IP, and what actually moved — `{"price_minor":
{"from": 6000, "to": 6125}}` — but only when something did. An edit that changes
nothing writes no row, because a log full of "changed nothing" is a log nobody
reads.

The same rule holds for couriers. Their order list (`/api/staff/orders`) shows
only open orders and **no** contact details; a name, phone and address come
from the single-order view, which writes an `order.view` row. A courier signs
in with an ordinary app token and no second factor, so that token must not be
a way to page through every customer the shop has had.

The audit chain's first row is anchored outside the database
(`storage/app/audit-chain-start`). Without that, someone holding only the
database could blank every hash and the log would read as "written before the
chain existed" instead of broken.

## Payments

Nothing is charged online. Cash or card at the door, which keeps this system
entirely outside PCI scope and means there is no payment credential in the
database to steal. Physical goods are also exempt from Apple's in-app purchase
requirement, so there is no conflict there either.

**If card payment is added later**, the card number must never reach this
server. Use the provider's own SDK and store nothing but their token.

## Account deletion

In-app, as Apple Guideline 5.1.1(v) requires, and a real erasure rather than a
flag: `User::anonymise()` destroys the name, email, phone and addresses, and
strips the contact and address snapshot from past orders. The financial record
— totals, dates, line items — survives without a person attached, because the
shop still has to account for what it sold.

An account with an order in flight cannot be deleted. Somebody is about to
knock on a door with goods. Staff are always anonymised, never hard-deleted:
`order_events` and `weighed_by` point at them, and deleting the row would
erase who moved or weighed an order.

## Links and third-party scripts on the website

- **Map links are Google Maps addresses and nothing else.** A customer-supplied
  `map_link` is shown to staff as something clickable, so it has to be a
  Google Maps address: `maps.app.goo.gl/`, `goo.gl/maps`, `maps.google.com/` or
  a `google.com|az/maps` path. Plain `google.com/…` is not enough — it includes
  `google.com/url?q=…`, which redirects anywhere. The same rule guards the website
  order and the app's saved addresses (`OrderController`, `AddressController`).
- **Google's map script is not part of the page's security policy unless a key
  is configured.** The basket's "pick on the map" needs `maps.googleapis.com` and
  `maps.gstatic.com`; `scripts/package-deploy.sh` adds exactly those, plus blob
  workers, to the Content-Security-Policy only when `GOOGLE_MAPS_KEY` is set.
  Without a key the policy stays `script-src 'self'`. The browser key itself is
  public by design: restrict it in Google Cloud to this site's referrer and to
  the Maps JavaScript API.
- **Geolocation is allowed for the site itself** (`Permissions-Policy:
  geolocation=(self)`), for the basket's "use my location"; it is still denied
  to every embedded third party.
- **Sets are priced by the server.** `POST /orders/quote` and `/orders/web` take
  a set's id and a count, never a price or a percentage; the discount comes from
  the `bundles` row and is applied per unit (`PricingService::bundleUnitMinor`).
  A switched-off set is refused like an unavailable product.

## The mobile app

Reviewed in October 2026 together with the API it calls. What holds now:

- **The session token is in the Keychain / Keystore**, readable only while the
  phone is unlocked and never copied into a backup or onto another device
  (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Tokens saved by older builds are moved to
  that setting the first time they are read.
- **Ids from the server or a notification are encoded** before they go into a
  URL path, and a notification opens an order only when its id is a UUID, so a
  crafted `../` cannot point a request at another endpoint.
- **The basket belongs to an account.** Signing in as somebody else on the same
  phone empties it.
- **Notifications stop with the session.** Signing out everywhere, a password
  reset, blocking an account, or a blocked account's next request all delete the
  phone's push tokens, so a lost phone stops receiving order updates.
- **Google and Apple sign-in** open or join an account only for an address the
  provider owns: Gmail, a Google Workspace domain, an Apple relay or iCloud
  address. For any other address the person signs up by emailed code first —
  otherwise whoever once held a Google account on that address could claim the
  account before its owner and keep a way back in. A password reset removes any
  Google or Apple link. These sign-ins have their own rate limit; they used to
  share the password limiter's empty-address bucket, where ten requests from
  anywhere would have locked everybody out.
- **Every limiter counts an IPv6 network as one source** (its /64), and the
  email keys in limiter counters are keyed hashes, not plain sha1.
- **A pending sign-up in the cache is encrypted**, so the cache table is not a
  list of names and birthdays.
- **Couriers reach open orders only.** A delivered or cancelled order answers
  404 to a courier; replies to a courier's status change or weighing carry no
  contact details; and a courier cannot weigh a line far below what was
  ordered (the same tolerance that caps it above). Admins are not limited.
- **Order fields have a shape**: at most three decimals of quantity, a time
  range for the slot, map links without dot segments (a `/maps/../url` link
  resolves to Google's redirector), and nothing from a hidden category.
- **Unknown API paths answer like a missing record**, so routes cannot be
  enumerated by their status codes.
- **Builds and over-the-air updates run only from the deploy branch**, even when
  the workflow is started by hand from another one.

Still open on the app side:

- **Over-the-air updates are not code-signed (medium).** Anyone holding the
  Expo account or the `EXPO_TOKEN` secret can push JavaScript to every
  installed app. Turn on `expo-updates` code signing (`npx expo-updates
  codesigning:generate`, keep the private key off GitHub), put `EXPO_TOKEN` in a
  GitHub Environment that needs approval, and protect the deploy branch. Code
  signing is a native change: it needs a new store build, and only reaches
  phones that install it.
- **`decode-uri-component` 0.2.x inside expo-router** has a published
  denial-of-service advisory (low: a malformed link can crash the screen it
  opens). It is fixed by the next Expo SDK upgrade; the other advisories
  `npm audit` reports are in build-time tools, not in the app.
- **Social sign-in has no nonce (low).** A Google or Apple token stolen from
  the phone could be replayed against the API until it expires (an hour).

## Known gaps, found in the October review and not closed in code

Each of these is a decision or a change of behaviour for the shop, not a quiet
fix. They are listed so nobody has to rediscover them.

- **The panel's sign-in can be kept shut by a stranger who knows the admin's
  address (medium).** The codes have a lane of their own, but the panel's own
  endpoints are public: five requests an hour use up the address's budget,
  a request kills the code just mailed, and five wrong guesses kill the live
  one. Nothing is disclosed and a 12-hour session already open keeps working;
  the second factor is untouched. The right control is outside the code:
  Cloudflare Access in front of `/cms` and `/api/auth/panel` (DEPLOY.md), which
  leaves nobody but the admin able to reach the endpoints at all. In code it
  would mean binding the code to the device that asked for it, as sign-up does.
- **The panel's code request answers a little faster for an address that is not
  the admin's (low).** The real path sends mail inside the request. Closing it
  means a real mail queue; deferring the work breaks the guarantee that a code
  exists once the request returns, and the tests that hold it.
- **A weighed order can be marked delivered without being weighed (low).** The
  customer is then billed the estimate and the dashboard does not count it,
  because it only counts open orders. Staff are trusted; if that should change,
  refuse `delivered` while `requires_weighing` and `weighed_at` is empty.
- **The admin's order list shows contact details unmasked and writes no audit
  row (low).** Opening one order is audited; paging the list is not.
- **A customer chooses the delivery zone, and nothing checks it against the
  address (low).** The fee and minimum follow the zone they pick.
- **Audit rows are written after the change commits**, and a product's old
  history sits under its old code after a rename (low).
- **The map picker widens the whole site's script policy when a key is set**,
  including the admin page (low, defence in depth). Nothing in the panel can
  inject script today. Left off by default; if it is turned on, serve the
  panel from its own policy.
- **One-time installer and upgrade pages** are protected by a random name only
  (96 bits) and are shipped only in a first-install package, never by the
  automatic deploy. Delete them as soon as they have been used.
- **A push to `claude/photo-analysis-bgp25f` goes straight to production**, with
  no approval step. Deploying from a protected branch, with the secrets in a
  GitHub Environment that needs a reviewer, would close that.
- **The browser keeps name, phone, address and the map pin in plain text** so a
  returning customer does not retype them (disclosed in the privacy policy;
  the Google Maps script is not yet named there when a key is set).
- **Orders from the website have no account, so nothing erases them** when a
  person asks. Staff can clear the contact fields on request.

## If something is stolen: what the thief can read

Encryption protects a thing only from someone who does not also have its key,
so what matters is which of the two a thief gets.

| What is stolen | What the thief has |
|---|---|
| A copy of the **database** (dump, backup, SQL injection) | Names, phones, emails, addresses, notes, map pins, cancel reasons, order notes and the admin's authenticator secret are ciphertext (AES-256-GCM). Emails and phones are searchable only through keyed hashes. Sign-in codes and passwords are bcrypt hashes; API tokens are hashed. Prices, products and order totals are not secret. **Not readable without `APP_KEY`.** |
| The database **and** `.env` (or `APP_KEY`) together | Everything. The application must be able to decrypt, so anything that can run it can read. Keep database backups and the key in different places. |
| The **website files** (`public_html`) | Nothing secret: the website is public code. `.env` and the API code live in `~/freshness`, outside the web root, behind `Require all denied`. |
| The **FTP login or the server account** | Everything the application can read. This is the one that encryption cannot answer; the FTP password and the host account are the weakest links, so keep them long, unique and in a password manager. |
| `BLIND_INDEX_KEY` alone | The ability to test guessed emails and phone numbers against the stored hashes, not the data itself. |

**Why the keys are not themselves encrypted.** A key that is encrypted needs a
second key to open it, and that one has to be somewhere the application can
reach — which is the same place the thief got the first from. It adds a step,
not a barrier. A key that really is out of reach of a stolen server lives in
another machine (a key-management service or a hardware module) that this host
plan cannot use. What can be done here, and is: keys are kept out of the
database and out of the repository, `.env` is mode 0600 outside the web root,
and a leaked key can be replaced.

**Changing the encryption key** (do this the day it may have been seen):

1. Put the current `APP_KEY` into `APP_PREVIOUS_KEYS`, and set a new `APP_KEY`
   (`php artisan key:generate --show`).
2. Run `php artisan freshness:reencrypt` — or, with no shell, send
   `POST /api/deploy/reencrypt` with the `X-Deploy-Token` header, as for the
   migrations. It rewrites every encrypted column under the new key and reports
   anything it could not read. `--dry-run` counts without changing.
3. Only when it reports success, remove the old key from `APP_PREVIOUS_KEYS`.

`BLIND_INDEX_KEY` is separate and cannot be changed this way: its hashes are how
customers are found, so changing it needs a re-index (it makes every customer
unfindable until then). The deploy token is changed by replacing it in `.env`
and in the repository secret `DEPLOY_TOKEN`; an admin session lasts 12 hours.

Free text typed by customers (cancel reasons and the notes on status changes)
used to be stored as typed; it is encrypted now, and sign-in codes no longer
keep the address they were asked from. The audit trail keeps the admin's IP and
browser on purpose: it is the record of who did what.

## Still to do

These are outside the code and cannot be closed from here.

- **Key backup.** Losing `APP_KEY` makes every encrypted column permanently
  unreadable. Losing `BLIND_INDEX_KEY` makes every customer unfindable by
  email. Back both up before the first real order, and store them somewhere
  that is not the same place as the database backup.
- **`APP_DEBUG=false` and a real `MAIL_MAILER` in production.** The app logs a
  critical error at boot for either (the `log` mailer writes sign-in codes
  into the log file), but nobody reads a log they are not looking at.
- **Two-factor sign-in on every account that can change this system** —
  GitHub, Expo (over-the-air updates reach every installed app), cPanel, the
  domain registrar, and the `info@` mailbox the panel's codes go to. Keep the
  repository private, and protect the deploy branch: a push to it deploys.
- **A CAPTCHA on sign-up, sign-in and the website's order form** (e.g.
  Cloudflare Turnstile). The budgets above bound abuse; only a CAPTCHA tells a
  person from a script.
- **PHP 8.3 or newer before 31 December 2026,** when 8.2's security fixes end.
- **TLS everywhere.** Both mobile platforms block cleartext HTTP by default;
  do not add an exception to work around a certificate problem.
- **The database must not be reachable from the internet.** The API is the only
  thing that should be able to open a connection to it.
- **Mail deliverability.** SPF, DKIM and DMARC on the sending domain. A
  sign-in code in a spam folder is a customer who cannot sign in, and this is
  the only way into the app.
- **A separate, non-superuser database role** for the application. The
  development setup in this repository uses a superuser for convenience.
- **Backups, and a restore that has actually been tested.** An untested backup
  is a belief, not a backup.

## Reporting

Security problems: **faiq.farid0604@gmail.com**. Please do not open a public
issue.
