# Freshness To Your Home

Product catalogue and ordering site for **Freshness To Your Home** — a Baku fishmonger,
cheese room and import pantry that delivers across the city.

Static site. No build step, no dependencies, no server. Open `index.html` or drop the
folder on any host.

---

## What's in it

- **54 products** across six counters — smoked fish, fresh fish, seafood, poultry & meat,
  cheese & dairy, pastry & pantry — each with its own photograph, both names
  (English / Azerbaijani), unit, price in AZN and a short description.
- **Basket** with quantity control, persisted in `localStorage`. Nothing is charged online:
  "Send basket" opens WhatsApp with the whole order already written out, which is how the
  business actually takes orders.
- **Bilingual**, EN ⇄ AZ, switched live from the header. The basket survives the switch.
- **Per-kilo reference prices** computed automatically for anything not sold by the kilo,
  so a 400 gr lobster at 60 AZN also reads as 150 AZN/kg.
- Filtering by counter, live search across both languages, and four sort orders — all
  animated with a FLIP transition rather than a redraw.

## Layout

```
index.html                 the whole page
assets/
  css/style.css            design system + components
  js/data.js               the catalogue — products, prices, categories, contact
  js/i18n.js               all interface copy, EN + AZ
  js/app.js                rendering, filtering, basket, quick view, motion
  logo.png                 full lock-up (footer, about)
  logo-mark.png            leaf mark only (header, favicon)
  products/*.jpg           54 product photographs
```

## Updating the catalogue

Everything a shopkeeper needs to change lives in **`assets/js/data.js`**.

**Change a price** — edit `price`:

```js
{ id:'smoked-salmon', cat:'smoked', price:65, unit:{en:'1 kg',az:'1 kg',kind:'kg',qty:1}, … }
```

**Add a product** — copy an existing entry, give it a unique `id`, and save a photo as
`assets/products/<id>.jpg`. The image path is derived from the `id`, so nothing else needs
wiring up. Bump the `kicker` count on its category while you're there.

`unit.kind` drives the per-kilo badge:

| `kind`  | meaning                | badge                     |
|---------|------------------------|---------------------------|
| `kg`    | sold by the kilo       | only if `qty` isn't 1     |
| `g`     | fixed weight in `qty`  | yes, computed from `qty`  |
| `pc`    | per piece              | no                        |
| `pack`  | per pack               | no                        |

**Two sizes of one product** — add a `variants` array (see `red-caviar`). The card opens
the quick view so the customer picks a size before it reaches the basket.

**Mark a product as a pick** — set `star:true`. It gains a "Chef's pick" tag and joins the
*This week's catch* slider.

**Interface wording** lives in `assets/js/i18n.js`, English and Azerbaijani side by side.
**Phone and WhatsApp number** are in the `CONTACT` object at the top of `data.js`.

## Design

Palette sampled straight off the printed boards: leaf `#84AB58`, deep forest `#2C4223`,
brick `#90452E`, cream `#F6F3EA`, acid yellow `#EFE24E`. Fraunces for display, Inter for
text, a paper grain over the whole sheet. Every colour, spacing step and easing curve is a
custom property at the top of `style.css`.

Motion respects `prefers-reduced-motion` throughout.

## Product photography

The photographs were extracted from the shop's own catalogue boards. The script that did
it is not part of the site; to replace a photo, just overwrite
`assets/products/<id>.jpg` with a square-ish image of your own.

## Deploying

Any static host works — GitHub Pages, Netlify, Cloudflare Pages, or plain nginx. There is
nothing to compile. For GitHub Pages, enable Pages on the branch and point it at `/`.

Locally:

```sh
python3 -m http.server 8000
```

## Notes on the prices

Prices came off the catalogue boards as published and are in AZN. Two things worth
confirming with the shop before this goes live:

- **Tuna loin (50 AZN/kg) is cheaper than tuna frozen (68 AZN/kg)** on the board, which is
  the reverse of what you'd expect. It may be a grade difference, or a typo.
- Boards 10–15 of the original 15-board catalogue were never supplied, so anything on them
  is missing here.
