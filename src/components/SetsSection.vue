<script setup>
import { computed } from 'vue'
import { SETS, setPricing, money } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'

const { t, nm, dsc } = useI18n()
const emit = defineEmits(['add'])

const sets = computed(() => SETS.map(s => ({ ...s, ...setPricing(s) })))

/* A set drops its whole contents into the basket in one go. */
function addSet (set, ev) {
  emit('add', { set, el: ev.currentTarget.closest('.set') })
}
</script>

<template>
  <section class="sets" id="sets">
    <div class="wrap">
      <div class="shead" v-reveal>
        <div class="shead__t">
          <p class="eyebrow">{{ t('sets.eyebrow') }}</p>
          <h2 class="display">{{ t('sets.h2') }}</h2>
          <p class="lede">{{ t('sets.copy') }}</p>
        </div>
      </div>

      <div class="sets__grid">
        <article v-for="(s, i) in sets" :key="s.id" class="set" v-reveal="i * 110 + 'ms'">
          <div class="set__shots">
            <img v-for="p in s.items" :key="p.id" :src="p.img" :alt="nm(p)" loading="lazy">
          </div>

          <div class="set__body">
            <span class="set__save">−{{ s.off }}% · {{ money(s.saving) }} AZN {{ t('sets.save') }}</span>
            <h3>{{ nm(s) }}</h3>
            <p class="set__desc">{{ dsc(s) }}</p>

            <ul class="set__list">
              <li v-for="p in s.items" :key="p.id">{{ nm(p) }}</li>
            </ul>

            <div class="set__foot">
              <span class="set__price">
                <b>{{ money(s.price) }}<i>AZN</i></b>
                <s>{{ money(s.full) }} AZN</s>
              </span>
              <button class="btn btn--brick" @click="addSet(s, $event)">
                <span>{{ t('sets.add') }}</span>
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sets{ background:var(--paper-2); border-block:1px solid var(--line); padding:clamp(56px,7vw,100px) 0; }
.sets__grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(16px,1.8vw,28px); }

.set{
  display:flex; flex-direction:column;
  background:var(--paper); border:1px solid var(--line); border-radius:var(--radius);
  overflow:hidden;
  transition:border-color .45s var(--ease), box-shadow .5s var(--ease-out), transform .5s var(--ease-out);
}
.set:hover{ border-color:rgba(27,41,22,.3); box-shadow:0 22px 46px -24px rgba(27,41,22,.42); transform:translateY(-3px); }

/* four photographs shown as one strip, so the set reads as a bundle */
.set__shots{ display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--line); }
.set__shots img{ width:100%; aspect-ratio:1; object-fit:cover; transition:transform 1s var(--ease-out); }
.set:hover .set__shots img{ transform:scale(1.05); }

.set__body{ padding:clamp(16px,1.8vw,22px); display:flex; flex-direction:column; flex:1; }
.set__save{
  align-self:flex-start; font-size:.64rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  background:var(--acid); color:var(--ink); padding:5px 10px; border-radius:2px; margin-bottom:12px;
}
.set__body h3{ font-family:var(--display); font-size:1.5rem; font-weight:600; letter-spacing:-.016em; margin:0; line-height:1.1; }
.set__desc{ margin:8px 0 0; font-size:.86rem; color:var(--ink-3); line-height:1.55; }

.set__list{ list-style:none; margin:16px 0 0; padding:0; border-top:1px solid var(--line-soft); }
.set__list li{
  font-size:.82rem; color:var(--ink-2); padding:7px 0 7px 16px; position:relative;
  border-bottom:1px solid var(--line-soft);
}
.set__list li::before{
  content:''; position:absolute; left:2px; top:50%; width:5px; height:5px; margin-top:-2px;
  border-radius:50%; background:var(--leaf-d);
}

.set__foot{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-top:auto; padding-top:18px; }
.set__price{ display:flex; flex-direction:column; line-height:1; }
.set__price b{ font-family:var(--display); font-size:1.7rem; font-weight:600; letter-spacing:-.022em; }
.set__price b i{ font-style:normal; font-size:.5em; font-weight:500; margin-left:3px; opacity:.62; }
.set__price s{ font-size:.76rem; color:var(--ink-3); margin-top:6px; }
.set__foot .btn{ padding:11px 16px; font-size:.78rem; }

@media (max-width:1080px){ .sets__grid{ grid-template-columns:1fr; max-width:560px; } }
@media (max-width:640px){
  .set__body h3{ font-size:1.3rem; }
  .set__foot{ flex-direction:column; align-items:stretch; }
  .set__foot .btn{ justify-content:center; }
}
</style>
