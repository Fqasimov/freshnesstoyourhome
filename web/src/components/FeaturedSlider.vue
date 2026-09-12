<script setup>
import BIcon from './BIcon.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { PRODUCTS } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'
import { reducedMotion } from '../composables/useMotion'
import ProductCard from './ProductCard.vue'

const { t } = useI18n()
const emit = defineEmits(['add', 'peek'])

const picks = computed(() => PRODUCTS.filter(p => p.popular))
const track = ref(null)
const atStart = ref(true)
const atEnd = ref(false)
const bar = ref({ width: '22%', transform: 'translateX(0%)' })

function measure () {
  const el = track.value
  if (!el) return
  const max = el.scrollWidth - el.clientWidth
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
</script>

<template>
  <section class="feature" id="week">
    <div class="wrap">
      <div class="shead" v-reveal>
        <div class="shead__t">
          <p class="eyebrow">{{ t('week.eyebrow') }}</p>
          <h2 class="display">{{ t('week.h2') }}</h2>
          <p class="lede">{{ t('week.copy') }}</p>
        </div>
        <div class="slider__nav">
          <button class="arrow" :disabled="atStart" aria-label="Previous" @click="go(-1)">
            <BIcon name="arrow-left" :size="15" />
          </button>
          <button class="arrow" :disabled="atEnd" aria-label="Next" @click="go(1)">
            <BIcon name="arrow-right" :size="15" />
          </button>
        </div>
      </div>
    </div>

    <div class="slider">
      <div class="slider__track" :class="{ drag: dragging }" ref="track"
           @scroll.passive="measure"
           @pointerdown="onDown" @pointermove="onMove"
           @pointerup="onUp" @pointercancel="onUp"
           @click.capture="onClickCapture">
        <ProductCard v-for="p in picks" :key="p.id" :product="p" variant="slide"
                     @add="emit('add', $event)" @peek="emit('peek', $event)" />
      </div>
      <div class="wrap">
        <div class="slider__bar"><i :style="bar"></i></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---------- 9. Featured slider ------------------------------------------ */
.feature{ padding:clamp(20px,3vw,40px) 0 clamp(60px,7vw,100px); }
.slider{
  position:relative; overflow:hidden;
  /* The track runs full-bleed, so whichever card happens to straddle the right
     edge gets sliced by the window — at 1360px that landed straight through an
     "add" button, which reads as broken rather than as "there is more". A short
     fade makes the cut deliberate at any width. */
  -webkit-mask-image:linear-gradient(90deg, #000 calc(100% - 64px), transparent);
  mask-image:linear-gradient(90deg, #000 calc(100% - 64px), transparent);
}
.slider__track{
  display:flex; gap:clamp(14px,1.6vw,24px);
  overflow-x:auto; scroll-snap-type:x mandatory;
  padding:6px var(--edge) 26px var(--edge);
  scroll-padding-inline:var(--edge);
  scrollbar-width:none; cursor:grab;
}
.slider__track::-webkit-scrollbar{ display:none; }
.slider__track.drag{ cursor:grabbing; scroll-snap-type:none; }

.slider__nav{ display:flex; align-items:center; gap:10px; }
.arrow{
  width:46px; height:46px; border-radius:50%; border:1px solid var(--line);
  display:grid; place-items:center; color:var(--ink);
  transition:background .4s var(--ease), color .4s var(--ease), border-color .4s var(--ease), transform .3s var(--ease-out);
}
.arrow:hover:not(:disabled){ background:var(--ink); color:var(--paper); border-color:var(--ink); transform:translateY(-2px); }
.arrow:disabled{ opacity:.26; cursor:default; }
.slider__bar{ height:2px; background:var(--line); position:relative; margin-top:6px; }
.slider__bar i{ position:absolute; inset:0 auto 0 0; width:22%; background:var(--brick); transition:transform .18s linear, width .3s var(--ease); }
</style>
