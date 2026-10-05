<script setup>
import BIcon from './BIcon.vue'
import { ref, computed, watch } from 'vue'
import { money, perKg } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'

const props = defineProps({ product: { type: Object, default: null } })
const emit = defineEmits(['close', 'add'])

const { t, nm, alt, dsc, catName, unitOf } = useI18n()
const variant = ref(null)
const qty = ref(1)

/* By the kilo the amount is typed, in kilos, as many as the customer wants. */
const weighed = computed(() => props.product?.unit?.kind === 'kg' && (props.product.unit.qty ?? 1) === 1
  && !props.product.variants)
const typed = ref('1')
watch(qty, v => { typed.value = String(v) })
function setTyped (raw) {
  const n = Number(String(raw).trim().replace(',', '.'))
  if (Number.isFinite(n) && n >= 0.1 && n <= 99) qty.value = Math.round(n * 100) / 100
  typed.value = String(qty.value)
}
function stepQty (dir) {
  const step = weighed.value ? 0.5 : 1
  const next = Math.round((qty.value + dir * step) * 100) / 100
  qty.value = Math.min(99, Math.max(weighed.value ? 0.1 : 1, next))
}

/* The main photograph and the extras, as one strip to look through. */
const shown = ref(null)
const pictures = computed(() => {
  const p = props.product
  if (!p) return []
  return [p.img, ...(p.gallery ?? []).map(g => g.url)].filter(Boolean)
})

/* Reset the picker each time a different product is opened. */
watch(() => props.product, p => {
  variant.value = p && p.variants ? 0 : null
  qty.value = 1
  typed.value = '1'
  shown.value = null
})

const chosen = computed(() =>
  props.product?.variants && variant.value != null
    ? props.product.variants[variant.value] : null)

const price = computed(() => chosen.value ? chosen.value.price : props.product?.price ?? 0)
const unit  = computed(() => props.product
  ? (chosen.value ? unitOf(props.product, chosen.value) : unitOf(props.product)) : '')
const kg = computed(() => {
  if (!props.product) return null
  return chosen.value ? price.value / (chosen.value.qty / 1000) : perKg(props.product)
})

const img = ref(null)
const confirm = () => emit('add', { product: props.product, v: variant.value, qty: qty.value, el: img.value })
</script>

