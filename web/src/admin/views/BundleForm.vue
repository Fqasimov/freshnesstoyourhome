<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api, money } from '../api'
import { say, complain } from '../toast'

/**
 * Making a set, or changing one: its name and description in each language,
 * what is in it, and the discount.
 *
 * A new set is saved switched off. The card it lands on shows what it costs
 * at today's prices, and turning it on is a separate, deliberate tap.
 */
const props = defineProps({ bundle: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved', 'deleted'])

const LANGS = [
  { id: 'az', label: 'Azərbaycanca', required: true },
  { id: 'en', label: 'İngiliscə' },
  { id: 'ru', label: 'Rusca' },
]

const isNew = !props.bundle
const b = props.bundle ?? {}

const form = ref({
  id: b.id ?? '',
  discount: b.discount_percent ?? 10,
  items: (b.items ?? []).map(i => ({ product_id: i.product_id, qty: i.qty })),
  ...Object.fromEntries(LANGS.map(l => [l.id, {
    name: b.name?.[l.id] ?? '',
    description: b.description?.[l.id] ?? '',
  }])),
})
if (!form.value.items.length) form.value.items.push({ product_id: '', qty: 1 })

const products = ref([])
const busy = ref(false)

onMounted(async () => {
  try {
    products.value = (await api('/admin/products')).data
      .slice().sort((x, y) => (x.name?.az ?? x.id).localeCompare(y.name?.az ?? y.id, 'az'))
  } catch (e) {
    complain(e)
  }
})

/* The id follows the name until somebody edits it, as for a new product. */
const idTouched = ref(false)
const slug = text => text.toLowerCase()
  .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
if (isNew) watch(() => form.value.az.name, n => { if (!idTouched.value) form.value.id = slug(n) })

const byId = computed(() => Object.fromEntries(products.value.map(p => [p.id, p])))
const chosen = computed(() => form.value.items.filter(i => i.product_id))

/* A preview only. The server works out the real figure the same way and
   is the one the website shows. */
const full = computed(() => chosen.value.reduce((s, i) => s + (byId.value[i.product_id]?.price_minor ?? 0) * Number(i.qty || 0), 0))
const price = computed(() => Math.round(full.value * (100 - Number(form.value.discount || 0)) / 100))

const idOk = computed(() => !isNew || (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.value.id) && form.value.id.length >= 3))
const dupes = computed(() => new Set(chosen.value.map(i => i.product_id)).size !== chosen.value.length)
const discountOk = computed(() => Number.isInteger(Number(form.value.discount)) && form.value.discount >= 0 && form.value.discount <= 60)
const ready = computed(() => idOk.value && form.value.az.name.trim() && chosen.value.length > 0 && !dupes.value && discountOk.value)

const addItem = () => form.value.items.push({ product_id: '', qty: 1 })
const removeItem = i => form.value.items.splice(i, 1)

async function destroy () {
  const name = props.bundle?.name?.az ?? props.bundle?.id
  if (!window.confirm(`“${name}” aksiyası həmişəlik silinsin?\n\nİçindəki məhsullar silinmir. Bu əməliyyatı geri qaytarmaq olmur.`)) return
  busy.value = true
  try {
    await api(`/admin/bundles/${props.bundle.id}`, { method: 'DELETE' })
    say(`${name} silindi`)
    emit('deleted', props.bundle.id)
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function save () {
  if (!ready.value) return
  busy.value = true

  const translations = Object.fromEntries(LANGS.map(l => [l.id, {
    name: form.value[l.id].name.trim() || null,
    description: form.value[l.id].description.trim() || null,
  }]))
  const body = {
    discount_percent: Number(form.value.discount),
    items: chosen.value.map(i => ({ product_id: i.product_id, qty: Number(i.qty) || 1 })),
    translations,
  }

  try {
    const saved = isNew
      ? await api('/admin/bundles', { method: 'POST', body: { id: form.value.id, ...body } })
      : await api(`/admin/bundles/${b.id}`, { method: 'PATCH', body })
    say(isNew ? `${saved.name?.az ?? saved.id} yaradıldı (söndürülmüş)` : `${saved.name?.az ?? saved.id} yadda saxlanıldı`)
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
  <aside class="a-drawer" role="dialog" aria-modal="true" :aria-label="isNew ? 'Yeni set' : b.name?.az">
    <div class="a-drawer__head">
      <div>
        <h2>{{ isNew ? 'Yeni set' : (b.name?.az ?? b.id) }}</h2>
        <div v-if="!isNew" class="a-mono a-muted">{{ b.id }}</div>
      </div>
      <button class="a-x" aria-label="Bağla" @click="emit('close')">×</button>
    </div>

    <div class="a-sec" style="margin-top:0">
      <h3>Ad və təsvir</h3>
      <div class="a-langs">
        <div v-for="l in LANGS" :key="l.id" class="a-lang">
          <b>{{ l.label }}<span v-if="l.required" style="color:var(--danger)"> *</span></b>
          <div class="a-field">
            <label :for="`bf-name-${l.id}`">Ad</label>
            <input :id="`bf-name-${l.id}`" v-model="form[l.id].name" class="a-in" maxlength="120"
                   :placeholder="l.id === 'az' ? 'Həftəsonu səhər yeməyi' : ''">
          </div>
          <div class="a-field">
            <label :for="`bf-desc-${l.id}`">Təsvir</label>
            <textarea :id="`bf-desc-${l.id}`" v-model="form[l.id].description" class="a-in" maxlength="600"></textarea>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isNew" class="a-sec">
      <h3>Kod (dəyişdirilə bilməz)</h3>
      <input v-model="form.id" class="a-in" :class="{ 'a-in--dirty': form.id && !idOk }"
             @input="idTouched = true" placeholder="heftesonu-seher">
      <p class="a-muted" style="font-size:.76rem; margin:6px 0 0">Yalnız kiçik hərflər, rəqəmlər və defis.</p>
    </div>

    <div class="a-sec">
      <h3>Tərkib</h3>
      <div class="a-items">
        <div v-for="(item, i) in form.items" :key="i" class="a-item">
          <select v-model="item.product_id" class="a-in" :aria-label="`Məhsul ${i + 1}`">
            <option value="" disabled>Məhsul seçin…</option>
            <option v-for="p in products" :key="p.id" :value="p.id">
              {{ p.name?.az ?? p.id }} — {{ money(p.price_minor) }}{{ p.in_stock ? '' : ' (stokda yox)' }}
            </option>
          </select>
          <input v-model="item.qty" class="a-in a-in--num" style="width:84px" inputmode="decimal"
                 :aria-label="`Miqdar ${i + 1}`">
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="form.items.length === 1"
                  aria-label="Sil" @click="removeItem(i)">×</button>
        </div>
      </div>
      <button type="button" class="a-btn a-btn--sm a-btn--ghost" style="margin-top:10px"
              :disabled="form.items.length >= 12" @click="addItem">+ Məhsul əlavə et</button>
      <p v-if="dupes" class="a-note a-note--err" style="margin:10px 0 0">Eyni məhsul iki dəfə seçilib.</p>
    </div>

    <div class="a-sec">
      <h3>Endirim</h3>
      <div class="a-row">
        <input v-model="form.discount" class="a-in a-in--num" style="width:90px" inputmode="numeric"
               :class="{ 'a-in--dirty': !discountOk }">
        <span class="a-muted">% · 0–60</span>
      </div>
      <dl class="a-dl" style="margin-top:12px">
        <dt>Tam qiymət</dt><dd>{{ money(full) }}</dd>
        <dt>Set qiyməti</dt><dd><b>{{ money(price) }}</b></dd>
        <dt>Qənaət</dt><dd>{{ money(full - price) }}</dd>
      </dl>
    </div>

    <div class="a-drawer__foot">
      <button class="a-btn" :disabled="!ready || busy" @click="save">
        {{ busy ? '…' : (isNew ? 'Seti yarat' : 'Yadda saxla') }}
      </button>
      <button class="a-btn a-btn--ghost" :disabled="busy" @click="emit('close')">Ləğv et</button>
      <button v-if="!isNew" class="a-btn a-btn--danger" style="margin-left:auto" :disabled="busy" @click="destroy">Aksiyanı sil</button>
    </div>
  </aside>
</template>
