<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { reducedMotion } from '../composables/useMotion'

/* The real brand mark drawing itself — the leaf and its veins traced on by a
   pen, the three seeds dropping in, the dashed arc swinging home — while the
   wordmark beside it fills from the bottom up with green, like sap rising.
   Once per tab. */

/* Decided synchronously, before the first render — otherwise a returning
   visitor sees the overlay flash for a frame before it fades away. */
let seen = false
try { seen = sessionStorage.getItem('fth.intro') === '1' } catch (e) {}
const skip = reducedMotion || seen

const svg = ref(null)
const go = ref(false)
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
  /* The traced outline is one long compound path; it needs its own length
     before stroke-dashoffset can draw it on. */
  svg.value?.querySelectorAll('.intro__draw')
    .forEach(p => p.style.setProperty('--len', p.getTotalLength()))

  requestAnimationFrame(() => requestAnimationFrame(() => { go.value = true }))
  timers.push(setTimeout(() => { pulse.value = true }, 1450))
  /* The wordmark's fill lands around 2.9s; this leaves a beat to read it. */
  timers.push(setTimeout(leave, 3200))
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
        <!-- The wordmark sits to the left of the mark, the pair centred as one. -->
        <div class="intro__word">
          <span class="intro__line"><span class="intro__rise" data-t="Freshness">Freshness</span></span>
          <span class="intro__line intro__line--sm"><span class="intro__rise" data-t="To Your Home">To Your Home</span></span>
        </div>

        <svg class="intro__mark" viewBox="340 0 415 300" ref="svg">
          <g class="intro__ripples">
            <circle cx="510" cy="144" r="70"/>
            <circle cx="510" cy="144" r="70"/>
            <circle cx="510" cy="144" r="70"/>
          </g>
          <path class="intro__arc" d="M425.3,268.0 A134.3,134.3 0 0 1 532.5,23.2"/>
          <path class="intro__fill" d="M495.4,269.0C512.6,264.4 517.1,262.2 535.0,250.4C540.8,246.5 553.9,235.2 560.2,228.7C573.7,214.5 589.8,188.7 597.0,169.6C598.7,165.1 600.5,160.6 600.9,159.5C602.4,156.0 605.0,146.8 605.6,142.8C606.0,140.7 606.7,138.7 607.1,138.4C607.6,138.1 608.0,136.6 608.0,134.9C608.0,133.3 608.4,131.2 609.0,130.2C610.3,127.8 613.7,110.4 614.9,99.5C617.5,76.2 618.1,60.3 617.1,41.1C615.7,15.9 616.3,16.8 602.7,17.1C573.9,17.7 546.2,23.4 516.8,34.7C510.3,37.2 505.0,39.7 505.0,40.1C505.0,40.6 504.5,41.0 503.8,41.0C501.1,41.0 472.0,59.3 472.0,61.0C472.0,61.6 471.4,62.0 470.7,62.0C468.5,62.0 453.3,75.5 444.3,85.5C433.6,97.2 417.0,120.0 417.0,123.0C417.0,123.6 416.5,124.8 416.0,125.8C415.4,126.7 413.6,130.7 411.9,134.5C404.2,152.1 402.5,161.3 402.5,186.5C402.5,209.9 403.4,214.7 411.1,230.6C422.5,254.6 436.4,266.0 460.0,270.6C468.6,272.3 486.1,271.5 495.4,269.0ZM460.2,251.3C457.4,250.9 457.0,250.6 457.6,248.7C458.7,244.9 469.0,230.1 470.8,229.6C471.7,229.4 479.7,227.7 488.5,226.0C497.3,224.3 506.1,222.5 508.1,221.9C510.1,221.4 512.9,221.0 514.3,221.0C517.5,221.0 520.5,217.0 519.5,214.0C519.0,212.4 518.0,212.0 514.7,212.0C510.8,212.0 496.4,214.2 493.0,215.4C492.2,215.6 488.5,216.1 484.8,216.4C479.9,216.9 478.0,216.7 478.0,215.9C478.0,215.2 480.0,211.7 482.4,208.1C484.7,204.5 487.7,199.7 488.8,197.5C492.6,190.4 494.4,188.9 500.7,188.0C508.7,186.8 539.1,180.9 546.0,179.3C549.8,178.3 551.0,175.9 548.9,173.3C547.8,172.0 546.3,171.9 540.5,172.4C532.2,173.2 523.3,174.4 512.7,176.0C502.2,177.6 501.4,177.2 504.2,171.8C505.4,169.4 509.0,163.4 512.2,158.5C515.4,153.6 518.1,149.2 518.2,148.8C518.4,148.5 522.1,147.6 526.5,147.0C530.9,146.4 537.0,145.4 540.0,144.9C543.0,144.4 548.6,143.6 552.5,143.1C556.4,142.6 561.0,141.9 562.8,141.5C566.8,140.6 568.5,138.0 566.6,135.5C565.4,133.8 564.5,133.8 551.9,135.0C526.6,137.5 526.7,137.5 527.5,135.2C527.8,134.0 530.4,129.2 533.2,124.3C536.0,119.5 538.6,114.6 539.1,113.5C539.6,112.4 541.4,109.5 543.0,107.0C544.6,104.5 546.5,101.4 547.3,100.0C548.0,98.6 550.0,95.2 551.5,92.5C558.1,81.0 558.4,79.6 554.4,77.8C552.0,76.7 551.6,76.8 549.6,79.5C548.5,81.1 547.0,83.2 546.5,84.1C545.4,86.1 536.6,100.5 533.3,105.9C532.1,107.9 530.4,110.8 529.5,112.5C528.6,114.2 526.7,117.3 525.2,119.6C523.7,121.9 521.0,125.9 519.3,128.6C517.5,131.3 516.0,134.1 516.0,134.8C516.0,135.4 515.6,136.0 515.1,136.0C514.6,136.0 513.7,137.2 513.1,138.8C512.5,140.3 511.1,142.1 510.0,142.8C508.3,143.8 508.0,143.7 507.6,141.7C506.3,135.5 505.7,131.9 504.9,126.0C504.5,122.4 503.6,116.8 503.1,113.5C502.6,110.2 501.6,103.8 501.0,99.2C499.7,89.5 498.6,86.2 496.4,85.3C493.5,84.2 491.8,87.8 492.5,93.5C492.8,96.2 493.3,100.3 493.5,102.5C493.7,104.7 494.3,110.1 494.9,114.5C498.3,141.2 498.9,146.2 499.4,153.0L500.0,160.5L495.5,168.0C487.9,180.4 487.5,181.0 486.5,180.7C485.4,180.3 482.8,171.3 479.1,155.0C475.3,137.6 471.8,123.5 471.0,122.0C470.2,120.4 467.3,120.5 465.2,122.3C463.7,123.5 464.2,128.0 467.2,138.5C469.0,144.9 470.1,150.0 473.1,165.0C473.7,168.0 474.5,172.3 475.0,174.5C475.4,176.7 476.4,182.3 477.0,187.0L478.2,195.5L475.0,201.5C473.2,204.8 470.9,208.4 469.9,209.6C468.8,210.7 468.0,212.0 468.0,212.6C467.9,214.3 464.0,218.2 462.8,217.7C462.1,217.5 460.7,213.3 459.7,208.4C458.6,203.5 457.4,198.6 457.0,197.5C456.5,196.4 455.4,191.4 454.4,186.5C453.5,181.6 451.7,173.3 450.4,168.1C449.1,163.0 448.0,158.0 448.0,157.0C448.0,154.1 445.3,152.5 442.5,153.8C439.7,155.1 439.3,158.4 440.9,164.9C445.4,182.3 448.7,196.6 449.4,201.5C450.4,208.7 454.3,224.2 456.1,227.5C456.8,229.0 456.7,230.3 455.8,232.2C453.5,236.5 447.6,243.9 446.3,244.0C441.8,244.1 431.3,229.0 427.1,216.4C421.8,200.7 420.7,184.3 423.9,169.1C428.4,147.6 430.7,142.0 443.5,121.1C446.9,115.5 457.4,102.8 464.3,95.7C472.6,87.4 480.8,80.0 481.9,80.0C482.2,80.0 485.0,78.1 488.0,75.8C496.6,69.2 516.8,58.0 519.9,58.0C520.4,58.0 523.4,56.7 526.6,55.1C534.2,51.4 542.3,48.7 553.5,46.0C558.5,44.8 563.4,43.6 564.5,43.4C566.5,42.9 576.2,41.6 587.0,40.4C595.4,39.4 595.4,39.5 595.1,61.8C594.7,90.8 593.0,104.1 586.6,130.3C585.2,136.1 584.0,141.5 584.0,142.4C584.0,143.3 583.6,144.8 583.0,145.8C582.5,146.7 579.7,153.8 576.9,161.5C574.0,169.2 571.0,176.2 570.3,177.1C569.6,177.9 569.0,179.0 569.0,179.4C569.0,180.7 557.0,198.1 550.9,205.7C529.5,232.2 498.4,250.4 472.5,251.4C467.6,251.6 462.0,251.6 460.2,251.3Z"/>
          <path class="intro__draw" d="M495.4,269.0C512.6,264.4 517.1,262.2 535.0,250.4C540.8,246.5 553.9,235.2 560.2,228.7C573.7,214.5 589.8,188.7 597.0,169.6C598.7,165.1 600.5,160.6 600.9,159.5C602.4,156.0 605.0,146.8 605.6,142.8C606.0,140.7 606.7,138.7 607.1,138.4C607.6,138.1 608.0,136.6 608.0,134.9C608.0,133.3 608.4,131.2 609.0,130.2C610.3,127.8 613.7,110.4 614.9,99.5C617.5,76.2 618.1,60.3 617.1,41.1C615.7,15.9 616.3,16.8 602.7,17.1C573.9,17.7 546.2,23.4 516.8,34.7C510.3,37.2 505.0,39.7 505.0,40.1C505.0,40.6 504.5,41.0 503.8,41.0C501.1,41.0 472.0,59.3 472.0,61.0C472.0,61.6 471.4,62.0 470.7,62.0C468.5,62.0 453.3,75.5 444.3,85.5C433.6,97.2 417.0,120.0 417.0,123.0C417.0,123.6 416.5,124.8 416.0,125.8C415.4,126.7 413.6,130.7 411.9,134.5C404.2,152.1 402.5,161.3 402.5,186.5C402.5,209.9 403.4,214.7 411.1,230.6C422.5,254.6 436.4,266.0 460.0,270.6C468.6,272.3 486.1,271.5 495.4,269.0ZM460.2,251.3C457.4,250.9 457.0,250.6 457.6,248.7C458.7,244.9 469.0,230.1 470.8,229.6C471.7,229.4 479.7,227.7 488.5,226.0C497.3,224.3 506.1,222.5 508.1,221.9C510.1,221.4 512.9,221.0 514.3,221.0C517.5,221.0 520.5,217.0 519.5,214.0C519.0,212.4 518.0,212.0 514.7,212.0C510.8,212.0 496.4,214.2 493.0,215.4C492.2,215.6 488.5,216.1 484.8,216.4C479.9,216.9 478.0,216.7 478.0,215.9C478.0,215.2 480.0,211.7 482.4,208.1C484.7,204.5 487.7,199.7 488.8,197.5C492.6,190.4 494.4,188.9 500.7,188.0C508.7,186.8 539.1,180.9 546.0,179.3C549.8,178.3 551.0,175.9 548.9,173.3C547.8,172.0 546.3,171.9 540.5,172.4C532.2,173.2 523.3,174.4 512.7,176.0C502.2,177.6 501.4,177.2 504.2,171.8C505.4,169.4 509.0,163.4 512.2,158.5C515.4,153.6 518.1,149.2 518.2,148.8C518.4,148.5 522.1,147.6 526.5,147.0C530.9,146.4 537.0,145.4 540.0,144.9C543.0,144.4 548.6,143.6 552.5,143.1C556.4,142.6 561.0,141.9 562.8,141.5C566.8,140.6 568.5,138.0 566.6,135.5C565.4,133.8 564.5,133.8 551.9,135.0C526.6,137.5 526.7,137.5 527.5,135.2C527.8,134.0 530.4,129.2 533.2,124.3C536.0,119.5 538.6,114.6 539.1,113.5C539.6,112.4 541.4,109.5 543.0,107.0C544.6,104.5 546.5,101.4 547.3,100.0C548.0,98.6 550.0,95.2 551.5,92.5C558.1,81.0 558.4,79.6 554.4,77.8C552.0,76.7 551.6,76.8 549.6,79.5C548.5,81.1 547.0,83.2 546.5,84.1C545.4,86.1 536.6,100.5 533.3,105.9C532.1,107.9 530.4,110.8 529.5,112.5C528.6,114.2 526.7,117.3 525.2,119.6C523.7,121.9 521.0,125.9 519.3,128.6C517.5,131.3 516.0,134.1 516.0,134.8C516.0,135.4 515.6,136.0 515.1,136.0C514.6,136.0 513.7,137.2 513.1,138.8C512.5,140.3 511.1,142.1 510.0,142.8C508.3,143.8 508.0,143.7 507.6,141.7C506.3,135.5 505.7,131.9 504.9,126.0C504.5,122.4 503.6,116.8 503.1,113.5C502.6,110.2 501.6,103.8 501.0,99.2C499.7,89.5 498.6,86.2 496.4,85.3C493.5,84.2 491.8,87.8 492.5,93.5C492.8,96.2 493.3,100.3 493.5,102.5C493.7,104.7 494.3,110.1 494.9,114.5C498.3,141.2 498.9,146.2 499.4,153.0L500.0,160.5L495.5,168.0C487.9,180.4 487.5,181.0 486.5,180.7C485.4,180.3 482.8,171.3 479.1,155.0C475.3,137.6 471.8,123.5 471.0,122.0C470.2,120.4 467.3,120.5 465.2,122.3C463.7,123.5 464.2,128.0 467.2,138.5C469.0,144.9 470.1,150.0 473.1,165.0C473.7,168.0 474.5,172.3 475.0,174.5C475.4,176.7 476.4,182.3 477.0,187.0L478.2,195.5L475.0,201.5C473.2,204.8 470.9,208.4 469.9,209.6C468.8,210.7 468.0,212.0 468.0,212.6C467.9,214.3 464.0,218.2 462.8,217.7C462.1,217.5 460.7,213.3 459.7,208.4C458.6,203.5 457.4,198.6 457.0,197.5C456.5,196.4 455.4,191.4 454.4,186.5C453.5,181.6 451.7,173.3 450.4,168.1C449.1,163.0 448.0,158.0 448.0,157.0C448.0,154.1 445.3,152.5 442.5,153.8C439.7,155.1 439.3,158.4 440.9,164.9C445.4,182.3 448.7,196.6 449.4,201.5C450.4,208.7 454.3,224.2 456.1,227.5C456.8,229.0 456.7,230.3 455.8,232.2C453.5,236.5 447.6,243.9 446.3,244.0C441.8,244.1 431.3,229.0 427.1,216.4C421.8,200.7 420.7,184.3 423.9,169.1C428.4,147.6 430.7,142.0 443.5,121.1C446.9,115.5 457.4,102.8 464.3,95.7C472.6,87.4 480.8,80.0 481.9,80.0C482.2,80.0 485.0,78.1 488.0,75.8C496.6,69.2 516.8,58.0 519.9,58.0C520.4,58.0 523.4,56.7 526.6,55.1C534.2,51.4 542.3,48.7 553.5,46.0C558.5,44.8 563.4,43.6 564.5,43.4C566.5,42.9 576.2,41.6 587.0,40.4C595.4,39.4 595.4,39.5 595.1,61.8C594.7,90.8 593.0,104.1 586.6,130.3C585.2,136.1 584.0,141.5 584.0,142.4C584.0,143.3 583.6,144.8 583.0,145.8C582.5,146.7 579.7,153.8 576.9,161.5C574.0,169.2 571.0,176.2 570.3,177.1C569.6,177.9 569.0,179.0 569.0,179.4C569.0,180.7 557.0,198.1 550.9,205.7C529.5,232.2 498.4,250.4 472.5,251.4C467.6,251.6 462.0,251.6 460.2,251.3Z"/>
          <circle class="intro__dot" cx="660.2" cy="93.3" r="31.7"/>
          <circle class="intro__dot" cx="709.4" cy="145.3" r="23.1"/>
          <circle class="intro__dot" cx="642.8" cy="191.0" r="30.6"/>
        </svg>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ---------- 21. Opening sequence ------------------------------------------
   The real mark, traced to vector from the logo artwork, drawing itself in;
   the wordmark filling with green from the bottom up. Plays once per visit;
   skips instantly for reduced motion. */
