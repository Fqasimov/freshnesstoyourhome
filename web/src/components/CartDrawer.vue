<script setup>
import BIcon from './BIcon.vue'
import { computed } from 'vue'
import { money } from '../data/catalogue'
import { ZONES } from '../data/delivery'
import { useI18n } from '../composables/useI18n'
import { useCart } from '../composables/useCart'

const { t, nm } = useI18n()
const {
  lines, count, total, open, setQty, remove, whatsapp, weighed, ceiling,
  zoneId, address, mapLink, zone, deliveryText, canSend,
} = useCart()

const countLabel = computed(() =>
  `${count.value} ${count.value === 1 ? t('ui.item') : t('ui.items')}`)

/* Somewhere to send people to fetch a link. An embedded picker needs a billed
   Google Maps key; this needs none, and the link a phone's Share button
   produces already resolves to an exact point. When a key exists, the picker
   slots in above the field and writes its pin into `mapLink` — see
   VITE_GOOGLE_MAPS_KEY in .env.example. */
const MAPS_URL = 'https://www.google.com/maps/@40.3777,49.8920,13z'
</script>

<template>
  <aside class="drawer" :class="{ on: open }" :aria-hidden="!open" aria-label="Basket">
    <div class="drawer__head">
      <div>
        <h3>{{ t('cart.t') }}</h3>
        <small>{{ countLabel }}</small>
      </div>
      <button class="x" aria-label="Close" @click="open = false">
        <BIcon name="x-lg" :size="14" />
      </button>
    </div>

    <!-- Body and foot scroll together. The foot used to be a fixed block at
         the bottom of a flex column, which was fine while it held a total and
         a button; with the delivery fields in it the foot is taller than a
         short phone, and anything past the bottom edge had nothing to scroll
         it into view. -->
    <div class="drawer__scroll">
    <div class="drawer__body">
      <div v-if="!lines.length" class="drawer__empty">
        <BIcon name="bag" :size="42" />
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

      <!-- Where it is going. Asked here rather than over WhatsApp, so the
           courier reads it off the order instead of a chat thread. -->
      <div class="deliv">
        <p class="deliv__h">{{ t('cart.deliv') }}</p>

        <label class="deliv__l" for="cart-zone">{{ t('cart.zone') }}</label>
        <select id="cart-zone" class="deliv__in" v-model="zoneId">
          <option value="">{{ t('cart.zonePick') }}</option>
          <option v-for="z in ZONES" :key="z.id" :value="z.id">
            {{ nm(z) }} — {{ z.fee[0] === z.fee[1] ? z.fee[0] : z.fee[0] + '–' + z.fee[1] }} AZN
          </option>
        </select>

        <label class="deliv__l" for="cart-addr">{{ t('cart.addr') }}</label>
        <textarea id="cart-addr" class="deliv__in" rows="2"
                  :placeholder="t('cart.addrPh')" v-model="address"></textarea>

        <!-- The embedded picker goes here once there is a Maps key. -->
        <label class="deliv__l" for="cart-map">
          {{ t('cart.map') }}
          <a class="deliv__open" :href="MAPS_URL" target="_blank" rel="noopener">
            <BIcon name="geo-alt" :size="11" /> {{ t('cart.mapOpen') }}
          </a>
        </label>
        <input id="cart-map" class="deliv__in" type="url" inputmode="url"
               :placeholder="t('cart.mapPh')" v-model="mapLink">
        <p class="deliv__hint">{{ t('cart.mapHint') }}</p>

        <div v-if="zone" class="deliv__fee">
          <span>{{ t('ui.waDeliv') }} · {{ nm(zone) }}</span>
          <b>{{ deliveryText }}</b>
        </div>
        <p v-if="zone && zone.fee[0] !== zone.fee[1]" class="deliv__range">
          {{ t('cart.feeRange') }}
        </p>
      </div>

      <p class="drawer__note">{{ t('cart.note') }}</p>
      <a class="btn btn--brick" :class="{ 'is-off': !canSend }" :href="canSend ? whatsapp : undefined"
         :aria-disabled="!canSend" target="_blank" rel="noopener"
         @click="!canSend && $event.preventDefault()">
        <span>{{ t('cart.send') }}</span>
        <BIcon name="arrow-right" :size="14" />
      </a>
      <p v-if="!canSend" class="deliv__need">{{ t('cart.needAddr') }}</p>
    </div>
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

