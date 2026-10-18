<script setup>
import { computed, ref, watch, watchEffect, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import BIcon from '../components/BIcon.vue'
import ProductCard from '../components/ProductCard.vue'
import { PRODUCTS, money, catalogueSettled } from '../data/catalogue'
import { badgeText } from '../data/discount'
import { productPath } from '../data/slug'
import { useI18n } from '../composables/useI18n'
import { setProductMeta, clearProductMeta } from '../composables/usePageMeta'

/**
 * One product, at an address of its own: /mehsul/{slug}.
 *
 * The same facts as the quick view, laid out as a page Google can index and a
 * customer can share. The build writes a plain HTML copy of every one of these
 * (web/scripts/prerender.mjs) so a search engine reads the name, price and
 * description without running any script; this component replaces that copy
 * the moment the app starts, with the live price.
 */
const emit = defineEmits(['add', 'add-set', 'peek', 'confirm'])

const route = useRoute()
const { t, nm, alt, dsc, catName, unitOf } = useI18n()

const product = computed(() => {
  const key = String(route.params.slug ?? '')
  return PRODUCTS.find(p => p.slug === key) ?? PRODUCTS.find(p => p.id === key) ?? null
})

/* The rest of its counter, so a page is never a dead end. */
const related = computed(() => product.value
  ? PRODUCTS.filter(p => p.cat === product.value.cat && p.id !== product.value.id).slice(0, 8)
  : [])

/* ── Buying ─────────────────────────────────────────────────────────────── */
const variant = ref(null)
const qty = ref(1)
const typed = ref('1')
const shown = ref(null)
const img = ref(null)

const weighed = computed(() => product.value?.unit?.kind === 'kg' && (product.value.unit.qty ?? 1) === 1
  && !product.value.variants)
watch(qty, v => { typed.value = String(v) })
watch(product, p => {
  variant.value = p?.variants ? 0 : null
  qty.value = 1
  shown.value = null
}, { immediate: true })

function setTyped (raw) {
  const n = Number(String(raw).trim().replace(',', '.'))
  if (Number.isFinite(n) && n >= 0.1 && n <= 99) qty.value = Math.round(n * 100) / 100
  typed.value = String(qty.value)
}
function stepQty (dir) {
  const step = weighed.value ? 0.5 : 1
  const next = Math.round((qty.value + dir * step) * 100) / 100
  qty.value = Math.min(99, Math.max(weighed.value ? 0.1 : 1, next))
}

const chosen = computed(() =>
  product.value?.variants && variant.value != null ? product.value.variants[variant.value] : null)
const price = computed(() => chosen.value ? chosen.value.price : product.value?.price ?? 0)
const unit = computed(() => product.value
  ? (chosen.value ? unitOf(product.value, chosen.value) : unitOf(product.value)) : '')

const pictures = computed(() => {
  const p = product.value
  return p ? [p.img, ...(p.gallery ?? []).map(g => g.url)].filter(Boolean) : []
})

function buy () {
  emit('confirm', { product: product.value, v: variant.value, qty: qty.value, el: img.value })
}

/* ── What the tab and a search engine read ──────────────────────────────── */
watchEffect(() => {
  const p = product.value
  if (p) setProductMeta(p, { name: nm(p), desc: dsc(p), unit: unitOf(p), category: catName(p.cat) })
  else if (catalogueSettled.value) clearProductMeta({ missing: true })
})
onUnmounted(() => clearProductMeta())

const paragraphs = computed(() => dsc(product.value ?? {}).split(/\n+/).map(s => s.trim()).filter(Boolean))
</script>

<template>
  <main class="pp">
    <div class="wrap">
      <nav class="pp__crumbs" :aria-label="t('pp.crumbs')">
        <RouterLink to="/">{{ t('pp.home') }}</RouterLink>
        <BIcon name="chevron-right" :size="10" />
        <RouterLink to="/kataloq">{{ t('nav.shop') }}</RouterLink>
        <template v-if="product">
          <BIcon name="chevron-right" :size="10" />
          <span>{{ catName(product.cat) }}</span>
        </template>
      </nav>

      <article v-if="product" class="pp__main">
        <div class="pp__media">
          <div class="pp__photo" ref="img">
            <img v-if="shown ?? product.img" :src="shown ?? product.img" :alt="nm(product)">
            <BIcon v-else name="basket" :size="42" class="pp__none" />
            <span v-if="product.discount" class="pp__sale">{{ badgeText(product.discount, money) }}</span>
          </div>
          <div v-if="pictures.length > 1" class="pp__thumbs">
            <button v-for="(src, i) in pictures" :key="src" type="button"
                    :class="{ on: (shown ?? product.img) === src }" :aria-label="`${nm(product)} ${i + 1}`"
                    @click="shown = src">
              <img :src="src" alt="" loading="lazy">
            </button>
          </div>
        </div>

        <div class="pp__body">
          <span class="pp__cat">{{ catName(product.cat) }}</span>
          <h1 class="pp__h">{{ nm(product) }}</h1>
          <p v-if="alt(product) && alt(product) !== nm(product)" class="pp__alt">{{ alt(product) }}</p>

          <p class="pp__price">
            <b>{{ money(price) }} ₼</b>
            <s v-if="product.discount && !chosen">{{ money(product.regular) }} ₼</s>
            <span class="pp__unit">{{ unit }}</span>
          </p>
          <p v-if="product.weighed" class="pp__flag">{{ t('ui.weighedNote') }}</p>

          <div v-if="product.variants" class="pp__variants">
            <button v-for="(v, i) in product.variants" :key="i" type="button"
                    :class="{ on: variant === i }" @click="variant = i">
              {{ unitOf(product, v) }} · {{ v.price }} ₼
            </button>
          </div>

          <div class="pp__buy">
            <div class="pp__qty">
              <button type="button" aria-label="−" @click="stepQty(-1)">−</button>
              <label v-if="weighed">
                <input type="text" inputmode="decimal" autocomplete="off" v-model="typed"
                       :aria-label="t('ui.kgAmount')" @change="setTyped(typed)"
                       @keydown.enter.prevent="$event.target.blur()">
                <i>{{ t('ui.kgShort') }}</i>
              </label>
              <span v-else>{{ qty }}</span>
              <button type="button" aria-label="+" @click="stepQty(1)">+</button>
            </div>
            <button type="button" class="btn pp__add" @click="buy">
              <span>{{ t('ui.add') }} · {{ money(price * qty) }} ₼</span>
            </button>
          </div>

          <div v-if="paragraphs.length" class="pp__desc">
            <p v-for="(line, i) in paragraphs" :key="i">{{ line }}</p>
          </div>

          <ul class="pp__facts">
            <li><BIcon name="truck" :size="15" /> {{ t('pp.delivery') }}</li>
            <li><BIcon name="calendar-check" :size="15" /> {{ t('pr4.d') }}</li>
          </ul>
        </div>
      </article>

      <section v-else-if="catalogueSettled" class="pp__missing">
        <h1 class="pp__h">{{ t('pp.missing') }}</h1>
        <p>{{ t('pp.missingCopy') }}</p>
        <RouterLink to="/kataloq" class="btn"><span>{{ t('hero.cta1') }}</span></RouterLink>
      </section>

      <p v-else class="pp__loading">{{ t('pp.loading') }}</p>

      <section v-if="related.length" class="pp__more">
        <h2>{{ t('pp.related') }}</h2>
        <div class="pp__grid">
          <ProductCard v-for="p in related" :key="p.id" :product="p"
                       @add="emit('add', $event)" @peek="emit('peek', $event)" />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.pp{ padding:calc(var(--nav-h) + clamp(20px,3vw,40px)) 0 clamp(64px,8vw,110px); }

.pp__crumbs{
  display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:clamp(16px,2vw,24px);
  font-size:.78rem; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-3);
}
.pp__crumbs a{ color:inherit; text-decoration:none; }
.pp__crumbs a:hover{ color:var(--forest); }

