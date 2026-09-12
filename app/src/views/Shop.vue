<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCatalogue } from '../stores/catalogue'
import { useCart } from '../stores/cart'
import ProductCard from '../components/ProductCard.vue'
import { t, pick, money } from '../i18n'

const catalogue = useCatalogue()
const cart = useCart()

const category = ref('all')
const query = ref('')
const loading = ref(false)

onMounted(async () => {
  if (!catalogue.loaded) loading.value = true
  try { await catalogue.load() } catch { /* the banner reports it */ }
  finally { loading.value = false }
})

const categories = computed(() => [
  { id: 'all', name: { az: t('shop.all'), ru: t('shop.all'), en: t('shop.all') } },
  ...catalogue.categories,
])

const results = computed(() => {
  let list = catalogue.inCategory(category.value)

  const q = query.value.trim().toLowerCase()
  if (q) {
    // Searches all three languages at once: a customer who knows a product as
    // "лосось" should find it with the app in Azerbaijani.
    list = list.filter((p) =>
      Object.values(p.name ?? {}).some((n) => String(n).toLowerCase().includes(q))
    )
  }

  return list
})

const showPopular = computed(() =>
  category.value === 'all' && !query.value.trim() && catalogue.popular.length > 0
)
</script>

<template>
  <main class="screen">
    <header class="topbar">
      <div class="topbar__in">
        <span class="topbar__title">{{ t('app.name') }}</span>
      </div>

      <div class="shop__search wrap">
        <input
          v-model="query"
          class="field__input"
          type="search"
          inputmode="search"
          autocapitalize="none"
          autocorrect="off"
          :placeholder="t('shop.search')"
        >
      </div>

      <div class="chips" role="tablist">
        <button
          v-for="c in categories"
          :key="c.id"
          class="chip"
          :class="{ 'is-on': category === c.id }"
          role="tab"
          :aria-selected="category === c.id"
          @click="category = c.id"
        >{{ pick(c.name) }}</button>
      </div>
    </header>

    <p v-if="catalogue.stale" class="note note--warn shop__stale wrap">
      {{ t('err.offline') }}
    </p>

    <div v-if="loading && !catalogue.loaded" class="empty">
      <span class="spinner" style="margin:0 auto" />
      <p style="margin-top:14px">{{ t('loading') }}</p>
    </div>

    <template v-else>
      <section v-if="showPopular" class="wrap shop__section">
        <h2 class="shop__heading">{{ t('shop.popular') }}</h2>
        <div class="grid">
          <ProductCard v-for="p in catalogue.popular" :key="p.id" :product="p" />
        </div>
      </section>

      <section class="wrap shop__section">
        <h2 v-if="showPopular" class="shop__heading">{{ t('shop.all') }}</h2>
        <div v-if="results.length" class="grid">
          <ProductCard v-for="p in results" :key="p.id" :product="p" />
        </div>
        <p v-else class="empty">{{ t('shop.empty') }}</p>
      </section>
    </template>

    <!-- A running total that follows the customer down the page, so they never
         have to open the basket to know where they are. -->
    <Transition name="sheet">
      <RouterLink v-if="!cart.isEmpty" to="/basket" class="shop__bar">
        <span class="shop__bar-count">{{ cart.count }}</span>
        <span>{{ t('cart.title') }}</span>
        <span class="shop__bar-go">→</span>
      </RouterLink>
    </Transition>
  </main>
</template>

<style scoped>
.shop__search{ padding-bottom:10px; }

.chips{
  display:flex; gap:8px;
  padding:0 var(--gutter) 12px;
  overflow-x:auto;
  scrollbar-width:none;
  /* Keeps the first and last chip off the screen edge while scrolling. */
  scroll-padding-inline:var(--gutter);
}
.chips::-webkit-scrollbar{ display:none; }
.chip{
  flex:none;
  padding:8px 15px;
  background:var(--paper-2); color:var(--ink-2);
  border-radius:999px;
  font-size:.85rem; font-weight:600; white-space:nowrap;
}
.chip.is-on{ background:var(--forest); color:#fff; }

.shop__stale{ margin:14px var(--gutter) 0; }
.shop__section{ padding-top:22px; }
.shop__heading{
  margin-bottom:13px;
  font-size:1.25rem;
}

.shop__bar{
  position:fixed; left:var(--gutter); right:var(--gutter);
  bottom:calc(var(--tabbar-h) + var(--safe-bottom) + 12px);
  z-index:25;
  display:flex; align-items:center; gap:11px;
  padding:14px 18px;
  background:var(--forest); color:#fff;
  border-radius:999px;
  font-weight:600; text-decoration:none;
  box-shadow:0 8px 24px rgba(27,41,22,.24);
}
.shop__bar-count{
  display:grid; place-items:center;
  min-width:24px; height:24px; padding:0 7px;
  background:var(--acid); color:var(--ink);
  border-radius:999px; font-size:.8rem; font-weight:700;
}
.shop__bar-go{ margin-left:auto; font-size:1.1rem; }
</style>
