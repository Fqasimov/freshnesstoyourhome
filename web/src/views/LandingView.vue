<script setup>
import { computed, watchEffect, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { PRODUCTS } from '../data/catalogue'
import { LANDING, DELIVERY_LINE } from '../data/landing'
import { useI18n } from '../composables/useI18n'
import ProductCard from '../components/ProductCard.vue'
import BIcon from '../components/BIcon.vue'

/**
 * One page per thing people search for — see data/landing.js. The products are
 * the live catalogue's, filtered; the structured data below (the questions and
 * the product list) is written into the head so a search engine reads the same
 * facts a visitor sees.
 */
const { t, lang, nm } = useI18n()
defineEmits(['add', 'peek'])

const route = useRoute()
const page = computed(() => LANDING.find(p => p.name === route.name) ?? LANDING[0])
const items = computed(() => PRODUCTS.filter(page.value.test))
const pick = o => o[lang.value] || o.az
const others = computed(() => LANDING.filter(p => p.name !== page.value.name))

let tag = null
function writeData () {
  const origin = location.origin
  const graph = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Freshness To Your Home', item: origin + '/' },
        { '@type': 'ListItem', position: 2, name: page.value.h1.az, item: origin + page.value.path },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: page.value.faq.map(f => ({
        '@type': 'Question',
        name: f.q.az,
        acceptedAnswer: { '@type': 'Answer', text: f.a.az },
      })),
    },
    {
      '@type': 'ItemList',
      itemListElement: items.value.slice(0, 30).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.az,
          ...(p.img ? { image: new URL(p.img, origin).href } : {}),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'AZN',
            price: Number(p.price).toFixed(2),
            availability: 'https://schema.org/InStock',
            url: origin + page.value.path,
          },
        },
      })),
    },
  ]
  if (!tag) {
    tag = document.createElement('script')
    tag.type = 'application/ld+json'
    tag.dataset.landing = ''
    document.head.appendChild(tag)
  }
  tag.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
}
watchEffect(writeData)
onUnmounted(() => { tag?.remove(); tag = null })
</script>

<template>
  <main class="land">
    <div class="wrap">
      <RouterLink to="/" class="land__back"><BIcon name="arrow-left" :size="12" /> {{ t('cat.back') }}</RouterLink>

      <h1 class="land__h">{{ pick(page.h1) }}</h1>
      <p class="land__also">{{ page.also }}</p>

      <div class="land__text">
        <p v-for="(para, i) in page.text[lang] || page.text.az" :key="i">{{ para }}</p>
        <p>{{ pick(DELIVERY_LINE) }}</p>
      </div>

      <div v-if="items.length" class="land__grid">
        <ProductCard v-for="p in items" :key="p.id" :product="p"
                     @add="$emit('add', $event)" @peek="$emit('peek', $event)" />
      </div>

      <section class="land__faq" :aria-label="'FAQ'">
        <details v-for="(f, i) in page.faq" :key="i">
          <summary>{{ pick(f.q) }}</summary>
          <p>{{ pick(f.a) }}</p>
        </details>
      </section>

      <nav class="land__more" aria-label="Kataloq">
        <RouterLink to="/kataloq">{{ t('cat.h') }}</RouterLink>
        <RouterLink v-for="o in others" :key="o.name" :to="o.path">{{ pick(o.h1) }}</RouterLink>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.land{ padding:clamp(96px,10vw,132px) 0 clamp(56px,7vw,96px); }
.land__back{ display:inline-flex; align-items:center; gap:6px; font-size:.82rem; color:var(--ink-3); margin-bottom:14px; }
.land__back:hover{ color:var(--forest); }
.land__h{ font-family:var(--display); font-size:clamp(1.9rem,4.4vw,3rem); font-weight:600; letter-spacing:-.02em; line-height:1.08; margin:0; }
.land__also{ margin:10px 0 0; font-size:.84rem; color:var(--ink-3); }
.land__text{ max-width:68ch; margin:18px 0 clamp(22px,3vw,34px); color:var(--ink-2); line-height:1.65; }
.land__text p{ margin:0 0 10px; }
.land__grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(176px,1fr)); gap:26px 16px; }
.land__faq{ max-width:68ch; margin-top:clamp(32px,5vw,56px); }
.land__faq details{ border-top:1px solid var(--line); padding:14px 0; }
.land__faq details:last-child{ border-bottom:1px solid var(--line); }
.land__faq summary{ cursor:pointer; font-weight:600; }
.land__faq p{ margin:10px 0 0; color:var(--ink-2); line-height:1.6; }
.land__more{ display:flex; flex-wrap:wrap; gap:8px 10px; margin-top:clamp(28px,4vw,44px); }
.land__more a{
  padding:9px 15px; border-radius:999px; background:var(--paper-2); color:var(--ink-2);
  font-size:.84rem; font-weight:600;
}
.land__more a:hover{ background:var(--forest); color:var(--paper); }
</style>
