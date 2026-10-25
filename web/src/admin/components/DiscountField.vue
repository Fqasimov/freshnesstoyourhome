<script setup>
import { computed, ref, watch } from 'vue'
import { basisPoints, percentOff, parseNum } from '../../data/discount'

/**
 * One discount, typed either way.
 *
 * Two boxes that follow each other: a percentage (decimals allowed, 16.4) and
 * an amount off in manats. Whichever one the shopkeeper types into is the one
 * that counts; the other shows what it comes to. Separately, which of the two
 * the website puts on the badge.
 *
 * `base` is the price the discount comes off, in qəpik — a product's normal
 * price, or what a set's products cost together.
 */
const props = defineProps({
  modelValue: { type: Object, required: true }, // { kind, percent, minor, show }
  base: { type: Number, default: 0 },
  maxPercent: { type: Number, default: 90 },
  allowNone: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'valid'])

const fmt = minor => (minor / 100).toFixed(2)
const trim = n => String(Math.round(n * 100) / 100)

const kind = ref(props.modelValue.kind ?? null)
const show = ref(props.modelValue.show ?? 'percent')
const pctText = ref(kind.value ? trim(Number(props.modelValue.percent || 0)) : '')
const amtText = ref(kind.value === 'amount' ? fmt(props.modelValue.minor || 0) : '')

/* The box not being typed in follows the one that is. */
function fromPercent () {
  const p = parseNum(pctText.value)
  if (pctText.value === '') { kind.value = null; amtText.value = ''; return }
  kind.value = 'percent'
  if (Number.isFinite(p) && props.base > 0) amtText.value = fmt(props.base - percentOff(props.base, basisPoints(p)))
}
function fromAmount () {
  const a = parseNum(amtText.value)
  if (amtText.value === '') { kind.value = null; pctText.value = ''; return }
  kind.value = 'amount'
  if (Number.isFinite(a) && props.base > 0) pctText.value = trim(Math.round(a * 100) / props.base * 100)
}
function clear () { kind.value = null; pctText.value = ''; amtText.value = '' }

/* A set's total changes as its products do; keep the follower box honest. */
watch(() => props.base, () => { if (kind.value === 'percent') fromPercent(); else if (kind.value === 'amount') fromAmount() })
if (kind.value === 'percent') fromPercent()
else if (kind.value === 'amount') fromAmount()

const PCT = /^\d{1,2}([.,]\d{1,2})?$/
const AMT = /^\d{1,6}([.,]\d{1,2})?$/
const percent = computed(() => parseNum(pctText.value))
const minor = computed(() => Math.round(parseNum(amtText.value) * 100))

const error = computed(() => {
  if (!kind.value) return props.allowNone ? '' : 'Endirim yazın.'
  if (kind.value === 'percent') {
    if (!PCT.test(pctText.value.trim())) return 'Faiz: məs. 10, 16.4 və ya 5,6 — ən çox iki onluq.'
    if (!(percent.value > 0 && percent.value <= props.maxPercent)) return `Faiz 0-dan böyük, ${props.maxPercent}%-dən çox olmamalıdır.`
  } else {
    if (!AMT.test(amtText.value.trim())) return 'Məbləğ: məs. 2 və ya 2.50 ₼.'
    if (!(minor.value > 0)) return 'Məbləğ 0-dan böyük olmalıdır.'
    if (props.base > 0 && minor.value * 100 > props.base * props.maxPercent) return `Məbləğ qiymətin ${props.maxPercent}%-indən çox ola bilməz.`
  }
  return ''
})

/* What the price becomes, for the line under the boxes. */
const after = computed(() => {
  if (!kind.value || error.value || props.base <= 0) return null
  return kind.value === 'percent'
    ? percentOff(props.base, basisPoints(percent.value))
    : props.base - minor.value
})

watch([kind, pctText, amtText, show, error], () => {
  emit('valid', !error.value)
  if (error.value) return
  emit('update:modelValue', {
    kind: kind.value,
    percent: kind.value === 'percent' ? percent.value : 0,
    minor: kind.value === 'amount' ? minor.value : 0,
    show: show.value,
  })
}, { immediate: true })
</script>

<template>
  <div class="dsc">
    <div class="a-row">
      <label class="dsc__box" :class="{ 'is-on': kind === 'percent' }">
        <input v-model="pctText" class="a-in a-in--num" inputmode="decimal" placeholder="0" aria-label="Endirim faizi"
               :class="{ 'a-in--dirty': kind === 'percent' && error }" @input="fromPercent">
        <span>%</span>
      </label>
      <span class="a-muted">və ya</span>
      <label class="dsc__box" :class="{ 'is-on': kind === 'amount' }">
        <span>−</span>
        <input v-model="amtText" class="a-in a-in--num" inputmode="decimal" placeholder="0.00" aria-label="Endirim məbləği"
               :class="{ 'a-in--dirty': kind === 'amount' && error }" @input="fromAmount">
        <span>₼</span>
      </label>
      <button v-if="kind" type="button" class="a-btn a-btn--sm a-btn--ghost" @click="clear">Endirimi sil</button>
    </div>

    <div v-if="kind" class="a-row dsc__show">
      <span class="a-muted">Saytda göstər:</span>
      <label><input v-model="show" type="radio" value="percent"> faiz</label>
      <label><input v-model="show" type="radio" value="amount"> məbləğ</label>
    </div>

    <p v-if="error" class="a-note a-note--err" style="margin:8px 0 0">{{ error }}</p>
    <p v-else-if="after != null" class="a-muted dsc__after">
      Yeni qiymət <b>{{ fmt(after) }} ₼</b> <s>{{ fmt(base) }} ₼</s>
      · hesablanan: {{ kind === 'percent' ? 'faizlə' : 'məbləğlə' }}
    </p>
    <p v-else-if="!kind" class="a-muted dsc__after">Endirim yoxdur.</p>
  </div>
</template>

<style scoped>
.dsc__box{ display:inline-flex; align-items:center; gap:6px; }
.dsc__box .a-in{ width:96px; }
.dsc__box.is-on .a-in{ outline:2px solid var(--accent, #2f6b3a); outline-offset:1px; }
.dsc__show{ margin-top:10px; gap:14px; font-size:.86rem; }
.dsc__show label{ display:inline-flex; align-items:center; gap:5px; cursor:pointer; }
.dsc__after{ font-size:.8rem; margin:8px 0 0; }
.dsc__after s{ margin-left:4px; }
</style>