.pp__main{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:clamp(24px,4vw,64px); align-items:start; }

.pp__photo{
  position:relative; aspect-ratio:1; border-radius:22px; overflow:hidden;
  background:var(--white); display:grid; place-items:center;
}
.pp__photo img{ width:100%; height:100%; object-fit:cover; }
.pp__none{ color:var(--ink-3); }
.pp__sale{
  position:absolute; top:14px; left:14px; padding:5px 10px; border-radius:999px;
  background:var(--brick); color:var(--paper); font-size:.8rem; font-weight:600;
}
.pp__thumbs{ display:flex; gap:8px; margin-top:10px; overflow-x:auto; }
.pp__thumbs button{
  flex:0 0 64px; height:64px; padding:0; border:2px solid transparent; border-radius:12px;
  overflow:hidden; background:var(--white); cursor:pointer;
}
.pp__thumbs button.on{ border-color:var(--forest); }
.pp__thumbs img{ width:100%; height:100%; object-fit:cover; }

.pp__cat{ font-size:.74rem; letter-spacing:.12em; text-transform:uppercase; color:var(--leaf-d); }
.pp__h{
  margin:8px 0 6px; font-family:var(--display); font-weight:600;
  font-size:clamp(1.9rem,3.6vw,2.9rem); line-height:1.05; letter-spacing:-.02em;
}
.pp__alt{ margin:0 0 14px; color:var(--ink-3); }

