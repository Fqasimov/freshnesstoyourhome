<script setup>
import { ref, computed } from 'vue'
import { api } from '../api'
import { say, complain } from '../toast'

/**
 * One product's photograph, edited in place.
 *
 * A thumbnail that is also the control: clicking it opens the file picker,
 * dropping a file on it does the same thing. The row tells you which picture
 * you are looking at — the one uploaded here, or the one that ships inside the
 * app and the website — because "remove" means two different things depending
 * on the answer, and an empty frame means a third.
 */
const props = defineProps({
  product: { type: Object, required: true },
  /* A new product has no row on the server yet, so the file is held until
     there is one to attach it to. */
  deferred: { type: Boolean, default: false },
})
const emit = defineEmits(['updated', 'picked'])

/**
 * The pictures that ship inside the website's bundle.
 *
 * Most products are still photographed this way, and without this the panel
 * showed an empty frame for them — which looks like "no photo" when the shop
 * front is showing one perfectly well. `?url` rather than the file, so this
 * costs a table of strings and the browser fetches only the ones on screen.
 */
const BUNDLED = import.meta.glob('../../assets/products/*.jpg', {
  eager: true, query: '?url', import: 'default',
})
const bundled = computed(() => props.product.image
  ? BUNDLED[`../../assets/products/${props.product.image}`] ?? null
  : null)

const input = ref(null)
const busy = ref(false)
const dragging = ref(false)
const localPreview = ref(null)

const src = computed(() => localPreview.value
  ?? props.product.thumb_url
  ?? props.product.image_url
  ?? bundled.value)

const source = computed(() => {
  // A file chosen but not sent yet — the new-product form, where there is no
  // product to attach it to until the rest of the form is submitted.
  if (localPreview.value && props.deferred) return 'staged'
  if (props.product.has_upload) return 'upload'
  // A name with no file behind it is worse than no name: it means the bundle
  // and the database disagree, and the shop front is showing nothing either.
  if (props.product.image && bundled.value) return 'bundled'
  return 'none'
})

/* Checked here as well as on the server, so an obvious mistake costs nothing
   and says so immediately rather than after a megabyte has gone up the wire. */
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024

function take (file) {
  if (!file) return
  if (!ACCEPT.includes(file.type)) {
    complain({ message: 'Yalnız JPEG, PNG və ya WebP.' })
    return
  }
  if (file.size > MAX_BYTES) {
    complain({ message: 'Şəkil 8 MB-dan böyük olmamalıdır.' })
    return
  }

  localPreview.value = URL.createObjectURL(file)

  if (props.deferred) {
    emit('picked', file)
    return
  }

  upload(file)
}

async function upload (file) {
  busy.value = true
  try {
    const form = new FormData()
    form.append('photo', file)
    const updated = await api(`/admin/products/${props.product.id}/photo`, {
      method: 'POST',
      body: form,
    })
    emit('updated', updated)
    say('Şəkil yükləndi')
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
    // The server's own thumbnail replaces the local one; keeping the object
    // URL would leak it and show a stale picture after the next change.
    release()
  }
}

async function remove () {
  if (props.deferred) { release(); emit('picked', null); return }

  busy.value = true
  try {
    const updated = await api(`/admin/products/${props.product.id}/photo`, { method: 'DELETE' })
    emit('updated', updated)
    say(updated.image ? 'Şəkil silindi — paketdəki şəkil qayıtdı' : 'Şəkil silindi')
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
    release()
  }
}

function release () {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = null
}

function onDrop (e) {
  dragging.value = false
  take(e.dataTransfer?.files?.[0])
}
</script>

<template>
  <div class="ph">
    <button
      class="ph__frame"
      :class="{ drag: dragging, busy }"
      :disabled="busy"
      :title="source === 'upload' ? 'Yüklənmiş şəkil — dəyişmək üçün toxunun'
        : source === 'bundled' ? 'Saytın paketindəki şəkil — əvəz etmək üçün toxunun'
        : 'Şəkil yoxdur — əlavə etmək üçün toxunun'"
      @click="input.click()"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <img v-if="src" :src="src" alt="">
      <span v-else class="ph__none">+</span>
      <span v-if="busy" class="ph__busy">…</span>
    </button>

    <div class="ph__side">
      <span class="ph__tag" :class="`ph__tag--${source}`">
        {{ { upload: 'yüklənib', bundled: 'paketdə', staged: 'seçilib', none: 'yoxdur' }[source] }}
      </span>
      <button v-if="source === 'upload' || localPreview" class="ph__x" :disabled="busy" @click="remove">
        sil
      </button>
    </div>

    <input ref="input" type="file" accept="image/jpeg,image/png,image/webp" hidden
           @change="take($event.target.files[0]); $event.target.value = ''">
  </div>
</template>

<style scoped>
.ph{ display:flex; align-items:center; gap:9px; }

.ph__frame{
  position:relative; width:54px; height:54px; flex:none;
  border-radius:8px; overflow:hidden; cursor:pointer;
  background:var(--bg); border:1px dashed var(--line-2); padding:0;
  display:grid; place-items:center;
  transition:border-color .15s, background .15s;
}
.ph__frame:hover{ border-color:var(--accent); }
.ph__frame.drag{ border-color:var(--accent); background:color-mix(in srgb, var(--accent) 16%, transparent); }
.ph__frame:disabled{ cursor:wait; }
.ph__frame img{ width:100%; height:100%; object-fit:cover; display:block; }
.ph__frame:has(img){ border-style:solid; }
.ph__none{ color:var(--text-3); font-size:1.2rem; line-height:1; }
.ph__busy{
  position:absolute; inset:0; display:grid; place-items:center;
  background:rgba(0,0,0,.55); color:var(--text); font-size:.9rem;
}

.ph__side{ display:flex; flex-direction:column; gap:3px; align-items:flex-start; }
.ph__tag{ font-size:.62rem; letter-spacing:.06em; text-transform:uppercase; color:var(--text-3); }
.ph__tag--upload,
.ph__tag--staged{ color:var(--accent); }
.ph__tag--none{ color:var(--warn); }
.ph__x{
  appearance:none; background:none; border:0; padding:0; cursor:pointer;
  font-size:.68rem; color:var(--danger); text-decoration:underline;
}
.ph__x:disabled{ opacity:.4; cursor:wait; }
</style>
