<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { ZONES, feeText } from '../data/delivery'
import BIcon from './BIcon.vue'

const { t, lang } = useI18n()

/* Every area the shop delivers to, with its fee — the same list the basket's
   area picker uses (shared/delivery.json), so the two can never disagree.
   Searchable in all three spellings, because people know their area by
   whichever name they grew up with. On a phone the list starts short and
   opens on request: fifty-one rows is a scroll nobody asked for. */
const query = ref('')
const all = ref(false)
const SHORT = 16

// Only a phone starts short; a wide screen has room for all of them.
const mq = typeof window !== 'undefined' ? window.matchMedia('(min-width:900px)') : null
const wide = ref(mq ? mq.matches : true)
const onWide = e => { wide.value = e.matches }
mq?.addEventListener('change', onWide)
onBeforeUnmount(() => mq?.removeEventListener('change', onWide))

const name = z => z[lang.value] || z.az

const matches = computed(() => {
  const q = query.value.trim().toLocaleLowerCase()
  if (!q) return ZONES
  return ZONES.filter(z => [z.az, z.ru, z.en].some(n => n.toLocaleLowerCase().includes(q)))
})

// A search always shows everything it found.
const shown = computed(() => (wide.value || all.value || query.value.trim() ? matches.value : matches.value.slice(0, SHORT)))
const hidden = computed(() => matches.value.length - shown.value.length)
</script>

<template>
  <div class="zones" v-reveal="'80ms'">
    <div class="zones__head">
      <h3>{{ t('dl.table') }}</h3>
      <label class="zones__search">
        <BIcon name="search" :size="14" />
        <input v-model="query" type="search" :placeholder="t('deliv.zoneFind')" :aria-label="t('deliv.zoneFind')">
      </label>
    </div>

    <table class="zones__table" >
      <thead>
        <tr><th scope="col">{{ t('dl.area') }}</th><th scope="col">{{ t('dl.feeCol') }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="z in shown" :key="z.id">
          <td :title="name(z)">{{ name(z) }}</td>
          <td class="zones__fee" :class="{ 'is-range': z.fee[0] !== z.fee[1] }">{{ feeText(z) }} <small>AZN</small></td>
        </tr>
        <tr v-if="!matches.length"><td colspan="2" class="zones__none">{{ t('deliv.zoneNone') }}</td></tr>
      </tbody>
    </table>

    <button v-if="!wide && (hidden > 0 || (all && !query.trim()))" class="zones__more" @click="all = !all">
      {{ all ? t('dl.showLess') : t('dl.showAll').replace('{n}', ZONES.length) }}
      <BIcon name="chevron-down" :size="11" :class="{ up: all }" />
    </button>

    <p class="zones__note"><span class="zones__dot"></span>{{ t('dl.rangeNote') }}</p>
  </div>
</template>

<style scoped>
.zones{
  grid-column:1 / -1; min-width:0;
  border:1px solid var(--line); border-radius:var(--radius);
  background:var(--paper-2); padding:clamp(20px,2.6vw,32px);
}
.zones__head{ display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:16px; }
.zones__head h3{ margin:0; font-family:var(--display); font-weight:500; font-size:clamp(1.25rem,2vw,1.55rem); letter-spacing:-.012em; }
.zones__search{
  display:flex; align-items:center; gap:8px; flex:0 1 280px; min-width:0;
  padding:9px 14px; border-radius:100px; background:var(--paper); border:1px solid var(--line); color:var(--ink-3);
}
.zones__search input{ border:0; background:none; outline:none; font:inherit; font-size:16px; color:var(--ink); width:100%; min-width:0; }

/* Three columns of rows on a wide screen, one on a phone. The table flows as
   a block so the browser can break it into columns. */
.zones__table{ display:block; width:100%; border-collapse:collapse; font-size:.82rem; }
.zones__table td{ display:block; }
.zones__table thead{ display:none; }
.zones__table tbody{ display:block; columns:5 170px; column-gap:24px; }
.zones__table tr{ display:flex; justify-content:space-between; gap:8px; break-inside:avoid; padding:5px 0; border-bottom:1px solid var(--line-soft, var(--line)); }
.zones__table td:first-child{ min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.zones__table td{ padding:0; }
.zones__fee{ font-weight:600; white-space:nowrap; font-variant-numeric:tabular-nums lining-nums; }
.zones__fee small{ font-weight:500; color:var(--ink-3); font-size:.66rem; }

/* A phone gets two columns: the names are short enough, and the list halves. */
@media (max-width:640px){
  .zones__table tbody{ columns:2; column-gap:16px; }
  .zones__table{ font-size:.78rem; }
}
.zones__fee.is-range{ color:var(--brick); }
.zones__none{ color:var(--ink-3); flex:1; }

.zones__more{
  margin-top:14px; display:inline-flex; align-items:center; gap:7px;
  padding:9px 16px; border-radius:100px; border:1px solid var(--line); background:var(--paper);
  font-size:.82rem; font-weight:600;
}
.zones__more .bi{ transition:transform .3s var(--ease-out); }
.zones__more .up{ transform:rotate(180deg); }
.zones__note{ margin:16px 0 0; display:flex; gap:9px; align-items:baseline; font-size:.8rem; line-height:1.5; color:var(--ink-3); }
.zones__dot{ flex:none; width:8px; height:8px; border-radius:50%; background:var(--brick); transform:translateY(1px); }
</style>
