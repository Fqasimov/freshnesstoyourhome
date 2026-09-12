<script setup>
import { computed } from 'vue'
import { useCart } from '../stores/cart'
import { t } from '../i18n'

const cart = useCart()

const tabs = computed(() => [
  { to: '/shop', icon: '🌿', label: t('nav.shop') },
  { to: '/basket', icon: '🧺', label: t('nav.basket'), badge: cart.count },
  { to: '/orders', icon: '📋', label: t('nav.orders') },
  { to: '/profile', icon: '👤', label: t('nav.profile') },
])
</script>

<template>
  <nav class="tabbar">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      active-class="is-active"
    >
      <span class="tab__icon" aria-hidden="true">{{ tab.icon }}</span>
      <span>{{ tab.label }}</span>
      <span v-if="tab.badge" class="tab__badge">{{ tab.badge }}</span>
    </RouterLink>
  </nav>
</template>
