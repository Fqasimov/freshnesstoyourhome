<script setup>
import CatalogueCta from './CatalogueCta.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../composables/useI18n'
import { reducedMotion } from '../composables/useMotion'
import duck from '../assets/products/peking-duck.jpg'
import camembert from '../assets/products/camembert.jpg'
import salmon from '../assets/products/salmon-steaks.jpg'

const { t } = useI18n()

const rule = ref(null)
const drawn = ref(false)
const box = ref(null)
const figs = ref([])

onMounted(() => {
  /* The hand-drawn rule inks itself in under the headline. */
  if (rule.value) rule.value.style.setProperty('--len', rule.value.getTotalLength())
  requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true }))

  if (reducedMotion || !box.value) return
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null
  const loop = () => {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08
    figs.value.forEach(f => {
      const d = Number(f.dataset.depth) || 10
      f.style.transform = `translate(${cx * d}px,${cy * d}px)`
    })
    raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(loop) : null
  }
  const onMove = e => {
    const r = box.value.getBoundingClientRect()
    tx = (e.clientX - r.left) / r.width - 0.5
    ty = (e.clientY - r.top) / r.height - 0.5
    if (!raf) raf = requestAnimationFrame(loop)
  }
  const onLeave = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop) }
  const onScroll = () => {
    const y = window.scrollY
    if (y > window.innerHeight) return
    figs.value.forEach(f => {
      f.style.marginTop = (y * (Number(f.dataset.depth) || 10) * -0.012) + 'px'
    })
  }
  box.value.addEventListener('pointermove', onMove)
  box.value.addEventListener('pointerleave', onLeave)
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
    box.value?.removeEventListener('pointermove', onMove)
    box.value?.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('scroll', onScroll)
  })
})

/* One from meat, one from the cheese room, one from the fish counter —
   the range, rather than a fishmonger's window. */
const shots = [
  { src: duck,      cls: 'c1', depth: 18,  alt: 'Peking duck' },
  { src: camembert, cls: 'c2', depth: -14, alt: 'Camembert' },
  { src: salmon,    cls: 'c3', depth: 26,  alt: 'Salmon steaks on ice' }
]
</script>

<template>
  <section class="hero" id="top" :class="{ in: drawn }">
    <div class="hero__lines"></div>
    <div class="wrap hero__in">
      <div class="hero__text">
        <p class="eyebrow eyebrow--inv">{{ t('hero.eyebrow') }}</p>
        <h1 class="display">
          Freshness
          <em>{{ t('hero.h1b') }}</em>
        </h1>
        <svg class="hero__ul" viewBox="0 0 420 22" preserveAspectRatio="none" aria-hidden="true">
          <path ref="rule" d="M4 15C70 6 138 5 206 9c62 4 124 9 210 2"/>
        </svg>
        <p class="hero__copy">{{ t('hero.copy') }}</p>
        <div class="hero__cta">
          <CatalogueCta />
          <!-- A RouterLink, not href="#contact": under hash routing a bare
               fragment sets the whole route to "contact", which matches
               nothing and bounces the visitor back to the top of the page. -->
          <RouterLink :to="{ path: '/', hash: '#contact' }" class="btn btn--ghost">
            <span>{{ t('hero.cta2') }}</span>
          </RouterLink>
        </div>
      </div>

      <div class="collage" ref="box">
        <figure v-for="s in shots" :key="s.cls" :class="s.cls"
                :data-depth="s.depth" ref="figs">
          <img :src="s.src" :alt="s.alt">
        </figure>
        <div class="collage__seal">
          <span><b>54</b><span v-html="t('hero.seal')"></span></span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---------- 5. Hero ------------------------------------------------------ */
