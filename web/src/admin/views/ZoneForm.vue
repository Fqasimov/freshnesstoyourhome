<script setup>
import { ref, computed, watch } from 'vue'
import { api, toAzn, toMinor } from '../api'
import { say, complain } from '../toast'

/**
 * A new delivery area, or the name of an existing one.
 *
 * Fees and minimums of existing areas stay in the table, where they are
 * typed straight into the row; this is for what the table has no room for.
 */
const props = defineProps({ zone: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const LANGS = [
  { id: 'az', label: 'Azərbaycanca', required: true },
  { id: 'en', label: 'İngiliscə' },
  { id: 'ru', label: 'Rusca' },
]

const isNew = !props.zone
const z = props.zone ?? {}

const form = ref({
  id: z.id ?? '',
  fee: isNew ? '' : toAzn(z.fee_minor),
  min: isNew ? '0' : toAzn(z.min_order_minor),
  ...Object.fromEntries(LANGS.map(l => [l.id, z.name?.[l.id] ?? ''])),
})
const busy = ref(false)

const idTouched = ref(false)
const slug = text => text.toLowerCase()
  .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
if (isNew) watch(() => form.value.az, n => { if (!idTouched.value) form.value.id = slug(n) })

const feeMinor = computed(() => toMinor(form.value.fee))
const minMinor = computed(() => toMinor(form.value.min || 0))
const idOk = computed(() => !isNew || (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.value.id) && form.value.id.length >= 2))
const ready = computed(() => idOk.value && form.value.az.trim()
  && Number.isFinite(feeMinor.value) && feeMinor.value >= 0
  && Number.isFinite(minMinor.value) && minMinor.value >= 0)

async function save () {
  if (!ready.value) return
  busy.value = true
  const translations = Object.fromEntries(LANGS.map(l => [l.id, { name: form.value[l.id].trim() || null }]))
  try {
    const saved = isNew
      ? await api('/admin/zones', {
        method: 'POST',
        body: { id: form.value.id, fee_minor: feeMinor.value, min_order_minor: minMinor.value, translations },
      })
      : await api(`/admin/zones/${z.id}`, { method: 'PATCH', body: { translations } })
    say(isNew ? `${saved.name?.az ?? saved.id} əlavə edildi` : `${saved.name?.az ?? saved.id} yadda saxlanıldı`)
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
  <aside class="a-drawer" role="dialog" aria-modal="true" :aria-label="isNew ? 'Yeni zona' : z.name?.az">
    <div class="a-drawer__head">
      <div>
        <h2>{{ isNew ? 'Yeni çatdırılma zonası' : (z.name?.az ?? z.id) }}</h2>
        <div v-if="!isNew" class="a-mono a-muted">{{ z.id }}</div>
      </div>
      <button class="a-x" aria-label="Bağla" @click="emit('close')">×</button>
    </div>

    <div class="a-sec" style="margin-top:0">
      <h3>Ad</h3>
      <div v-for="l in LANGS" :key="l.id" class="a-field">
        <label :for="`zf-${l.id}`">{{ l.label }}<span v-if="l.required" style="color:var(--danger)"> *</span></label>
        <input :id="`zf-${l.id}`" v-model="form[l.id]" class="a-in" maxlength="80"
               :placeholder="l.id === 'az' ? 'Maştağa' : ''">
      </div>
    </div>

    <template v-if="isNew">
      <div class="a-sec">
        <h3>Kod (dəyişdirilə bilməz)</h3>
        <input v-model="form.id" class="a-in" :class="{ 'a-in--dirty': form.id && !idOk }"
               @input="idTouched = true" placeholder="mastaga">
        <p class="a-muted" style="font-size:.76rem; margin:6px 0 0">
          Yalnız kiçik hərflər, rəqəmlər və defis. Ünvanlar və sifarişlər bu koda bağlanır.
        </p>
      </div>

      <div class="a-sec">
        <h3>Qiymət</h3>
        <div class="a-row">
          <div class="a-field" style="flex:1">
            <label for="zf-fee">Çatdırılma (AZN)</label>
            <input id="zf-fee" v-model="form.fee" class="a-in" inputmode="decimal" placeholder="7.00">
          </div>
          <div class="a-field" style="flex:1">
            <label for="zf-min">Minimum sifariş (AZN)</label>
            <input id="zf-min" v-model="form.min" class="a-in" inputmode="decimal" placeholder="0">
          </div>
        </div>
        <p class="a-muted" style="font-size:.76rem; margin:0">
          Yeni zona dərhal saytda və tətbiqdə seçilə bilər.
        </p>
      </div>
    </template>

    <div class="a-drawer__foot">
      <button class="a-btn" :disabled="!ready || busy" @click="save">
        {{ busy ? '…' : (isNew ? 'Zonanı əlavə et' : 'Yadda saxla') }}
      </button>
      <button class="a-btn a-btn--ghost" :disabled="busy" @click="emit('close')">Ləğv et</button>
    </div>
  </aside>
</template>
