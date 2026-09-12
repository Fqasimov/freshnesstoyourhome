<script setup>
import { useToast } from '../composables/useMotion'
const { message, showing } = useToast()
</script>

<template>
  <div class="toast" :class="{ on: showing }" role="status" aria-live="polite">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    <span>{{ message }}</span>
  </div>
</template>

<style scoped>
/* ---------- 18. Toast ---------------------------------------------------- */
.toast{
  position:fixed; left:50%; bottom:28px; z-index:700;
  transform:translate(-50%,140%); transition:transform .6s var(--ease-out);
  background:var(--ink); color:var(--paper);
  border-radius:100px; padding:13px 24px; font-size:.84rem; letter-spacing:.02em;
  display:flex; align-items:center; gap:10px; box-shadow:0 16px 40px rgba(0,0,0,.3);
}
.toast.on{ transform:translate(-50%,0); }
.toast svg{ width:16px; height:16px; color:var(--acid); }
</style>
