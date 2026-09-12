<script setup>
import { useI18n } from '../composables/useI18n'
import BIcon from './BIcon.vue'
const { t } = useI18n()

/* Four promises: delivery, where we go, the guarantee, and the day's notice. */
const items = [
  { k: 'pr1', d: '0ms',   icon: 'truck' },
  { k: 'pr2', d: '90ms',  icon: 'geo-alt' },
  { k: 'pr3', d: '180ms', icon: 'shield-check' },
  { k: 'pr4', d: '270ms', icon: 'clock' },
]
</script>

<template>
  <section class="promise">
    <div class="wrap">
      <div class="promise__grid">
        <div v-for="it in items" :key="it.k" class="promise__item" v-reveal="it.d">
          <div class="promise__ico"><BIcon :name="it.icon" :size="28" /></div>
          <h4>{{ t(it.k + '.t') }}</h4>
          <p>{{ t(it.k + '.d') }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---------- 7. Promises -------------------------------------------------- */
.promise{ padding:clamp(52px,7vw,96px) 0; }
.promise__grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:0; border-top:1px solid var(--line); }
.promise__item{ padding:clamp(24px,3vw,38px) clamp(16px,2vw,32px) 0; border-right:1px solid var(--line); }
.promise__item:last-child{ border-right:0; }
.promise__item:first-child{ padding-left:0; }
/* The first column was flush with the gutter and the last was inset by its own
   padding, so the row of four sat a little to the left of everything else. */
.promise__item:last-child{ padding-right:0; }
.promise__ico{ color:var(--leaf-d); margin-bottom:18px; line-height:0; }
.promise__item h4{ font-family:var(--display); font-size:1.16rem; font-weight:500; margin:0 0 8px; letter-spacing:-.012em; }
.promise__item p{ margin:0; font-size:.88rem; color:var(--ink-3); line-height:1.55; }

@media (max-width:1080px){
  .promise__grid{ grid-template-columns:1fr 1fr; }
  .promise__item{ border-bottom:1px solid var(--line); padding-bottom:26px; }
  .promise__item:nth-child(2n){ border-right:0; }
  .promise__item:nth-child(2n+1){ padding-left:0; }
}

@media (max-width:640px){
  .promise__grid{ grid-template-columns:1fr; }
  .promise__item{ border-right:0; padding-left:0; }
}
</style>
