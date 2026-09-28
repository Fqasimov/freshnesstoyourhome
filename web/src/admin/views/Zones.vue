<script setup>
import { ref, onMounted } from 'vue'
import { api, toAzn, toMinor } from '../api'
import { say, complain } from '../toast'
import ZoneForm from './ZoneForm.vue'

/**
 * Delivery areas and what they cost.
 *
 * These ship at zero, because nobody had decided the numbers. The quote
 * endpoint reads the same rows, so a fee typed here is charged on the very
 * next basket — on the website and in the app, without a release.
 */
const rows = ref([])
const busy = ref(true)
const fee = ref({})
const min = ref({})
const editing = ref(null)

async function load () {
  busy.value = true
  try {
    rows.value = (await api('/admin/zones')).data
    fee.value = Object.fromEntries(rows.value.map(z => [z.id, toAzn(z.fee_minor)]))
    min.value = Object.fromEntries(rows.value.map(z => [z.id, toAzn(z.min_order_minor)]))
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function patch (zone, body, note) {
  try {
    await api(`/admin/zones/${zone.id}`, { method: 'PATCH', body })
    Object.assign(zone, body)
    say(note)
  } catch (e) {
    complain(e)
  } finally {
    fee.value[zone.id] = toAzn(zone.fee_minor)
    min.value[zone.id] = toAzn(zone.min_order_minor)
  }
}

function saveFee (z) {
  const minor = toMinor(fee.value[z.id])
  if (!Number.isFinite(minor) || minor < 0 || minor === z.fee_minor) return
  patch(z, { fee_minor: minor }, `${z.name?.az ?? z.id}: çatdırılma ${toAzn(minor)} AZN`)
}

function saveMin (z) {
  const minor = toMinor(min.value[z.id])
  if (!Number.isFinite(minor) || minor < 0 || minor === z.min_order_minor) return
  patch(z, { min_order_minor: minor }, `${z.name?.az ?? z.id}: minimum ${toAzn(minor)} AZN`)
}

function saved (zone) {
  const row = rows.value.find(z => z.id === zone.id)
  if (row) Object.assign(row, zone)
  else rows.value.push(zone)
  fee.value[zone.id] = toAzn(zone.fee_minor)
  min.value[zone.id] = toAzn(zone.min_order_minor)
  editing.value = null
}

onMounted(load)
</script>

<template>
  <div class="a-row" style="align-items:flex-start">
    <div style="flex:1">
      <h2 class="a-h">Çatdırılma zonaları</h2>
      <p class="a-sub">Burada yazılan haqq növbəti sifarişdən tutulur. Adı dəyişmək üçün zonanın adına toxunun.</p>
    </div>
    <button class="a-btn" @click="editing = 'new'">+ Yeni zona</button>
  </div>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else class="a-scroll">
    <table class="a-t">
      <thead>
        <tr>
          <th>Zona</th>
          <th class="num">Çatdırılma (AZN)</th>
          <th class="num">Minimum sifariş (AZN)</th>
          <th>Aktiv</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="z in rows" :key="z.id">
          <td>
            <button type="button" class="a-link" @click="editing = z">{{ z.name?.az ?? z.id }}</button>
            <div class="a-mono a-muted">{{ z.id }}</div>
          </td>
          <td class="num">
            <input v-model="fee[z.id]" class="a-in a-in--num" inputmode="decimal"
                   @keyup.enter="saveFee(z)" @blur="saveFee(z)">
          </td>
          <td class="num">
            <input v-model="min[z.id]" class="a-in a-in--num" inputmode="decimal"
                   @keyup.enter="saveMin(z)" @blur="saveMin(z)">
          </td>
          <td>
            <label class="a-sw">
              <input type="checkbox" :checked="z.is_active"
                     @change="patch(z, { is_active: !z.is_active }, 'Zona yeniləndi')">
            </label>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <ZoneForm v-if="editing" :zone="editing === 'new' ? null : editing"
            @close="editing = null" @saved="saved" />
</template>