.intro{
  position:fixed; inset:0; z-index:5000;
  background:var(--forest);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer;
}
.intro::before{
  content:''; position:absolute; inset:0; opacity:.14; mix-blend-mode:screen;
  background:
    repeating-linear-gradient(102deg, transparent 0 46px, rgba(168,199,130,.9) 46px 47px);
}

/* Text left, mark right, the pair centred on the screen. */
.intro__stage{
  position:relative; display:flex; align-items:center; justify-content:center;
  gap:clamp(14px,3.2vw,52px);
}
.intro__mark{ width:clamp(165px,26vw,335px); height:auto; overflow:visible; flex:none; }

/* ---- the mark ---- */
.intro__arc{
  fill:none; stroke:var(--leaf-l); stroke-width:7; stroke-linecap:round;
  stroke-dasharray:18.7 17.2;
  opacity:0; transform:rotate(-16deg); transform-origin:491px 151px;
  transition:opacity .75s var(--ease), transform 1.1s var(--ease-out);
}
.intro.go .intro__arc{ opacity:.85; transform:none; }

/* Drawn first as a hairline, then the real weight of the mark fades up
   underneath it — the pen passes, the ink follows. */
.intro__draw{
  fill:none; stroke:var(--acid); stroke-width:2.6; stroke-linecap:round; stroke-linejoin:round;
  stroke-dasharray:var(--len,4000); stroke-dashoffset:var(--len,4000);
  transition:stroke-dashoffset 1.25s var(--ease-out), opacity .5s var(--ease);
  transition-delay:.1s, 1.45s;
}
.intro.go .intro__draw{ stroke-dashoffset:0; opacity:0; }

