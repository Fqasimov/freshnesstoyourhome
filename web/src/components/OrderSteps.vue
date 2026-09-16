<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../composables/useI18n'
import { reducedMotion } from '../composables/useMotion'
import BIcon from './BIcon.vue'

const { t } = useI18n()

const steps = [
  { k: 's1', icon: 'bag' },
  { k: 's2', icon: 'whatsapp' },
  { k: 's3', icon: 'truck' },
]

const DWELL = 3800

const root = ref(null)
const armed = ref(false)
const active = ref(0)
/* Paused by a hover or a focus, and switched off for good by a click: once
   somebody is driving this themselves, having it move under them is rude. */
const paused = ref(false)
const taken = ref(false)
const playing = ref(false)

let io = null
let tick = null

const canPlay = () => armed.value && !paused.value && !taken.value && !reducedMotion

function schedule () {
  clearTimeout(tick)
  if (!canPlay()) { playing.value = false; return }
  playing.value = true
  tick = setTimeout(() => {
    active.value = (active.value + 1) % steps.length
    schedule()
  }, DWELL)
}

const pause = () => { paused.value = true; schedule() }
const resume = () => { paused.value = false; schedule() }

function pick (i) {
  active.value = i
  taken.value = true
  schedule()
}

/* Left and right walk the steps from the keyboard, the way a stepper should. */
function onKey (e) {
  const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  if (!d) return
  e.preventDefault()
  const next = (active.value + d + steps.length) % steps.length
  pick(next)
  root.value?.querySelectorAll('.step__node')[next]?.focus()
}

onMounted(() => {
  io = new IntersectionObserver(es => {
    /* Only runs while it is on screen — a timer ticking against a section
       nobody is looking at is just battery. */
    armed.value = armed.value || es[0].isIntersecting
    if (es[0].isIntersecting) schedule()
    else { clearTimeout(tick); playing.value = false }
  }, { threshold: 0.25 })
  if (root.value) io.observe(root.value)
})

onUnmounted(() => { io && io.disconnect(); clearTimeout(tick) })
</script>

<template>
  <section class="steps" id="order" ref="root" :class="{ in: armed, still: reducedMotion }">
    <div class="wrap">
      <div class="shead" v-reveal>
        <div class="shead__t">
          <p class="eyebrow">{{ t('how.eyebrow') }}</p>
          <h2 class="display">{{ t('how.h2') }}</h2>
        </div>
      </div>

      <ol class="steps__grid" @mouseleave="resume">
        <li v-for="(s, i) in steps" :key="s.k" class="step"
            :class="{ on: i === active, done: i < active }"
            :style="{ '--i': i }"
            @mouseenter="active = i; pause()">

          <div class="step__top">
            <button class="step__node" type="button"
                    :aria-current="i === active ? 'step' : undefined"
                    @click="pick(i)" @focus="pause" @blur="resume" @keydown="onKey">
              <span>0{{ i + 1 }}</span>
              <span class="step__halo"></span>
            </button>
            <span v-if="i < steps.length - 1" class="step__rail"><i></i></span>
          </div>

          <div class="step__card">
            <span class="step__icon"><BIcon :name="s.icon" :size="21" /></span>
            <h4 v-html="t(s.k + '.t')"></h4>
            <p>{{ t(s.k + '.d') }}</p>
            <!-- Re-keyed on every change so the dwell bar restarts rather than
                 resuming halfway through the previous step's count. -->
            <span v-if="i === active && playing" :key="active" class="step__bar"
                  :style="{ '--dwell': DWELL + 'ms' }"></span>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
/* ---------- 13. How to order ---------------------------------------------
   A stepper that walks itself while it is on screen, and hands over the
   moment anyone hovers, focuses or clicks it. Every step's words stay
   readable at all times — only the emphasis moves. */
.steps{ padding:clamp(64px,8vw,110px) 0; }
.steps__grid{
  list-style:none; margin:clamp(30px,4vw,50px) 0 0; padding:0;
  display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(20px,2.6vw,38px);
}

.step{
  /* column + flex:1 on the card, so three cards of unequal copy still end on
     the same line — Russian runs a line longer than Azerbaijani here. */
  display:flex; flex-direction:column;
  opacity:0; transform:translateY(16px);
  transition:opacity .7s var(--ease-out), transform .7s var(--ease-out);
  transition-delay:calc(var(--i) * 110ms);
}
.steps.in .step{ opacity:1; transform:none; }

/* ---- the track ---- */
.step__top{ display:flex; align-items:center; gap:clamp(10px,1.4vw,18px); margin-bottom:18px; }

