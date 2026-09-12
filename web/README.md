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
destination now, and the home page is 5,177px: what a first-time visitor needs,
without scrolling past fifty-four products to reach the phone number.

The catalogue page carries a left sidebar (counters with live counts, price
bands), a search field, quick-pick buttons and sorting. On a phone the sidebar
becomes a slide-over that closes as soon as a choice is made, so the customer
lands on the result rather than back at the panel they just used.

Price **bands** rather than a two-thumb slider: a range slider is fiddly with a
thumb, and for fifty-four products between 5 and 110 AZN four bands answer the
question just as well. Quick picks combine as OR, not AND — ticking "by weight"
and "by the piece" means either, not the empty set those would make if ANDed.

**Hash routing** (`/#/kataloq`), because this is built as static files and as a
single self-contained .html for previews. Clean paths would need the host to
rewrite unknown URLs to index.html, and a deep link would 404 anywhere that is
not configured for it. Switching is one import in `src/router.js` once there is
hosting that rewrites.

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

## Still placeholder content

- the hero text and the "about" text
- the logo
- delivery areas and prices
- the three bundles and their discounts, which were invented during design
