<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { PRODUCTS, CATEGORIES } from '../data/catalogue'
import { CATEGORY_LOOK } from '../data/brand'
import { useI18n } from '../composables/useI18n'
import { glideTo } from '../composables/glide'
import ProductCard from '../components/ProductCard.vue'
import SetsSection from '../components/SetsSection.vue'
import BIcon from '../components/BIcon.vue'

/**
 * The catalogue, built the way the app's is: browse by picture first, then by
 * row. A search pill, the best sellers as one wide tile, every category as a
 * tile with its photograph breaking out of the corner, then the shelf itself
 * with the categories as chips above it — the same pieces in the same order,
 * so someone who shops in the app is never lost on the website.
 */
const { t, lang, nm, catName } = useI18n()
defineEmits(['add', 'add-set', 'peek'])

/* ── Filter state ──────────────────────────────────────────────────────── */
const route = useRoute()
/* /kataloq?q=skumbriya opens the catalogue already searching — what the tag
   links in the footer, and anyone sharing a search, rely on. */
const query = ref(typeof route.query.q === 'string' ? route.query.q.slice(0, 60) : '')
watch(() => route.query.q, q => { query.value = typeof q === 'string' ? q.slice(0, 60) : '' })
const category = ref('all')
const band = ref('any')
const quick = ref(new Set())
const sortBy = ref('default')
const sheet = ref(false)

/* Price bands rather than a slider: a two-thumb range is fiddly with a thumb,
   and for this many products four bands answer the question as well. */
const BANDS = [
  { id: 'any', key: 'cat.any', test: () => true },
  { id: 'under', key: 'price.under', test: p => p.price < 20 },
  { id: 'mid', key: 'price.mid', test: p => p.price >= 20 && p.price < 50 },
  { id: 'high', key: 'price.high', test: p => p.price >= 50 && p.price < 100 },
  { id: 'top', key: 'price.top', test: p => p.price >= 100 },
]

const QUICK = [
  { id: 'popular', key: 'quick.popular', test: p => p.popular },
  { id: 'weighed', key: 'quick.weighed', test: p => p.unit?.kind === 'kg' },
  { id: 'piece', key: 'quick.piece', test: p => p.unit?.kind !== 'kg' },
]

const SORTS = [
  { id: 'default', key: 'sort.default' },
  { id: 'asc', key: 'sort.asc' },
  { id: 'desc', key: 'sort.desc' },
  { id: 'az', key: 'sort.az' },
]

function toggleQuick (id) {
  const next = new Set(quick.value)
  next.has(id) ? next.delete(id) : next.add(id)
  quick.value = next
}

function reset () {
  query.value = ''
  category.value = 'all'
  band.value = 'any'
  quick.value = new Set()
  sortBy.value = 'default'
}

/* What is narrowing the list, counted — the badge on the filter button and
   the switch that hides the tiles once somebody is hunting for one thing. */
const active = computed(() =>
  (query.value.trim() ? 1 : 0) +
  (category.value !== 'all' ? 1 : 0) +
  (band.value !== 'any' ? 1 : 0) +
  quick.value.size)
const sheetActive = computed(() => (band.value !== 'any' ? 1 : 0) + quick.value.size)

/* ── Results ───────────────────────────────────────────────────────────── */
function matches (p, q) {
  /* Spans all three languages, so "krevet" finds the prawns whichever one the
     page happens to be in. */
  return `${p.en} ${p.az} ${p.ru} ${p.den} ${p.daz} ${p.dru} ${catName(p.cat)}`
    .toLowerCase().includes(q)
}

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  const bandTest = BANDS.find(b => b.id === band.value)?.test ?? (() => true)
  /* Quick picks are OR against each other: "by weight" and "by the piece"
     together mean either, not the empty set an AND would make. */
  const picks = QUICK.filter(x => quick.value.has(x.id))

  let list = PRODUCTS.filter(p =>
    (category.value === 'all' || p.cat === category.value) &&
    bandTest(p) &&
    (picks.length === 0 || picks.some(x => x.test(p))) &&
    (!q || matches(p, q)))

  if (sortBy.value === 'asc') list = [...list].sort((a, b) => a.price - b.price)
  if (sortBy.value === 'desc') list = [...list].sort((a, b) => b.price - a.price)
  if (sortBy.value === 'az') list = [...list].sort((a, b) => nm(a).localeCompare(nm(b), lang.value))
  return list
})

