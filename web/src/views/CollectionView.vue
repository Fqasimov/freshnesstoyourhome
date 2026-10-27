<script setup>
import { computed, watchEffect, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import BIcon from '../components/BIcon.vue'
import ProductCard from '../components/ProductCard.vue'
import SetsSection from '../components/SetsSection.vue'
import { PRODUCTS, SETS, COLLECTIONS, setPricing } from '../data/catalogue'
import { productPath } from '../data/slug'
import { categoryTitle, categoryDescription, crumbsJsonLd, itemListJsonLd, words, own, textBlocks } from '../data/productSchema'
import { useI18n } from '../composables/useI18n'
import { setPageHead, setRobots, setLd } from '../composables/usePageMeta'

/**
 * A collection page, /kataloq/yeni-il-setleri: products and sets the shop
 * chose in the panel, with its own heading and text. The build writes a plain
 * HTML copy for search engines; this is the live page.
 */
const emit = defineEmits(['add', 'add-set', 'peek'])
const route = useRoute()
const { t, lang } = useI18n()

const page = computed(() => COLLECTIONS.find(c => c.slug === route.params.cat) ?? null)
const name = computed(() => (page.value ? page.value[lang.value] || page.value.az : ''))
const products = computed(() => (page.value?.products ?? []).map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean))
const sets = computed(() => (page.value?.sets ?? []).filter(id => SETS.some(s => s.id === id)))
const heading = computed(() => (page.value ? own(page.value.page, 'h1', lang.value) ?? name.value : ''))
const blocks = computed(() => (page.value ? textBlocks(own(page.value.page, 'body', lang.value)) : []))

watchEffect(() => {
  const c = page.value
  if (!c) return
  const prices = [...products.value.map(p => p.price), ...sets.value.map(id => setPricing(SETS.find(s => s.id === id)).price)]
  const title = own(c.page, 'seo_title', lang.value) ?? categoryTitle(name.value, lang.value)
  const desc = own(c.page, 'seo_description', lang.value) ?? (prices.length ? categoryDescription(name.value, prices, lang.value) : name.value)
  const path = `/kataloq/${c.slug}`
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
  setPageHead({ path, title, desc })
  setRobots(c.indexed !== false)
  const site = location.origin, w = words(lang.value)
  setLd('ld-list', itemListJsonLd(name.value, products.value.map(p => site + productPath(p))))
  setLd('ld-crumbs', crumbsJsonLd([[w.home, `${site}/`], [w.catalogue, `${site}/kataloq`], [name.value, site + path]]))

// After the render, so it lands after the page this one replaced has cleared its own.
}, { flush: 'post' })
onUnmounted(() => { setLd('ld-list', null); setLd('ld-crumbs', null) })
</script>

<template>
  <main class="col">
    <div class="wrap">
      <nav class="col__crumbs" :aria-label="t('pp.crumbs')">
        <RouterLink to="/">{{ t('pp.home') }}</RouterLink>
        <BIcon name="chevron-right" :size="10" />
        <RouterLink to="/kataloq">{{ t('nav.shop') }}</RouterLink>
      </nav>
      <h1 class="col__h">{{ heading }}</h1>

      <SetsSection v-if="sets.length" compact :only="sets" @add="emit('add-set', $event)" />

      <div v-if="products.length" class="col__grid">
        <ProductCard v-for="p in products" :key="p.id" :product="p"
                     @add="emit('add', $event)" @peek="emit('peek', $event)" />
      </div>

      <section v-if="blocks.length" class="col__text">
        <template v-for="(b, i) in blocks" :key="i">
          <h2 v-if="b.h">{{ b.h }}</h2>
          <p v-else>{{ b.p }}</p>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
.col{ padding:calc(var(--nav-h) + clamp(20px,3vw,40px)) 0 clamp(64px,8vw,110px); }
.col__crumbs{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:12px; font-size:.78rem; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-3); }
.col__crumbs a{ color:inherit; text-decoration:none; }
.col__crumbs a:hover{ color:var(--forest); }
.col__h{ margin:0 0 clamp(20px,2.6vw,30px); font-family:var(--display); font-weight:600; font-size:clamp(2.1rem,4.4vw,3.4rem); line-height:1; letter-spacing:-.02em; }
.col__grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:clamp(12px,1.6vw,20px); }
@media (min-width:720px){ .col__grid{ grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); } }
.col__text{ max-width:760px; margin-top:clamp(40px,5vw,64px); padding-top:clamp(24px,3vw,32px); border-top:1px solid var(--line); line-height:1.7; color:var(--ink-2); }
.col__text h2{ font-family:var(--display); font-weight:600; font-size:clamp(1.3rem,2.2vw,1.7rem); color:var(--ink); margin:1.4em 0 .5em; }
.col__text h2:first-child{ margin-top:0; }
.col__text p{ margin:0 0 1em; }
</style>
