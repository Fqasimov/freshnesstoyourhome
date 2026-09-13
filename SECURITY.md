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

Passwordless, by email code. There is no password column anywhere and there
should never be one: no password to reuse, no reset flow to attack, no hash
worth stealing.

That concentrates the risk into one place — a six-digit code — and four things
hold it:

- **The code is stored only as a bcrypt hash.** Six digits is a small search
  space; a fast hash here would be recoverable from a database copy in
  milliseconds while the code was still live.
- **Wrong guesses are counted and the code dies** after `LOGIN_CODE_MAX_ATTEMPTS`.
  A million possibilities and five tries is 1 in 200,000 per code, and the code
  expires within minutes regardless.
- **Issuing is budgeted three ways** — per address, per IP, and globally. They
  answer different attacks: mailbombing one person, harvesting many addresses
  from one client, and an attacker with many IPs, which the first two cannot
  see. Without the global cap this endpoint is a mail cannon pointed at
  strangers, sent from our domain and charged to our reputation.
- **Asking for a new code kills the old one.** Otherwise every resend widens
  the window a guesser is shooting into.

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
knock on a door with goods.

## Still to do

These are outside the code and cannot be closed from here.

- **Key backup.** Losing `APP_KEY` makes every encrypted column permanently
  unreadable. Losing `BLIND_INDEX_KEY` makes every customer unfindable by
  email. Back both up before the first real order, and store them somewhere
  that is not the same place as the database backup.
- **`APP_DEBUG=false` in production.** The app logs a critical error at boot if
  it is not, but nobody reads a log they are not looking at.
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