.intro__fill{
  fill:var(--acid); fill-rule:evenodd;
  opacity:0; transition:opacity .6s var(--ease-out); transition-delay:1.15s;
}
.intro.go .intro__fill{ opacity:1; }

.intro__dot{
  fill:var(--acid); opacity:0; transform:scale(.2); transform-origin:center;
  transform-box:fill-box;
  transition:opacity .45s var(--ease-out), transform .55s var(--ease-out);
}
.intro.go .intro__dot{ opacity:1; transform:scale(1); }
.intro__dot:nth-of-type(1){ transition-delay:.95s; }
.intro__dot:nth-of-type(2){ transition-delay:1.06s; }
.intro__dot:nth-of-type(3){ transition-delay:1.17s; }

.intro__ripples circle{
  fill:none; stroke:var(--leaf-l); stroke-width:1.5; opacity:0; transform-origin:510px 144px;
}
.intro.pulse .intro__ripples circle{ animation:introBloom 1.05s var(--ease-out) forwards; }
.intro.pulse .intro__ripples circle:nth-child(1){ animation-delay:0ms; }
.intro.pulse .intro__ripples circle:nth-child(2){ animation-delay:160ms; }
.intro.pulse .intro__ripples circle:nth-child(3){ animation-delay:320ms; }
/* Stops short of the wordmark: at the old scale(4.2) the ring washed straight
   across the letters while they were still filling. */