.pp__price{ display:flex; flex-wrap:wrap; align-items:baseline; gap:8px 12px; margin:14px 0 6px; }
.pp__price b{ font-size:1.8rem; font-weight:600; color:var(--forest); }
.pp__price s{ color:var(--ink-3); }
.pp__unit{ color:var(--ink-3); font-size:.92rem; }
.pp__flag{ display:flex; gap:6px; align-items:center; margin:0 0 10px; font-size:.84rem; color:var(--ink-3); }

.pp__variants{ display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; }
.pp__variants button{
  padding:8px 14px; border-radius:999px; border:1px solid var(--line); background:transparent; cursor:pointer;
}
.pp__variants button.on{ background:var(--forest); border-color:var(--forest); color:var(--paper); }

.pp__buy{ display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin:18px 0 22px; }
.pp__qty{
  display:flex; align-items:center; height:52px; border:1px solid var(--line); border-radius:999px; overflow:hidden;
}
.pp__qty button{ width:46px; height:100%; border:0; background:transparent; font-size:1.2rem; cursor:pointer; }
.pp__qty span, .pp__qty label{ min-width:52px; text-align:center; display:flex; align-items:center; justify-content:center; gap:2px; }
.pp__qty input{ width:44px; border:0; background:transparent; text-align:center; font:inherit; }
.pp__qty i{ font-style:normal; color:var(--ink-3); font-size:.85rem; }
.pp__add{ flex:1 1 220px; min-height:52px; }

.pp__desc{ border-top:1px solid var(--line); padding-top:16px; line-height:1.6; }
.pp__desc p{ margin:0 0 8px; }

.pp__facts{ list-style:none; padding:0; margin:18px 0 0; display:grid; gap:8px; font-size:.9rem; color:var(--ink-3); }
.pp__facts li{ display:flex; gap:8px; align-items:flex-start; }
.pp__facts li :deep(svg), .pp__facts li .bi{ flex:0 0 auto; margin-top:3px; color:var(--forest); }

.pp__missing, .pp__loading{ padding:clamp(40px,8vw,90px) 0; max-width:560px; }
.pp__missing p{ margin:0 0 20px; color:var(--ink-3); }

.pp__more{ margin-top:clamp(48px,6vw,80px); }
.pp__more h2{ font-family:var(--display); font-weight:600; font-size:clamp(1.5rem,2.6vw,2rem); margin:0 0 18px; }
.pp__grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:clamp(12px,1.6vw,20px); }

@media (max-width:820px){
  .pp__main{ grid-template-columns:1fr; }
}
</style>
