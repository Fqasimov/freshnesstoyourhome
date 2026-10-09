<script setup>
import BIcon from './BIcon.vue'
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'
import { MAP_CENTRE } from '../data/brand'
import { useI18n } from '../composables/useI18n'

/**
 * Where to deliver, as a point on the map instead of a pasted link.
 *
 * Two ways in, both writing the same Google Maps link the order has always
 * carried (so nothing on the server or in the panel changes):
 *
 *  - "Use my location" — the phone's own position. Needs no key.
 *  - "Pick on the map" — a Google map with a pin to tap or drag. This needs a
 *    Google Maps key (VITE_GOOGLE_MAPS_KEY); without one the button is simply
 *    not shown and the first way still works.
 *
 * Once a point is chosen the customer can open it in Google Maps to check it.
 */
const model = defineModel({ type: String, default: '' })
const { t, lang } = useI18n()

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''

const linkFor = (lat, lng) => `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`

/* The point inside a link we wrote — or one pasted into an older basket. */
function pointOf (link) {
  const m = /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(link) || /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(link)
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null
}

/* Only ever linked to if it is an https address; the value can have come out
   of the browser's storage. */
const openHref = computed(() => (/^https:\/\//i.test(model.value) ? model.value : ''))

const problem = ref('')
const locating = ref(false)
const showMap = ref(false)
const mapEl = ref(null)
let map = null
let pin = null

function setPoint (lat, lng, move = true) {
  model.value = linkFor(lat, lng)
  problem.value = ''
  if (map && pin && move) {
    const at = { lat, lng }
    pin.setPosition(at)
    map.panTo(at)
  }
}

function useMyLocation () {
  problem.value = ''
  if (!navigator.geolocation) { problem.value = t('map.denied'); return }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    pos => { locating.value = false; setPoint(pos.coords.latitude, pos.coords.longitude) },
    () => { locating.value = false; problem.value = t('map.denied') },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  )
}

let loading = null
function loadMaps () {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  loading ??= new Promise((resolve, reject) => {
    window.__fthMapsReady = () => resolve(window.google.maps)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&callback=__fthMapsReady&language=${lang.value}`
    s.async = true
    s.onerror = () => { loading = null; reject(new Error('maps')) }
    document.head.appendChild(s)
  })
  return loading
}

async function openMap () {
  problem.value = ''
  showMap.value = true
  await nextTick()
  try {
    const maps = await loadMaps()
    if (!mapEl.value) return
    const start = pointOf(model.value) ?? { lat: MAP_CENTRE.lat, lng: MAP_CENTRE.lng }
    map = new maps.Map(mapEl.value, {
      center: start,
      zoom: pointOf(model.value) ? 17 : MAP_CENTRE.zoom,
      streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
      gestureHandling: 'greedy',
    })
    pin = new maps.Marker({ map, position: start, draggable: true })
    if (pointOf(model.value)) pin.setVisible(true)
    map.addListener('click', e => setPoint(e.latLng.lat(), e.latLng.lng()))
    pin.addListener('dragend', e => setPoint(e.latLng.lat(), e.latLng.lng(), false))
  } catch {
    showMap.value = false
    problem.value = t('map.failed')
  }
}

function closeMap () {
  showMap.value = false
  map = null
  pin = null
}

const clear = () => { model.value = ''; problem.value = '' }
onBeforeUnmount(closeMap)
</script>

<template>
  <div class="mp">
    <p class="mp__l">{{ t('map.h') }}<span class="mp__opt"> · {{ t('deliv.optional') }}</span></p>

    <div class="mp__btns">
      <button type="button" class="mp__btn" :disabled="locating" @click="useMyLocation">
        <BIcon name="geo-alt" :size="13" /> {{ locating ? '…' : t('map.here') }}
      </button>
      <button v-if="KEY && !showMap" type="button" class="mp__btn" @click="openMap">
        <BIcon name="search" :size="13" /> {{ t('map.choose') }}
      </button>
      <button v-if="showMap" type="button" class="mp__btn" @click="closeMap">{{ t('map.close') }}</button>
    </div>

    <template v-if="showMap">
      <div ref="mapEl" class="mp__map" role="application" :aria-label="t('map.h')"></div>
      <p class="mp__hint">{{ t('map.tap') }}</p>
    </template>

    <p v-if="problem" class="mp__bad" role="alert">{{ problem }}</p>

    <p v-if="model" class="mp__set">
      <BIcon name="check-lg" :size="13" /> {{ t('map.set') }}
      <template v-if="openHref"> · <a :href="openHref" target="_blank" rel="noopener">{{ t('map.open') }}</a></template>
      · <button type="button" class="mp__clear" @click="clear">{{ t('map.clear') }}</button>
    </p>
  </div>
</template>

<style scoped>
.mp{ margin:2px 0 4px; }
.mp__l{ margin:10px 0 6px; font-size:.78rem; font-weight:600; color:var(--ink-2); }
.mp__opt{ font-weight:400; opacity:.75; }
.mp__btns{ display:flex; flex-wrap:wrap; gap:8px; }
.mp__btn{
  display:inline-flex; align-items:center; gap:6px; padding:9px 14px; border-radius:999px;
  border:1px solid var(--line); background:var(--paper); color:var(--ink); font-size:.8rem; font-weight:600; cursor:pointer;
}
.mp__btn:hover:not(:disabled){ border-color:var(--forest); color:var(--forest); }
.mp__btn:disabled{ opacity:.6; cursor:default; }
.mp__map{ margin-top:10px; height:260px; border-radius:14px; overflow:hidden; background:var(--paper-2); }
.mp__hint{ margin:6px 0 0; font-size:.72rem; color:var(--ink-3); }
.mp__bad{ margin:8px 0 0; font-size:.78rem; color:var(--brick); }
.mp__set{ margin:10px 0 0; font-size:.82rem; color:var(--forest); display:flex; flex-wrap:wrap; align-items:center; gap:4px 6px; }
.mp__set a{ color:var(--forest); text-decoration:underline; text-underline-offset:3px; }
.mp__clear{ background:none; border:0; padding:0; font:inherit; color:var(--ink-3); text-decoration:underline; text-underline-offset:3px; cursor:pointer; }
</style>
