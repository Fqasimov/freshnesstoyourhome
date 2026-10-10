<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { say, complain } from '../toast'
import CategoryForm from './CategoryForm.vue'

/**
 * The shelves the catalogue is sorted into.
 *
 * Switching one off hides it, and its products, from the website and the app.
 * One can be deleted only while it is empty.
 */
const rows = ref([])
const busy = ref(true)
const editing = ref(null)

async function load () {
  busy.value = true
  try {
    rows.value = (await api('/admin/categories')).data
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function toggle (c) {
  try {
    await api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { is_active: !c.is_active } })
    c.is_active = !c.is_active
    say(`${c.name?.az ?? c.id}: ${c.is_active ? 'aktiv' : 'gizli'}`)
  } catch (e) {
    complain(e)
  }
}

async function remove (c) {
  if (!window.confirm(`“${c.name?.az ?? c.id}” silinsin?`)) return
  try {
    await api(`/admin/categories/${c.id}`, { method: 'DELETE' })
    rows.value = rows.value.filter(r => r.id !== c.id)
    say('Kateqoriya silindi')
  } catch (e) {
    complain(e)
  }
}

/* Moving a category swaps it with its neighbour and sends the whole new order,
   so the numbers on the server are rewritten together and never collide. */
const moving = ref(false)
async function move (c, dir) {
  const i = rows.value.indexOf(c)
  const j = i + dir
  if (moving.value || j < 0 || j >= rows.value.length) return
  const next = rows.value.slice()
  ;[next[i], next[j]] = [next[j], next[i]]
  moving.value = true
  try {
    await api('/admin/categories/order', { method: 'POST', body: { ids: next.map(r => r.id) } })
    rows.value = next
  } catch (e) {
    complain(e)
  } finally {
    moving.value = false
  }
}

function saved (c) {
  const row = rows.value.find(r => r.id === c.id)
  if (row) Object.assign(row, c)
  else rows.value.push(c)
  editing.value = null
}

onMounted(load)
</script>

<template>
  <div class="a-row" style="align-items:flex-start">
    <div style="flex:1">
      <h2 class="a-h">Kateqoriyalar</h2>
      <p class="a-sub">Adı dəyişmək üçün kateqoriyanın adına toxunun. Yerini dəyişmək üçün ↑ ↓ düymələrindən istifadə edin — saytda və tətbiqdə eyni sıra ilə görünür. Yeni kateqoriya ilk məhsulu əlavə ediləndən sonra saytda və tətbiqdə görünür.</p>
    </div>
    <button class="a-btn" @click="editing = 'new'">+ Yeni kateqoriya</button>
  </div>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else class="a-scroll">
    <table class="a-t">
      <thead>
        <tr>
          <th style="width:76px">Sıra</th>
          <th>Kateqoriya</th>
          <th class="num">Məhsul</th>
          <th>Aktiv</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(c, i) in rows" :key="c.id">
          <td class="a-move">
            <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="moving || i === 0"
                    aria-label="Yuxarı" @click="move(c, -1)">↑</button>
            <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="moving || i === rows.length - 1"
                    aria-label="Aşağı" @click="move(c, 1)">↓</button>
          </td>
          <td>
            <button type="button" class="a-link" @click="editing = c">{{ c.name?.az ?? c.id }}</button>
            <div class="a-mono a-muted">{{ c.id }}</div>
          </td>
          <td class="num">{{ c.product_count }}</td>
          <td>
            <label class="a-sw">
              <input type="checkbox" :checked="c.is_active" @change="toggle(c)">
            </label>
          </td>
          <td class="num">
            <button v-if="!c.product_count" type="button" class="a-link" @click="remove(c)">Sil</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <CategoryForm v-if="editing" :category="editing === 'new' ? null : editing"
                @close="editing = null" @saved="saved" />
</template>
