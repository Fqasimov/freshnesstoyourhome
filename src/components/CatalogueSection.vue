<script setup>
import { ref, computed } from 'vue'
import { PRODUCTS, CATEGORIES } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'
import ProductCard from './ProductCard.vue'

const { t, lang, nm, catName } = useI18n()
const emit = defineEmits(['add', 'peek'])

const filter = ref('all')
const query  = ref('')
const sortBy = ref('default')

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = PRODUCTS.filter(p => {
    if (filter.value !== 'all' && p.cat !== filter.value) return false
    if (!q) return true
    /* Search spans both languages, so "krevet" finds shrimp in English too. */
    return `${p.en} ${p.az} ${p.den} ${p.daz} ${catName(p.cat)}`.toLowerCase().includes(q)
  })
  if (sortBy.value === 'asc')  list = [...list].sort((a, b) => a.price - b.price)
  if (sortBy.value === 'desc') list = [...list].sort((a, b) => b.price - a.price)
  if (sortBy.value === 'az')   list = [...list].sort((a, b) =>
    nm(a).localeCompare(nm(b), lang.value))
  return list
})

const countLabel = computed(() =>
  `${visible.value.length} ${visible.value.length === 1 ? t('ui.item') : t('ui.items')}`)
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

    <div class="shop__bar">
      <div class="wrap shop__bar-in">
        <div class="chips">
          <button v-for="c in CATEGORIES" :key="c.id" class="chip"
                  :class="{ on: filter === c.id }" @click="filter = c.id">
            {{ catName(c.id) }}<sup>{{ c.kicker }}</sup>
          </button>
        </div>

        <div class="field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" v-model="query" :placeholder="t('shop.search')">
        </div>

        <div class="select">
          <select v-model="sortBy">
            <option value="default">{{ t('sort.default') }}</option>
            <option value="asc">{{ t('sort.asc') }}</option>
            <option value="desc">{{ t('sort.desc') }}</option>
            <option value="az">{{ t('sort.az') }}</option>
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>

        <span class="count">{{ countLabel }}</span>
      </div>
    </div>

    <div class="wrap">
      <!-- TransitionGroup does the FLIP the vanilla build hand-rolled:
           cards slide to their new positions instead of the grid redrawing. -->
      <TransitionGroup name="flip" tag="div" class="grid">
        <ProductCard v-for="p in visible" :key="p.id" :product="p"
                     @add="emit('add', $event)" @peek="emit('peek', $event)" />
      </TransitionGroup>

      <div v-if="!visible.length" class="empty">
        <h3>{{ t('ui.empty.t') }}</h3>
        <p>{{ t('ui.empty.d') }}</p>
      </div>
    </div>
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