.step__node{
  position:relative; flex:none;
  width:clamp(46px,4.4vw,58px); height:clamp(46px,4.4vw,58px); border-radius:50%;
  display:grid; place-items:center;
  font-family:var(--display); font-variant-numeric:lining-nums tabular-nums;
  font-size:clamp(.95rem,1.4vw,1.1rem); letter-spacing:-.02em;
  border:1.5px solid var(--line); background:var(--paper); color:var(--ink-3);
  cursor:pointer;
  transition:background .45s var(--ease), color .45s var(--ease),
             border-color .45s var(--ease), transform .45s var(--ease-out);
}
.step__node span{ position:relative; z-index:1; }
.step__node:hover{ border-color:var(--leaf-d); }
.step__node:focus-visible{ outline:2px solid var(--logo); outline-offset:3px; }

.step.done .step__node{ border-color:var(--leaf-d); color:var(--leaf-d); }
.step.on .step__node{
  background:var(--logo); border-color:var(--logo); color:var(--paper);
  transform:scale(1.06);
}

/* One ring, on the active step only, so the eye knows where the walk is. */
.step__halo{
  position:absolute; inset:-2px; border-radius:50%;
  border:1.5px solid var(--logo); opacity:0;
}
.steps:not(.still) .step.on .step__halo{ animation:stepHalo 2.1s var(--ease-out) infinite; }
@keyframes stepHalo{
  0%{ opacity:.5; transform:scale(1); }
  70%{ opacity:0; transform:scale(1.5); }
  100%{ opacity:0; transform:scale(1.5); }
}

/* The dashed rule of the old design, now carrying a filling line: it says
   how far along the walk is, not just that the steps are related. */
.step__rail{
  flex:1 1 auto; height:1.5px; position:relative;
  background:repeating-linear-gradient(90deg, var(--leaf-d) 0 5px, transparent 5px 13px);
  opacity:.45;
}
.step__rail i{
  position:absolute; inset:0 auto 0 0; display:block; height:100%;
  background:var(--logo); width:0;
  transition:width .55s var(--ease-out);
}
.step.done .step__rail i{ width:100%; }

/* ---- the card ---- */
.step__card{
  position:relative; overflow:hidden; flex:1;
  padding:clamp(18px,1.9vw,26px);
  border:1px solid var(--line); border-radius:4px; background:var(--paper);
  transition:border-color .45s var(--ease), box-shadow .45s var(--ease),
             transform .45s var(--ease-out), background .45s var(--ease);
}
.step.on .step__card{
  border-color:color-mix(in srgb, var(--logo) 40%, var(--line));
  background:var(--paper-2);
  box-shadow:0 14px 34px rgba(27,41,22,.09);
  transform:translateY(-4px);
}

.step__icon{
  width:44px; height:44px; border-radius:50%; margin-bottom:16px;
  display:grid; place-items:center;
  background:var(--paper-2); color:var(--leaf-d);
  transition:background .45s var(--ease), color .45s var(--ease), transform .5s var(--ease-out);
}
.step.on .step__icon{ background:var(--logo); color:var(--paper); transform:scale(1.07); }

.step h4{
  font-family:var(--display); font-size:1.32rem; font-weight:500;
  margin:0 0 10px; letter-spacing:-.014em;
  transition:color .45s var(--ease);
}
.step p{ margin:0; color:var(--ink-3); font-size:.92rem; max-width:34ch; }
.step.on h4{ color:var(--logo); }
.step.on p{ color:var(--ink-2); }

/* How long this step keeps the floor, drawn rather than guessed at. */
.step__bar{
  position:absolute; left:0; right:0; bottom:0; height:2px;
  background:var(--logo); transform-origin:left;
  animation:stepDwell var(--dwell,3800ms) linear forwards;
}
@keyframes stepDwell{ from{ transform:scaleX(0); } to{ transform:scaleX(1); } }

@media (max-width:860px){
  .steps__grid{ grid-template-columns:1fr; gap:26px; }
  .step__top{ margin-bottom:14px; }
  /* Stacked, the horizontal rail would point at nothing, so the walk turns
     and runs down the numerals instead. */
  .step__rail{ display:none; }
  .step{ position:relative; }
  .step:not(:last-child)::before{
    content:''; position:absolute; left:22px; top:50px; bottom:-30px; width:1.5px;
    background:repeating-linear-gradient(180deg, var(--leaf-d) 0 5px, transparent 5px 13px);
    opacity:.4;
  }
}

/* Nothing moves on its own, nothing is dimmed: every step reads as active. */
@media (prefers-reduced-motion: reduce){
  .step{ opacity:1; transform:none; transition:none; }
  .step__card,.step__icon,.step__node{ transition:none; }
  .step__rail i{ width:100%; transition:none; }
}
</style>
