<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { say, complain } from '../toast'
import CollectionForm from './CollectionForm.vue'

/**
 * Collection pages: a page on the website made of chosen products and sets,
 * with its own text — /kataloq/yeni-il-setleri for the New Year, say. Unlike
 * a category, a product can be in any number of them.
 */
const rows = ref([])
const busy = ref(true)
const editing = ref(null)
const SITE = 'https://freshness.az'

async function load () {
  busy.value = true
  try {
    rows.value = (await api('/admin/collections')).data
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function toggle (c) {
  try {
    await api(`/admin/collections/${c.id}`, { method: 'PATCH', body: { is_active: !c.is_active } })
    c.is_active = !c.is_active
    say(`${c.name?.az ?? c.slug}: ${c.is_active ? 'aktiv' : 'gizli'}`)
  } catch (e) {
    complain(e)
  }
}

function saved (c) {
  const i = rows.value.findIndex(r => r.id === c.id)
  if (i >= 0) rows.value[i] = c
  else rows.value.push(c)
  editing.value = null
}

function deleted (id) {
  rows.value = rows.value.filter(r => r.id !== id)
  editing.value = null
}

onMounted(load)
</script>

<template>
  <div class="a-row" style="align-items:flex-start">
    <div style="flex:1">
      <h2 class="a-h">Kolleksiyalar</h2>
      <p class="a-sub">Seçilmiş məhsul və setlərdən ibarət ayrıca səhifə — məsələn, “Yeni il setləri”. Bir məhsul bir neçə kolleksiyada ola bilər. Stokda olmayan məhsul və söndürülmüş set səhifədə avtomatik gizlənir.</p>
    </div>
    <button class="a-btn" @click="editing = 'new'">+ Yeni kolleksiya</button>
  </div>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else-if="!rows.length" class="a-empty">Hələ kolleksiya yoxdur.</div>
  <div v-else class="a-scroll">
    <table class="a-t">
      <thead>
        <tr>
          <th>Kolleksiya</th>
          <th class="num">Məhsul</th>
          <th class="num">Set</th>
          <th>Google</th>
          <th>Aktiv</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in rows" :key="c.id">
          <td>
            <button type="button" class="a-link" @click="editing = c">{{ c.name?.az ?? c.slug }}</button>
            <div class="a-mono a-muted">
              <a :href="`${SITE}/kataloq/${c.slug}`" target="_blank" rel="noopener" style="color:inherit">/kataloq/{{ c.slug }}</a>
            </div>
          </td>
          <td class="num">{{ c.products?.length ?? 0 }}</td>
          <td class="num">{{ c.bundles?.length ?? 0 }}</td>
          <td>{{ c.is_indexed ? 'bəli' : 'yox' }}</td>
          <td>
            <label class="a-sw">
              <input type="checkbox" :checked="c.is_active" @change="toggle(c)">
            </label>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <CollectionForm v-if="editing" :collection="editing === 'new' ? null : editing"
                  @close="editing = null" @saved="saved" @deleted="deleted" />
</template>