/* min-height:0 so this may actually shrink inside the flex column — without
   it a tall foot pushes the region past the drawer and nothing scrolls. */
.drawer__scroll{ flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; }
.drawer__body{ padding:8px var(--dpad,24px) 16px; }
.drawer__empty{ text-align:center; padding:70px 10px; color:var(--ink-3); }
.drawer__empty .bi{ margin:0 auto 16px; opacity:.35; }

.line{ display:grid; grid-template-columns:76px 1fr auto; gap:14px; padding:16px 0; border-bottom:1px solid var(--line-soft); align-items:center; }
.line__img{ width:76px; height:76px; border-radius:var(--radius); overflow:hidden; background:var(--paper-2); }
.line__img img{ width:100%; height:100%; object-fit:cover; }
.line__t b{ font-family:var(--display); font-size:1rem; font-weight:500; display:block; letter-spacing:-.01em; line-height:1.2; }
.line__t span{ font-size:.74rem; color:var(--ink-3); display:block; margin-top:3px; }
.line__t em{ font-style:normal; font-size:.8rem; font-weight:600; display:block; margin-top:6px; }
.line__r{ display:flex; flex-direction:column; align-items:flex-end; gap:9px; }
.rm{ font-size:.68rem; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); border-bottom:1px solid transparent; transition:color .3s var(--ease), border-color .3s var(--ease); }
.rm:hover{ color:var(--brick); border-color:var(--brick); }

.drawer__foot{ margin-top:auto; border-top:1px solid var(--line); padding:20px var(--dpad,24px) 24px; background:var(--paper-2); }
.total{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:6px; }
.total span{ font-size:.78rem; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-3); }
.total b{ font-family:var(--display); font-variant-numeric:lining-nums tabular-nums; font-size:1.9rem; font-weight:600; letter-spacing:-.028em; }
.total b i{ font-style:normal; font-size:.5em; opacity:.6; margin-left:3px; }
.drawer__note{ font-size:.74rem; color:var(--ink-3); margin:0 0 16px; line-height:1.5; }
.drawer__foot .btn{ width:100%; justify-content:center; }
/* Not `disabled`: an anchor cannot be, and swapping it for a button would
   lose the middle-click and long-press that open WhatsApp in a new tab. */
.drawer__foot .btn.is-off{ opacity:.45; pointer-events:none; }

/* ---- delivery ---- */
.deliv{ margin:14px 0 16px; padding-top:14px; border-top:1px solid var(--line); }
.deliv__h{
  margin:0 0 10px; font-size:.72rem; letter-spacing:.14em; text-transform:uppercase;
  color:var(--ink-3);
}
.deliv__l{ display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:.72rem; color:var(--ink-3); margin:0 0 4px; }
.deliv__open{ display:inline-flex; align-items:center; gap:4px; color:var(--logo); border-bottom:1px solid transparent; }
.deliv__open:hover{ border-color:currentColor; }
.deliv__in{
  width:100%; margin-bottom:10px; padding:9px 11px;
  border:1px solid var(--line); border-radius:3px; background:var(--paper);
  font-family:var(--sans); font-size:.86rem; color:var(--ink);
  transition:border-color .3s var(--ease);
}
.deliv__in:focus{ outline:none; border-color:var(--logo); }
textarea.deliv__in{ resize:vertical; min-height:52px; }
.deliv__hint{ margin:-4px 0 10px; font-size:.7rem; line-height:1.45; color:var(--ink-3); }

.deliv__fee{
  display:flex; align-items:baseline; justify-content:space-between; gap:12px;
  padding:9px 11px; border-radius:3px; background:var(--paper-3);
  font-size:.8rem;
}
.deliv__fee b{ font-variant-numeric:lining-nums tabular-nums; white-space:nowrap; }
.deliv__range{ margin:7px 0 0; font-size:.7rem; line-height:1.45; color:var(--ink-3); }
.deliv__need{ margin:8px 0 0; font-size:.72rem; color:var(--brick); text-align:center; }
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