/* ── Tiles ─────────────────────────────────────────────────────────────── */
const photoOf = id => PRODUCTS.find(p => p.id === id)?.img
const tiles = computed(() => CATEGORIES.filter(c => c.id !== 'all').map(c => {
  const items = PRODUCTS.filter(p => p.cat === c.id)
  const look = CATEGORY_LOOK[c.id] ?? { bg: 'var(--paper-2)', ink: 'var(--ink-2)', photo: '' }
  return { id: c.id, look, count: items.length, photo: photoOf(look.photo) ?? items[0]?.img }
}).filter(x => x.count > 0))

const popular = computed(() => PRODUCTS.filter(p => p.popular))
const fan = computed(() => popular.value.map(p => p.img).filter(Boolean).slice(0, 3))

/* The tiles are a way in, not a second copy of the shelf: once anything is
   narrowing the list they step aside and the results come up to meet it. */
const browsing = computed(() => active.value === 0)

const shelf = ref(null)
async function openCategory (id) {
  category.value = id
  await nextTick()
  glideTo(shelf.value)
}
async function openPopular () {
  quick.value = new Set(['popular'])
  await nextTick()
  glideTo(shelf.value)
}

/* The chosen chip is always in view, so the row says where you are. */
const chipRow = ref(null)
watch(category, async () => {
  await nextTick()
  const row = chipRow.value
  const on = row?.querySelector('.chip.on')
  if (!row || !on) return
  const left = on.offsetLeft - (row.clientWidth - on.clientWidth) / 2
  row.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
})

const sortLabel = computed(() => t(SORTS.find(s => s.id === sortBy.value)?.key ?? 'sort.default'))
</script>

