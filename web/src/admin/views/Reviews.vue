<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { say, complain } from '../toast'

/**
 * Reviews written on the website. Nothing shows until it is approved here:
 * the form is public, so a person decides what reaches the product page
 * (and Google's stars).
 */
const emit = defineEmits(['changed'])
const rows = ref([])
const products = ref({})
const busy = ref(true)
const filter = ref('pending')
const LABEL = { pending: 'Gözləyir', approved: 'Təsdiqlənib', rejected: 'Rədd edilib' }

async function load () {
  busy.value = true
  try {
    const [r, p] = await Promise.all([
      api(`/admin/reviews${filter.value ? `?status=${filter.value}` : ''}`),
      Object.keys(products.value).length ? null : api('/admin/products'),
    ])
    rows.value = r.data
    if (p) products.value = Object.fromEntries(p.data.map(x => [x.id, x.name?.az ?? x.id]))
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function set (r, status) {
  try {
    await api(`/admin/reviews/${r.id}`, { method: 'PATCH', body: { status } })
    r.status = status
    say(`${r.name}: ${LABEL[status].toLowerCase()}`)
    emit('changed')
  } catch (e) {
    complain(e)
  }
}

async function remove (r) {
  if (!window.confirm(`${r.name} adlı istifadəçinin rəyi silinsin?`)) return
  try {
    await api(`/admin/reviews/${r.id}`, { method: 'DELETE' })
    rows.value = rows.value.filter(x => x.id !== r.id)
    emit('changed')
  } catch (e) {
    complain(e)
  }
}

const shown = computed(() => rows.value.filter(r => !filter.value || r.status === filter.value))
onMounted(load)
</script>

<template>
  <div class="a-row" style="align-items:flex-start">
    <div style="flex:1">
      <h2 class="a-h">Rəylər</h2>
      <p class="a-sub">Saytda yazılan rəylər. Yalnız təsdiq etdikləriniz məhsul səhifəsində və Google-da (ulduzlar) görünür.</p>
    </div>
    <select v-model="filter" class="a-in" style="max-width:200px" aria-label="Süzgəc" @change="load">
      <option value="pending">Gözləyənlər</option>
      <option value="approved">Təsdiqlənənlər</option>
      <option value="rejected">Rədd edilənlər</option>
      <option value="">Hamısı</option>
    </select>
  </div>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else-if="!shown.length" class="a-empty">Rəy yoxdur.</div>
  <div v-else class="a-scroll">
    <table class="a-t">
      <thead><tr><th>Məhsul</th><th>Rəy</th><th>Tarix</th><th>Vəziyyət</th><th></th></tr></thead>
      <tbody>
        <tr v-for="r in shown" :key="r.id">
          <td>{{ products[r.product_id] ?? r.product_id }}</td>
          <td style="max-width:420px">
            <b>{{ r.name }}</b> · <span style="color:var(--warn)">{{ '★'.repeat(r.rating) }}</span> <span class="a-muted">{{ r.locale }}</span>
            <div v-if="r.text" style="white-space:pre-wrap">{{ r.text }}</div>
          </td>
          <td class="a-mono">{{ String(r.created_at).slice(0, 10) }}</td>
          <td>{{ LABEL[r.status] }}</td>
          <td class="num" style="white-space:nowrap">
            <button v-if="r.status !== 'approved'" type="button" class="a-btn a-btn--sm" @click="set(r, 'approved')">Təsdiqlə</button>
            <button v-if="r.status !== 'rejected'" type="button" class="a-btn a-btn--sm a-btn--ghost" @click="set(r, 'rejected')">Rədd et</button>
            <button type="button" class="a-link" style="margin-left:6px" @click="remove(r)">Sil</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
