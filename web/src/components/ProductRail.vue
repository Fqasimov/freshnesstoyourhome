<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { reducedMotion } from '../composables/useMotion'
import ProductCard from './ProductCard.vue'

/**
 * One counter, browsed sideways.
 *
 * A delicatessen is a row of counters you walk along, not a warehouse list —
 * and six or eight things at a counter is a choice, where fifty-four in a grid
 * is a wall. Each rail holds one counter's goods and scrolls horizontally, so a
 * whole shop fits in a few screens and nothing has to be scrolled past to reach
 * what comes next.
 */
const props = defineProps({
  products: { type: Array, required: true },
  index: { type: Number, default: 0 },
  title: { type: String, default: '' },
  copy: { type: String, default: '' },
  meta: { type: String, default: '' },
})

const emit = defineEmits(['add', 'peek'])

const track = ref(null)
const atStart = ref(true)
const atEnd = ref(false)
const bar = ref({ width: '22%', transform: 'translateX(0%)' })

/* Hidden entirely when everything already fits — arrows and a progress bar on
   a rail with nothing to scroll are furniture, not affordance. */
const scrollable = ref(false)

function measure () {
  const el = track.value
  if (!el) return
  const max = el.scrollWidth - el.clientWidth
  scrollable.value = max > 8
  const pct = max > 0 ? el.scrollLeft / max : 0
  const w = Math.max(12, (el.clientWidth / el.scrollWidth) * 100)
  bar.value = { width: w + '%', transform: `translateX(${pct * (100 / w) * (100 - w)}%)` }
  atStart.value = el.scrollLeft < 4
  atEnd.value = el.scrollLeft > max - 4
}

const step = () => Math.min(track.value.clientWidth * 0.8, 360)
const go = dir => track.value.scrollBy({ left: dir * step(), behavior: reducedMotion ? 'auto' : 'smooth' })

/* Drag-to-scroll, with a click guard so a drag never opens a card. */
let down = false, sx = 0, sl = 0, moved = 0
const dragging = ref(false)

function onDown (e) {
  if (e.target.closest('button')) return
  down = true; moved = 0; sx = e.clientX; sl = track.value.scrollLeft
  dragging.value = true
  track.value.setPointerCapture(e.pointerId)
}
function onMove (e) {
  if (!down) return
  const d = e.clientX - sx
  moved = Math.abs(d)
  track.value.scrollLeft = sl - d
}
const onUp = () => { down = false; dragging.value = false }
const onClickCapture = e => { if (moved > 6) { e.preventDefault(); e.stopPropagation() } }

/* Keep the first card flush with the page gutter on a full-bleed track. */
function setEdge () {
  const w = document.querySelector('.wrap')
  if (!w) return
  const r = w.getBoundingClientRect()
  const pad = parseFloat(getComputedStyle(w).paddingLeft) || 0
  document.documentElement.style.setProperty('--edge', (r.left + pad) + 'px')
}

const onResize = () => { setEdge(); measure() }
onMounted(() => { setEdge(); measure(); window.addEventListener('resize', onResize) })
onUnmounted(() => window.removeEventListener('resize', onResize))

const number = computed(() => String(props.index + 1).padStart(2, '0'))
</script>

<template>
  <div class="rail">
    <div class="wrap">
      <div class="rail__head" v-reveal>
        <div class="rail__t">
          <!-- Numbered like counters in a shop, so a long page reads as a walk
               past six of them rather than one endless list. -->
          <p class="rail__n"><i>{{ number }}</i>{{ title }}</p>
          <p v-if="copy" class="rail__copy">{{ copy }}</p>
          <p v-if="meta" class="rail__meta">{{ meta }}</p>
        </div>

        <div v-if="scrollable" class="rail__nav">
          <button class="arrow" :disabled="atStart" aria-label="Previous" @click="go(-1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
          </button>
          <button class="arrow" :disabled="atEnd" aria-label="Next" @click="go(1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div class="rail__slider">
      <div class="rail__track" :class="{ drag: dragging }" ref="track"
           @scroll.passive="measure"
           @pointerdown="onDown" @pointermove="onMove"
           @pointerup="onUp" @pointercancel="onUp"
           @click.capture="onClickCapture">
        <ProductCard v-for="p in products" :key="p.id" :product="p" variant="slide"
                     @add="emit('add', $event)" @peek="emit('peek', $event)" />
      </div>
      <div v-if="scrollable" class="wrap">
        <div class="rail__bar"><i :style="bar"></i></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rail{ padding-block:clamp(26px,3.4vw,46px); }

.rail__head{
  display:flex; align-items:flex-end; justify-content:space-between; gap:24px;
  margin-bottom:clamp(14px,1.8vw,22px);
}
.rail__t{ max-width:56ch; }

.rail__n{
  display:flex; align-items:baseline; gap:12px;
  margin:0;
  font-family:var(--display); font-size:clamp(1.5rem,2.6vw,2.1rem);
  font-weight:600; letter-spacing:-.015em; color:var(--ink);
}
.rail__n i{
  font-family:var(--sans); font-style:normal;
  font-size:.68rem; font-weight:700; letter-spacing:.18em;
  color:var(--leaf-d);
  /* Sits on the baseline of the heading rather than floating beside it. */
  transform:translateY(-.35em);
}
.rail__copy{ margin:7px 0 0; font-size:.95rem; line-height:1.55; color:var(--ink-2); }
.rail__meta{
  margin:8px 0 0;
  font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-3);
}

.rail__nav{ display:flex; align-items:center; gap:10px; flex:none; }
.arrow{
  width:44px; height:44px; border-radius:50%; border:1px solid var(--line);
  display:grid; place-items:center; color:var(--ink); background:none;
  transition:background .4s var(--ease), color .4s var(--ease), border-color .4s var(--ease), transform .3s var(--ease-out);
}
.arrow:hover:not(:disabled){ background:var(--ink); color:var(--paper); border-color:var(--ink); transform:translateY(-2px); }
.arrow:disabled{ opacity:.26; cursor:default; }

.rail__slider{ position:relative; overflow:hidden; }
.rail__track{
  display:flex; gap:clamp(14px,1.6vw,24px);
  overflow-x:auto; scroll-snap-type:x mandatory;
  padding:6px var(--edge) 22px var(--edge);
  scroll-padding-inline:var(--edge);
  scrollbar-width:none; cursor:grab;
}
.rail__track::-webkit-scrollbar{ display:none; }
.rail__track.drag{ cursor:grabbing; scroll-snap-type:none; }

.rail__bar{ height:2px; background:var(--line); position:relative; }
.rail__bar i{
  position:absolute; inset:0 auto 0 0; width:22%; background:var(--leaf-d);
  transition:transform .18s linear, width .3s var(--ease);
}

@media (max-width:640px){
  .rail__nav{ display:none; }   /* a thumb is the affordance on a phone */
}
</style>
