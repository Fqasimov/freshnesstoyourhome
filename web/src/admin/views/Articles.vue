<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { say, complain } from '../toast'
import ArticleForm from './ArticleForm.vue'

/**
 * Recipes and articles on the website (/resept/…): how to serve caviar, a
 * burrata salad, choosing salmon. Each links to the products it is about.
 */
const rows = ref([])
const busy = ref(true)
const editing = ref(null)
const SITE = 'https://freshness.az'

async function load () {
  busy.value = true
  try {
    rows.value = (await api('/admin/articles')).data
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function toggle (a) {
  try {
    await api(`/admin/articles/${a.id}`, { method: 'PATCH', body: { is_published: !a.is_published } })
    a.is_published = !a.is_published
    say(`${a.title?.az ?? a.slug}: ${a.is_published ? 'dərc olundu' : 'gizlədildi'}`)
  } catch (e) {
    complain(e)
  }
}

function saved (a) {
  const i = rows.value.findIndex(r => r.id === a.id)
  if (i >= 0) rows.value[i] = a
  else rows.value.unshift(a)
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
      <h2 class="a-h">Reseptlər</h2>
      <p class="a-sub">Saytdakı reseptlər və məqalələr — məsələn, “Qırmızı kürünü necə vermək”. Hər birinə aid məhsulları seçin: səhifənin altında görünür. Ayda 1–2 məqalə kifayətdir.</p>
    </div>
    <button class="a-btn" @click="editing = 'new'">+ Yeni məqalə</button>
  </div>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else-if="!rows.length" class="a-empty">Hələ məqalə yoxdur.</div>
  <div v-else class="a-scroll">
    <table class="a-t">
      <thead>
        <tr><th>Məqalə</th><th>Tarix</th><th class="num">Məhsul</th><th>Dillər</th><th>Dərc</th></tr>
      </thead>
      <tbody>
        <tr v-for="a in rows" :key="a.id">
          <td>
            <button type="button" class="a-link" @click="editing = a">{{ a.title?.az ?? a.slug }}</button>
            <div class="a-mono a-muted">
              <a :href="`${SITE}/resept/${a.slug}`" target="_blank" rel="noopener" style="color:inherit">/resept/{{ a.slug }}</a>
            </div>
          </td>
          <td class="a-mono">{{ a.published_on }}</td>
          <td class="num">{{ a.products?.length ?? 0 }}</td>
          <td>{{ Object.keys(a.title ?? {}).join(', ') }}</td>
          <td><label class="a-sw"><input type="checkbox" :checked="a.is_published" @change="toggle(a)"></label></td>
        </tr>
      </tbody>
    </table>
  </div>

  <ArticleForm v-if="editing" :article="editing === 'new' ? null : editing"
               @close="editing = null" @saved="saved" @deleted="deleted" />
</template>
