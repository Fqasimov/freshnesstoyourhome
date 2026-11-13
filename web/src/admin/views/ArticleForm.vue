<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { say, complain } from '../toast'

/** Writing or changing one article: address, text per language, products. */
const props = defineProps({ article: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved', 'deleted'])

const LANGS = [
  { id: 'az', label: 'Azərbaycanca', required: true },
  { id: 'ru', label: 'Rusca' },
  { id: 'en', label: 'İngiliscə' },
]
const FIELDS = ['title', 'summary', 'body', 'seo_title', 'seo_description']
const isNew = !props.article
const a = props.article ?? {}

const form = ref({
  slug: a.slug ?? '',
  published: a.is_published ?? false,
  date: a.published_on ?? new Date().toISOString().slice(0, 10),
  products: [...(a.products ?? [])],
  ...Object.fromEntries(LANGS.map(l => [l.id, Object.fromEntries(FIELDS.map(f => [f, a[f]?.[l.id] ?? '']))])),
})
const busy = ref(false)
const products = ref([])
onMounted(async () => {
  try {
    products.value = (await api('/admin/products')).data
      .slice().sort((x, y) => (x.name?.az ?? x.id).localeCompare(y.name?.az ?? y.id, 'az'))
  } catch (e) {
    complain(e)
  }
})
const byId = computed(() => Object.fromEntries(products.value.map(p => [p.id, p])))

const slugTouched = ref(!isNew)
const slugOf = text => text.toLowerCase()
  .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
watch(() => form.value.az.title, t => { if (!slugTouched.value) form.value.slug = slugOf(t) })
const slugOk = computed(() => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.value.slug) && form.value.slug.length >= 3)
const ready = computed(() => slugOk.value && form.value.az.title.trim())
const words = text => String(text ?? '').replace(/^##\s/gm, '').trim().split(/\s+/).filter(Boolean).length

function add (e) {
  const id = e.target.value
  if (id && !form.value.products.includes(id)) form.value.products.push(id)
  e.target.value = ''
}
function move (i, dir) {
  const list = form.value.products, j = i + dir
  if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]]
}

