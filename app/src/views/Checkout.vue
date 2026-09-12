<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCart } from '../stores/cart'
import { useCatalogue } from '../stores/catalogue'
import { useAuth } from '../stores/auth'
import { api } from '../api/client'
import AppBar from '../components/AppBar.vue'
import { t, pick, money } from '../i18n'

const cart = useCart()
const catalogue = useCatalogue()
const auth = useAuth()
const router = useRouter()

const addresses = ref([])
const addressId = ref(null)
const date = ref('')
const payment = ref('cash')
const note = ref('')
const placing = ref(false)
const error = ref('')
const loading = ref(true)

/** The shop takes orders a day ahead, so today is not offered. */
const minDate = computed(() => {
  const lead = catalogue.delivery?.lead_days ?? 1
  const d = new Date()
  d.setDate(d.getDate() + lead)
  return d.toISOString().slice(0, 10)
})

const maxDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
})

const selected = computed(() => addresses.value.find((a) => a.id === addressId.value))
const quote = computed(() => cart.quote)

const canPlace = computed(() =>
  Boolean(addressId.value) &&
  Boolean(date.value) &&
  auth.profileComplete &&
  quote.value?.meets_minimum &&
  !placing.value
)

onMounted(async () => {
  try {
    const { data } = await api.addresses()
    addresses.value = data
    addressId.value = data.find((a) => a.is_default)?.id ?? data[0]?.id ?? null
    date.value = minDate.value

    // The fee depends on the zone, so the quote is refreshed once an address
    // is known — the basket screen priced it without one.
    if (selected.value) await cart.refreshQuote(selected.value.delivery_zone_id)
  } catch (e) {
    error.value = e.status === 0 ? t('err.offline') : t('err.generic')
  } finally {
    loading.value = false
  }
})

async function pickAddress (id) {
  addressId.value = id
  const zone = addresses.value.find((a) => a.id === id)?.delivery_zone_id ?? null
  try { await cart.refreshQuote(zone) } catch { /* totals stay as they were */ }
}

async function place () {
  if (!canPlace.value) return
  placing.value = true
  error.value = ''

  try {
    // Ids and quantities only. No prices leave this device.
    const order = await api.placeOrder({
      address_id: addressId.value,
      delivery_date: date.value,
      payment_method: payment.value,
      note: note.value.trim() || undefined,
      lines: cart.lines,
    })

    await cart.clear()
    router.replace({ name: 'order', params: { id: order.id }, query: { placed: '1' } })
  } catch (e) {
    if (e.payload?.unavailable_product_ids?.length) {
      await cart.dropUnavailable(e.payload.unavailable_product_ids)
      error.value = e.message
      await cart.refreshQuote()
    } else {
      const fields = e.fieldErrors ?? {}
      error.value = Object.values(fields)[0] ?? e.message ?? t('err.generic')
    }
  } finally {
    placing.value = false
  }
}
</script>

<template>
  <main class="screen">
    <AppBar :title="t('checkout.title')" back />

    <div v-if="loading" class="empty"><span class="spinner" style="margin:0 auto" /></div>

    <template v-else>
      <!-- A courier cannot deliver to a customer with no name and no phone;
           the server refuses the order too, so this is a shortcut rather than
           the control. -->
      <section v-if="!auth.profileComplete" class="wrap checkout__section">
        <p class="note note--warn">{{ t('profile.complete') }}</p>
        <RouterLink to="/profile" class="btn btn--ghost btn--block" style="margin-top:12px">
          {{ t('profile.title') }}
        </RouterLink>
      </section>

      <section class="wrap checkout__section">
        <h2 class="checkout__heading">{{ t('checkout.address') }}</h2>

        <div v-if="addresses.length" class="stack">
          <button
            v-for="a in addresses"
            :key="a.id"
            class="option"
            :class="{ 'is-on': addressId === a.id }"
            @click="pickAddress(a.id)"
          >
            <span class="option__dot" aria-hidden="true" />
            <span class="option__body">
              <strong v-if="a.label">{{ a.label }}</strong>
              <span>{{ a.line }}</span>
              <span v-if="a.notes" class="small muted">{{ a.notes }}</span>
            </span>
          </button>
        </div>

        <p v-else class="muted small">{{ t('address.none') }}</p>

        <RouterLink to="/profile/addresses" class="btn btn--ghost btn--block" style="margin-top:12px">
          {{ t('checkout.addAddress') }}
        </RouterLink>
      </section>

      <section class="wrap checkout__section">
        <h2 class="checkout__heading">{{ t('checkout.date') }}</h2>
        <input v-model="date" class="field__input" type="date" :min="minDate" :max="maxDate">
        <p class="field__hint">{{ t('checkout.dateNote') }}</p>
      </section>

      <section class="wrap checkout__section">
        <h2 class="checkout__heading">{{ t('checkout.payment') }}</h2>

        <div class="stack">
          <button class="option" :class="{ 'is-on': payment === 'cash' }" @click="payment = 'cash'">
            <span class="option__dot" aria-hidden="true" />
            <span class="option__body"><strong>{{ t('checkout.cash') }}</strong></span>
          </button>
          <button class="option" :class="{ 'is-on': payment === 'pos' }" @click="payment = 'pos'">
            <span class="option__dot" aria-hidden="true" />
            <span class="option__body"><strong>{{ t('checkout.pos') }}</strong></span>
          </button>
        </div>

        <p class="field__hint">{{ t('checkout.paymentNote') }}</p>
      </section>

      <section class="wrap checkout__section">
        <label class="field">
          <span class="field__label">{{ t('checkout.note') }}</span>
          <textarea v-model="note" class="field__input" rows="2" maxlength="500" />
        </label>
      </section>

      <section v-if="quote" class="wrap checkout__section">
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
            <small v-if="quote.requires_weighing" class="muted checkout__about">{{ t('cart.about') }}</small>
            {{ money(quote.total_minor, quote.currency) }}
          </span>
        </div>

        <p v-if="quote.requires_weighing" class="note" style="margin-top:14px">
          {{ t('shop.weighedNote') }}
          <strong>{{ t('cart.upTo', { amount: money(quote.weighed_ceiling_minor, quote.currency) }) }}</strong>
        </p>
      </section>

      <p v-if="error" class="note note--warn wrap">{{ error }}</p>

      <div class="wrap checkout__cta">
        <button class="btn btn--primary btn--block" :disabled="!canPlace" @click="place">
          <span v-if="placing" class="spinner" />
          {{ placing ? t('checkout.placing') : t('checkout.place') }}
        </button>
      </div>
    </template>
  </main>
</template>

<style scoped>
.checkout__section{ padding-top:22px; }
.checkout__heading{ margin-bottom:12px; font-size:1.15rem; }
.checkout__about{ font-size:.78rem; font-weight:400; margin-right:4px; }
.checkout__cta{ padding:22px 0 28px; }

.option{
  display:flex; align-items:flex-start; gap:12px; width:100%;
  padding:14px;
  background:#fff; border:1px solid var(--line); border-radius:var(--radius);
  text-align:left;
}
.option.is-on{ border-color:var(--forest); box-shadow:inset 0 0 0 1px var(--forest); }
.option__dot{
  width:20px; height:20px; flex:none; margin-top:2px;
  border:2px solid var(--line); border-radius:50%;
}
.option.is-on .option__dot{
  border-color:var(--forest);
  background:radial-gradient(circle at center, var(--forest) 0 5px, transparent 6px);
}
.option__body{ display:flex; flex-direction:column; gap:2px; min-width:0; }
</style>
