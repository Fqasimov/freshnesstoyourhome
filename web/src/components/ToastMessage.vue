<script setup>
import BIcon from './BIcon.vue'
import { useToast } from '../composables/useMotion'
const { message, showing } = useToast()
</script>

<template>
  <div class="toast" :class="{ on: showing }" role="status" aria-live="polite">
    <BIcon name="check-lg" :size="16" />
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
.toast .bi{ color:var(--acid); }
</style>
