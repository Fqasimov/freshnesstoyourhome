<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCart } from '../stores/cart'
import { useCatalogue } from '../stores/catalogue'
import { useAuth } from '../stores/auth'
import AppBar from '../components/AppBar.vue'
import { t, pick, money } from '../i18n'

const cart = useCart()
const catalogue = useCatalogue()
const auth = useAuth()
const router = useRouter()

const error = ref('')

async function refresh () {
  if (cart.isEmpty) return
  error.value = ''
  try {
    await cart.refreshQuote()
  } catch (e) {
    error.value = e.status === 0 ? t('err.offline') : t('err.generic')
  }
}

onMounted(refresh)

// Every change of quantity is re-priced by the server rather than adjusted
// locally, so the figure on this screen is always the server's own.
watch(() => cart.lines.map((l) => `${l.product_id}:${l.qty}`).join('|'), refresh)

const quote = computed(() => cart.quote)

const rows = computed(() =>
  (quote.value?.lines ?? []).map((line) => ({
    ...line,
    product: catalogue.byId(line.product_id),
  }))
)

function stepFor (row) {
  return row.is_weight_based ? 0.5 : 1
}

function qtyLabel (row) {
  return row.is_weight_based ? `${row.qty} kg` : `${row.qty}`
}

function checkout () {
  if (!auth.isSignedIn) {
    return router.push({ name: 'sign-in', query: { next: '/checkout' } })
  }
  router.push('/checkout')
}
</script>

<template>
  <main class="screen">
    <AppBar :title="t('cart.title')" />

    <div v-if="cart.isEmpty" class="empty">
      <h3>{{ t('cart.empty') }}</h3>
      <RouterLink to="/shop" class="btn btn--ghost" style="margin-top:16px">
        {{ t('cart.browse') }}
      </RouterLink>
    </div>

    <template v-else>
      <section class="wrap basket__list">
        <article v-for="row in rows" :key="row.product_id" class="basket__row">
          <div class="basket__media">
            <img v-if="row.product?.photo" :src="row.product.photo" :alt="row.name" loading="lazy">
          </div>

          <div class="basket__info">
            <h3 class="basket__name">{{ row.name }}</h3>
            <span v-if="row.product" class="small muted">{{ pick(row.product.unit_label) }}</span>

            <div class="basket__controls">
              <div class="stepper">
                <button :aria-label="t('cart.remove')" @click="cart.setQty(row.product_id, row.qty - stepFor(row))">−</button>
                <span>{{ qtyLabel(row) }}</span>
                <button :aria-label="t('shop.add')" @click="cart.add(row.product_id, stepFor(row))">+</button>
              </div>

              <strong class="basket__line">{{ money(row.line_total_minor, quote.currency) }}</strong>
            </div>
          </div>

          <button class="basket__x" :aria-label="t('cart.remove')" @click="cart.remove(row.product_id)">×</button>
        </article>
      </section>

      <p v-if="error" class="note note--warn wrap">{{ error }}</p>

      <section v-if="quote" class="wrap basket__totals">
        <div class="row">
          <span class="muted">{{ t('cart.subtotal') }}</span>
          <span>{{ money(quote.subtotal_minor, quote.currency) }}</span>
        </div>
        <div v-if="quote.delivery_fee_minor" class="row">
          <span class="muted">{{ t('cart.delivery') }}</span>
          <span>{{ money(quote.delivery_fee_minor, quote.currency) }}</span>
        </div>
        <div class="row">
          <span class="row__total">{{ t('cart.total') }}</span>
          <span class="row__total">
            <small v-if="quote.requires_weighing" class="muted basket__about">{{ t('cart.about') }}</small>
            {{ money(quote.total_minor, quote.currency) }}
          </span>
        </div>

        <!-- Weighed goods: the customer agrees to an estimate and a ceiling,
             not to a figure we cannot actually promise. -->
        <p v-if="quote.requires_weighing" class="note basket__weighed">
          {{ t('shop.weighedNote') }}
          <strong>{{ t('cart.upTo', { amount: money(quote.weighed_ceiling_minor, quote.currency) }) }}</strong>
        </p>

        <p v-if="!quote.meets_minimum" class="note note--warn">
          {{ t('cart.minimum', { amount: money(quote.minimum_order_minor, quote.currency) }) }}
        </p>
      </section>

      <div class="wrap basket__cta">
        <button
          class="btn btn--primary btn--block"
          :disabled="cart.quoting || !quote || !quote.meets_minimum"
          @click="checkout"
        >
          <span v-if="cart.quoting" class="spinner" />
          {{ t('cart.checkout') }}
        </button>
      </div>
    </template>
  </main>
</template>

<style scoped>
.basket__list{ padding-top:14px; }
.basket__row{
  display:flex; gap:13px; align-items:flex-start;
  padding:14px 0;
  border-bottom:1px solid var(--line-soft);
}
.basket__media{
  width:74px; height:74px; flex:none;
  background:var(--paper-3); border-radius:var(--radius); overflow:hidden;
}
.basket__media img{ width:100%; height:100%; object-fit:cover; display:block; }
.basket__info{ flex:1; min-width:0; }
.basket__name{ font-size:1.02rem; line-height:1.22; }
.basket__controls{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  margin-top:10px;
}
.basket__line{ font-size:1.02rem; font-variant-numeric:tabular-nums; }
.basket__x{
  width:32px; height:32px; flex:none;
  display:grid; place-items:center;
  font-size:1.3rem; color:var(--ink-3);
}
.basket__totals{ padding-top:18px; }
.basket__about{ font-size:.78rem; font-weight:400; margin-right:4px; }
.basket__weighed{ margin-top:14px; }
.basket__cta{ padding:20px 0 26px; }
</style>