<template>
  <main class="cat" id="catalogue">
    <div class="wrap">
      <header class="cat__head">
        <RouterLink to="/" class="cat__back"><BIcon name="arrow-left" :size="12" /> {{ t('cat.back') }}</RouterLink>
        <h1 class="cat__h">{{ t('cat.h') }}</h1>

        <label class="search">
          <span class="visually-hidden">{{ t('shop.search') }}</span>
          <input type="search" v-model="query" :placeholder="t('shop.search')" enterkeyhint="search">
          <button v-if="query" type="button" class="search__x" :aria-label="t('shop.clear')" @click="query = ''">
            <BIcon name="x-lg" :size="13" />
          </button>
          <span class="search__btn" aria-hidden="true"><BIcon name="search" :size="16" /></span>
        </label>
      </header>

      <!-- Browse by picture: the best sellers wide, then one tile a category. -->
      <section v-if="browsing" class="browse" :aria-label="t('cat.sections')">
          <button v-if="popular.length" type="button" class="pop" style="--i:0" @click="openPopular">
            <span class="pop__text">
              <span class="pop__tag"><BIcon name="fire" :size="11" />{{ t('cat.hit') }}</span>
              <span class="pop__title">{{ t('cat.popular') }}</span>
              <span class="pop__lead">{{ t('cat.popularLead') }}</span>
            </span>
            <span class="pop__fan" aria-hidden="true">
              <img v-for="(src, i) in fan" :key="i" :src="src" alt="" :style="{ '--n': i }">
            </span>
          </button>

          <button v-for="(c, i) in tiles" :key="c.id" type="button" class="tile"
                  :style="{ background: c.look.bg, '--i': i + 1 }" @click="openCategory(c.id)">
            <span class="tile__name">{{ catName(c.id) }}</span>
            <span class="tile__count" :style="{ color: c.look.ink }">{{ c.count }}</span>
            <img v-if="c.photo" class="tile__plate" :src="c.photo" alt="" loading="lazy">
          </button>
      </section>

      <SetsSection v-if="browsing" compact @add="$emit('add-set', $event)" />

      <!-- The shelf. Categories as chips above it, as in the app. -->
      <div ref="shelf" class="bar">
        <div ref="chipRow" class="chips" role="tablist" :aria-label="t('cat.sections')">
          <button type="button" role="tab" class="chip" :class="{ on: category === 'all' }"
                  :aria-selected="category === 'all'" @click="category = 'all'">
            {{ t('cat.all') }}
          </button>
          <button v-for="c in tiles" :key="c.id" type="button" role="tab" class="chip"
                  :class="{ on: category === c.id }" :aria-selected="category === c.id"
                  @click="category = c.id">
            {{ catName(c.id) }}
          </button>
        </div>
      </div>

      <div class="tools">
        <h2 class="tools__title">
          {{ category === 'all' ? (quick.has('popular') && quick.size === 1 ? t('cat.popular') : t('cat.all')) : catName(category) }}
          <span>{{ t('cat.count').replace('{n}', results.length) }}</span>
        </h2>
        <div class="tools__right">
          <button type="button" class="tool" :aria-expanded="sheet" aria-controls="cat-filters" @click="sheet = true">
            <BIcon name="sliders" :size="15" /> {{ t('cat.filters') }}
            <span v-if="sheetActive" class="tool__badge">{{ sheetActive }}</span>
          </button>
          <label class="tool tool--sort">
            <BIcon name="arrow-down-up" :size="14" />
            <span>{{ sortLabel }}</span>
            <select v-model="sortBy" :aria-label="t('sort.default')">
              <option v-for="s in SORTS" :key="s.id" :value="s.id">{{ t(s.key) }}</option>
            </select>
          </label>
          <button v-if="active" type="button" class="tool tool--reset" @click="reset">{{ t('cat.reset') }}</button>
        </div>
      </div>

      <TransitionGroup v-if="results.length" name="flip" tag="div" class="shelf">
        <ProductCard v-for="p in results" :key="p.id" :product="p"
                     @add="$emit('add', $event)" @peek="$emit('peek', $event)" />
      </TransitionGroup>

      <div v-else class="empty">
        <BIcon name="search" :size="28" />
        <h3>{{ t('ui.empty.t') }}</h3>
        <p>{{ t('cat.none') }}</p>
        <button type="button" class="tool tool--reset" @click="reset">{{ t('cat.reset') }}</button>
      </div>
    </div>

    <!-- Filters: a sheet from the side at every width, as the app's is a
         sheet from the bottom. The shelf keeps the whole page. -->
    <div class="scrim" :class="{ on: sheet }" @click="sheet = false"></div>
    <aside id="cat-filters" class="sheet" :class="{ open: sheet }" :aria-hidden="!sheet" :inert="!sheet">
      <div class="sheet__head">
        <span>{{ t('cat.filters') }}</span>
        <button type="button" class="sheet__x" :aria-label="t('shop.clear')" @click="sheet = false">
          <BIcon name="x-lg" :size="14" />
        </button>
      </div>

      <section class="fgroup">
        <h3 class="fgroup__t">{{ t('cat.quick') }}</h3>
        <div class="fchips">
          <button v-for="q in QUICK" :key="q.id" type="button" class="chip" :class="{ on: quick.has(q.id) }"
                  :aria-pressed="quick.has(q.id)" @click="toggleQuick(q.id)">{{ t(q.key) }}</button>
        </div>
      </section>

      <section class="fgroup">
        <h3 class="fgroup__t">{{ t('cat.price') }}</h3>
        <div class="fradio">
          <button v-for="b in BANDS" :key="b.id" type="button" class="frow" role="radio"
                  :aria-checked="band === b.id" @click="band = b.id">
            <span>{{ t(b.key) }}</span><i :class="{ on: band === b.id }"></i>
          </button>
        </div>
      </section>

      <div class="sheet__foot">
        <button type="button" class="tool tool--reset" @click="band = 'any'; quick = new Set()">{{ t('cat.reset') }}</button>
        <button type="button" class="show" @click="sheet = false">
          {{ t('cat.show') }} · {{ results.length }}
        </button>
      </div>
    </aside>
  </main>
</template>

<style scoped>
/* One easing for everything that answers a hand: fast out, soft landing.
   The drawer curve is the one iOS sheets use. */
.cat{
  --snap: cubic-bezier(.23,1,.32,1);
  --drawer: cubic-bezier(.32,.72,0,1);
  --r: 22px;
  padding:calc(var(--nav-h) + clamp(20px,3vw,40px)) 0 clamp(64px,8vw,110px);
}

