<script setup>
import { ref, computed, onMounted } from 'vue'
import { api, toAzn, toMinor } from '../api'
import { say, complain } from '../toast'

/**
 * The price list.
 *
 * Edited in place, one row at a time, and saved per row rather than behind a
 * single "save everything" button: a shopkeeper changing one price should not
 * be able to commit forty other half-finished edits by accident.
 */
const rows = ref([])
const search = ref('')
const category = ref('')
const busy = ref(true)
const saving = ref(null)
const picked = ref(new Set())

/* The edited value lives beside the row, so the row still knows what the
   server last said and can show that the field has been touched. */
const draft = ref({})

const categories = computed(() => {
  const seen = new Map()
  rows.value.forEach(r => seen.set(r.category_id, r.category?.az ?? r.category_id))
  return [...seen].sort((a, b) => a[1].localeCompare(b[1], 'az'))
})

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter(r =>
    (!category.value || r.category_id === category.value) &&
    (!q || `${r.id} ${r.name?.az ?? ''} ${r.name?.en ?? ''} ${r.name?.ru ?? ''}`.toLowerCase().includes(q)))
})

const dirty = r => draft.value[r.id] !== undefined && toMinor(draft.value[r.id]) !== r.price_minor

async function load () {
  busy.value = true
  try {
    rows.value = (await api('/admin/products')).data
    draft.value = Object.fromEntries(rows.value.map(r => [r.id, toAzn(r.price_minor)]))
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function patch (row, body, note) {
  saving.value = row.id
  try {
    const updated = await api(`/admin/products/${row.id}`, { method: 'PATCH', body })
    Object.assign(row, updated)
    draft.value[row.id] = toAzn(row.price_minor)
    say(note)
  } catch (e) {
    complain(e)
    // Put the row back to what the server actually holds, so the screen is
    // never showing a price that was refused.
    draft.value[row.id] = toAzn(row.price_minor)
  } finally {
    saving.value = null
  }
}

function savePrice (row) {
  const minor = toMinor(draft.value[row.id])
  if (!Number.isFinite(minor) || minor < 1) {
    complain({ message: 'Qiymət düzgün deyil.' })
    draft.value[row.id] = toAzn(row.price_minor)
    return
  }
  if (minor === row.price_minor) return
  patch(row, { price_minor: minor }, `${row.name?.az ?? row.id}: ${toAzn(minor)} AZN`)
}

const toggle = (row, field) =>
  patch(row, { [field]: !row[field] }, `${row.name?.az ?? row.id} yeniləndi`)

function pick (id) {
  const next = new Set(picked.value)
  next.has(id) ? next.delete(id) : next.add(id)
  picked.value = next
}

async function bulkStock (inStock) {
  try {
    await api('/admin/products/stock', {
      method: 'POST',
      body: { ids: [...picked.value], in_stock: inStock },
    })
    rows.value.forEach(r => { if (picked.value.has(r.id)) r.in_stock = inStock })
    say(`${picked.value.size} məhsul ${inStock ? 'stoka qaytarıldı' : 'stokdan çıxarıldı'}`)
    picked.value = new Set()
  } catch (e) {
    complain(e)
  }
}

onMounted(load)
</script>

<template>
  <h2 class="a-h">Məhsullar və qiymətlər</h2>
  <p class="a-sub">Qiyməti dəyişin və Enter basın. Dəyişiklik saytda və tətbiqdə dərhal görünür.</p>

  <div class="a-row" style="margin-bottom:12px">
    <input v-model="search" class="a-in" style="max-width:260px" placeholder="Axtar…">
    <select v-model="category" class="a-in" style="max-width:210px">
      <option value="">Bütün bölmələr</option>
      <option v-for="[id, name] in categories" :key="id" :value="id">{{ name }}</option>
    </select>
    <span class="a-muted" style="font-size:.8rem">{{ shown.length }} sətir</span>

    <template v-if="picked.size">
      <span class="a-top__spacer"></span>
      <span class="a-muted" style="font-size:.8rem">{{ picked.size }} seçilib</span>
      <button class="a-btn a-btn--sm a-btn--danger" @click="bulkStock(false)">Stokdan çıxar</button>
      <button class="a-btn a-btn--sm a-btn--ghost" @click="bulkStock(true)">Stoka qaytar</button>
    </template>
  </div>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else-if="!shown.length" class="a-empty">Uyğun məhsul yoxdur.</div>

  <div v-else class="a-scroll">
    <table class="a-t">
      <thead>
        <tr>
          <th style="width:30px"></th>
          <th>Məhsul</th>
          <th>Bölmə</th>
          <th>Vahid</th>
          <th class="num">Qiymət (AZN)</th>
          <th>Stok</th>
          <th>Vitrin</th>
          <th>Populyar</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in shown" :key="r.id">
          <td>
            <input type="checkbox" :checked="picked.has(r.id)" @change="pick(r.id)"
                   :aria-label="r.name?.az">
          </td>
          <td>
            <b>{{ r.name?.az ?? r.id }}</b>
            <div class="a-mono a-muted">{{ r.id }}</div>
          </td>
          <td class="a-muted">{{ r.category?.az ?? r.category_id }}</td>
          <td class="a-muted">
            {{ r.unit_label?.az ?? r.unit_kind }}
            <span v-if="r.is_weight_based" class="a-pill" style="margin-left:4px">çəki</span>
          </td>
          <td class="num">
            <input v-model="draft[r.id]" class="a-in a-in--num" :class="{ 'a-in--dirty': dirty(r) }"
                   inputmode="decimal" :disabled="saving === r.id"
                   @keyup.enter="savePrice(r)" @blur="savePrice(r)">
          </td>
          <td>
            <label class="a-sw">
              <input type="checkbox" :checked="r.in_stock" @change="toggle(r, 'in_stock')">
            </label>
          </td>
          <td>
            <label class="a-sw">
              <input type="checkbox" :checked="r.is_active" @change="toggle(r, 'is_active')">
            </label>
          </td>
          <td>
            <label class="a-sw">
              <input type="checkbox" :checked="r.is_popular" @change="toggle(r, 'is_popular')">
            </label>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
