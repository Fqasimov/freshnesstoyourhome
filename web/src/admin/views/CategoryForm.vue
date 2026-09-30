<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '../api'
import { say, complain } from '../toast'

/**
 * A new category, or the names of an existing one.
 *
 * A category shows on the website and in the app once it has a product in it,
 * so the usual order is: make the category here, then add its products.
 */
const props = defineProps({ category: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const LANGS = [
  { id: 'az', label: 'Azərbaycanca', required: true },
  { id: 'en', label: 'İngiliscə' },
  { id: 'ru', label: 'Rusca' },
]

const isNew = !props.category
const c = props.category ?? {}

const form = ref({
  id: c.id ?? '',
  ...Object.fromEntries(LANGS.map(l => [l.id, c.name?.[l.id] ?? ''])),
})
const busy = ref(false)

const idTouched = ref(false)
const slug = text => text.toLowerCase()
  .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
if (isNew) watch(() => form.value.az, n => { if (!idTouched.value) form.value.id = slug(n) })

const idOk = computed(() => !isNew || (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.value.id) && form.value.id.length >= 2))
const ready = computed(() => idOk.value && form.value.az.trim())

async function save () {
  if (!ready.value) return
  busy.value = true
  const translations = Object.fromEntries(LANGS.map(l => [l.id, { name: form.value[l.id].trim() || null }]))
  try {
    const saved = isNew
      ? await api('/admin/categories', { method: 'POST', body: { id: form.value.id, translations } })
      : (await api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { translations } }), {
          ...c, name: { ...c.name, ...Object.fromEntries(LANGS.filter(l => form.value[l.id].trim()).map(l => [l.id, form.value[l.id].trim()])) },
        })
    say(`${saved.name?.az ?? saved.id} ${isNew ? 'əlavə edildi' : 'yadda saxlanıldı'}`)
    emit('saved', saved)
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="a-scrim" @click="emit('close')"></div>
  <aside class="a-drawer" role="dialog" aria-modal="true" :aria-label="isNew ? 'Yeni kateqoriya' : c.name?.az">
    <div class="a-drawer__head">
      <div>
        <h2>{{ isNew ? 'Yeni kateqoriya' : (c.name?.az ?? c.id) }}</h2>
        <div v-if="!isNew" class="a-mono a-muted">{{ c.id }}</div>
      </div>
      <button class="a-x" aria-label="Bağla" @click="emit('close')">×</button>
    </div>

    <div class="a-sec" style="margin-top:0">
      <h3>Ad</h3>
      <div v-for="l in LANGS" :key="l.id" class="a-field">
        <label :for="`cf-${l.id}`">{{ l.label }}<span v-if="l.required" style="color:var(--danger)"> *</span></label>
        <input :id="`cf-${l.id}`" v-model="form[l.id]" class="a-in" maxlength="80"
               :placeholder="l.id === 'az' ? 'Salatlar' : ''">
      </div>
    </div>

    <div v-if="isNew" class="a-sec">
      <h3>Kod (dəyişdirilə bilməz)</h3>
      <input v-model="form.id" class="a-in" :class="{ 'a-in--dirty': form.id && !idOk }"
             @input="idTouched = true" placeholder="salatlar">
      <p class="a-muted" style="font-size:.76rem; margin:6px 0 0">
        Yalnız kiçik hərflər, rəqəmlər və defis. Məhsullar bu koda bağlanır.
      </p>
      <p class="a-muted" style="font-size:.76rem; margin:6px 0 0">
        Kateqoriya saytda və tətbiqdə ilk məhsul əlavə ediləndən sonra görünür.
      </p>
    </div>

    <div class="a-drawer__foot">
      <button class="a-btn" :disabled="!ready || busy" @click="save">
        {{ busy ? '…' : (isNew ? 'Kateqoriyanı əlavə et' : 'Yadda saxla') }}
      </button>
      <button class="a-btn a-btn--ghost" :disabled="busy" @click="emit('close')">Ləğv et</button>
    </div>
  </aside>
</template>
