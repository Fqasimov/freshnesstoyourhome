# Freshness To Your Home

Product catalogue and ordering site for **Freshness To Your Home** — a Baku fishmonger,
cheese room and import pantry that delivers across the city.

Vue 3 + Vite. Bilingual (Azerbaijani / English), 54 products, basket handed off to
WhatsApp.

---

## Running it

```sh
npm install
npm run dev        # dev server with hot reload
npm run build      # → dist/         static site, hashed assets
npm run preview    # serve the production build
npm run build:single   # → dist-single/index.html, one self-contained file
```

`build:single` inlines every script, style and photograph as a data URI, producing a
single HTML file that runs from `file://`. It exists for previews and one-file hosting;
for a real deployment use `npm run build` and upload `dist/`.

## What's in it

- **54 products** across six counters — smoked fish, fresh fish, seafood, poultry & meat,
  cheese & dairy, pastry & pantry — each with its own photograph, both names, unit, price
  in AZN and a short description.
- **Basket** with quantity control, persisted in `localStorage`. Nothing is charged
  online: "Send basket" opens WhatsApp with the order already written out, which is how
  the business actually takes orders.
- **Bilingual**, AZ ⇄ EN, switched live. Azerbaijani is the default for a first-time
  visitor; a saved choice wins. The basket survives the switch.
- **Per-kilo reference prices** computed for anything not sold by the kilo, so a 400 gr
  lobster at 60 AZN also reads as 150 AZN/kg.
- **Opening sequence** — the brand mark assembling itself, then a bloom of ripples.
  Plays once per browser tab, skips on any interaction, and is skipped outright under
  `prefers-reduced-motion`.
- Filtering by counter, search across both languages, four sort orders — reflowed with
  `<TransitionGroup>`, so cards slide to their new positions instead of redrawing.

## Layout

```
index.html               Vite entry
vite.config.js           two build modes: hashed assets, or one inlined file
src/
  main.js                app bootstrap, favicon injection
  App.vue                composition root: sections, overlays, add-to-basket flow
  components/            16 single-file components
  composables/
    useI18n.js           language state + translation helpers
    useCart.js           basket state, totals, WhatsApp composition
    useMotion.js         reduced-motion flag, toast, fly-to-basket
  directives/reveal.js   v-reveal — fade-up on first scroll into view
  data/
    catalogue.js         products, categories, contact, price helpers
    messages.js          all interface copy, AZ + EN
  styles/base.css        design tokens, reset, typography, shared primitives
  assets/products/       54 product photographs
```

Component-specific CSS lives in each `.vue` file as `<style scoped>`; only tokens and
genuinely shared primitives (`.btn`, `.wrap`, `.card` typography scale) are global.

## Updating the catalogue

Everything a shopkeeper needs to change lives in **`src/data/catalogue.js`**.

**Change a price** — edit `price`:

```js
{ id:'smoked-salmon', cat:'smoked', price:65, unit:{en:'1 kg',az:'1 kg',kind:'kg',qty:1}, … }
```

**Add a product** — copy an existing entry, give it a unique `id`, and save a photo as
`src/assets/products/<id>.jpg`. Vite resolves photos by `id` at build time, so a missing
file warns in dev rather than 404-ing in production. Bump the `kicker` count on its
category while you're there.

`unit.kind` drives the per-kilo badge:

| `kind`  | meaning                | badge                     |
|---------|------------------------|---------------------------|
| `kg`    | sold by the kilo       | only if `qty` isn't 1     |
| `g`     | fixed weight in `qty`  | yes, computed from `qty`  |
| `pc`    | per piece              | no                        |
| `pack`  | per pack               | no                        |

**Two sizes of one product** — add a `variants` array (see `red-caviar`). The card opens
the quick view so the customer picks a size before it reaches the basket.

**Mark a product as a pick** — set `star:true`. It gains a "Chef's pick" tag and joins
the *This week's catch* slider.

**Interface wording** lives in `src/data/messages.js`, Azerbaijani and English side by
side. **Phone and WhatsApp number** are in the `CONTACT` object in `catalogue.js`.

## Design

Palette sampled straight off the shop's printed boards: leaf `#84AB58`, deep forest
`#2C4223`, brick `#90452E`, cream `#F6F3EA`, acid yellow `#EFE24E`. Fraunces for display,
Inter for text, a paper grain over the whole sheet. Every colour, spacing step and easing
curve is a custom property at the top of `src/styles/base.css`.

Motion respects `prefers-reduced-motion` throughout.

## Product photography

The photographs were extracted from the shop's own catalogue boards. To replace one,
overwrite `src/assets/products/<id>.jpg` with a square-ish image of your own.

## Deploying

`npm run build`, then upload `dist/`. Any static host works — GitHub Pages, Netlify,
Cloudflare Pages, plain nginx. `base` is `./`, so the build runs from a subdirectory too.

## Notes on the prices

Prices came off the catalogue boards as published and are in AZN. Two things worth
confirming with the shop:

- **Tuna loin (50 AZN/kg) is cheaper than tuna frozen (68 AZN/kg)** on the board, which
  is the reverse of what you'd expect. It may be a grade difference, or a typo.
- Boards 10–15 of the original 15-board catalogue were never supplied, so anything on
  them is missing here.

## History

This started as a no-build vanilla HTML/CSS/JS site; that version is preserved in git at
commit `bb57703`. The port to Vue kept the markup, styling and behaviour intact — the
main structural wins were `<TransitionGroup>` replacing a hand-rolled FLIP animation,
`<Transition>` replacing class-toggled overlay visibility, and shared state moving out
of module globals into composables.
