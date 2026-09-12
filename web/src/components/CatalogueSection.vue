<script setup>
import { ref, computed } from 'vue'
import { PRODUCTS, CATEGORIES } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'
import ProductCard from './ProductCard.vue'
import ProductRail from './ProductRail.vue'

const { t, lang, nm, catName } = useI18n()
const emit = defineEmits(['add', 'peek'])

const query = ref('')
const sortBy = ref('default')

/* Two ways through the shop, and the default is the gentler one.
   - counters: six rails, walked past like counters in a delicatessen
   - grid:     every product at once, for somebody who wants the whole list
   Searching switches to results regardless, because search is a third mode:
   you already know what you are looking for. */
const showAll = ref(false)

const searching = computed(() => query.value.trim().length > 0)

function matches (p, q) {
  /* Spans all three languages, so "krevet" finds the prawns whichever one the
     page happens to be in. */
  return `${p.en} ${p.az} ${p.ru} ${p.den} ${p.daz} ${p.dru} ${catName(p.cat)}`
    .toLowerCase().includes(q)
}

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? PRODUCTS.filter(p => matches(p, q)) : []
})

function sorted (list) {
  if (sortBy.value === 'asc') return [...list].sort((a, b) => a.price - b.price)
  if (sortBy.value === 'desc') return [...list].sort((a, b) => b.price - a.price)
  if (sortBy.value === 'az') return [...list].sort((a, b) => nm(a).localeCompare(nm(b), lang.value))
  return list
}

const allSorted = computed(() => sorted(PRODUCTS))

/* One rail per counter, in catalogue order. 'all' is a filter, not a counter. */
const counters = computed(() =>
  CATEGORIES
    .filter(c => c.id !== 'all')
    .map(c => {
      const items = PRODUCTS.filter(p => p.cat === c.id)
      const prices = items.map(p => p.price)
      return {
        id: c.id,
        title: catName(c.id),
        copy: t(`counter.${c.id}`),
        items,
        /* What the counter holds and what it costs, before you walk up to it. */
        meta: items.length
          ? `${items.length} ${items.length === 1 ? t('ui.item') : t('ui.items')} · ${Math.min(...prices)}–${Math.max(...prices)} AZN`
          : '',
      }
    })
    .filter(c => c.items.length > 0)
)

const resultLabel = computed(() =>
  `${results.value.length} ${results.value.length === 1 ? t('ui.item') : t('ui.items')}`)
</script>

<template>
  <section class="shop" id="catalogue">
    <div class="wrap">
      <div class="shead" v-reveal>
        <div class="shead__t">
          <p class="eyebrow">{{ t('shop.eyebrow') }}</p>
          <h2 class="display">{{ t('shop.h2') }}</h2>
          <p class="lede">{{ t('shop.copy') }}</p>
        </div>
      </div>
    </div>

    <!-- One field, not a control panel. Search is for somebody who already
         knows what they want; everyone else is meant to browse the counters. -->
    <div class="wrap">
      <div class="shop__find">
        <div class="field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" v-model="query" :placeholder="t('shop.search')">
          <button v-if="searching" class="field__x" :aria-label="t('shop.clear')" @click="query = ''">×</button>
        </div>
      </div>
    </div>

    <!-- Search results: a plain grid, because relevance has no counters. -->
    <template v-if="searching">
      <div class="wrap">
        <p class="shop__resulthead">{{ t('shop.results') }} · {{ resultLabel }}</p>

        <TransitionGroup v-if="results.length" name="flip" tag="div" class="grid">
          <ProductCard v-for="p in results" :key="p.id" :product="p"
                       @add="emit('add', $event)" @peek="emit('peek', $event)" />
        </TransitionGroup>

        <div v-else class="empty">
          <h3>{{ t('ui.empty.t') }}</h3>
          <p>{{ t('shop.noresults') }}</p>
        </div>
      </div>
    </template>

    <!-- The whole list, for anyone who would rather see everything at once. -->
    <template v-else-if="showAll">
      <div class="wrap">
        <div class="shop__allbar">
          <div class="select">
            <select v-model="sortBy">
              <option value="default">{{ t('sort.default') }}</option>
              <option value="asc">{{ t('sort.asc') }}</option>
              <option value="desc">{{ t('sort.desc') }}</option>
              <option value="az">{{ t('sort.az') }}</option>
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
          <button class="linkbtn" @click="showAll = false">{{ t('shop.showCounters') }}</button>
        </div>

        <TransitionGroup name="flip" tag="div" class="grid">
          <ProductCard v-for="p in allSorted" :key="p.id" :product="p"
                       @add="emit('add', $event)" @peek="emit('peek', $event)" />
        </TransitionGroup>
      </div>
    </template>

    <!-- The default: six counters, walked past. -->
    <template v-else>
      <ProductRail
        v-for="(c, i) in counters"
        :key="c.id"
        :products="c.items"
        :index="i"
        :title="c.title"
        :copy="c.copy"
        :meta="c.meta"
        @add="emit('add', $event)"
        @peek="emit('peek', $event)"
      />

      <div class="wrap">
        <div class="shop__more">
          <button class="btn btn--ghost" @click="showAll = true">{{ t('shop.showAll') }}</button>
        </div>
      </div>
    </template>
  </section>
</template>