.hero{
  background:var(--forest);
  color:var(--paper);
  position:relative; overflow:hidden;
  padding:calc(var(--nav-h) + clamp(48px,7vw,110px)) 0 clamp(56px,7vw,96px);
}
/* the poster's engraved line-work, rebuilt as a background */
.hero__lines{
  position:absolute; inset:-10% -5% auto -5%; height:150%; opacity:.16; pointer-events:none;
  background:
    repeating-linear-gradient(102deg, transparent 0 46px, rgba(168,199,130,.85) 46px 47px);
  -webkit-mask-image:radial-gradient(120% 90% at 12% 40%, #000 10%, transparent 72%);
  mask-image:radial-gradient(120% 90% at 12% 40%, #000 10%, transparent 72%);
  animation:drift 34s linear infinite;
}
@keyframes drift{ to{ transform:translateX(-94px); } }

.hero__in{ display:grid; grid-template-columns:1.05fr .95fr; gap:clamp(28px,5vw,72px); align-items:center; position:relative; z-index:2; }

.hero h1{ color:var(--paper); }
.hero h1 em{
  font-style:italic; font-weight:400; color:var(--leaf-l);
  display:block; font-size:.4em; line-height:1.08;
  margin-top:.18em; letter-spacing:-.01em;
}
.hero__ul{ display:block; width:min(340px,54%); margin:.35em 0 0; overflow:visible; }
.hero__ul path{
  fill:none; stroke:var(--acid); stroke-width:5; stroke-linecap:round;
  stroke-dasharray:var(--len,600); stroke-dashoffset:var(--len,600);
  transition:stroke-dashoffset 1.5s .5s var(--ease-out);
}
.hero.in .hero__ul path{ stroke-dashoffset:0; }

.hero__copy{ margin:clamp(22px,3vw,34px) 0 0; max-width:46ch; color:rgba(246,243,234,.9); font-size:clamp(.98rem,1.2vw,1.1rem); }

.hero__cta{ display:flex; flex-wrap:wrap; gap:12px; margin-top:clamp(26px,3.4vw,38px); }

/* photo collage */
.collage{ position:relative; aspect-ratio:1/1.02; }
.collage figure{
  position:absolute; margin:0; overflow:hidden; border-radius:var(--radius);
  box-shadow:0 26px 60px rgba(0,0,0,.34);
  outline:6px solid var(--paper); outline-offset:-1px;
  will-change:transform;
}
.collage img{ width:100%; height:100%; object-fit:cover; transition:transform 1.4s var(--ease-out); }
.collage figure:hover img{ transform:scale(1.07); }
.collage .c1{ width:52%; aspect-ratio:4/5;  left:0;    top:7%;  z-index:3; }
.collage .c2{ width:42%; aspect-ratio:1/1;  right:0;   top:0;   z-index:2; }
.collage .c3{ width:46%; aspect-ratio:5/4;  right:1%;  bottom:0; z-index:2; }
.collage__seal{
  position:absolute; left:34%; bottom:7%; z-index:6;
  width:clamp(96px,10.5vw,128px); aspect-ratio:1; border-radius:50%;
  background:var(--acid); color:var(--ink);
  display:grid; place-items:center; text-align:center;
  font-family:var(--display); font-size:clamp(.7rem,.86vw,.82rem); line-height:1.2; font-weight:500;
  box-shadow:0 16px 38px rgba(0,0,0,.34);
}
.collage__seal b{ display:block; font-size:2.1em; font-weight:600; letter-spacing:-.03em; line-height:.95; margin-bottom:2px; }
.collage__seal::before{
  content:''; position:absolute; inset:-11px; border-radius:50%;
  border:1.5px dashed rgba(44,66,35,.5);
  animation:spinRing 30s linear infinite;
}
@keyframes spinRing{ to{ transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce){ .collage__seal::before, .hero__lines{ animation:none; } }
@media (max-width:1080px){
  .hero__in{ grid-template-columns:1fr; gap:44px; }
  .collage{ max-width:520px; }
}

@media (max-width:640px){
  .collage__seal{ left:auto; right:4%; bottom:16%; }
}
</style>
