<script setup>
import { ref, computed, watch } from 'vue'
import { PRODUCTS, CATEGORIES } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'
import ProductCard from '../components/ProductCard.vue'

const { t, lang, nm, catName } = useI18n()
defineEmits(['add', 'peek'])

/* ── Filter state ──────────────────────────────────────────────────────── */
const query = ref('')
const category = ref('all')
const band = ref('any')
const quick = ref(new Set())
const sortBy = ref('default')

/* Open on a phone, where the sidebar is a slide-over rather than a column. */
const filtersOpen = ref(false)

/* Price bands rather than a slider: a two-thumb range is fiddly with a thumb,
   and for fifty-four products between 5 and 110 AZN four bands answer the
   question just as well. */
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

const active = computed(() =>
  (query.value.trim() ? 1 : 0) +
  (category.value !== 'all' ? 1 : 0) +
  (band.value !== 'any' ? 1 : 0) +
  quick.value.size)

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
  /* Quick picks are OR against each other — someone ticking "by weight" and
     "by the piece" means either, not the empty set those two would make if
     they were ANDed. */
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

/* Counts sit beside each section so a filter that would empty the page says so
   before it is tapped. */
const countIn = id => id === 'all' ? PRODUCTS.length : PRODUCTS.filter(p => p.cat === id).length

/* Choosing a filter on a phone should show the result, not leave the customer
   looking at the panel they just used. */
watch([category, band], () => { filtersOpen.value = false })
</script>