<template>
  <Transition name="modal">
    <div v-if="product" class="modal" role="dialog" aria-modal="true" @click.self="emit('close')">
      <div class="modal__box">
        <div class="modal__img" ref="img">
          <img :src="shown ?? product.img" :alt="nm(product)">
          <button class="x modal__x" aria-label="Close" @click="emit('close')">
            <BIcon name="x-lg" :size="14" />
          </button>
        </div>

        <div v-if="pictures.length > 1" class="modal__thumbs">
          <button v-for="(src, i) in pictures" :key="src" type="button"
                  :class="{ on: (shown ?? product.img) === src }" :aria-label="`${nm(product)} ${i + 1}`"
                  @click="shown = src">
            <img :src="src" alt="" loading="lazy">
          </button>
        </div>

        <div class="modal__body">
          <span class="card__cat">{{ catName(product.cat) }}</span>
          <h3>{{ nm(product) }}</h3>
          <p class="modal__alt">{{ alt(product) }}</p>
          <p class="modal__desc">{{ dsc(product) }}</p>

          <div v-if="product.variants" class="variants">
            <button v-for="(v, i) in product.variants" :key="i"
                    :class="{ on: variant === i }" @click="variant = i">
              {{ unitOf(product, v) }} · {{ v.price }} AZN
            </button>
          </div>

          <dl class="modal__spec">
            <div><dt>{{ t('ui.category') }}</dt><dd>{{ catName(product.cat) }}</dd></div>
            <div><dt>{{ t('ui.unit') }}</dt><dd>{{ unit }}</dd></div>
            <div><dt>{{ t('ui.price') }}</dt><dd>{{ price }} AZN</dd></div>
            <div v-if="kg"><dt>{{ t('ui.perkgfull') }}</dt><dd>{{ money(kg) }} AZN</dd></div>
          </dl>

          <div class="modal__buy">
            <div class="qty" :class="{ 'qty--kg': weighed }">
              <button @click="stepQty(-1)" aria-label="−">−</button>
              <label v-if="weighed" class="qty__kg">
                <input type="text" inputmode="decimal" autocomplete="off" v-model="typed"
                       :aria-label="t('ui.kgAmount')" @change="setTyped(typed)"
                       @keydown.enter.prevent="$event.target.blur()">
                <i>{{ t('ui.kgShort') }}</i>
              </label>
              <span v-else>{{ qty }}</span>
              <button @click="stepQty(1)" aria-label="+">+</button>
            </div>
            <button class="btn" @click="confirm">
              <span>{{ t('ui.add') }} · {{ money(price * qty) }} AZN</span>
            </button>
          </div>
          <p v-if="weighed" class="modal__vary">{{ t('ui.weightVaries') }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ---------- 17. Quick view ----------------------------------------------- */
.modal{
  position:fixed; inset:0; z-index:600; display:grid; place-items:center; padding:var(--gutter);
}
.modal__box{
  position:relative; z-index:2; width:min(920px,100%); max-height:86vh; overflow:auto;
  background:var(--paper); border-radius:var(--radius);
  display:grid; grid-template-columns:.92fr 1.08fr;
  box-shadow:0 40px 90px rgba(0,0,0,.3);
}
.modal__img{ position:relative; background:var(--paper-2); aspect-ratio:1; }
.modal__img img{ width:100%; height:100%; object-fit:cover; }
.modal__body{ padding:clamp(24px,3vw,40px); display:flex; flex-direction:column; }
.modal__body .card__cat{ margin-bottom:8px; }
.modal__body h3{ font-family:var(--display); font-size:clamp(1.5rem,2.6vw,2.1rem); font-weight:500; margin:0; letter-spacing:-.022em; line-height:1.1; }
.modal__alt{ color:var(--ink-3); font-size:.94rem; margin:6px 0 0; }
.modal__desc{ margin:18px 0 0; color:var(--ink-2); font-size:.95rem; line-height:1.65; }
.modal__spec{ margin:22px 0 0; border-top:1px solid var(--line); }
.modal__spec div{ display:flex; justify-content:space-between; gap:16px; padding:11px 0; border-bottom:1px solid var(--line-soft); font-size:.86rem; }
.modal__spec dt{ color:var(--ink-3); margin:0; }
.modal__spec dd{ margin:0; font-weight:600; }
.variants{ display:flex; gap:8px; margin:20px 0 0; }
.variants button{
  border:1px solid var(--line); border-radius:100px; padding:9px 16px; font-size:.82rem;
  transition:border-color .35s var(--ease), background .35s var(--ease), color .35s var(--ease);
}
.variants button.on{ background:var(--forest); border-color:var(--forest); color:var(--paper); }
.modal__buy{ display:flex; gap:10px; align-items:center; margin-top:auto; padding-top:26px; }
.modal__vary{ margin:12px 0 0; font-size:.78rem; line-height:1.45; color:var(--ink-3); }
.modal__thumbs{ display:flex; gap:8px; padding:10px 20px 0; overflow-x:auto; }
.modal__thumbs button{ flex:0 0 auto; width:56px; height:56px; padding:0; border-radius:10px; overflow:hidden; border:2px solid transparent; opacity:.75; transition:opacity .2s var(--ease), border-color .2s var(--ease); }
.modal__thumbs button.on{ border-color:var(--forest); opacity:1; }
.modal__thumbs img{ width:100%; height:100%; object-fit:cover; display:block; }
.modal__buy .qty--kg .qty__kg{ display:flex; align-items:baseline; gap:2px; padding:0 2px; }
.modal__buy .qty--kg .qty__kg input{ width:3.8em; text-align:center; border:0; background:transparent; outline:0; padding:0; font:inherit; font-weight:600; font-variant-numeric:tabular-nums; color:var(--ink); }
.modal__buy .qty--kg .qty__kg i{ font-style:normal; font-size:.78rem; color:var(--ink-3); }
.modal__buy .qty{ height:48px; padding:0 4px; }
.modal__buy .qty button{ width:34px; height:34px; }
.modal__buy .btn{ flex:1; justify-content:center; white-space:nowrap; padding-inline:16px; font-size:.82rem; }
.modal__x{ position:absolute; top:14px; right:14px; z-index:3; background:rgba(246,243,234,.9); }

@media (max-width:860px){
  .modal__box{ grid-template-columns:1fr; }
  .modal__img{ aspect-ratio:16/10; }
}
</style>

<style scoped>
.modal-enter-active,.modal-leave-active{ transition:opacity .45s var(--ease); }
.modal-enter-active .modal__box{ transition:transform .6s var(--ease-out); }
.modal-leave-active .modal__box{ transition:transform .3s var(--ease); }
.modal-enter-from,.modal-leave-to{ opacity:0; }
.modal-enter-from .modal__box,.modal-leave-to .modal__box{ transform:translateY(24px) scale(.98); }
@media (prefers-reduced-motion: reduce){
  .modal-enter-active,.modal-leave-active,
  .modal-enter-active .modal__box,.modal-leave-active .modal__box{ transition:none; }
}
</style>
