<script setup>
import { computed } from 'vue'
import { CATEGORIES } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'

const { lang, t } = useI18n()

/* The track is duplicated so the marquee can loop seamlessly at -50%. */
const words = computed(() => {
  const names = CATEGORIES.slice(1).map(c => (lang.value === 'az' ? c.az : c.en))
  names.push(lang.value === 'az' ? 'Bakıya çatdırılma' : 'Delivered across Baku')
  return [...names, ...names]
})
</script>

<template>
  <div class="ticker" aria-hidden="true">
    <div class="ticker__track">
      <span v-for="(w, i) in words" :key="i">{{ w }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ---------- 6. Ticker ---------------------------------------------------- */
.ticker{ background:var(--brick); color:#F6F3EA; overflow:hidden; padding:13px 0; }
.ticker__track{ display:flex; gap:0; width:max-content; animation:tick 46s linear infinite; }
.ticker:hover .ticker__track{ animation-play-state:paused; }
.ticker span{
  font-family:var(--display); font-size:clamp(.95rem,1.5vw,1.25rem); font-style:italic;
  padding:0 clamp(18px,2.4vw,34px); white-space:nowrap; opacity:.94;
  display:flex; align-items:center; gap:clamp(18px,2.4vw,34px);
}
.ticker span::after{ content:''; width:5px; height:5px; border-radius:50%; background:var(--acid); flex:none; }
@keyframes tick{ to{ transform:translateX(-50%); } }
@media (prefers-reduced-motion: reduce){ .ticker__track{ animation:none; } }
</style>
