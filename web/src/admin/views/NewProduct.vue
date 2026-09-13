<script setup>
import { ref, computed, watch } from 'vue'
import { api, toMinor } from '../api'
import { say, complain } from '../toast'
import ProductPhoto from './ProductPhoto.vue'

/**
 * Adding a product.
 *
 * Two requests, in this order: the row, then the photograph. There is nothing
 * to attach a file to until the product exists, and doing it the other way
 * round would mean orphaned files every time a name was rejected.
 */
const props = defineProps({ categories: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'created'])

const form = ref({
  id: '',
  category_id: props.categories[0]?.[0] ?? '',
  price: '',
  unit_kind: 'kg',
  unit_qty: 1,
  az: '', en: '', ru: '',
  unit_az: '1 kq', unit_en: '1 kg', unit_ru: '1 кг',
  in_stock: true,
  is_popular: false,
})
const photo = ref(null)
const busy = ref(false)

/* The id is permanent — it is written into every order line this product ever
   appears on — so it is offered rather than imposed: derived from the name
   while it has not been edited by hand, and then left alone. */
const idTouched = ref(false)

/* The unit label follows the unit until somebody types their own: choosing
   "by the piece" and being left with "1 kg" underneath it is a trap. */
const unitTouched = ref(false)
const UNIT_LABELS = {
  kg: { az: '1 kq', en: '1 kg', ru: '1 кг' },
  pc: { az: '1 ədəd', en: '1 piece', ru: '1 шт' },
}
watch(() => form.value.unit_kind, kind => {
  if (unitTouched.value) return
  const l = UNIT_LABELS[kind]
  form.value.unit_az = l.az
  form.value.unit_en = l.en
  form.value.unit_ru = l.ru
})
const slug = text => text
  .toLowerCase()
  .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60)

watch(() => form.value.az, name => { if (!idTouched.value) form.value.id = slug(name) })

const idOk = computed(() => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.value.id) && form.value.id.length >= 3)
const ready = computed(() => idOk.value && form.value.az.trim() && Number(form.value.price) > 0)

/* A fake product row, so the photo control is the same component here as in
   the table rather than a second one that drifts from it. */
const pending = computed(() => ({ id: form.value.id, image: null, image_url: null, thumb_url: null, has_upload: false }))

async function submit () {
  if (!ready.value) return
  busy.value = true

  try {
    const created = await api('/admin/products', {
      method: 'POST',
      body: {
        id: form.value.id,
        category_id: form.value.category_id,
        price_minor: toMinor(form.value.price),
        unit_kind: form.value.unit_kind,
        unit_qty: Number(form.value.unit_qty) || 1,
        in_stock: form.value.in_stock,
        is_popular: form.value.is_popular,
        translations: {
          az: { name: form.value.az.trim(), unit_label: form.value.unit_az },
          en: { name: form.value.en.trim() || undefined, unit_label: form.value.unit_en },
          ru: { name: form.value.ru.trim() || undefined, unit_label: form.value.unit_ru },
        },
      },
    })

    let final = created
    if (photo.value) {
      const body = new FormData()
      body.append('photo', photo.value)
      try {
        final = await api(`/admin/products/${created.id}/photo`, { method: 'POST', body })
      } catch (e) {
        // The product is real either way; say which half failed rather than
        // implying nothing happened.
        complain({ message: `Məhsul yaradıldı, amma şəkil yüklənmədi: ${e.message}` })
      }
    }

    say(`${final.name?.az ?? final.id} əlavə edildi`)
    emit('created', final)
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="a-scrim" @click="emit('close')"></div>
  <aside class="a-drawer">
    <div class="a-drawer__head">
      <h2>Yeni məhsul</h2>
      <button class="a-x" aria-label="Bağla" @click="emit('close')">×</button>
    </div>

    <div class="a-sec" style="margin-top:0">
      <h3>Şəkil</h3>
      <ProductPhoto :product="pending" deferred @picked="photo = $event" />
      <p class="a-muted" style="font-size:.76rem; margin:8px 0 0">
        JPEG, PNG və ya WebP · 8 MB-a qədər. Şəkil məhsul yaradıldıqdan sonra yüklənir.
      </p>
    </div>

    <div class="a-sec">
      <h3>Ad</h3>
      <div class="a-field">
        <label for="np-az">Azərbaycanca <b style="color:var(--danger)">*</b></label>
        <input id="np-az" v-model="form.az" class="a-in" placeholder="Kefir 1 l">
      </div>
      <div class="a-field">
        <label for="np-en">İngiliscə</label>
        <input id="np-en" v-model="form.en" class="a-in" placeholder="Kefir 1 l">
      </div>
      <div class="a-field">
        <label for="np-ru">Rusca</label>
        <input id="np-ru" v-model="form.ru" class="a-in" placeholder="Кефир 1 л">
      </div>
    </div>

    <div class="a-sec">
      <h3>Kod (dəyişdirilə bilməz)</h3>
      <input v-model="form.id" class="a-in" :class="{ 'a-in--dirty': form.id && !idOk }"
             @input="idTouched = true" placeholder="kefir-1l">
      <p class="a-muted" style="font-size:.76rem; margin:6px 0 0">
        Yalnız kiçik hərflər, rəqəmlər və defis. Sonradan dəyişdirmək mümkün deyil —
        bu kod bütün sifariş sətirlərində qalır.
      </p>
    </div>

    <div class="a-sec">
      <h3>Bölmə və qiymət</h3>
      <div class="a-field">
        <label for="np-cat">Bölmə</label>
        <select id="np-cat" v-model="form.category_id" class="a-in">
          <option v-for="[id, name] in categories" :key="id" :value="id">{{ name }}</option>
        </select>
      </div>
      <div class="a-row">
        <div class="a-field" style="flex:1">
          <label for="np-price">Qiymət (AZN)</label>
          <input id="np-price" v-model="form.price" class="a-in" inputmode="decimal" placeholder="4.50">
        </div>
        <div class="a-field" style="flex:1">
          <label for="np-unit">Vahid</label>
          <select id="np-unit" v-model="form.unit_kind" class="a-in">
            <option value="kg">Çəkiyə görə (kq)</option>
            <option value="pc">Ədədlə</option>
          </select>
        </div>
      </div>
      <p v-if="form.unit_kind === 'kg'" class="a-muted" style="font-size:.76rem; margin:0">
        Çəkiyə görə satılan məhsulun yekun məbləği kuryerin tərəzisinə görə dəqiqləşdirilir.
      </p>
    </div>

    <div class="a-sec">
      <h3>Vahid etiketi</h3>
      <div class="a-row" @input="unitTouched = true">
        <input v-model="form.unit_az" class="a-in" placeholder="1 kq">
        <input v-model="form.unit_en" class="a-in" placeholder="1 kg">
        <input v-model="form.unit_ru" class="a-in" placeholder="1 кг">
      </div>
    </div>

    <div class="a-sec">
      <div class="a-row">
        <label class="a-sw"><input type="checkbox" v-model="form.in_stock"><span>Stokda</span></label>
        <label class="a-sw"><input type="checkbox" v-model="form.is_popular"><span>Populyar</span></label>
      </div>
    </div>

    <div class="a-sec a-row">
      <button class="a-btn" :disabled="!ready || busy" @click="submit">
        {{ busy ? '…' : 'Məhsulu əlavə et' }}
      </button>
      <button class="a-btn a-btn--ghost" :disabled="busy" @click="emit('close')">Ləğv et</button>
    </div>
  </aside>
</template>
