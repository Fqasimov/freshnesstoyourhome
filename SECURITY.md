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
