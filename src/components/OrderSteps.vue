<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()
const steps = [
  { n: '01', k: 's1', d: '0ms',   dd: '0ms' },
  { n: '02', k: 's2', d: '120ms', dd: '340ms' },
  { n: '03', k: 's3', d: '240ms', dd: '0ms' }
]

/* The dashed rules between the numerals grow when the section arrives. */
const root = ref(null)
const armed = ref(false)
let io = null

onMounted(() => {
  io = new IntersectionObserver(es => {
    if (es[0].isIntersecting) { armed.value = true; io.disconnect() }
  }, { threshold: 0.2 })
  if (root.value) io.observe(root.value)
})
onUnmounted(() => io && io.disconnect())
</script>

<template>
  <section class="steps" id="order" ref="root" :class="{ in: armed }">
    <div class="wrap">
      <div class="shead" v-reveal>
        <div class="shead__t">
          <p class="eyebrow">{{ t('how.eyebrow') }}</p>
          <h2 class="display">{{ t('how.h2') }}</h2>
        </div>
      </div>
      <div class="steps__grid">
        <div v-for="s in steps" :key="s.n" class="step"
             v-reveal="s.d" :style="{ '--dd': s.dd }">
          <b>{{ s.n }}</b>
          <h4 v-html="t(s.k + '.t')"></h4>
          <p>{{ t(s.k + '.d') }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---------- 13. How to order --------------------------------------------- */
.steps{ padding:clamp(64px,8vw,110px) 0; }
.steps__grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(24px,3.4vw,54px); position:relative; margin-top:clamp(30px,4vw,50px); }
.step{ position:relative; }
.step b{
  font-family:var(--display); font-size:clamp(3.4rem,6vw,5.2rem); font-weight:300;
  line-height:.8; color:var(--leaf); letter-spacing:-.04em;
  display:flex; align-items:center; gap:clamp(14px,1.6vw,22px);
}
/* the rule that ties one numeral to the next — it grows when the section arrives */
.step b::after{
  content:''; flex:1 1 auto; height:1.5px; align-self:center;
  background:repeating-linear-gradient(90deg, var(--leaf-d) 0 5px, transparent 5px 13px);
  opacity:.5; transform:scaleX(0); transform-origin:left;
  transition:transform 1.15s var(--ease-out); transition-delay:var(--dd,0ms);
}
.steps.in .step b::after{ transform:scaleX(1); }
.step:last-child b::after{ content:none; }
@media (prefers-reduced-motion: reduce){ .step b::after{ transform:none; } }
.step h4{ font-family:var(--display); font-size:1.32rem; font-weight:500; margin:20px 0 10px; letter-spacing:-.014em; }
.step p{ margin:0; color:var(--ink-3); font-size:.92rem; max-width:34ch; }

@media (max-width:860px){
  .steps__grid{ grid-template-columns:1fr; gap:34px; }
  .step b::after{ content:none; }
}
</style>
