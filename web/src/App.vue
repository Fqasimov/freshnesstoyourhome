<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useCart } from './composables/useCart'
import { useToast, flyToCart } from './composables/useMotion'

import IntroSequence from './components/IntroSequence.vue'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import CartDrawer from './components/CartDrawer.vue'
import QuickView from './components/QuickView.vue'
import ToastMessage from './components/ToastMessage.vue'
import BackToTop from './components/BackToTop.vue'

import { useI18n } from './composables/useI18n'

const { t } = useI18n()
const { add, open } = useCart()
const { toast } = useToast()

const nav = ref(null)
const peeked = ref(null)

/* A product with two tin sizes goes through the quick view, so the
   customer picks a size before it reaches the basket. */
function onAdd ({ product, el }) {
  if (product.variants) { peeked.value = product; return }
  flyToCart(el, nav.value?.cartBtn)
  add(product.id, null, 1)
  toast(t('ui.added'))
}

/* A set joins the basket as a single discounted line. */
function onAddSet ({ set, el }) {
  flyToCart(el, nav.value?.cartBtn)
  add(set.id, null, 1, 'set')
  toast(t('ui.added'))
}

function onConfirm ({ product, v, qty, el }) {
  flyToCart(el, nav.value?.cartBtn)
  add(product.id, v, qty)
  toast(t('ui.added'))
  peeked.value = null
}

/* The scrim is shared by the drawer and the quick view. */
const scrim = () => open.value || !!peeked.value
function closeAll () { open.value = false; peeked.value = null }

watch([open, peeked], () => {
  document.body.classList.toggle('is-locked', scrim())
})

const onKey = e => { if (e.key === 'Escape') closeAll() }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <IntroSequence />

  <SiteNav ref="nav" />

  <!--
    The shell stays put across both pages: nav, basket, quick view and toast
    belong to the whole site, so switching page never loses a basket or
    re-animates the header.
  -->
  <RouterView v-slot="{ Component }">
    <component
      :is="Component"
      @add="onAdd"
      @add-set="onAddSet"
      @peek="peeked = $event"
    />
  </RouterView>

  <SiteFooter />

  <div class="scrim" :class="{ on: scrim() }" @click="closeAll"></div>
  <CartDrawer />
  <QuickView :product="peeked" @close="peeked = null" @add="onConfirm" />
  <ToastMessage />
  <BackToTop />
</template>

<style scoped>
/* ---------- 16. Cart drawer ---------------------------------------------- */
.scrim{
  position:fixed; inset:0; z-index:400; background:rgba(27,41,22,.5);
  opacity:0; visibility:hidden; transition:opacity .5s var(--ease), visibility .5s;
}
.scrim.on{ opacity:1; visibility:visible; }
</style>