/* Head -------------------------------------------------------------------- */
.cat__head{ margin-bottom:clamp(18px,2.4vw,28px); }
.cat__back{
  display:inline-flex; align-items:center; gap:6px; margin-bottom:10px;
  font-size:.78rem; letter-spacing:.08em; text-transform:uppercase;
  color:var(--ink-3); text-decoration:none;
}
.cat__back:hover{ color:var(--forest); }
.cat__h{
  margin:0 0 16px; font-family:var(--display); font-weight:600;
  font-size:clamp(2.1rem,4.4vw,3.4rem); line-height:1; letter-spacing:-.02em;
}

.search{
  display:flex; align-items:center; gap:6px; max-width:640px; height:52px;
  padding:0 5px 0 20px; border:2px solid var(--forest); border-radius:999px; background:#fff;
  transition:box-shadow .2s var(--snap);
}
.search:focus-within{ box-shadow:0 0 0 4px color-mix(in srgb, var(--forest) 16%, transparent); }
.search input{
  flex:1; min-width:0; border:0; outline:none; background:none;
  font-size:1rem; color:var(--ink);
}
.search input::placeholder{ color:#8C9384; }
.search input::-webkit-search-cancel-button{ display:none; }
.search__x{
  width:32px; height:32px; border:0; border-radius:50%; background:var(--paper-2); color:var(--ink-2);
  display:grid; place-items:center; cursor:pointer;
}
.search__btn{
  width:40px; height:40px; flex:none; border-radius:50%; background:var(--forest); color:#fff;
  display:grid; place-items:center;
}

/* Tiles ------------------------------------------------------------------- */
/* Five across on a desktop: the best sellers take a two-by-two block and the
   six categories fill the rest, so the whole way in fits one screen. */
.browse{
  display:grid; grid-template-columns:repeat(5,1fr); gap:12px;
  margin-bottom:clamp(24px,3vw,36px);
}
.pop, .tile{
  position:relative; overflow:hidden; border:0; border-radius:var(--r); cursor:pointer;
  display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-start;
  text-align:left; color:var(--ink);
  animation:rise .38s var(--snap) both; animation-delay:calc(var(--i) * 40ms);
  transition:transform .16s var(--snap), box-shadow .25s var(--snap);
}
.pop:active, .tile:active{ transform:scale(.97); }
.pop:focus-visible, .tile:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--paper), 0 0 0 5px var(--forest); }
@keyframes rise{ from{ opacity:0; transform:translateY(10px); } }

.pop{
  grid-column:span 2; grid-row:span 2; padding:22px 24px;
  background:var(--forest); color:#fff;
}
.pop__text{ position:relative; z-index:1; display:flex; flex-direction:column; align-items:flex-start; }
.pop__tag{
  display:inline-flex; align-items:center; gap:4px; margin-bottom:10px;
  padding:3px 9px; border-radius:999px; background:var(--acid); color:var(--ink);
  font-size:.7rem; font-weight:700;
}
.pop__title{ font-family:var(--display); font-weight:600; font-size:clamp(1.6rem,2.6vw,2.1rem); line-height:1; }
.pop__lead{ margin-top:6px; font-size:.84rem; font-weight:500; color:var(--leaf-xl); }
/* Three plates fanned across the lower half of the block. */
.pop__fan{ position:absolute; left:24px; right:24px; bottom:24px; height:52%; }
.pop__fan img{
  position:absolute; bottom:0; width:clamp(110px,13vw,170px); aspect-ratio:1; border-radius:50%; object-fit:cover;
  border:4px solid rgba(255,255,255,.85); background:var(--paper-3);
  right:calc(var(--n) * 28%); bottom:calc((var(--n) - 1) * -10px + 10px);
  transform:rotate(calc((var(--n) - 1) * 6deg)); z-index:calc(3 - var(--n));
  box-shadow:0 10px 24px -12px rgba(0,0,0,.4);
  transition:transform .3s var(--snap);
}