<template>
  <main class="cat" id="catalogue">
    <div class="wrap">
      <header class="cat__head" v-reveal>
        <RouterLink to="/" class="cat__back">← {{ t('cat.back') }}</RouterLink>
        <h1 class="display cat__h">{{ t('cat.h') }}</h1>
        <p class="lede">{{ t('cat.lede') }}</p>
      </header>

      <!-- Search and the quick picks sit above everything, because they are
           what most people reach for first. -->
      <div class="cat__tools">
        <div class="field cat__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" v-model="query" :placeholder="t('shop.search')">
          <button v-if="query" class="field__x" :aria-label="t('shop.clear')" @click="query = ''">×</button>
        </div>

        <div class="select">
          <select v-model="sortBy" :aria-label="t('sort.default')">
            <option value="default">{{ t('sort.default') }}</option>
            <option value="asc">{{ t('sort.asc') }}</option>
            <option value="desc">{{ t('sort.desc') }}</option>
            <option value="az">{{ t('sort.az') }}</option>
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>

        <button class="cat__filterbtn" @click="filtersOpen = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
          {{ t('cat.filters') }}<span v-if="active" class="cat__badge">{{ active }}</span>
        </button>
      </div>

      <div class="cat__quick">
        <button v-for="q in QUICK" :key="q.id" class="chip"
                :class="{ on: quick.has(q.id) }" @click="toggleQuick(q.id)">
          {{ t(q.key) }}
        </button>
        <button v-if="active" class="chip chip--reset" @click="reset">{{ t('cat.reset') }}</button>
      </div>

      <div class="cat__body">
        <!-- A column on a desktop, a slide-over on a phone. Same markup. -->
        <aside class="cat__side" :class="{ open: filtersOpen }" :aria-hidden="false">
          <div class="cat__sidehead">
            <span>{{ t('cat.filters') }}</span>
            <button class="x" :aria-label="t('shop.clear')" @click="filtersOpen = false">×</button>
          </div>

          <section class="fgroup">
            <h2 class="fgroup__t">{{ t('cat.sections') }}</h2>
            <ul class="flist">
              <li v-for="c in CATEGORIES" :key="c.id">
                <button class="frow" :class="{ on: category === c.id }" @click="category = c.id">
                  <span>{{ catName(c.id) }}</span><i>{{ countIn(c.id) }}</i>
                </button>
              </li>
            </ul>
          </section>

          <section class="fgroup">
            <h2 class="fgroup__t">{{ t('cat.price') }}</h2>
            <ul class="flist">
              <li v-for="b in BANDS" :key="b.id">
                <button class="frow" :class="{ on: band === b.id }" @click="band = b.id">
                  <span>{{ t(b.key) }}</span>
                </button>
              </li>
            </ul>
          </section>

          <button class="btn btn--ghost cat__resetwide" @click="reset">{{ t('cat.reset') }}</button>
        </aside>

        <div class="cat__results">
          <p class="cat__count">{{ results.length }} {{ t('cat.found') }}</p>

          <TransitionGroup v-if="results.length" name="flip" tag="div" class="grid">
            <ProductCard v-for="p in results" :key="p.id" :product="p"
                         @add="$emit('add', $event)" @peek="$emit('peek', $event)" />
          </TransitionGroup>

          <div v-else class="empty">
            <h3>{{ t('ui.empty.t') }}</h3>
            <p>{{ t('cat.none') }}</p>
            <button class="btn btn--ghost" style="margin-top:16px" @click="reset">{{ t('cat.reset') }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="cat__scrim" :class="{ on: filtersOpen }" @click="filtersOpen = false"></div>
  </main>
</template>

<style scoped>
.cat{ padding:calc(var(--nav-h) + clamp(24px,4vw,54px)) 0 clamp(64px,8vw,110px); }

.cat__head{ margin-bottom:clamp(22px,3vw,34px); }
.cat__back{
  display:inline-block; margin-bottom:14px;
  font-size:.8rem; letter-spacing:.1em; text-transform:uppercase;
  color:var(--ink-3); text-decoration:none;
}
.cat__back:hover{ color:var(--forest); }
.cat__h{ margin:0 0 10px; }

/* Tools row -------------------------------------------------------------- */
.cat__tools{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:14px; }
.cat__search{ flex:1 1 260px; max-width:420px; }
.field{ display:flex; align-items:center; gap:9px; border-bottom:1px solid var(--line); padding:6px 2px; }
.field svg{ width:15px; height:15px; color:var(--ink-3); flex:none; }
.field input{ border:0; background:none; outline:none; width:100%; font-size:.9rem; padding:2px 0; }
.field input::placeholder{ color:var(--ink-3); }
.field:focus-within{ border-color:var(--ink); }
.field__x{ border:0; background:none; color:var(--ink-3); font-size:1.1rem; line-height:1; cursor:pointer; padding:0 2px; }
.field__x:hover{ color:var(--ink); }

.select{ position:relative; display:flex; align-items:center; }
.select select{
  appearance:none; -webkit-appearance:none;
  border:1px solid var(--line); border-radius:100px; padding:9px 34px 9px 15px;
  font-size:.83rem; background:none; cursor:pointer; outline:none;
  transition:border-color .35s var(--ease);
}
.select select:hover{ border-color:var(--ink); }
.select svg{ position:absolute; right:13px; width:11px; height:11px; pointer-events:none; color:var(--ink-3); }

/* Only a phone needs this: the sidebar is already on screen above 900px. */
.cat__filterbtn{
  display:none; align-items:center; gap:8px;
  border:1px solid var(--line); border-radius:100px; padding:9px 16px;
  font-size:.83rem; background:none; cursor:pointer;
}
.cat__filterbtn svg{ width:15px; height:15px; }
.cat__badge{
  display:grid; place-items:center; min-width:19px; height:19px; padding:0 5px;
  background:var(--forest); color:var(--paper); border-radius:100px;
  font-size:.68rem; font-weight:700;
}

.cat__quick{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:clamp(20px,2.6vw,30px); }
.chip{
  border:1px solid var(--line); border-radius:100px; padding:8px 15px;
  font-size:.83rem; color:var(--ink-2); background:none; cursor:pointer; white-space:nowrap;
  transition:background .35s var(--ease), color .35s var(--ease), border-color .35s var(--ease), transform .3s var(--ease-out);
}
.chip:hover{ border-color:var(--ink); transform:translateY(-1px); }
.chip.on{ background:var(--forest); border-color:var(--forest); color:var(--paper); }
.chip--reset{ color:var(--brick); border-color:color-mix(in srgb, var(--brick) 40%, transparent); }

/* Body ------------------------------------------------------------------- */
.cat__body{ display:grid; grid-template-columns:232px 1fr; gap:clamp(24px,3vw,44px); align-items:start; }

.cat__side{ position:sticky; top:calc(var(--nav-h) + 18px); }
.cat__sidehead{ display:none; }

.fgroup + .fgroup{ margin-top:26px; }
.fgroup__t{
  margin:0 0 10px;
  font-size:.72rem; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-3);
}
.flist{ list-style:none; margin:0; padding:0; }
.frow{
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  width:100%; border:0; background:none; cursor:pointer;
  padding:9px 10px; margin-left:-10px; border-radius:var(--radius);
  font-size:.92rem; color:var(--ink-2); text-align:left;
  transition:background .3s var(--ease), color .3s var(--ease);
}
.frow:hover{ background:var(--paper-2); color:var(--ink); }
.frow.on{ background:var(--forest); color:var(--paper); font-weight:600; }
.frow i{ font-style:normal; font-size:.74rem; opacity:.55; font-variant-numeric:tabular-nums; }
.frow.on i{ opacity:.75; }

.cat__resetwide{ width:100%; margin-top:26px; }

.cat__count{
  margin:0 0 16px;
  font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-3);
}

.cat__scrim{
  position:fixed; inset:0; z-index:290; background:rgba(27,41,22,.5);
  opacity:0; visibility:hidden; transition:opacity .4s var(--ease), visibility .4s;
}

@media (max-width:900px){
  .cat__filterbtn{ display:inline-flex; }
  .cat__body{ grid-template-columns:1fr; }

  .cat__side{
    position:fixed; inset:0 auto 0 0; z-index:300;
    width:min(310px,86vw);
    background:var(--paper); padding:20px var(--gutter) 30px;
    overflow-y:auto;
    transform:translateX(-101%);
    transition:transform .5s var(--ease-out);
    box-shadow:14px 0 44px rgba(0,0,0,.16);
  }
  .cat__side.open{ transform:none; }
  .cat__scrim.on{ opacity:1; visibility:visible; }

  .cat__sidehead{
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:20px; padding-bottom:14px; border-bottom:1px solid var(--line);
    font-family:var(--display); font-size:1.2rem;
  }
  .cat__sidehead .x{
    width:34px; height:34px; border:1px solid var(--line); border-radius:50%;
    background:none; cursor:pointer; font-size:1.1rem; line-height:1;
  }
}
</style>
