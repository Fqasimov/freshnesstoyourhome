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

## How the catalogue is laid out

Six **counters**, not one grid. Each is a horizontal rail carrying one
category's goods, with a number, a line saying what is on it, and its size and
price range — so the page reads as a walk past six counters rather than a wall
of fifty-four boxes.

That was the fix for a real problem: the old single grid ran to 7,583px on
desktop and 10,042px on a phone, which was 59% of the entire page. The same
products now take 5,134px and 3,952px — a 61% cut on mobile, where it hurt
most.

Three ways through, and the gentlest is the default:

| | |
|---|---|
| **Counters** | the default; browse sideways, one counter at a time |
| **Search** | a separate mode — you already know what you want, so results are a plain grid |
| **Show everything** | one button; the full 54-item grid with sorting, for anyone who wants the lot |

`ProductRail.vue` holds the rail mechanics — scroll-snap, drag-to-scroll with a
click guard, arrows, and the `--edge` variable that keeps the first card flush
with the page gutter. Arrows hide themselves when a counter already fits, since
an arrow that cannot scroll is furniture rather than affordance.

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