.tile{ aspect-ratio:1/1; padding:14px 14px 0; }
.tile__name{ position:relative; z-index:1; max-width:92%; font-size:.98rem; font-weight:600; line-height:1.22; }
.tile__count{ position:relative; z-index:1; margin-top:4px; font-size:.78rem; font-weight:700; opacity:.85; }
.tile__plate{
  position:absolute; width:70%; aspect-ratio:1; right:-12%; bottom:-12%;
  border-radius:50%; object-fit:cover; background:var(--paper-3);
  border:4px solid rgba(255,255,255,.75);
  transition:transform .35s var(--snap);
}

@media (hover:hover) and (pointer:fine){
  .tile:hover .tile__plate{ transform:scale(1.05) rotate(-3deg); }
  .pop:hover .pop__fan img{ transform:rotate(calc((var(--n) - 1) * 10deg)) translateY(-3px); }
  .pop:hover, .tile:hover{ box-shadow:0 16px 34px -22px rgba(27,41,22,.5); }
}


/* Shelf bar --------------------------------------------------------------- */
.bar{
  position:sticky; top:var(--nav-h); z-index:20;
  margin:0 calc(var(--gutter) * -1); padding:10px var(--gutter);
  background:color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  scroll-margin-top:var(--nav-h);
}
.chips{
  display:flex; gap:8px; overflow-x:auto; scrollbar-width:none;
  margin:0 calc(var(--gutter) * -1); padding:0 var(--gutter);
}
.chips::-webkit-scrollbar{ display:none; }
.chip{
  flex:none; border:0; border-radius:999px; padding:10px 16px; cursor:pointer;
  background:var(--paper-2); color:var(--ink-2); font-size:.86rem; font-weight:600; white-space:nowrap;
  transition:background .2s var(--snap), color .2s var(--snap), transform .16s var(--snap);
}
.chip:active{ transform:scale(.96); }
.chip.on{ background:var(--forest); color:#fff; }
@media (hover:hover) and (pointer:fine){ .chip:not(.on):hover{ background:var(--paper-3); color:var(--ink); } }

/* Tools ------------------------------------------------------------------- */
.tools{
  display:flex; align-items:flex-end; justify-content:space-between; gap:12px 20px; flex-wrap:wrap;
  margin:18px 0 18px;
}
.tools__title{
  margin:0; font-family:var(--display); font-weight:600; font-size:clamp(1.6rem,2.8vw,2.2rem); line-height:1.05;
}
.tools__title span{ display:block; margin-top:4px; font-family:var(--sans); font-size:.8rem; font-weight:500; color:var(--ink-3); }
.tools__right{ display:flex; align-items:center; gap:6px 18px; flex-wrap:wrap; }
.tool{
  position:relative; display:inline-flex; align-items:center; gap:7px;
  border:0; background:none; padding:8px 2px; cursor:pointer;
  font-size:.92rem; font-weight:600; color:var(--forest);
  transition:color .2s var(--snap), transform .16s var(--snap);
}
.tool:active{ transform:scale(.97); }
.tool__badge{
  display:grid; place-items:center; min-width:19px; height:19px; padding:0 5px; border-radius:999px;
  background:var(--forest); color:#fff; font-size:.7rem; font-weight:700;
}
.tool--sort select{ position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; }
.tool--sort:focus-within{ outline:2px solid var(--forest); outline-offset:3px; border-radius:6px; }
.tool--reset{ color:var(--brick); }
@media (hover:hover) and (pointer:fine){ .tool:hover{ color:var(--forest-2); } .tool--reset:hover{ color:var(--brick-l); } }

/* Products ---------------------------------------------------------------- */
.shelf{
  display:grid; grid-template-columns:repeat(auto-fill, minmax(176px, 1fr));
  gap:26px 16px;
}
.flip-move{ transition:transform .35s var(--snap); }
.flip-enter-active{ transition:opacity .2s var(--snap), transform .25s var(--snap); }
.flip-enter-from{ opacity:0; transform:scale(.96); }
.flip-leave-active{ display:none; }

.empty{
  display:flex; flex-direction:column; align-items:center; gap:6px;
  padding:clamp(40px,8vw,80px) 20px; text-align:center; color:var(--ink-3);
}
.empty h3{ margin:8px 0 0; font-family:var(--display); font-size:1.6rem; color:var(--ink); }
.empty p{ margin:0 0 6px; }

/* Filter sheet ------------------------------------------------------------ */
.scrim{
  position:fixed; inset:0; z-index:290; background:rgba(27,41,22,.42);
  opacity:0; visibility:hidden; transition:opacity .3s var(--snap), visibility .3s;
}
.scrim.on{ opacity:1; visibility:visible; }
.sheet{
  position:fixed; z-index:300; top:0; right:0; bottom:0; width:min(380px, 92vw);
  display:flex; flex-direction:column; gap:26px;
  padding:22px 24px calc(22px + env(safe-area-inset-bottom));
  background:var(--paper); overflow-y:auto;
  box-shadow:-18px 0 50px rgba(27,41,22,.18);
  transform:translateX(102%); transition:transform .4s var(--drawer);
}
.sheet.open{ transform:none; }
.sheet__head{
  display:flex; align-items:center; justify-content:space-between;
  font-family:var(--display); font-weight:600; font-size:1.7rem;
}
.sheet__x{
  width:38px; height:38px; border:0; border-radius:50%; background:var(--paper-2); color:var(--ink);
  display:grid; place-items:center; cursor:pointer;
}
.fgroup__t{
  margin:0 0 12px; font-size:.74rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-3);
}
.fchips{ display:flex; flex-wrap:wrap; gap:8px; }
.fradio{ display:flex; flex-direction:column; }
.frow{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:14px 0; border:0; border-bottom:1px solid var(--line-soft); background:none; cursor:pointer;
  font-size:.98rem; color:var(--ink); text-align:left;
}
.frow i{
  width:22px; height:22px; flex:none; border-radius:50%; border:2px solid var(--paper-3);
  display:grid; place-items:center; transition:border-color .2s var(--snap);
}
.frow i::after{
  content:''; width:10px; height:10px; border-radius:50%; background:var(--forest);
  transform:scale(0); transition:transform .2s var(--snap);
}
.frow i.on{ border-color:var(--forest); }
.frow i.on::after{ transform:scale(1); }
.frow[aria-checked="true"] span{ color:var(--forest); font-weight:600; }
.sheet__foot{ margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.show{
  flex:1; max-width:220px; height:50px; border:0; border-radius:999px; cursor:pointer;
  background:var(--forest); color:#fff; font-size:.95rem; font-weight:600;
  transition:transform .16s var(--snap), background .2s var(--snap);
}
.show:active{ transform:scale(.97); }

/* Phones ------------------------------------------------------------------ */
@media (max-width:1100px){
  .browse{ grid-template-columns:repeat(4,1fr); }
  .pop{ grid-row:span 1; min-height:0; }
  .pop__fan{ left:auto; top:0; bottom:0; right:14px; width:46%; height:auto; }
  .pop__fan img{ width:clamp(80px,11vw,112px); bottom:auto; top:calc(50% - 50px + (var(--n) - 1) * 10px); right:calc(var(--n) * 30%); }
}
@media (max-width:900px){
  .browse{ grid-template-columns:repeat(3,1fr); gap:10px; }
  .pop{ grid-column:1 / -1; min-height:132px; padding:16px; }
  .tile{ padding:11px 11px 0; border-radius:18px; aspect-ratio:1/1.05; }
  .tile__name{ font-size:.84rem; max-width:100%; hyphens:auto; }
  .tile__plate{ width:62%; right:-10%; bottom:-10%; border-width:3px; }
}
@media (max-width:640px){
  .pop__text{ max-width:56%; }
  .pop__title{ font-size:1.55rem; }
  .pop__fan{ width:44%; right:8px; }
  .pop__fan img{ width:70px; top:calc(50% - 35px + (var(--n) - 1) * 10px); right:calc(var(--n) * 26%); border-width:3px; }
  .shelf{ grid-template-columns:repeat(2, minmax(0,1fr)); gap:22px 12px; }
  .tools{ align-items:flex-start; flex-direction:column; gap:6px; }
  .search{ height:48px; }
}
@media (max-width:380px){
  .browse{ grid-template-columns:repeat(2,1fr); }
}

@media (prefers-reduced-motion:reduce){
  .pop, .tile{ animation:none; }
  .sheet, .scrim, .flip-move, .flip-enter-active{ transition:none; }
}
</style>
