<script setup>
import BIcon from './BIcon.vue'
import { computed } from 'vue'
import { money } from '../data/catalogue'
import { useCart } from '../composables/useCart'
import { useI18n } from '../composables/useI18n'

/**
 * A product on a shelf — the same card as the app's.
 *
 * The photograph on a soft ground, the price in a pill under it, the name
 * below: the order a shopper's eye goes in. The "+" sits on the photo's
 * corner and turns into a − n + stepper once the product is in the basket,
 * so a second one never means opening anything. The rest of the card opens
 * the quick view.
 */
const props = defineProps({
  product: { type: Object, required: true },
  /* 'grid' sits in the catalogue; 'slide' sizes itself for the slider. */
  variant: { type: String, default: 'grid' },
})
const emit = defineEmits(['add', 'peek'])

const { t, nm, unitOf } = useI18n()
const cart = useCart()

/* Tins that come in two sizes go through the quick view to pick one, so
   they never show a stepper: there is no single line for it to count. */
const qty = computed(() => (props.product.variants ? 0 : cart.qtyOf(props.product.id)))

function add (ev) {
  emit('add', { product: props.product, el: ev.currentTarget.closest('.card') })
}
</script>

<template>
  <article class="card" :class="{ 'card--slide': variant === 'slide' }">
    <button type="button" class="card__open" :aria-label="nm(product)" @click="emit('peek', product)">
      <span class="card__media">
        <img v-if="product.img" :src="product.img" :alt="nm(product)" loading="lazy" decoding="async">
        <BIcon v-else name="basket" :size="30" class="card__none" />
        <span v-if="product.popular" class="card__hit"><BIcon name="fire" :size="10" />{{ t('cat.hit') }}</span>
      </span>

      <span class="card__body">
        <span class="card__price">
          <b>{{ money(product.price) }} ₼</b>
        </span>
        <span class="card__name">{{ nm(product) }}</span>
        <span class="card__unit">{{ unitOf(product) }}</span>
      </span>
    </button>

    <div class="card__corner">
      <Transition name="swap" mode="out-in">
        <div v-if="qty > 0" key="step" class="stepper">
          <button type="button" :aria-label="t('ui.less')" @click="cart.step(product.id, -1)">
            <BIcon name="dash-lg" :size="14" />
          </button>
          <Transition name="tick" mode="out-in">
            <span :key="qty" class="stepper__n" aria-live="polite">{{ qty }}</span>
          </Transition>
          <button type="button" :aria-label="t('ui.more')" @click="cart.step(product.id, 1)">
            <BIcon name="plus-lg" :size="14" />
          </button>
        </div>
        <button v-else key="add" type="button" class="add" :aria-label="t('ui.add')" @click="add">
          <BIcon name="plus-lg" :size="17" />
        </button>
      </Transition>
    </div>
  </article>
</template>

<style scoped>
/* Motion follows one rule: things answer at once and settle quickly. Presses
   scale to .97 in 160ms, anything that appears comes from .9, never from
   nothing, and hover effects exist only where there is a pointer to hover. */
.card{ --ease-snap: cubic-bezier(.23,1,.32,1); position:relative; min-width:0; }

.card__open{
  display:flex; flex-direction:column; width:100%; padding:0; border:0; background:none;
  text-align:left; color:inherit; cursor:pointer;
  transition:transform .16s var(--ease-snap);
}
.card__open:active{ transform:scale(.97); }
.card__open:focus-visible{ outline:none; }
.card__open:focus-visible .card__media{ box-shadow:0 0 0 3px var(--paper), 0 0 0 5px var(--forest); }

.card__media{
  position:relative; display:grid; place-items:center;
  aspect-ratio:1/1; border-radius:22px; overflow:hidden; background:var(--paper-2);
  transition:box-shadow .25s var(--ease-snap);
}
.card__media img{
  position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
  transition:transform .5s var(--ease-snap);
}
.card__none{ color:var(--paper-3); }

.card__hit{
  position:absolute; left:10px; top:10px;
  display:inline-flex; align-items:center; gap:4px;
  padding:4px 8px; border-radius:999px; background:var(--acid); color:var(--ink);
  font-size:.66rem; font-weight:700; letter-spacing:.03em;
}

.card__body{ display:flex; flex-direction:column; gap:5px; padding:10px 2px 0; }
.card__price{
  align-self:flex-start; display:inline-flex; align-items:baseline;
  padding:4px 10px; border-radius:999px; background:var(--paper-2);
}
.card__price b{ font-size:1.02rem; font-weight:700; font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
.card__price i{ font-style:normal; font-size:.8rem; font-weight:600; color:var(--ink-2); margin-left:1px; }
.card__name{
  font-size:.92rem; font-weight:500; line-height:1.32; color:var(--ink);
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  margin-top:1px;
}
.card__unit{ font-size:.8rem; color:var(--ink-3); }

/* The corner control sits over the photograph, outside the open button, so
   adding never opens the quick view by accident. */
.card__corner{ position:absolute; top:0; right:0; aspect-ratio:1/1; width:100%; pointer-events:none; }
.card__corner > *{ position:absolute; right:9px; bottom:9px; pointer-events:auto; }

.add{
  width:40px; height:40px; border-radius:50%; border:0; cursor:pointer;
  display:grid; place-items:center; background:#fff; color:var(--forest);
  box-shadow:0 3px 10px rgba(27,41,22,.16);
  transition:transform .16s var(--ease-snap), background .2s var(--ease-snap), color .2s var(--ease-snap);
}
.add:active{ transform:scale(.9); }

.stepper{
  display:flex; align-items:center; height:40px; padding:0 2px; border-radius:999px;
  background:var(--forest); color:#fff; box-shadow:0 3px 10px rgba(27,41,22,.2);
}
.stepper button{
  width:34px; height:40px; border:0; background:none; color:inherit; cursor:pointer;
  display:grid; place-items:center; transition:transform .16s var(--ease-snap);
}
.stepper button:active{ transform:scale(.85); }
.stepper__n{ min-width:22px; text-align:center; font-size:.9rem; font-weight:700; font-variant-numeric:tabular-nums; }

.swap-enter-active, .swap-leave-active{ transition:opacity .15s var(--ease-snap), transform .18s var(--ease-snap); }
.swap-enter-from, .swap-leave-to{ opacity:0; transform:scale(.9); }
.tick-enter-active, .tick-leave-active{ transition:opacity .12s var(--ease-snap), transform .14s var(--ease-snap); }
.tick-enter-from{ opacity:0; transform:translateY(5px); }
.tick-leave-to{ opacity:0; transform:translateY(-5px); }

@media (hover:hover) and (pointer:fine){
  .card__open:hover .card__media img{ transform:scale(1.04); }
  .card__open:hover .card__media{ box-shadow:0 14px 30px -18px rgba(27,41,22,.45); }
  .add:hover{ background:var(--forest); color:#fff; }
}

@media (prefers-reduced-motion:reduce){
  .card__open, .card__media img, .add, .stepper button{ transition:none; }
  .card__open:active, .add:active{ transform:none; }
}
</style>

<style scoped>
/* Sizing for the slider, so the parent never has to style a child's root. */
.card--slide{ scroll-snap-align:start; flex:0 0 clamp(170px,19vw,240px); }
</style>
