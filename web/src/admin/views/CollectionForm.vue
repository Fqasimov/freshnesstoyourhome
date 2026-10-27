<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api, money } from '../api'
import { say, complain } from '../toast'
import PageFields from '../components/PageFields.vue'
import { pageForm, pageBody } from '../pageText'

/**
 * Making a collection page, or changing one: its address, name, the products
 * and sets on it in the order they show, and its text.
 */
const props = defineProps({ collection: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved', 'deleted'])

const LANGS = [
  { id: 'az', label: 'Azərbaycanca', required: true },
  { id: 'ru', label: 'Rusca' },
  { id: 'en', label: 'İngiliscə' },
]

const isNew = !props.collection
const c = props.collection ?? {}

const form = ref({
  slug: c.slug ?? '',
  active: c.is_active ?? true,
  indexed: c.is_indexed ?? true,
  name: Object.fromEntries(LANGS.map(l => [l.id, c.name?.[l.id] ?? ''])),
  products: [...(c.products ?? [])],
  bundles: [...(c.bundles ?? [])],
})
const page = ref(pageForm(c))
const busy = ref(false)

const products = ref([])
const bundles = ref([])
onMounted(async () => {
  try {
    const [p, b] = await Promise.all([api('/admin/products'), api('/admin/bundles')])
    const az = (x, y) => (x.name?.az ?? x.id).localeCompare(y.name?.az ?? y.id, 'az')
    products.value = p.data.slice().sort(az)
    bundles.value = b.data.slice().sort(az)
  } catch (e) {
    complain(e)
  }
})
const productById = computed(() => Object.fromEntries(products.value.map(p => [p.id, p])))
const bundleById = computed(() => Object.fromEntries(bundles.value.map(b => [b.id, b])))

/* The address follows the name until somebody edits it. */
const slugTouched = ref(!isNew)
const slugOf = text => text.toLowerCase()
  .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
watch(() => form.value.name.az, n => { if (!slugTouched.value) form.value.slug = slugOf(n) })

const slugOk = computed(() => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.value.slug) && form.value.slug.length >= 3)
const ready = computed(() => slugOk.value && form.value.name.az.trim())

/* Picking: a select adds to the end, arrows reorder, × removes. */
function add (list, e) {
  const id = e.target.value
  if (id && !form.value[list].includes(id)) form.value[list].push(id)
  e.target.value = ''
}
function move (list, i, dir) {
  const a = form.value[list], j = i + dir
  if (j < 0 || j >= a.length) return
  ;[a[i], a[j]] = [a[j], a[i]]
}
const drop = (list, i) => form.value[list].splice(i, 1)

async function save () {
  if (!ready.value) return
  busy.value = true
  const text = pageBody(page.value)
  const translations = Object.fromEntries(LANGS.map(l => [l.id, { name: form.value.name[l.id].trim() || null, ...text[l.id] }]))
  const body = {
    slug: form.value.slug,
    is_active: form.value.active,
    is_indexed: form.value.indexed,
    translations,
    products: form.value.products,
    bundles: form.value.bundles,
  }
  try {
    const saved = isNew
      ? await api('/admin/collections', { method: 'POST', body })
      : await api(`/admin/collections/${c.id}`, { method: 'PATCH', body })
    say(`${saved.name?.az ?? saved.slug} ${isNew ? 'yaradıldı' : 'yadda saxlanıldı'}`)
    emit('saved', saved)
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function destroy () {
  const name = c.name?.az ?? c.slug
  if (!window.confirm(`“${name}” kolleksiyası silinsin?\n\nİçindəki məhsullar və setlər silinmir, amma /kataloq/${c.slug} ünvanı işləməyəcək.`)) return
  busy.value = true
  try {
    await api(`/admin/collections/${c.id}`, { method: 'DELETE' })
    say(`${name} silindi`)
    emit('deleted', c.id)
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="a-scrim" @click="emit('close')"></div>
  <aside class="a-drawer" role="dialog" aria-modal="true" :aria-label="isNew ? 'Yeni kolleksiya' : c.name?.az">
    <div class="a-drawer__head">
      <div>
        <h2>{{ isNew ? 'Yeni kolleksiya' : (c.name?.az ?? c.slug) }}</h2>
        <div v-if="!isNew" class="a-mono a-muted">/kataloq/{{ c.slug }}</div>
      </div>
      <button class="a-x" aria-label="Bağla" @click="emit('close')">×</button>
    </div>

    <div class="a-sec" style="margin-top:0">
      <h3>Ad</h3>
      <div v-for="l in LANGS" :key="l.id" class="a-field">
        <label :for="`clf-${l.id}`">{{ l.label }}<span v-if="l.required" style="color:var(--danger)"> *</span></label>
        <input :id="`clf-${l.id}`" v-model="form.name[l.id]" class="a-in" maxlength="120"
               :placeholder="l.id === 'az' ? 'Yeni il setləri' : ''">
      </div>
    </div>

    <div class="a-sec">
      <h3>Saytdakı səhifə</h3>
      <div class="a-field">
        <label for="clf-slug">Ünvan</label>
        <div class="a-row" style="gap:6px; align-items:center">
          <span class="a-mono a-muted">/kataloq/</span>
          <input id="clf-slug" v-model.trim="form.slug" class="a-in a-mono" maxlength="80" style="flex:1"
                 :class="{ 'a-in--dirty': form.slug && !slugOk }" placeholder="yeni-il-setleri"
                 @input="slugTouched = true">
        </div>
        <p v-if="!isNew && form.slug !== c.slug" class="a-note a-note--err" style="margin:8px 0 0">
          Ünvan dəyişsə, köhnə ünvan işləməyəcək. Yalnız zərurət olduqda dəyişin.
        </p>
        <p v-else class="a-muted" style="font-size:.76rem; margin:6px 0 0">
          Yalnız kiçik latın hərfləri, rəqəmlər və defis. Kateqoriyanın ünvanı ilə eyni ola bilməz.
        </p>
      </div>
      <div class="a-row" style="gap:18px">
        <label class="a-sw"><input v-model="form.active" type="checkbox"> Aktiv</label>
        <label class="a-sw"><input v-model="form.indexed" type="checkbox"> Google-da göstər</label>
      </div>
    </div>

    <div class="a-sec">
      <h3>Setlər</h3>
      <div class="a-items">
        <div v-for="(id, i) in form.bundles" :key="id" class="a-item">
          <span style="flex:1">{{ bundleById[id]?.name?.az ?? id }}
            <span v-if="bundleById[id] && !bundleById[id].is_active" class="a-muted">(söndürülüb)</span></span>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="i === 0" aria-label="Yuxarı" @click="move('bundles', i, -1)">↑</button>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="i === form.bundles.length - 1" aria-label="Aşağı" @click="move('bundles', i, 1)">↓</button>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" aria-label="Sil" @click="drop('bundles', i)">×</button>
        </div>
      </div>
      <select class="a-in" style="margin-top:8px" aria-label="Set əlavə et" @change="add('bundles', $event)">
        <option value="">+ Set əlavə et…</option>
        <option v-for="b in bundles" :key="b.id" :value="b.id" :disabled="form.bundles.includes(b.id)">
          {{ b.name?.az ?? b.id }}{{ b.is_active ? '' : ' (söndürülüb)' }}
        </option>
      </select>
    </div>

    <div class="a-sec">
      <h3>Məhsullar</h3>
      <div class="a-items">
        <div v-for="(id, i) in form.products" :key="id" class="a-item">
          <span style="flex:1">{{ productById[id]?.name?.az ?? id }}
            <span v-if="productById[id] && !productById[id].in_stock" class="a-muted">(stokda yox)</span></span>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="i === 0" aria-label="Yuxarı" @click="move('products', i, -1)">↑</button>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="i === form.products.length - 1" aria-label="Aşağı" @click="move('products', i, 1)">↓</button>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" aria-label="Sil" @click="drop('products', i)">×</button>
        </div>
      </div>
      <select class="a-in" style="margin-top:8px" aria-label="Məhsul əlavə et" @change="add('products', $event)">
        <option value="">+ Məhsul əlavə et…</option>
        <option v-for="p in products" :key="p.id" :value="p.id" :disabled="form.products.includes(p.id)">
          {{ p.name?.az ?? p.id }} — {{ money(p.price_minor) }}{{ p.in_stock ? '' : ' (stokda yox)' }}
        </option>
      </select>
      <p class="a-muted" style="font-size:.76rem; margin:6px 0 0">
        Boş kolleksiya saytda görünmür. Sıra saytdakı sıradır.
      </p>
    </div>

    <div class="a-sec">
      <h3>Səhifənin mətni</h3>
      <PageFields v-model="page" :name="form.name" />
    </div>

    <div class="a-drawer__foot">
      <button class="a-btn" :disabled="!ready || busy" @click="save">
        {{ busy ? '…' : (isNew ? 'Kolleksiyanı yarat' : 'Yadda saxla') }}
      </button>
      <button class="a-btn a-btn--ghost" :disabled="busy" @click="emit('close')">Ləğv et</button>
      <button v-if="!isNew" class="a-btn a-btn--danger" style="margin-left:auto" :disabled="busy" @click="destroy">Sil</button>
    </div>
  </aside>
</template>
