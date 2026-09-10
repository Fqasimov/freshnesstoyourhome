<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { reducedMotion } from '../composables/useMotion'

const shown = ref(false)
const onScroll = () => { shown.value = window.scrollY > 900 }
const toTop = () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })

onMounted(() => { window.addEventListener('scroll', onScroll, { passive: true }); onScroll() })
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <button class="totop" :class="{ on: shown }" aria-label="Back to top" @click="toTop">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  </button>
</template>

<style scoped>
/* ---------- 19. Back to top ---------------------------------------------- */
.totop{
  position:fixed; right:22px; bottom:22px; z-index:300;
  width:48px; height:48px; border-radius:50%; background:var(--forest); color:var(--paper);
  display:grid; place-items:center;
  opacity:0; visibility:hidden; transform:translateY(14px);
  transition:opacity .45s var(--ease), transform .45s var(--ease-out), visibility .45s, background .35s var(--ease);
}
.totop.on{ opacity:1; visibility:visible; transform:none; }
.totop:hover{ background:var(--brick); }

@media (max-width:640px){
  .totop{ right:16px; bottom:16px; width:44px; height:44px; }
}
</style>
