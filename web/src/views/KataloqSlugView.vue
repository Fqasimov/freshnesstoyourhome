<script setup>
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CATEGORIES, COLLECTIONS, CATEGORY_REDIRECTS, catalogueSettled } from '../data/catalogue'
import { lp } from '../composables/useI18n'
import { categorySlug } from '../data/slug'
import CatalogueView from './CatalogueView.vue'
import CollectionView from './CollectionView.vue'
import NotFoundView from './NotFoundView.vue'

/* /kataloq/{slug} is a category or a collection page — the panel keeps their
   addresses apart — or, once the catalogue has arrived, neither. */
defineEmits(['add', 'add-set', 'peek'])
const route = useRoute()
const kind = computed(() => {
  const slug = route.params.cat
  if (!slug) return 'category'
  if (COLLECTIONS.some(c => c.slug === slug)) return 'collection'
  if (CATEGORIES.some(c => c.id !== 'all' && categorySlug(c) === slug)) return 'category'
  return catalogueSettled.value ? 'missing' : 'category'
})
/* A category that moved to a new address: on to it (the server 301s too). */
const router = useRouter()
watchEffect(() => {
  const to = CATEGORY_REDIRECTS[route.params.cat]
  if (kind.value === 'missing' && to) router.replace({ path: lp(`/kataloq/${to}`), query: route.query })
})
</script>

<template>
  <CollectionView v-if="kind === 'collection'" @add="$emit('add', $event)" @add-set="$emit('add-set', $event)" @peek="$emit('peek', $event)" />
  <NotFoundView v-else-if="kind === 'missing'" />
  <CatalogueView v-else @add="$emit('add', $event)" @add-set="$emit('add-set', $event)" @peek="$emit('peek', $event)" />
</template>
