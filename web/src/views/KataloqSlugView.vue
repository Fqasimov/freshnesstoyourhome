<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CATEGORIES, COLLECTIONS, catalogueSettled } from '../data/catalogue'
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
</script>

<template>
  <CollectionView v-if="kind === 'collection'" @add="$emit('add', $event)" @add-set="$emit('add-set', $event)" @peek="$emit('peek', $event)" />
  <NotFoundView v-else-if="kind === 'missing'" />
  <CatalogueView v-else @add="$emit('add', $event)" @add-set="$emit('add-set', $event)" @peek="$emit('peek', $event)" />
</template>
