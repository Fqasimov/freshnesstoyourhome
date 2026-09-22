# shared

Everything the website and the app must agree on, written once.

Change a file here, run `npm run sync` at the repository root, and both
surfaces change together. That is the whole arrangement.

```
shared/
  brand.json       the shop itself — phone, WhatsApp, Instagram, hours, map centre
  tokens.json      the palette, and the names of the two typefaces
  catalogue.json   every listing: price, unit, three languages, and the bundles
  delivery.json    the fifty-one areas and what each one costs
  copy.json        the words that appear on both surfaces
  products/        one photograph per product id, named after it
  products/_incoming/   photographs received but not yet matched to a listing
```

## Why this exists

Before it, the same facts lived in two or three places and quietly stopped
matching. When this folder was created:

- the app was shipping **thirty-two fewer product photographs** than the
  website, and four of the ones it did have were the wrong picture — the
  corrected duck leg, tiger prawn, mussel meat and baby octopus had been filed
  on the website only;
- **nineteen listings** existed in the website's bundled catalogue and nowhere
  else, so they could never have reached the database or the app, while nine
  others were in the database seed but had fallen out of the website's copy;
- the app offered **two delivery areas**, both placeholders charging nothing,
  where the website offered the shop's real fifty-one.

Nobody had done anything wrong. There was simply no way to write any of it
once.

## What is generated

Never edit these. `npm run sync` overwrites them and `npm run check` fails the
build until it has been run.

| Generated | From | Read by |
| --- | --- | --- |
| `web/src/styles/tokens.css` | `tokens.json` | the website's CSS custom properties |
| `app/theme/palette.ts` | `tokens.json` | `app/theme/tokens.ts` |
| `web/src/data/brand.js` | `brand.json` | `CONTACT`, the WhatsApp link, the map |
| `app/lib/brand.ts` | `brand.json` | the same, in the app |
| `web/src/data/catalogue.generated.js` | `catalogue.json` | the website's bundled fallback |
| `app/lib/fallbackCatalogue.ts` | `catalogue.json` | the app's copy for a first run with no signal |
| `web/src/data/delivery.js` | `delivery.json` | the basket's zone picker |
| `app/lib/zones.ts` | `delivery.json` | the checkout's zone picker |
| `web/src/data/copy.generated.js` | `copy.json` | merged into `I18N` in `messages.js` |
| `app/lib/sharedCopy.ts` | `copy.json` | merged into `MESSAGES` in `i18n.ts` |
| `web/src/assets/products/*` | `products/` | the website's image bundle |
| `app/assets/products/*` | `products/` | the app's image bundle |
| `app/assets/products/index.ts` | `products/` | Metro's `require()` map |

The photograph copies are gitignored: the library is the only copy in the
repository. Everything else generated is committed, so a change to a colour
shows up in a diff as the two files it actually alters.

## What is deliberately *not* here

**The live catalogue.** `catalogue.json` seeds the database and is what each
surface falls back to when the API cannot be reached — it is not what the shop
sells today. Prices, names and availability are rows, edited in the admin panel
and served by `/api/catalogue`, and both surfaces prefer them. Treat any
disagreement as the database being right.

The same split holds for delivery. `delivery.json` seeds `delivery_zones` and
is where the *ranges* live, because that table holds one integer per area and
cannot say "20–25". An order is priced on the row; a customer is quoted the
range.

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

*A listing* — add it to `catalogue.json` with a price in qəpik, the three
translations and a photograph in `products/` under the same id. `npm run sync`
puts it in the website's fallback and the app's; `php artisan db:seed
--class=CatalogueSeeder` puts it in the database, which is what customers
actually see. `sort` must keep increasing down the whole file — the catalogue
endpoint orders by it alone, across every category.

*A delivery area* — add it to `delivery.json` in the shop's own order, with
`fee` as a `[low, high]` pair, then re-run the zone seeder. Equal ends mean a
flat fee.

*A word both surfaces say* — add it to `copy.json` under a `deliv.` key with
all three languages. Both `t()` implementations pick it up. If only one surface
says it, leave it in that surface's own table.

*A colour* — add it to `tokens.json` with both spellings: `css` for the custom
property (`--leaf-d`) and `app` for the TypeScript key (`leafDark`).

*Something new entirely* — add the JSON file here and a generator for each
surface in `scripts/shared-build.mjs`. The generator writes a file in the
language the surface already speaks, rather than making either bundler reach
outside its own folder; Metro will not do that without being taught to, and a
build step that works on one surface and not the other is precisely the drift
this exists to prevent.

## The generator refuses bad data

`npm run sync` and `npm run check` both validate before they write a byte. Each
check is there because getting it wrong is *silent*:

- a duplicate product or area id shadows a listing;
- a `sort` that does not increase puts the frozen croissants at the top of the
  smoked fish (this happened);
- a missing translation renders blank in one language only;
- a listing with no photograph in `products/` leaves a grey rectangle on two
  surfaces at once;
- a bundle naming a product that does not exist prices as though it were free.
