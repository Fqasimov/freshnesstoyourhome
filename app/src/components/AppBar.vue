<script setup>
import { useRouter } from 'vue-router'

defineProps({
  title: { type: String, default: '' },
  back: { type: Boolean, default: false },
})

const router = useRouter()
</script>

<template>
  <header class="topbar">
    <div class="topbar__in">
      <button v-if="back" class="appbar__back" :aria-label="'Back'" @click="router.back()">←</button>
      <span class="topbar__title">{{ title }}</span>
      <span class="topbar__spacer" />
      <slot name="action" />
    </div>
  </header>
</template>

<style scoped>
.appbar__back{
  display:grid; place-items:center;
  width:40px; height:40px; margin-left:-10px;
  font-size:1.4rem; line-height:1;
}
</style>
