<script setup>
import { computed } from 'vue'
import { money } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'
import { useCart } from '../composables/useCart'

const { t, nm } = useI18n()
const { lines, count, total, open, setQty, remove, whatsapp, weighed, ceiling } = useCart()

const countLabel = computed(() =>
  `${count.value} ${count.value === 1 ? t('ui.item') : t('ui.items')}`)
</script>

<template>
  <aside class="drawer" :class="{ on: open }" :aria-hidden="!open" aria-label="Basket">
    <div class="drawer__head">
      <div>
        <h3>{{ t('cart.t') }}</h3>
        <small>{{ countLabel }}</small>
      </div>
      <button class="x" aria-label="Close" @click="open = false">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="drawer__body">
      <div v-if="!lines.length" class="drawer__empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <h4>{{ t('ui.cartempty') }}</h4>
        <p>{{ t('ui.cartempty.d') }}</p>
      </div>

      <TransitionGroup v-else name="line" tag="div">
        <div v-for="l in lines" :key="l.key" class="line">
          <div class="line__img"><img :src="l.product.img" alt=""></div>
          <div class="line__t">
            <b>{{ nm(l.product) }}</b>
            <span>{{ l.unit }} · {{ l.price }} AZN</span>
            <em>{{ money(l.price * l.qty) }} AZN</em>
          </div>
          <div class="line__r">
            <div class="qty">
              <button @click="setQty(l.key, -1)" aria-label="−">−</button>
              <span>{{ l.qty }}</span>
              <button @click="setQty(l.key, 1)" aria-label="+">+</button>
            </div>
            <button class="rm" @click="remove(l.key)">{{ t('ui.remove') }}</button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <div class="drawer__foot" v-if="lines.length">
      <div class="total">
        <span>{{ t('cart.sub') }}</span>
        <b>{{ money(total) }}<i>AZN</i></b>
      </div>

      <!-- Goods sold by the kilo are weighed by the courier, so the figure
           above is an estimate. Saying so here, rather than at the door, is
           the whole difference between an expectation and an argument. -->
      <p v-if="weighed && ceiling" class="drawer__weighed">
        {{ t('ui.weighedNote') }}
        <b>{{ t('ui.waWeighed') }} {{ money(ceiling) }} AZN</b>
      </p>

      <p class="drawer__note">{{ t('cart.note') }}</p>
      <a class="btn btn--brick" :href="whatsapp" target="_blank" rel="noopener">
        <span>{{ t('cart.send') }}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
    </div>
  </aside>
</template>

<style scoped>
.drawer{
  position:fixed; top:0; right:0; bottom:0; z-index:500;
  width:min(430px,100%); background:var(--paper);
  display:flex; flex-direction:column;
  transform:translateX(101%);
  transition:transform .62s var(--ease-out);
  box-shadow:-20px 0 60px rgba(0,0,0,.2);
}
.drawer.on{ transform:none; }
.drawer__weighed{
  margin:12px 0 0;
  padding:10px 12px;
  background:var(--paper-2);
  border-left:3px solid var(--leaf);
  border-radius:2px;
  font-size:.82rem; line-height:1.5; color:var(--ink-2);
}
.drawer__weighed b{ display:block; margin-top:3px; color:var(--ink); }
.drawer__head{ display:flex; align-items:center; justify-content:space-between; padding:22px var(--dpad,24px); border-bottom:1px solid var(--line); }
.drawer__head h3{ font-family:var(--display); font-size:1.34rem; font-weight:500; margin:0; letter-spacing:-.014em; }
.drawer__head small{ display:block; font-family:var(--sans); font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-3); margin-top:4px; }

.drawer__body{ flex:1; overflow-y:auto; padding:8px var(--dpad,24px) 16px; }
.drawer__empty{ text-align:center; padding:70px 10px; color:var(--ink-3); }
.drawer__empty svg{ width:44px; height:44px; margin:0 auto 16px; opacity:.35; }

.line{ display:grid; grid-template-columns:76px 1fr auto; gap:14px; padding:16px 0; border-bottom:1px solid var(--line-soft); align-items:center; }
.line__img{ width:76px; height:76px; border-radius:var(--radius); overflow:hidden; background:var(--paper-2); }
.line__img img{ width:100%; height:100%; object-fit:cover; }
.line__t b{ font-family:var(--display); font-size:1rem; font-weight:500; display:block; letter-spacing:-.01em; line-height:1.2; }
.line__t span{ font-size:.74rem; color:var(--ink-3); display:block; margin-top:3px; }
.line__t em{ font-style:normal; font-size:.8rem; font-weight:600; display:block; margin-top:6px; }
.line__r{ display:flex; flex-direction:column; align-items:flex-end; gap:9px; }
.rm{ font-size:.68rem; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); border-bottom:1px solid transparent; transition:color .3s var(--ease), border-color .3s var(--ease); }
.rm:hover{ color:var(--brick); border-color:var(--brick); }

.drawer__foot{ border-top:1px solid var(--line); padding:20px var(--dpad,24px) 24px; background:var(--paper-2); }
.total{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:6px; }
.total span{ font-size:.78rem; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-3); }
.total b{ font-family:var(--display); font-variant-numeric:lining-nums tabular-nums; font-size:1.9rem; font-weight:600; letter-spacing:-.028em; }
.total b i{ font-style:normal; font-size:.5em; opacity:.6; margin-left:3px; }
.drawer__note{ font-size:.74rem; color:var(--ink-3); margin:0 0 16px; line-height:1.5; }
.drawer__foot .btn{ width:100%; justify-content:center; }
</style>

<style scoped>
/* Lines settle rather than snapping when one is removed. */
.line-move{ transition:transform .4s cubic-bezier(.16,1,.3,1); }
.line-leave-active{ transition:opacity .25s ease, transform .3s ease; position:absolute; width:calc(100% - 48px); }
.line-enter-active{ transition:opacity .35s ease, transform .4s cubic-bezier(.16,1,.3,1); }
.line-enter-from{ opacity:0; transform:translateX(18px); }
.line-leave-to{ opacity:0; transform:translateX(18px); }
@media (prefers-reduced-motion: reduce){
  .line-move,.line-enter-active,.line-leave-active{ transition:none; }
}
</style>