async function save () {
  if (!ready.value) return
  busy.value = true
  const body = {
    slug: form.value.slug,
    is_published: form.value.published,
    published_on: form.value.date || null,
    products: form.value.products,
    translations: Object.fromEntries(LANGS.map(l => [l.id,
      Object.fromEntries(FIELDS.map(f => [f, form.value[l.id][f].trim() || null]))])),
  }
  try {
    const saved = isNew
      ? await api('/admin/articles', { method: 'POST', body })
      : await api(`/admin/articles/${a.id}`, { method: 'PATCH', body })
    say(`${saved.title?.az ?? saved.slug} ${isNew ? 'yaradıldı' : 'yadda saxlanıldı'}`)
    emit('saved', saved)
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function destroy () {
  if (!window.confirm(`“${a.title?.az ?? a.slug}” silinsin?\n\n/resept/${a.slug} ünvanı işləməyəcək.`)) return
  busy.value = true
  try {
    await api(`/admin/articles/${a.id}`, { method: 'DELETE' })
    say('Məqalə silindi')
    emit('deleted', a.id)
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="a-scrim" @click="emit('close')"></div>
  <aside class="a-drawer" role="dialog" aria-modal="true" :aria-label="isNew ? 'Yeni məqalə' : a.title?.az">
    <div class="a-drawer__head">
      <div>
        <h2>{{ isNew ? 'Yeni məqalə' : (a.title?.az ?? a.slug) }}</h2>
        <div v-if="!isNew" class="a-mono a-muted">/resept/{{ a.slug }}</div>
      </div>
      <button class="a-x" aria-label="Bağla" @click="emit('close')">×</button>
    </div>

    <div class="a-sec" style="margin-top:0">
      <h3>Mətn</h3>
      <div class="a-langs">
        <div v-for="l in LANGS" :key="l.id" class="a-lang">
          <b>{{ l.label }}<span v-if="l.required" style="color:var(--danger)"> *</span></b>
          <div class="a-field">
            <label :for="`af-t-${l.id}`">Başlıq</label>
            <input :id="`af-t-${l.id}`" v-model="form[l.id].title" class="a-in" maxlength="140"
                   :placeholder="l.id === 'az' ? 'Qırmızı kürünü necə vermək' : ''">
          </div>
          <div class="a-field">
            <label :for="`af-s-${l.id}`">Qısa təsvir (siyahıda və Google-da)</label>
            <textarea :id="`af-s-${l.id}`" v-model="form[l.id].summary" class="a-in" rows="2" maxlength="300"></textarea>
          </div>
          <div class="a-field">
            <label :for="`af-b-${l.id}`">Mətn <span class="a-muted">{{ words(form[l.id].body) }} söz</span></label>
            <textarea :id="`af-b-${l.id}`" v-model="form[l.id].body" class="a-in" rows="12" maxlength="20000"></textarea>
          </div>
          <div class="a-field">
            <label :for="`af-st-${l.id}`">Google başlığı <span class="a-muted">{{ form[l.id].seo_title.length }}/60 · boş = başlıq</span></label>
            <input :id="`af-st-${l.id}`" v-model="form[l.id].seo_title" class="a-in" maxlength="70">
          </div>
          <div class="a-field">
            <label :for="`af-sd-${l.id}`">Google təsviri <span class="a-muted">{{ form[l.id].seo_description.length }}/160 · boş = qısa təsvir</span></label>
            <textarea :id="`af-sd-${l.id}`" v-model="form[l.id].seo_description" class="a-in" rows="2" maxlength="170"></textarea>
          </div>
        </div>
      </div>
      <p class="a-muted" style="font-size:.76rem; margin:8px 0 0">
        Boş sətir yeni abzasdır, “## ” ilə başlayan sətir alt başlıq. Başlığı boş qalan dildə məqalə Azərbaycanca göstərilir.
      </p>
    </div>

    <div class="a-sec">
      <h3>Məhsullar</h3>
      <div class="a-items">
        <div v-for="(id, i) in form.products" :key="id" class="a-item">
          <span style="flex:1">{{ byId[id]?.name?.az ?? id }}</span>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="i === 0" aria-label="Yuxarı" @click="move(i, -1)">↑</button>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="i === form.products.length - 1" aria-label="Aşağı" @click="move(i, 1)">↓</button>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" aria-label="Sil" @click="form.products.splice(i, 1)">×</button>
        </div>
      </div>
      <select class="a-in" style="margin-top:8px" aria-label="Məhsul əlavə et" @change="add">
        <option value="">+ Məhsul əlavə et…</option>
        <option v-for="p in products" :key="p.id" :value="p.id" :disabled="form.products.includes(p.id)">{{ p.name?.az ?? p.id }}</option>
      </select>
    </div>

    <div class="a-sec">
      <h3>Saytdakı səhifə</h3>
      <div class="a-field">
        <label for="af-slug">Ünvan</label>
        <div class="a-row" style="gap:6px; align-items:center">
          <span class="a-mono a-muted">/resept/</span>
          <input id="af-slug" v-model.trim="form.slug" class="a-in a-mono" maxlength="80" style="flex:1"
                 :class="{ 'a-in--dirty': form.slug && !slugOk }" @input="slugTouched = true">
        </div>
      </div>
      <div class="a-row" style="gap:18px; align-items:center">
        <label class="a-sw"><input v-model="form.published" type="checkbox"> Dərc olunsun</label>
        <input v-model="form.date" type="date" class="a-in" style="max-width:180px" aria-label="Tarix">
      </div>
    </div>

    <div class="a-drawer__foot">
      <button class="a-btn" :disabled="!ready || busy" @click="save">{{ busy ? '…' : (isNew ? 'Məqaləni yarat' : 'Yadda saxla') }}</button>
      <button class="a-btn a-btn--ghost" :disabled="busy" @click="emit('close')">Ləğv et</button>
      <button v-if="!isNew" class="a-btn a-btn--danger" style="margin-left:auto" :disabled="busy" @click="destroy">Sil</button>
    </div>
  </aside>
</template>
