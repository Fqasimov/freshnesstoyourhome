<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../composables/useI18n'
import { reducedMotion } from '../composables/useMotion'

/* The brand mark assembling itself — leaf, veins, the three dots — then a
   bloom of ripples before the shop underneath is revealed. Once per tab. */
const { t } = useI18n()

/* Decided synchronously, before the first render — otherwise a returning
   visitor sees the overlay flash for a frame before it fades away. */
let seen = false
try { seen = sessionStorage.getItem('fth.intro') === '1' } catch (e) {}
const skip = reducedMotion || seen

const svg  = ref(null)
const go   = ref(false)
const pulse = ref(false)
const gone = ref(skip)
const finished = ref(skip)
let timers = []

function leave () {
  if (finished.value) return
  finished.value = true
  timers.forEach(clearTimeout)
  document.body.classList.remove('is-locked')
  gone.value = true
}

onMounted(() => {
  if (skip) return
  try { sessionStorage.setItem('fth.intro', '1') } catch (e) {}

  document.body.classList.add('is-locked')
  /* Each stroke needs its own length before it can be drawn on. */
  svg.value?.querySelectorAll('.intro__outline, .intro__vein')
    .forEach(p => p.style.setProperty('--len', p.getTotalLength()))

  requestAnimationFrame(() => requestAnimationFrame(() => { go.value = true }))
  timers.push(setTimeout(() => { pulse.value = true }, 1150))
  timers.push(setTimeout(leave, 2000))
  window.addEventListener('keydown', leave, { once: true })
  window.addEventListener('wheel', leave, { once: true, passive: true })
})

onUnmounted(() => {
  timers.forEach(clearTimeout)
  document.body.classList.remove('is-locked')
  window.removeEventListener('keydown', leave)
  window.removeEventListener('wheel', leave)
})
</script>

<template>
  <Transition name="intro" @after-leave="gone = true">
    <div v-if="!gone" class="intro" :class="{ go, pulse }" aria-hidden="true"
         @click="leave" @touchstart.passive="leave">
      <div class="intro__stage">
        <svg class="intro__mark" viewBox="-10 -40 320 320" ref="svg">
          <circle class="intro__ring" cx="150" cy="120" r="140"/>
          <g class="intro__ripples">
            <circle cx="150" cy="120" r="62"/>
            <circle cx="150" cy="120" r="62"/>
            <circle cx="150" cy="120" r="62"/>
          </g>
          <path class="intro__outline" d="M100,20 C40,55 25,130 60,195 C75,215 125,215 140,195 C175,130 160,55 100,20 Z"/>
          <path class="intro__vein" d="M100,35 C101,95 102,150 109,205"/>
          <path class="intro__vein" d="M100,84 L72,64"/>
          <path class="intro__vein" d="M104,84 L133,64"/>
          <path class="intro__vein" d="M104,128 L69,116"/>
          <path class="intro__vein" d="M108,128 L139,116"/>
          <circle class="intro__dot" cx="183" cy="65" r="11"/>
          <circle class="intro__dot" cx="207" cy="92" r="8"/>
          <circle class="intro__dot" cx="192" cy="119" r="6"/>
        </svg>
        <p class="intro__tag">{{ t('intro.tag') }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ---------- 21. Opening sequence ------------------------------------------
   The brand mark assembling itself, then a bloom of ripples, then a soft
   fade into the shop underneath. Plays once per visit; skips instantly
   for reduced motion. */
.intro{
  position:fixed; inset:0; z-index:5000;
  background:var(--bright);
  background-image:linear-gradient(168deg, var(--bright) 0%, var(--bright-2) 100%);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer;
}
.intro::before{
  content:''; position:absolute; inset:0; opacity:.1; pointer-events:none;
  background:
    repeating-linear-gradient(102deg, transparent 0 46px, rgba(23,37,15,.55) 46px 47px);
}
.intro__stage{ position:relative; display:flex; flex-direction:column; align-items:center; gap:clamp(18px,2.6vw,34px); }
.intro__mark{ width:clamp(260px,38vw,440px); height:auto; overflow:visible; }

.intro__ring{
  fill:none; stroke:rgba(23,37,15,.38); stroke-width:2; stroke-dasharray:9 13;
  opacity:0; transform-origin:150px 120px;
  transition:opacity .8s var(--ease); animation:introSpin 40s linear infinite;
  animation-play-state:paused;
}
.intro.go .intro__ring{ opacity:1; animation-play-state:running; }
@keyframes introSpin{ to{ transform:rotate(360deg); } }

.intro__outline{
  fill:none; stroke:var(--forest); stroke-width:4.5; stroke-linecap:round; stroke-linejoin:round;
  stroke-dasharray:var(--len,700); stroke-dashoffset:var(--len,700);
  transition:stroke-dashoffset 1s var(--ease-out);
}
.intro.go .intro__outline{ stroke-dashoffset:0; }

.intro__vein{
  fill:none; stroke:rgba(23,37,15,.45); stroke-width:2.5; stroke-linecap:round;
  stroke-dasharray:var(--len,120); stroke-dashoffset:var(--len,120);
  transition:stroke-dashoffset .55s var(--ease-out); transition-delay:.62s;
}
.intro.go .intro__vein{ stroke-dashoffset:0; }

.intro__dot{
  fill:var(--forest); opacity:0; transform:scale(.2); transform-origin:center;
  transform-box:fill-box;
  transition:opacity .45s var(--ease-out), transform .55s var(--ease-out);
}
.intro.go .intro__dot{ opacity:1; transform:scale(1); }
.intro__dot:nth-of-type(1){ transition-delay:.95s; }
.intro__dot:nth-of-type(2){ transition-delay:1.06s; }
.intro__dot:nth-of-type(3){ transition-delay:1.17s; }

.intro__ripples circle{
  fill:none; stroke:rgba(23,37,15,.5); stroke-width:1.5; opacity:0; transform-origin:150px 120px;
}
.intro.pulse .intro__ripples circle{ animation:introBloom 1.05s var(--ease-out) forwards; }
.intro.pulse .intro__ripples circle:nth-child(1){ animation-delay:0ms; }
.intro.pulse .intro__ripples circle:nth-child(2){ animation-delay:160ms; }
.intro.pulse .intro__ripples circle:nth-child(3){ animation-delay:320ms; }
@keyframes introBloom{
  0%{ opacity:.55; transform:scale(.3); }
  100%{ opacity:0; transform:scale(4.2); }
}

.intro__tag{
  margin:0; color:var(--ink); opacity:0; transform:translateY(10px);
  font-family:var(--display); font-style:italic; font-weight:400;
  font-size:clamp(1.15rem,2.3vw,1.75rem); letter-spacing:.01em;
  transition:opacity .6s var(--ease-out), transform .7s var(--ease-out);
  transition-delay:1.02s;
}
.intro.go .intro__tag{ opacity:.92; transform:none; }


@media (prefers-reduced-motion: reduce){
  .intro{ transition:none; }
  .intro__ring{ animation:none; }
  .intro__ripples circle{ animation:none !important; }
}
</style>

<style scoped>
/* <Transition> owns the exit now; .leave/.hidden from the vanilla build are gone. */
.intro-leave-active{ transition:opacity .7s var(--ease-out), transform .8s var(--ease-in-out); }
.intro-leave-to{ opacity:0; transform:scale(1.04); pointer-events:none; }
</style>
