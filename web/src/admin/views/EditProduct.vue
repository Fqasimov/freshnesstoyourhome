<script setup>
import { ref, computed } from 'vue'
import { api } from '../api'
import { say, complain } from '../toast'

/**
 * A product's words: its name, description and unit label in each language,
 * and the section it sits in. Prices, stock and the switches stay in the
 * table, where they are changed a dozen at a time; this is for the text,
 * which is changed one product at a time and wants room to be read.
 */
const props = defineProps({
  product: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'saved'])

const LANGS = [
  { id: 'az', label: 'Azərbaycanca', required: true },
  { id: 'en', label: 'İngiliscə' },
  { id: 'ru', label: 'Rusca' },
]

const p = props.product
const form = ref({
  category_id: p.category_id,
  ...Object.fromEntries(LANGS.map(l => [l.id, {
    name: p.name?.[l.id] ?? '',
    description: p.description?.[l.id] ?? '',
    unit_label: p.unit_label?.[l.id] ?? '',
  }])),
})
const busy = ref(false)

const ready = computed(() => form.value.az.name.trim().length > 0)

async function save () {
  if (!ready.value) return
  busy.value = true
  try {
    const translations = Object.fromEntries(LANGS.map(l => [l.id, {
      // An empty name means "not translated yet"; the server keeps the old
      // one rather than leaving a product nameless in that language.
      name: form.value[l.id].name.trim() || null,
      description: form.value[l.id].description.trim() || null,
      unit_label: form.value[l.id].unit_label.trim() || null,
    }]))

    const updated = await api(`/admin/products/${p.id}`, {
      method: 'PATCH',
      body: { category_id: form.value.category_id, translations },
    })
    say(`${updated.name?.az ?? updated.id} yadda saxlanıldı`)
    emit('saved', updated)
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="a-scrim" @click="emit('close')"></div>
  <aside class="a-drawer" role="dialog" aria-modal="true" :aria-label="p.name?.az ?? p.id">
    <div class="a-drawer__head">
      <div>
        <h2>{{ p.name?.az ?? p.id }}</h2>
        <div class="a-mono a-muted">{{ p.id }}</div>
      </div>
      <button class="a-x" aria-label="Bağla" @click="emit('close')">×</button>
    </div>

    <div class="a-sec" style="margin-top:0">
      <h3>Bölmə</h3>
      <select v-model="form.category_id" class="a-in">
        <option v-for="[id, name] in categories" :key="id" :value="id">{{ name }}</option>
      </select>
    </div>

    <div class="a-sec">
      <h3>Ad, təsvir və vahid</h3>
      <div class="a-langs">
        <div v-for="l in LANGS" :key="l.id" class="a-lang">
          <b>{{ l.label }}<span v-if="l.required" style="color:var(--danger)"> *</span></b>
          <div class="a-field">
            <label :for="`ep-name-${l.id}`">Ad</label>
            <input :id="`ep-name-${l.id}`" v-model="form[l.id].name" class="a-in" maxlength="120">
          </div>
          <div class="a-field">
            <label :for="`ep-desc-${l.id}`">Təsvir</label>
            <textarea :id="`ep-desc-${l.id}`" v-model="form[l.id].description" class="a-in" maxlength="600"
                      placeholder="Mənşəyi, dadı, necə bişirilir…"></textarea>
          </div>
          <div class="a-field">
            <label :for="`ep-unit-${l.id}`">Vahid etiketi</label>
            <input :id="`ep-unit-${l.id}`" v-model="form[l.id].unit_label" class="a-in" maxlength="40"
                   :placeholder="p.is_weight_based ? '1 kq' : '1 ədəd'">
          </div>
        </div>
      </div>
      <p class="a-muted" style="font-size:.76rem; margin:8px 0 0">
        Boş buraxılan tərcümədə saytda Azərbaycanca mətn göstərilir.
      </p>
    </div>

    <div class="a-drawer__foot">
      <button class="a-btn" :disabled="!ready || busy" @click="save">{{ busy ? '…' : 'Yadda saxla' }}</button>
      <button class="a-btn a-btn--ghost" :disabled="busy" @click="emit('close')">Ləğv et</button>
    </div>
  </aside>
</template>
