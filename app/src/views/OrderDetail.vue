<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/client'
import AppBar from '../components/AppBar.vue'
import { t, money } from '../i18n'

const props = defineProps({ id: { type: String, required: true } })
const route = useRoute()

const order = ref(null)
const loading = ref(true)
const error = ref('')
const cancelling = ref(false)
const confirmingCancel = ref(false)

const justPlaced = computed(() => route.query.placed === '1')

const STEPS = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']

const stepIndex = computed(() => STEPS.indexOf(order.value?.status))

onMounted(load)

async function load () {
  try {
    const { data } = await api.order(props.id)
    order.value = data
  } catch (e) {
    error.value = e.status === 0 ? t('err.offline') : t('err.generic')
  } finally {
    loading.value = false
  }
}

async function cancel () {
  cancelling.value = true
  try {
    const { data } = await api.cancelOrder(props.id)
    order.value = data
    confirmingCancel.value = false
  } catch (e) {
    error.value = e.message ?? t('err.generic')
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <main class="screen">
    <AppBar :title="order?.code ?? t('orders.title')" back />

    <div v-if="loading" class="empty"><span class="spinner" style="margin:0 auto" /></div>

    <p v-else-if="!order" class="note note--warn wrap" style="margin-top:16px">{{ error }}</p>

    <template v-else>
      <p v-if="justPlaced" class="note wrap detail__placed">✓ {{ t('status.placed') }}</p>

      <!-- Progress, as a track rather than a list: at a glance, where is it. -->
      <section v-if="order.status !== 'cancelled'" class="wrap detail__track">
        <div
          v-for="(s, i) in STEPS"
          :key="s"
          class="track__step"
          :class="{ 'is-done': i <= stepIndex }"
        >
          <span class="track__dot" aria-hidden="true" />
          <span class="track__label small">{{ t('status.' + s) }}</span>
        </div>
      </section>

      <p v-else class="note note--warn wrap detail__placed">
        {{ t('status.cancelled') }}<template v-if="order.cancel_reason"> — {{ order.cancel_reason }}</template>
      </p>

      <section class="wrap detail__section">
        <h2 class="detail__heading">{{ t('checkout.address') }}</h2>
        <p>{{ order.address_line }}</p>
        <p v-if="order.address_notes" class="small muted">{{ order.address_notes }}</p>
        <p class="small muted" style="margin-top:8px">
          {{ order.delivery_date }} ·
          {{ order.payment_method === 'cash' ? t('checkout.cash') : t('checkout.pos') }}
        </p>
      </section>

      <section class="wrap detail__section">
        <div v-for="item in order.items" :key="item.id" class="row">
          <span class="detail__item">
            {{ item.name }}
            <small class="muted">
              × {{ item.confirmed_qty ?? item.qty }}{{ item.is_weight_based ? ' kg' : '' }}
              <template v-if="item.is_weight_based && item.confirmed_qty == null">({{ t('cart.about') }})</template>
            </small>
          </span>
          <span>{{ money(item.final_line_total_minor ?? item.line_total_minor, order.currency) }}</span>
        </div>
      </section>

      <section class="wrap detail__section">
        <div class="row">
          <span class="muted">{{ t('cart.subtotal') }}</span>
          <span>{{ money(order.final_total_minor ? order.final_total_minor - order.delivery_fee_minor : order.subtotal_minor, order.currency) }}</span>
        </div>
        <div v-if="order.delivery_fee_minor" class="row">
          <span class="muted">{{ t('cart.delivery') }}</span>
          <span>{{ money(order.delivery_fee_minor, order.currency) }}</span>
        </div>
        <div class="row">
          <span class="row__total">
            {{ order.final_total_minor ? t('orders.final') : t('orders.estimate') }}
          </span>
          <span class="row__total">{{ order.payable_display }}</span>
        </div>

        <p v-if="order.requires_weighing && !order.final_total_minor" class="note" style="margin-top:14px">
          {{ t('orders.weighedPending') }} — {{ t('shop.weighedNote') }}
        </p>
      </section>

      <div v-if="order.can_cancel" class="wrap detail__section">
        <button v-if="!confirmingCancel" class="btn btn--danger btn--block" @click="confirmingCancel = true">
          {{ t('orders.cancel') }}
        </button>

        <div v-else class="stack">
          <p class="note note--warn">{{ t('orders.cancelConfirm') }}</p>
          <button class="btn btn--danger btn--block" :disabled="cancelling" @click="cancel">
            <span v-if="cancelling" class="spinner" /> {{ t('orders.cancel') }}
          </button>
          <button class="btn btn--ghost btn--block" @click="confirmingCancel = false">{{ t('cancel') }}</button>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.detail__placed{ margin-top:16px; }
.detail__section{ padding-top:24px; }
.detail__heading{ margin-bottom:8px; font-size:1.1rem; }
.detail__item{ display:flex; flex-direction:column; gap:2px; }

.detail__track{
  display:flex; gap:4px;
  padding-top:22px;
}
.track__step{ flex:1; display:flex; flex-direction:column; gap:7px; }
.track__dot{
  height:4px; border-radius:2px;
  background:var(--paper-3);
}
.track__step.is-done .track__dot{ background:var(--forest); }
.track__label{
  font-size:.68rem; line-height:1.2; color:var(--ink-3);
  hyphens:auto;
}
.track__step.is-done .track__label{ color:var(--forest); font-weight:600; }
</style>