<style scoped>
/* ---------- 10. Catalogue ----------------------------------------------- */
.shop{ padding:0 0 clamp(64px,8vw,110px); }
.shop__bar{
  position:sticky; top:64px; z-index:120;
  background:rgba(246,243,234,.94);
  backdrop-filter:blur(14px) saturate(1.4); -webkit-backdrop-filter:blur(14px) saturate(1.4);
  border-top:1px solid var(--line); border-bottom:1px solid var(--line);
  padding:14px 0; margin-bottom:clamp(26px,3.5vw,44px);
}
.shop__bar-in{ display:flex; align-items:center; gap:18px; flex-wrap:wrap; }

.chips{ display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; margin-right:auto; padding-bottom:2px; }
.chips::-webkit-scrollbar{ display:none; }
.chip{
  display:inline-flex; align-items:baseline; gap:7px; white-space:nowrap;
  border:1px solid var(--line); border-radius:100px; padding:8px 15px;
  font-size:.83rem; letter-spacing:.005em; color:var(--ink-2);
  transition:background .4s var(--ease), color .4s var(--ease), border-color .4s var(--ease), transform .3s var(--ease-out);
}
.chip sup{ font-size:.62rem; font-weight:600; opacity:.5; letter-spacing:.06em; }
.chip:hover{ border-color:var(--ink); transform:translateY(-1px); }
.chip.on{ background:var(--forest); border-color:var(--forest); color:var(--paper); }
.chip.on sup{ opacity:.7; }

.field{ display:flex; align-items:center; gap:9px; border-bottom:1px solid var(--line); padding:6px 2px; min-width:190px; }
.field svg{ width:15px; height:15px; color:var(--ink-3); flex:none; }
.field input{ border:0; background:none; outline:none; width:100%; font-size:.86rem; padding:2px 0; }
.field input::placeholder{ color:var(--ink-3); }
.field:focus-within{ border-color:var(--ink); }

.select{ position:relative; display:flex; align-items:center; }
.select select{
  appearance:none; -webkit-appearance:none;
  border:1px solid var(--line); border-radius:100px; padding:8px 34px 8px 15px;
  font-size:.83rem; background:none; cursor:pointer; outline:none;
  transition:border-color .35s var(--ease);
}
.select select:hover{ border-color:var(--ink); }
.select svg{ position:absolute; right:13px; width:11px; height:11px; pointer-events:none; color:var(--ink-3); }

.count{ font-size:.76rem; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-3); white-space:nowrap; }

.grid{
  display:grid; grid-template-columns:repeat(auto-fill,minmax(252px,1fr));
  gap:clamp(16px,1.8vw,30px) clamp(14px,1.5vw,24px);
}


.empty{ text-align:center; padding:70px 0; color:var(--ink-3); grid-column:1/-1; }
.empty h3{ font-family:var(--display); font-size:1.6rem; color:var(--ink); margin:0 0 8px; font-weight:500; }
@media (max-width:640px){
  .shop__bar{ padding:10px 0; }
  .shop__bar-in{ gap:10px 12px; }
  .chips{ width:100%; margin-right:0; }
  .field{ flex:1; min-width:0; }
  .count{ display:none; }
  .select select{ padding:7px 30px 7px 13px; font-size:.78rem; }
  .grid{ grid-template-columns:repeat(auto-fill,minmax(158px,1fr)); gap:14px 12px; }
  .shop__bar{ top:64px; }
}
</style>

<style scoped>
/* FLIP: cards travel to their new slot, new arrivals fade up, leavers are
   taken out of flow so the survivors can slide over them. */
.flip-move{ transition:transform .58s cubic-bezier(.16,1,.3,1); }
.flip-enter-active{ transition:opacity .5s ease, transform .6s cubic-bezier(.16,1,.3,1); }
.flip-leave-active{ transition:opacity .3s ease, transform .3s ease; position:absolute; }
.flip-enter-from{ opacity:0; transform:translateY(16px) scale(.97); }
.flip-leave-to{ opacity:0; transform:scale(.97); }

@media (prefers-reduced-motion: reduce){
  .flip-move,.flip-enter-active,.flip-leave-active{ transition:none; }
}
</style>

<style scoped>
/* Counters view ---------------------------------------------------------- */
.shop__find{ margin-bottom:clamp(10px,1.4vw,18px); }
.shop__find .field{ max-width:340px; }
.field__x{
  border:0; background:none; color:var(--ink-3); font-size:1.1rem; line-height:1;
  padding:0 2px; cursor:pointer;
}
.field__x:hover{ color:var(--ink); }

.shop__resulthead{
  margin:0 0 18px;
  font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-3);
}

.shop__allbar{
  display:flex; align-items:center; justify-content:space-between; gap:16px;
  margin-bottom:clamp(18px,2.4vw,28px);
}
.linkbtn{
  border:0; background:none; cursor:pointer;
  font-size:.86rem; color:var(--forest);
  text-decoration:underline; text-underline-offset:3px;
}
.linkbtn:hover{ color:var(--forest-2); }

/* The way out of the counters, for anyone who wants the whole list. */
.shop__more{
  display:flex; justify-content:center;
  padding-top:clamp(20px,3vw,36px);
  border-top:1px solid var(--line-soft);
  margin-top:clamp(14px,2vw,24px);
}
</style>
