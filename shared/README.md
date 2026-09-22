# shared

Everything the website and the app must agree on, written once.

Change a file here, run `npm run sync` at the repository root, and both
surfaces change together. That is the whole arrangement.

```
shared/
  brand.json       the shop itself — phone, WhatsApp, Instagram, hours, map centre
  tokens.json      the palette, and the names of the two typefaces
  delivery.json    the fifty-one areas and what each one costs
  products/        one photograph per product id, named after it
  products/_incoming/   photographs received but not yet matched to a listing
```

## Why this exists

Before it, the same facts lived in two places and quietly stopped matching.
When this folder was created, the app was shipping **thirty-two fewer product
photographs than the website**, and four of the ones it did have were the wrong
picture — the corrected duck leg, tiger prawn, mussel meat and baby octopus had
been filed on the website only. Nobody had done anything wrong. There was
simply no way to add a photograph once.

## What is generated

Never edit these. `npm run sync` overwrites them and `npm run check` fails the
build until it has been run.

| Generated | From | Read by |
| --- | --- | --- |
| `web/src/styles/tokens.css` | `tokens.json` | the website's CSS custom properties |
| `app/theme/palette.ts` | `tokens.json` | `app/theme/tokens.ts` |
| `web/src/data/brand.js` | `brand.json` | `CONTACT`, the WhatsApp link, the map |
| `app/lib/brand.ts` | `brand.json` | the same, in the app |
| `web/src/data/delivery.js` | `delivery.json` | the basket's zone picker |
| `app/lib/zones.ts` | `delivery.json` | the checkout's zone picker |
| `web/src/assets/products/*` | `products/` | the website's image bundle |
| `app/assets/products/*` | `products/` | the app's image bundle |
| `app/assets/products/index.ts` | `products/` | Metro's `require()` map |

The photograph copies are gitignored: the library is the only copy in the
repository. Everything else generated is committed, so a change to a colour
shows up in a diff as the two files it actually alters.

## What is deliberately *not* here

**Prices, names, availability, stock.** Those live in the database and reach
both surfaces through `/api/catalogue` already. Putting them here as well would
create a second truth, and the second truth is always the one that is wrong.
The bundled catalogue each surface carries is a *fallback* for a customer with
no signal, and it says so.

**Layout, type scale, spacing, motion.** A phone held at arm's length and a
desktop page do not want the same numbers. A token shared here that has to be
overridden at every use is worse than two honest numbers.

**Copy that only one surface shows.** The app says `shop.add`; the website says
`ui.add`. They are different screens with different words, and forcing them
into one table would mean inventing a shared name for a string that exists
once.

## Adding something

*A photograph* — drop it in `products/` named after the product id
(`quadrotto-pistacchio.jpg`), run `npm run sync`. It is now in both bundles and
in the app's require map.

*A delivery area* — add it to `delivery.json` in the shop's own order, with
`fee` as a `[low, high]` pair. Equal ends mean a flat fee.

*A colour* — add it to `tokens.json` with both spellings: `css` for the custom
property (`--leaf-d`) and `app` for the TypeScript key (`leafDark`).

*Something new entirely* — add the JSON file here and a generator for each
surface in `scripts/shared-build.mjs`. The generator writes a file in the
language the surface already speaks, rather than making either bundler reach
outside its own folder; Metro will not do that without being taught to, and a
build step that works on one surface and not the other is precisely the drift
this exists to prevent.
