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
bands), a search field, quick-pick buttons and sorting.

**The sidebar slides away at every width**, from one flag and one button:

- On a phone it is a slide-over that starts closed and shuts as soon as a
  choice is made, so the customer lands on the result rather than back at the
  panel they just used.
- On a desktop it is a column that folds out of the grid — the products take
  the space, going from three across to four — and it stays open when a filter
  is chosen, because there it sits beside the results rather than over them.
  Being closed is remembered, so somebody who prefers the wider grid is not
  made to say so again on every visit.

The column animates by interpolating `grid-template-columns`; a browser that
will not interpolate it snaps instead, which is a duller version of the same
behaviour rather than a broken one. A folded panel is `visibility: hidden`, so
it cannot be tabbed into.

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

## Icons

**Bootstrap Icons, and only Bootstrap Icons.** They used to be hand-drawn
inline SVGs — twenty-two of them at four stroke widths across three viewBoxes,
which is why the truck and the map pin never looked like a set.

```vue
<BIcon name="truck" />
<BIcon name="x-lg" :size="14" label="Close" />
```

Only the icons in `src/assets/icons` are in the bundle, so the other two
thousand cost nothing. To add one, copy the file across and use its name:

```bash
cp node_modules/bootstrap-icons/icons/basket.svg src/assets/icons/
```

`BIcon` owns the size, the colour and the accessibility attributes: pass
`size` rather than styling the `svg` from the parent, because the component
sets its own dimensions inline and an inline style outranks a class rule. An
icon with a `label` becomes an image with a name; one without is hidden from
screen readers, which is right when it sits next to a word that already says
the same thing.

The two SVGs left in the source are not icons — the hand-drawn rule under the
wordmark, and the mark that draws itself in the intro.

## The opening sequence

`IntroSequence.vue`, once per tab, skipped outright for reduced motion and
dismissed by a click, a key or a scroll.

The mark is **the real logo, traced to vector** rather than an impression of
it. The artwork was auto-traced off the supplied JPEG (potrace, via a script
kept out of the bundle) and split by connected components into the parts the
animation needs: one compound path for the leaf and its veins, three circles
for the seeds, and a circle fitted through the eleven dashes so the arc can be
one stroke with a `dasharray` instead of eleven. 4.3 KB of path data, sharp at
any size, and no image request before the first frame.

That compound path is drawn twice: once stroked as a hairline that draws on
with `stroke-dashoffset`, then again filled underneath as the hairline fades —
the pen passes, the ink follows.

The wordmark sits to its left and fills from the bottom up: a gradient
anchored to the bottom of the letters whose `background-size` grows from 0 to
full through `background-clip: text`, so the green climbs the letterforms
rather than sliding across them. Its top stop fades to transparent, which
keeps the rising edge soft instead of a ruled line.

It is deliberately **not** on `--ease-out` like everything else here. That
curve is front-loaded enough to look finished in under a second; this one
holds a steady climb so it reads as loading. The fill lands around 2.3s, the
overlay leaves at 3.2s.

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

### Photographs

Every row in **Məhsullar** carries its picture. Click the frame or drop a file
on it to upload, and the tag underneath says where the picture is coming from:

| | |
|---|---|
| `paketdə` | the photo that ships inside the website and app bundles — most products, still |
| `yüklənib` | a photo uploaded here, which overrides the bundled one |
| `yoxdur` | no picture anywhere; the shop front is showing an empty card |

Removing an upload falls back to the bundled picture rather than leaving a gap.
**+ Yeni məhsul** adds a product and its photo in one go — a product created
today has no bundled picture, so the upload is the only one it will have.

**Aksiyalar** has the same control. A set has never had a photograph of its
own — the site draws it as the pictures of the four things inside it — so the
tag there says `kollaj`, and uploading one replaces the collage with a single
picture of the actual box. Removing it puts the collage back.

The panel shows bundled pictures by importing them as URLs (`?url`), not as
files, so this costs a table of strings and the browser fetches only the rows
on screen.

The collage is a 2×2 at 16:9 rather than the row of four squares it used to
be, so a photographed set and an unphotographed one are the same height. Four
squares in a row are a quarter as tall as a single 16:9 picture, and mixing
them left one card's title a hundred pixels below its neighbours' — which is
exactly the state the shop is in while the photographs are being taken one at
a time.

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

## Sections

The home page, top to bottom: hero, ticker, four promises, special offers
(when at least one is switched on), most-ordered, a catalogue banner, about,
how to order, **delivery**, contact. The nav mirrors that order — Haqqımızda,
Xüsusi təkliflər, Ən çox sifariş olunan, Necə sifariş etmək olar?, Çatdırılma,
Əlaqə — with the catalogue itself living in the toolbar as a button rather
than a nav word, since it's a page you go to rather than a section you scroll
past.

**Delivery** (`DeliverySection.vue`, `#delivery`) is the one new section: what
the shop actually said about zones, the cold chain and payment, plus a terms
card. Two facts there — hours and the day-ahead notice — are deliberately not
repeated as icon cards, because the promise row right above the fold already
carries them; saying them twice would read as filler. The zones/fee/minimum
values in the terms card say "confirmed when you order" rather than a number,
because every delivery zone still ships with a zero fee — a fabricated "5
AZN" would be a lie the admin panel could not silently correct later.

## Still placeholder content

- the logo
- delivery areas and prices — the admin panel's **Zonalar** tab is where
  real numbers go in; the website reads `dl.ask` until it does
- the three bundles and their discounts, which were invented during design and
  ship switched **off** — the admin panel is what turns them on
