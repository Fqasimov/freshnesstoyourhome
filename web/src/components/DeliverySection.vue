<script setup>
import { useI18n } from '../composables/useI18n'
import BIcon from './BIcon.vue'

const { t } = useI18n()

/* Only the two things nothing else on the page says: the cold chain, and how
   payment works. Hours and the day-ahead notice are already the first and
   last cards in the promise row above — repeating them here would just be the
   same two facts in a second box. */
const facts = [
  { k: 'dl.cold', icon: 'snow' },
  { k: 'dl.pay', icon: 'credit-card' },
]

/* The zones table has no numbers to show yet: every delivery zone ships with
   a zero fee because the business has not set real ones. Saying "confirmed
   when you order" is honest; a fabricated "5 AZN" would not be. */
const terms = [
  ['dl.zones', 'h.zonev'],
  ['dl.fee', 'dl.ask'],
  ['dl.min', 'dl.ask'],
]
</script>

<template>
  <section class="delivery" id="delivery">
    <div class="wrap delivery__in">
      <div v-reveal>
        <p class="eyebrow">{{ t('dl.eyebrow') }}</p>
        <h2 class="display">{{ t('dl.h2') }}</h2>
        <p class="lede">{{ t('dl.copy') }}</p>

        <div class="delivery__facts">
          <div v-for="f in facts" :key="f.k" class="delivery__fact">
            <div class="delivery__ico"><BIcon :name="f.icon" :size="22" /></div>
            <div>
              <h4>{{ t(f.k + '.t') }}</h4>
              <p>{{ t(f.k + '.d') }}</p>
            </div>
          </div>
        </div>

        <p class="delivery__close">{{ t('dl.close') }}</p>
      </div>

      <div class="terms" v-reveal="'120ms'">
        <dl>
          <template v-for="[k, v] in terms" :key="k">
            <dt>{{ t(k) }}</dt>
            <dd>{{ t(v) }}</dd>
          </template>
        </dl>
        <p class="terms__note">{{ t('h.zonenote') }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---------- 13. Delivery -------------------------------------------------- */
.delivery{ padding:clamp(64px,8vw,108px) 0; }
.delivery__in{ display:grid; grid-template-columns:1.1fr .9fr; gap:clamp(32px,5vw,80px); align-items:start; }

.delivery__facts{ display:flex; flex-direction:column; gap:22px; margin-top:30px; }
.delivery__fact{ display:flex; gap:16px; align-items:flex-start; }
.delivery__ico{
  flex:none; width:44px; height:44px; border-radius:50%;
  display:grid; place-items:center; color:var(--leaf-d);
  background:var(--paper-2); border:1px solid var(--line);
}
.delivery__fact h4{ font-family:var(--display); font-size:1.05rem; font-weight:500; margin:0 0 4px; letter-spacing:-.012em; }
.delivery__fact p{ margin:0; font-size:.88rem; color:var(--ink-3); line-height:1.55; }

.delivery__close{
  margin:30px 0 0; padding-top:26px; border-top:1px solid var(--line);
  font-family:var(--display); font-style:italic; font-size:clamp(1.1rem,1.8vw,1.35rem);
  color:var(--ink-2); line-height:1.4; max-width:48ch;
}

.terms{ border:1px solid var(--line); border-radius:var(--radius); padding:clamp(22px,2.6vw,32px); background:var(--paper-2); }
.terms dl{ margin:0; display:grid; grid-template-columns:auto 1fr; gap:14px 18px; font-size:.9rem; }
.terms dt{ color:var(--ink-3); }
.terms dd{ margin:0; text-align:right; font-weight:500; }
.terms__note{ margin:18px 0 0; padding-top:18px; border-top:1px solid var(--line); font-size:.8rem; line-height:1.55; color:var(--ink-3); }

@media (max-width:1080px){
  .delivery__in{ grid-template-columns:1fr; }
}
@media (max-width:420px){
  .terms dl{ grid-template-columns:1fr; gap:2px 0; }
  .terms dd{ text-align:left; padding-bottom:10px; }
}
</style>
