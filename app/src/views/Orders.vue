<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/client'
import AppBar from '../components/AppBar.vue'
import { t, money } from '../i18n'

const orders = ref([])
const loading = ref(true)
const error = ref('')

const LIVE = ['placed', 'confirmed', 'preparing', 'out_for_delivery']

onMounted(async () => {
  try {
    const { data } = await api.orders()
    orders.value = data
  } catch (e) {
    error.value = e.status === 0 ? t('err.offline') : t('err.generic')
  } finally {
    loading.value = false
  }
})

function pillClass (status) {
  if (LIVE.includes(status)) return 'pill pill--live'
  if (status === 'delivered') return 'pill pill--done'
  return 'pill pill--off'
}

function formatDate (iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
</script>

<template>
  <main class="screen">
    <AppBar :title="t('orders.title')" />

    <div v-if="loading" class="empty"><span class="spinner" style="margin:0 auto" /></div>

    <p v-else-if="error" class="note note--warn wrap" style="margin-top:16px">{{ error }}</p>

    <div v-else-if="!orders.length" class="empty">
      <h3>{{ t('orders.empty') }}</h3>
      <RouterLink to="/shop" class="btn btn--ghost" style="margin-top:16px">
        {{ t('cart.browse') }}
      </RouterLink>
    </div>

    <section v-else class="wrap orders__list">
      <RouterLink
        v-for="o in orders"
        :key="o.id"
        :to="{ name: 'order', params: { id: o.id } }"
        class="order"
      >
        <div class="order__head">
          <strong class="order__code">{{ o.code }}</strong>
          <span :class="pillClass(o.status)">{{ t('status.' + o.status) }}</span>
        </div>

        <div class="order__meta small muted">
          {{ formatDate(o.delivery_date) }} · {{ o.items?.length ?? 0 }}
        </div>

        <div class="order__foot">
          <!-- Until the goods are weighed the figure is an estimate, and the
               screen says so rather than implying a precision we do not have. -->
          <small v-if="o.requires_weighing && !o.final_total_minor" class="muted">
            {{ t('cart.about') }}
          </small>
          <strong>{{ o.payable_display }}</strong>
        </div>
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.orders__list{ padding-top:16px; display:flex; flex-direction:column; gap:11px; }
.order{
  display:block; padding:15px;
  background:#fff; border:1px solid var(--line-soft); border-radius:var(--radius);
  color:inherit; text-decoration:none;
}
.order__head{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
.order__code{ font-family:var(--display); font-size:1.16rem; letter-spacing:.02em; }
.order__meta{ margin-top:5px; }
.order__foot{ display:flex; align-items:baseline; justify-content:flex-end; gap:5px; margin-top:11px; font-size:1.05rem; }
</style>
