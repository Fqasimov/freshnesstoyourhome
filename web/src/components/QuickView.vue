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

/* Reset the picker each time a different product is opened. */
watch(() => props.product, p => {
  variant.value = p && p.variants ? 0 : null
  qty.value = 1
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
          <img :src="product.img" :alt="nm(product)">
          <button class="x modal__x" aria-label="Close" @click="emit('close')">
            <BIcon name="x-lg" :size="14" />
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
            <div class="qty">
              <button @click="qty = Math.max(1, qty - 1)" aria-label="−">−</button>
              <span>{{ qty }}</span>
              <button @click="qty++" aria-label="+">+</button>
            </div>
            <button class="btn" @click="confirm">
              <span>{{ t('ui.add') }} · {{ money(price * qty) }} AZN</span>
            </button>
          </div>
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
