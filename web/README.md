# Freshness To Your Home — website

Vue 3 + Vite. The public catalogue and the WhatsApp basket.

```bash
npm install
cp .env.example .env      # VITE_API_URL, or leave unset for a static build
npm run dev
```

## Where the prices come from

**The database, through `/api/catalogue`** — the same public endpoint the mobile
app uses. Changing a price is a row update, not a redeploy of this site.

`src/data/catalogue.js` still holds a full copy of the catalogue, but it is a
**fallback**, not the source of truth. It is what renders on first paint and
what the page falls back to when the API cannot be reached, so a customer never
meets an empty shop. Treat any disagreement with the API as the API being right.

`PRODUCTS` and `CATEGORIES` are reactive arrays mutated in place when the live
catalogue lands, so every component that already imports them updates without
knowing where the data came from.

Leaving `VITE_API_URL` unset is a legitimate way to deploy: the site then runs
entirely on the bundled catalogue, which is fine for a pure marketing build.

## Where the total comes from

**The server**, through the public `/api/orders/quote` endpoint. The browser
still computes a figure — shown while the server's is in flight, and used on a
static build — but it is never the number sent to the shop.

This matters because the basket is handed to WhatsApp as written-out text. A
total the browser worked out is a total that disagrees with the till the first
time a price changes, and the customer has already sent the message.

Bundles are excluded from the quote: they are a website-only construct whose
discount the business has not confirmed, and the API deliberately has no opinion
about them.

## Two pages

| | |
|---|---|
| `/` | hero, Aksiyalar (bundles), most-ordered, story, how it works, contact |
| `/#/kataloq` | the full catalogue, with filters |

The catalogue used to sit on the front page and it was a wall — 7,583px on
desktop and 10,042px on a phone, 59% of the whole page. It is its own
destination now, and the home page is about 5,500px: what a first-time visitor
needs, without scrolling past fifty-four products to reach the phone number.

A page you have to be told about needs telling. **"Kataloqa keçid edin" appears
five times** — as a solid button in the header toolbar (beside the basket, not
as one word among five in the nav), as the hero's primary call to action, under
the sets, as a full-width band after the most-ordered rail, and in the footer.
All five are the same `CatalogueCta` component, so the wording and the live
product count are identical everywhere; five different labels would read as five
different places rather than one door.

The catalogue page carries a left sidebar (counters with live counts, price
bands), a search field, quick-pick buttons and sorting. On a phone the sidebar
becomes a slide-over that closes as soon as a choice is made, so the customer
lands on the result rather than back at the panel they just used.

The sets appear on the catalogue page too, as a compact strip above the
products — they are things to buy, so they belong where people buy things. The
strip hides itself the moment any filter is active: somebody who has typed
"pendir" is hunting one item, and a seafood set above their results is exactly
the clutter this page was built to remove.

Price **bands** rather than a two-thumb slider: a range slider is fiddly with a
thumb, and for fifty-four products between 5 and 110 AZN four bands answer the
question just as well. Quick picks combine as OR, not AND — ticking "by weight"
and "by the piece" means either, not the empty set those would make if ANDed.

**Hash routing** (`/#/kataloq`), because this is built as static files and as a
single self-contained .html for previews. Clean paths would need the host to
rewrite unknown URLs to index.html, and a deep link would 404 anywhere that is
not configured for it. Switching is one import in `src/router.js` once there is
hosting that rewrites.

## Type

| | |
|---|---|
| **Vollkorn** | every heading, and the ticker | 
| **Onest** | body text, buttons, labels |
| **Fraunces** | the wordmark, and nothing else |

The constraint that decides this is not taste, it is coverage: the site runs in
Azerbaijani, Russian and English, so any face carrying translated text has to
have both the schwa (ə, Ə) and Cyrillic. That was checked against the actual
glyph tables rather than assumed — Manrope has no Ə, Golos Text has neither,
and **Fraunces has no Cyrillic at all**, which is why it is confined to the
brand's own name, where the text is "Freshness to your home" in every language
and can never become something else. Its `<link>` carries `&text=`, so Google
returns those thirteen letters and nothing else: 4 KB instead of 90, and any
other character falls straight through to the next font in the stack.

Vollkorn — the name means "wholegrain" — is the warm, slightly rough bookface
doing the actual work. Two things had to follow it:

- **The scale came down.** Its x-height is about half its em where Cormorant's
  was closer to a third, so the same `font-size` renders roughly a quarter
  larger to the eye. Every display size shrank, the weight went 600 → 500, and
  the leading opened from `.94`, which had been set for letters that barely
  reached it.
- **Lining figures, everywhere.** Vollkorn defaults to oldstyle numerals, so
  "1 gün" rendered as "I gün" and opening hours came out looking like IO:OO.
  Opening hours and prices are the last place to be charming about numerals.

## Goods sold by weight

Most of this catalogue is sold by the kilo, and a kilo is never exactly a kilo.
The drawer shows the server's estimate, the ceiling it would quote an app
customer, and says plainly that the courier's scales decide. The same note goes
into the WhatsApp message.

Saying so here rather than at the door is the whole difference between an
expectation and an argument.

## Tests

```bash
npm run test:api
```

Drives the built site in a real browser against a real API and checks the three
things reading the code cannot: that a price changed in the database reaches the
page, that the basket total is the server's, and that the site still works with
the API switched off. That last one matters as much as the others — a fallback
nobody tests is a fallback that has quietly stopped working.

It edits a price and puts it back, so point it at a development database.

## The admin panel

`admin.html` — a **second Vite entry**, not a route inside the site. None of it
ships to a customer browsing the shop: not the screens, not the endpoint names,
not the shape of the audit trail. `npm run build` produces both `index.html` and
`admin.html`; the single-file preview build leaves the panel out entirely.

Sign in with the same email code as everywhere else, then the server decides. A
non-admin gets 404s from `/api/admin/*` — the role middleware's convention — and
the panel shows the sign-in screen again. The token lives in `sessionStorage`
rather than `localStorage`: it dies with the tab, so a shared machine in the
shop does not stay signed in until somebody notices.

| Screen | What it is for |
|---|---|
| Bu gün | today's and tomorrow's deliveries, open orders, orders still waiting for weights, revenue, stock warnings, the last ten changes |
| Sifarişlər | the day's orders; open one to move its status, record the scales, read its history |
| Məhsullar | price, stock, shelf and "popular" per row, plus taking a whole shelf out at once |
| Aksiyalar | switch a set on, set its discount, and see what it will cost |
| Zonalar | delivery fee and minimum order per area |
| Müştərilər | masked contact details, one customer at a time in full, block/unblock |
| Jurnal | who changed what — append-only |

Every edit reaches customers on the next request: the catalogue cache is busted
by a model hook, not by remembering to call something.

### Looking at it without a server

```bash
npm run build:admin-demo     # → dist-admin-demo/admin.html
```

One self-contained file that answers from `src/admin/demo.js` instead of the
network, so the screens can be clicked through before the API is deployed. Every
number in it is invented and nothing is saved; a banner across the top says so.

It is a build mode, not a runtime switch. The real build sets no flag, which
makes the branch in `api.js` dead and lets Rollup drop it and the dynamic import
with it — the sample data does not ship with the panel the shop uses. Worth
re-checking after touching `api.js`:

```bash
grep -l 'Preview has no answer' dist/assets/admin-*.js   # must find nothing
```

## Still placeholder content

- the hero text and the "about" text
- the logo
- delivery areas and prices
- the three bundles and their discounts, which were invented during design and
  ship switched **off** — the admin panel is what turns them on