@keyframes introBloom{
  0%{ opacity:.5; transform:scale(.3); }
  100%{ opacity:0; transform:scale(2.5); }
}

/* ---- the wordmark ---- */
.intro__word{
  font-family:var(--wordmark); font-weight:600; text-align:right;
  line-height:1.02; letter-spacing:-.022em;
}
.intro__line{ display:block; overflow:hidden; }
.intro__line--sm{ font-size:.52em; letter-spacing:.005em; margin-top:.16em; }
.intro__word{ font-size:clamp(2rem,6.4vw,4.9rem); }

/* Two things at once: the line rides up from under its own edge, and the
   green climbs through the letters behind it. */
.intro__rise{
  display:block; position:relative;
  color:rgba(246,243,234,.16);
  transform:translateY(112%);
  transition:transform 1.1s var(--ease-out);
  transition-delay:.35s;
}
.intro.go .intro__rise{ transform:none; }
.intro__line--sm .intro__rise{ transition-delay:.52s; }

.intro__rise::after{
  content:attr(data-t);
  position:absolute; inset:0;
  background-image:linear-gradient(to top,
    var(--acid) 0%, var(--leaf-xl) 46%, var(--paper) 86%, rgba(246,243,234,0) 100%);
  background-repeat:no-repeat;
  /* anchored to the bottom and grown upward: the fill rises, it never slides */
  background-position:0 100%;
  background-size:100% 0%;
  -webkit-background-clip:text; background-clip:text;
  color:transparent;
  /* Not --ease-out: that curve is so front-loaded the fill would look done in
     a second. This one keeps the climb steady, so it reads as loading. */
  transition:background-size 2.4s cubic-bezier(.42,.03,.35,1);
  transition-delay:.55s;
}
/* 112%, not 140% — only the feathered top needs to clear the caps, and
   overshooting further would finish the visible fill long before time. */
.intro.go .intro__rise::after{ background-size:100% 112%; }
.intro__line--sm .intro__rise::after{ transition-delay:.72s; }

@media (max-width:560px){
  .intro__stage{ flex-direction:column-reverse; gap:18px; }
  .intro__word{ text-align:center; }
}

@media (prefers-reduced-motion: reduce){
  .intro{ transition:none; }
  .intro__ripples circle{ animation:none !important; }
}
</style>

<style scoped>
/* <Transition> owns the exit now; .leave/.hidden from the vanilla build are gone. */
.intro-leave-active{ transition:opacity .7s var(--ease-out), transform .8s var(--ease-in-out); }
.intro-leave-to{ opacity:0; transform:scale(1.04); pointer-events:none; }
</style>
