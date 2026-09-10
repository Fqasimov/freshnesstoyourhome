<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../composables/useI18n'
import { reducedMotion } from '../composables/useMotion'
import logo from '../assets/logo.png'

const { t } = useI18n()

const stats = [
  { to: 54, key: 'st1' }, { to: 6, key: 'st2' },
  { to: 5,  key: 'st3' }, { to: 4, key: 'st4' }
]

/* Numbers count up once, when the block first arrives. */
const shown = ref(stats.map(() => 0))
const box = ref(null)
let io = null

onMounted(() => {
  if (reducedMotion) { shown.value = stats.map(s => s.to); return }
  io = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return
    io.disconnect()
    const t0 = performance.now(), dur = 1100
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur)
      const eased = 1 - Math.pow(1 - k, 3)
      shown.value = stats.map(s => Math.round(s.to * eased))
      if (k < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, { threshold: 0.6 })
  if (box.value) io.observe(box.value)
})
onUnmounted(() => io && io.disconnect())
</script>

<template>
  <section class="story" id="story">
    <div class="wrap story__in">
      <div v-reveal>
        <p class="eyebrow">{{ t('story.eyebrow') }}</p>
        <blockquote v-html="t('story.quote')"></blockquote>
        <div class="story__meta">
          <img :src="logo" alt="">
          <div>
            <b>Freshness To Your Home</b>
            <span v-html="t('story.meta')"></span>
          </div>
        </div>
      </div>

      <div class="stats" ref="box" v-reveal="'120ms'">
        <div v-for="(s, i) in stats" :key="s.key" class="stat">
          <b>{{ shown[i] }}</b>
          <span>{{ t(s.key) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---------- 12. Story band ----------------------------------------------- */
.story{ background:var(--paper-2); border-block:1px solid var(--line); padding:clamp(64px,8vw,108px) 0; }
.story__in{ display:grid; grid-template-columns:1fr 1fr; gap:clamp(32px,5vw,84px); align-items:center; }
.story blockquote{
  margin:0; font-family:var(--display); font-size:clamp(1.5rem,2.9vw,2.5rem);
  line-height:1.16; letter-spacing:-.022em; font-weight:400;
}
.story blockquote em{ font-style:italic; color:var(--brick); }
.story__meta{ margin-top:26px; display:flex; align-items:center; gap:14px; }
.story__meta img{ width:52px; height:52px; border-radius:50%; object-fit:cover; }
.story__meta div{ font-size:.82rem; line-height:1.4; }
.story__meta b{ display:block; font-weight:600; }
.story__meta span{ color:var(--ink-3); }

.stats{ display:grid; grid-template-columns:repeat(2,1fr); gap:1px; background:var(--line); border:1px solid var(--line); }
.stat{ background:var(--paper-2); padding:clamp(20px,2.6vw,32px); }
.stat b{ font-family:var(--display); font-size:clamp(2rem,4vw,3.1rem); font-weight:500; letter-spacing:-.03em; line-height:1; display:block; }
.stat b i{ font-style:normal; font-size:.44em; margin-left:2px; opacity:.55; }
.stat span{ display:block; margin-top:10px; font-size:.76rem; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-3); }

@media (max-width:1080px){
  .story__in,.contact__in{ grid-template-columns:1fr; }
}

@media (max-width:640px){
  .stats{ grid-template-columns:1fr 1fr; }
}
</style>
