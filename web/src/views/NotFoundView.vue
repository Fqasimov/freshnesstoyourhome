<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BIcon from '../components/BIcon.vue'
import { CATEGORIES, PRODUCTS } from '../data/catalogue'
import { categoryPath } from '../data/slug'
import { useI18n } from '../composables/useI18n'
import { setRobots } from '../composables/usePageMeta'

/**
 * A page that does not exist. The server has already answered it with a 404
 * (deploy/website.htaccess); this is what the visitor sees: a search box and
 * every category, so a dead link still leads somewhere useful.
 */
const { t, catName } = useI18n()
const router = useRouter()
const q = ref('')
const cats = computed(() => CATEGORIES.filter(c => c.id !== 'all' && PRODUCTS.some(p => p.cat === c.id)))

function search () {
  const query = q.value.trim()
  router.push(query ? { path: '/kataloq', query: { q: query } } : '/kataloq')
}

onMounted(() => {
  document.title = `${t('nf.h')} | Freshness`
  setRobots(false)
})
</script>

<template>
  <main class="nf">
    <div class="wrap">
      <p class="nf__code">404</p>
      <h1 class="nf__h">{{ t('nf.h') }}</h1>
      <p class="nf__p">{{ t('nf.p') }}</p>

      <form class="nf__search" role="search" @submit.prevent="search">
        <input v-model="q" type="search" :placeholder="t('shop.search')" :aria-label="t('shop.search')">
        <button type="submit" :aria-label="t('shop.search')"><BIcon name="search" :size="16" /></button>
      </form>

      <nav class="nf__cats" :aria-label="t('cat.sections')">
        <RouterLink v-for="c in cats" :key="c.id" :to="categoryPath(c)">{{ catName(c.id) }}</RouterLink>
      </nav>

      <RouterLink to="/" class="btn"><span>{{ t('pp.home') }}</span></RouterLink>
    </div>
  </main>
</template>

<style scoped>
.nf{ padding:calc(var(--nav-h) + clamp(40px,6vw,80px)) 0 clamp(64px,8vw,110px); }
.nf__code{ margin:0; font-family:var(--display); font-size:clamp(4rem,10vw,7rem); line-height:1; color:var(--leaf); }
.nf__h{ margin:8px 0 10px; font-family:var(--display); font-weight:600; font-size:clamp(2rem,4.4vw,3rem); line-height:1.05; }
.nf__p{ margin:0 0 22px; color:var(--ink-3); max-width:52ch; }
.nf__search{ display:flex; max-width:520px; height:52px; margin-bottom:22px; border:1px solid var(--line); border-radius:999px; overflow:hidden; background:var(--white); }
.nf__search input{ flex:1; border:0; padding:0 20px; font:inherit; background:transparent; }
.nf__search input:focus{ outline:none; }
.nf__search button{ width:52px; border:0; background:var(--forest); color:#fff; cursor:pointer; }
.nf__cats{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:28px; }
.nf__cats a{ padding:9px 16px; border-radius:999px; background:var(--paper-2); color:var(--ink); text-decoration:none; font-size:.88rem; font-weight:600; }
.nf__cats a:hover{ background:var(--forest); color:#fff; }
</style>
