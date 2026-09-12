<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'

const route = useRoute()

// Sign-in has no tab bar: there is nowhere to go until you are in.
const showTabs = computed(() => !route.meta.plain)
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>

  <TabBar v-if="showTabs" />
</template>
