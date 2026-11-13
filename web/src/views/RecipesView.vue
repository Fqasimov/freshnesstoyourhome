<script setup>
import { computed, watchEffect, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BIcon from '../components/BIcon.vue'
import ProductCard from '../components/ProductCard.vue'
import { ARTICLES, PRODUCTS, catalogueSettled } from '../data/catalogue'
import { articleJsonLd, crumbsJsonLd, inLang, textBlocks, words } from '../data/productSchema'
import { productPath } from '../data/slug'
import { useI18n } from '../composables/useI18n'
import { setPageHead, setRobots, setLd } from '../composables/usePageMeta'
import NotFoundView from './NotFoundView.vue'

/**
 * Recipes and articles: the list at /resept, one article at /resept/{slug},
 * written in the panel. The build writes a plain HTML copy of each for search
 * engines (web/scripts/prerender.mjs); this is the live page.
 */
const emit = defineEmits(['add', 'peek'])
const route = useRoute()
const { t, lang, lp } = useI18n()
const w = computed(() => words(lang.value))

/* Only the languages the article was written in; another one shows the AZ text. */
const tr = (a, f) => inLang(a?.[f], lang.value)
const slug = computed(() => route.params.slug ?? null)
const article = computed(() => (slug.value ? ARTICLES.find(a => a.slug === slug.value) ?? null : null))
const products = computed(() => (article.value?.products ?? []).map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean))
const blocks = computed(() => textBlocks(tr(article.value, 'body')))
const cover = a => (a.products ?? []).map(id => PRODUCTS.find(p => p.id === id)?.img).find(Boolean)
const missing = computed(() => slug.value && !article.value && catalogueSettled.value)

watchEffect(() => {
  const site = location.origin
  if (!slug.value) {
    document.title = `${w.value.recipesH1} | Freshness`
    document.querySelector('meta[name="description"]')?.setAttribute('content', w.value.recipesDesc)
    setPageHead({ path: '/resept', title: document.title, desc: w.value.recipesDesc })
    setRobots(true)
    setLd('ld-crumbs', crumbsJsonLd([[w.value.home, site + lp('/')], [w.value.recipes, site + lp('/resept')]]))
    return
  }
  const a = article.value
  if (!a) return
  const title = tr(a, 'seo_title') || `${tr(a, 'title')} | Freshness`
  const desc = tr(a, 'seo_description') || tr(a, 'summary') || tr(a, 'title')
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
  setPageHead({ path: `/resept/${a.slug}`, title, desc })
  setRobots(true)
  setLd('ld-article', articleJsonLd({ url: site + lp(`/resept/${a.slug}`), title: tr(a, 'title'), desc, image: cover(a), published: a.published_on, modified: a.updated_at, lang: lang.value }))
  setLd('ld-crumbs', crumbsJsonLd([[w.value.home, site + lp('/')], [w.value.recipes, site + lp('/resept')], [tr(a, 'title'), site + lp(`/resept/${a.slug}`)]]))
  setLd('ld-list', products.value.length ? { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: products.value.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: site + lp(productPath(p)) })) } : null)
}, { flush: 'post' })
onUnmounted(() => { setLd('ld-article', null); setLd('ld-crumbs', null); setLd('ld-list', null) })
</script>

<template>
  <NotFoundView v-if="missing" />
  <main v-else class="rc">
    <div class="wrap">
      <nav class="rc__crumbs" :aria-label="t('pp.crumbs')">
        <RouterLink :to="lp('/')">{{ t('pp.home') }}</RouterLink>
        <template v-if="article">
          <BIcon name="chevron-right" :size="10" />
          <RouterLink :to="lp('/resept')">{{ w.recipes }}</RouterLink>
        </template>
      </nav>

      <template v-if="!slug">
        <h1 class="rc__h">{{ w.recipesH1 }}</h1>
        <p class="rc__lead">{{ w.recipesDesc }}</p>
        <div class="rc__grid">
          <RouterLink v-for="a in ARTICLES" :key="a.slug" :to="lp(`/resept/${a.slug}`)" class="rc__card">
            <img v-if="cover(a)" :src="cover(a)" alt="" loading="lazy">
            <b>{{ tr(a, 'title') }}</b>
            <span v-if="tr(a, 'summary')">{{ tr(a, 'summary') }}</span>
            <i>{{ w.readMore }} →</i>
          </RouterLink>
        </div>
      </template>

      <article v-else-if="article" class="rc__article">
        <h1 class="rc__h">{{ tr(article, 'title') }}</h1>
        <p v-if="tr(article, 'summary')" class="rc__lead">{{ tr(article, 'summary') }}</p>
        <template v-for="(b, i) in blocks" :key="i">
          <h2 v-if="b.h">{{ b.h }}</h2>
          <p v-else>{{ b.p }}</p>
        </template>
      </article>

      <section v-if="products.length" class="rc__more">
        <h2>{{ w.inArticle }}</h2>
        <div class="rc__products">
          <ProductCard v-for="p in products" :key="p.id" :product="p" @add="emit('add', $event)" @peek="emit('peek', $event)" />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.rc{ padding:calc(var(--nav-h) + clamp(20px,3vw,40px)) 0 clamp(64px,8vw,110px); }
.rc__crumbs{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:12px; font-size:.78rem; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-3); }
.rc__crumbs a{ color:inherit; text-decoration:none; }
.rc__h{ margin:0 0 14px; font-family:var(--display); font-weight:600; font-size:clamp(2rem,4.2vw,3.2rem); line-height:1.05; letter-spacing:-.02em; }
.rc__lead{ max-width:62ch; color:var(--ink-2); font-size:1.08rem; line-height:1.6; margin:0 0 clamp(22px,3vw,34px); }
.rc__grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:clamp(14px,2vw,24px); }
.rc__card{ display:flex; flex-direction:column; gap:8px; padding:0 0 16px; border-radius:18px; overflow:hidden; background:var(--white); color:var(--ink); text-decoration:none; }
.rc__card img{ width:100%; aspect-ratio:16/10; object-fit:cover; }
.rc__card b{ padding:4px 16px 0; font-family:var(--display); font-size:1.25rem; line-height:1.2; }
.rc__card span{ padding:0 16px; color:var(--ink-2); font-size:.92rem; line-height:1.5; }
.rc__card i{ padding:0 16px; font-style:normal; color:var(--forest); font-weight:600; font-size:.9rem; margin-top:auto; }
.rc__article{ max-width:760px; line-height:1.75; color:var(--ink-2); }
.rc__article h2{ font-family:var(--display); font-weight:600; font-size:clamp(1.3rem,2.2vw,1.7rem); color:var(--ink); margin:1.4em 0 .5em; }
.rc__article p{ margin:0 0 1em; }
.rc__more{ margin-top:clamp(40px,5vw,64px); }
.rc__more h2{ font-family:var(--display); font-weight:600; font-size:clamp(1.4rem,2.4vw,1.9rem); margin:0 0 18px; }
.rc__products{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:clamp(12px,1.6vw,20px); }
</style>
