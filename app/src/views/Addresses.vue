<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/client'
import { useCatalogue } from '../stores/catalogue'
import AppBar from '../components/AppBar.vue'
import { t, pick } from '../i18n'

const catalogue = useCatalogue()

const addresses = ref([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)

const editing = ref(null)   // null = list, otherwise the form model

onMounted(load)

async function load () {
  loading.value = true
  try {
    const { data } = await api.addresses()
    addresses.value = data
  } catch (e) {
    error.value = e.status === 0 ? t('err.offline') : t('err.generic')
  } finally {
    loading.value = false
  }
}

function startNew () {
  editing.value = {
    id: null,
    label: '',
    line: '',
    notes: '',
    delivery_zone_id: catalogue.zones[0]?.id ?? '',
    is_default: addresses.value.length === 0,
  }
}

function startEdit (a) {
  editing.value = { ...a, label: a.label ?? '', notes: a.notes ?? '' }
}

async function save () {
  const form = editing.value
  if (!form.line.trim() || !form.delivery_zone_id) return

  saving.value = true
  error.value = ''

  const body = {
    label: form.label.trim() || null,
    line: form.line.trim(),
    notes: form.notes.trim() || null,
    delivery_zone_id: form.delivery_zone_id,
    is_default: form.is_default,
  }

  try {
    if (form.id) await api.updateAddress(form.id, body)
    else await api.createAddress(body)
    editing.value = null
    await load()
  } catch (e) {
    error.value = Object.values(e.fieldErrors ?? {})[0] ?? t('err.generic')
  } finally {
    saving.value = false
  }
}

async function remove (id) {
  try {
    await api.deleteAddress(id)
    await load()
  } catch (e) {
    error.value = e.message ?? t('err.generic')
  }
}
</script>

<template>
  <main class="screen">
    <AppBar :title="t('profile.addresses')" back />

    <div v-if="loading" class="empty"><span class="spinner" style="margin:0 auto" /></div>

    <template v-else-if="editing">
      <section class="wrap addr__section">
        <label class="field">
          <span class="field__label">{{ t('address.label') }}</span>
          <input v-model="editing.label" class="field__input" type="text" maxlength="40">
        </label>

        <label class="field">
          <span class="field__label">{{ t('address.line') }}</span>
          <input v-model="editing.line" class="field__input" type="text" maxlength="300" autocomplete="street-address">
        </label>

        <label class="field">
          <span class="field__label">{{ t('address.notes') }}</span>
          <input v-model="editing.notes" class="field__input" type="text" maxlength="200">
        </label>

        <label class="field">
          <span class="field__label">{{ t('address.zone') }}</span>
          <select v-model="editing.delivery_zone_id" class="field__input">
            <option v-for="z in catalogue.zones" :key="z.id" :value="z.id">{{ pick(z.name) }}</option>
          </select>
        </label>

        <p v-if="error" class="field__error">{{ error }}</p>

        <button class="btn btn--primary btn--block" :disabled="saving || !editing.line.trim()" @click="save">
          <span v-if="saving" class="spinner" /> {{ t('address.save') }}
        </button>
        <button class="btn btn--ghost btn--block" style="margin-top:10px" @click="editing = null">
          {{ t('cancel') }}
        </button>
      </section>
    </template>

    <template v-else>
      <div v-if="!addresses.length" class="empty">
        <h3>{{ t('address.none') }}</h3>
      </div>

      <section v-else class="wrap addr__section">
        <article v-for="a in addresses" :key="a.id" class="addr">
          <div class="addr__body">
            <strong v-if="a.label">{{ a.label }}</strong>
            <span v-if="a.is_default" class="pill pill--done addr__default">✓</span>
            <p>{{ a.line }}</p>
            <p v-if="a.notes" class="small muted">{{ a.notes }}</p>
          </div>
          <div class="addr__actions">
            <button @click="startEdit(a)">{{ t('address.save') }}</button>
            <button class="addr__del" @click="remove(a.id)">{{ t('address.delete') }}</button>
          </div>
        </article>
      </section>

      <div class="wrap addr__section">
        <button class="btn btn--primary btn--block" @click="startNew">
          {{ t('checkout.addAddress') }}
        </button>
      </div>
    </template>
  </main>
</template>

<style scoped>
.addr__section{ padding-top:18px; }
.addr{
  padding:15px;
  background:#fff; border:1px solid var(--line-soft); border-radius:var(--radius);
  margin-bottom:11px;
}
.addr__default{ margin-left:8px; }
.addr__actions{ display:flex; gap:16px; margin-top:12px; }
.addr__actions button{
  font-size:.86rem; font-weight:600; color:var(--forest);
  text-decoration:underline; text-underline-offset:3px;
}
.addr__del{ color:var(--brick) !important; }
</style>
