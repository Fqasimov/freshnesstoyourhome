<script setup>
import BIcon from './BIcon.vue'
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
    <BIcon name="arrow-up" :size="17" />
  </button>
</template>

<style scoped>
/* ---------- 19. Back to top ---------------------------------------------- */
.totop{
  position:fixed; right:22px; bottom:22px; z-index:300;
  width:48px; height:48px; border-radius:50%;
  /* Acid rather than forest. The contact panel is forest too, so the button
     used to disappear into it exactly where somebody scrolling to the bottom
     of the page reaches for it. Yellow is the one accent that reads on both
     the cream page and the green panel. */
  background:var(--acid); color:var(--ink);
  box-shadow:0 10px 26px rgba(27,41,22,.28);
  display:grid; place-items:center;
  opacity:0; visibility:hidden; transform:translateY(14px);
  transition:opacity .45s var(--ease), transform .45s var(--ease-out), visibility .45s, background .35s var(--ease);
}
.totop.on{ opacity:1; visibility:visible; transform:none; }
.totop:hover{ background:var(--brick); color:#fff; }

@media (max-width:640px){
  .totop{ right:16px; bottom:16px; width:44px; height:44px; }
}
</style>
