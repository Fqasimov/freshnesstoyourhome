<script setup>
import { useI18n } from '../composables/useI18n'
const { t } = useI18n()

/* Four promises, each with a line icon drawn inline. */
const items = [
  { k: 'pr1', d: '0ms',   path: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' },
  { k: 'pr2', d: '90ms',  path: '<path d="M20 10.2c0 5.4-8 11.3-8 11.3s-8-5.9-8-11.3a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.8"/>' },
  { k: 'pr3', d: '180ms', path: '<path d="M12 2.5 4 6v6c0 4.6 3.2 8.4 8 9.5 4.8-1.1 8-4.9 8-9.5V6l-8-3.5Z"/><path d="m8.8 12 2.3 2.3 4.3-4.5"/>' },
  { k: 'pr4', d: '270ms', path: '<circle cx="12" cy="12" r="9.2"/><path d="M12 6.6V12l3.4 2"/>' }
]
</script>

<template>
  <section class="promise">
    <div class="wrap">
      <div class="promise__grid">
        <div v-for="it in items" :key="it.k" class="promise__item" v-reveal="it.d">
          <div class="promise__ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
                 stroke-linecap="round" stroke-linejoin="round" v-html="it.path"></svg>
          </div>
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
.promise__ico{ width:30px; height:30px; color:var(--leaf-d); margin-bottom:18px; }
.promise__ico svg{ width:100%; height:100%; }
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
