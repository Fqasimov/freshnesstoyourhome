<script setup>
import { computed, ref } from 'vue'
import { words } from '../data/productSchema'
import { useI18n } from '../composables/useI18n'
import { track } from '../analytics'

/**
 * A product's approved reviews, and a form to write one. What is sent is held
 * for approval in the panel, so the form only says thank you — it never
 * shows the new review straight away.
 */
const props = defineProps({ product: { type: Object, required: true } })
const { lang } = useI18n()
const w = computed(() => words(lang.value))
const API = import.meta.env.VITE_API_URL

const r = computed(() => props.product.reviews)
const stars = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))

const open = ref(false)
const form = ref({ name: '', rating: 5, text: '', website: '' })
const state = ref('idle') // idle | sending | sent | failed
const ok = computed(() => form.value.name.trim().length >= 2 && form.value.rating >= 1)

async function send () {
  if (!ok.value || state.value === 'sending' || !API) return
  state.value = 'sending'
  try {
    const res = await fetch(`${API}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        product_id: props.product.id, name: form.value.name.trim(), rating: form.value.rating,
        text: form.value.text.trim() || null, locale: lang.value,
        ...(form.value.website ? { website: form.value.website } : {}),
      }),
    })
    state.value = res.ok ? 'sent' : 'failed'
    if (res.ok) track('review_sent', { item_id: props.product.id, rating: form.value.rating })
  } catch {
    state.value = 'failed'
  }
}
</script>

<template>
  <section class="rv" :aria-label="w.reviews">
    <h2>
      {{ w.reviews }}
      <span v-if="r?.count" class="rv__avg"><b aria-hidden="true">{{ stars(r.rating) }}</b> {{ r.rating }} · {{ r.count }}</span>
    </h2>

    <ul v-if="r?.latest?.length" class="rv__list">
      <li v-for="(x, i) in r.latest" :key="i">
        <span class="rv__stars" :aria-label="`${x.rating}/5`">{{ stars(x.rating) }}</span>
        <b>{{ x.name }}</b> <time v-if="x.date">{{ x.date }}</time>
        <p v-if="x.text">{{ x.text }}</p>
      </li>
    </ul>
    <p v-else class="rv__none">{{ w.noReviews }}</p>

    <p v-if="state === 'sent'" class="rv__done">{{ w.thanks }}</p>
    <template v-else-if="API">
      <button v-if="!open" type="button" class="btn btn--ghost rv__open" @click="open = true"><span>{{ w.writeReview }}</span></button>
      <form v-else class="rv__form" @submit.prevent="send">
        <fieldset class="rv__rate">
          <legend>{{ w.rating }}</legend>
          <label v-for="n in 5" :key="n" :class="{ on: n <= form.rating }">
            <input v-model.number="form.rating" type="radio" name="rating" :value="n" class="visually-hidden">
            <span aria-hidden="true">★</span><span class="visually-hidden">{{ n }}</span>
          </label>
        </fieldset>
        <input v-model="form.name" class="rv__in" maxlength="60" :placeholder="w.yourName" :aria-label="w.yourName" required>
        <textarea v-model="form.text" class="rv__in" rows="3" maxlength="1000" :placeholder="w.yourReview" :aria-label="w.yourReview"></textarea>
        <!-- Not for people: a bot fills it in and is turned away. -->
        <input v-model="form.website" class="rv__trap" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button type="submit" class="btn" :disabled="!ok || state === 'sending'"><span>{{ state === 'sending' ? '…' : w.send }}</span></button>
        <p v-if="state === 'failed'" class="rv__err">{{ w.failed }}</p>
      </form>
    </template>
  </section>
</template>

<style scoped>
.rv{ max-width:760px; margin-top:clamp(36px,5vw,56px); }
.rv h2{ display:flex; flex-wrap:wrap; align-items:baseline; gap:10px; font-family:var(--display); font-weight:600; font-size:clamp(1.4rem,2.4vw,1.9rem); margin:0 0 14px; }
.rv__avg{ font-family:inherit; font-size:1rem; color:var(--ink-3); font-weight:400; }
.rv__avg b, .rv__stars{ color:var(--brick); letter-spacing:1px; }
.rv__list{ list-style:none; padding:0; margin:0 0 18px; }
.rv__list li{ padding:12px 0; border-bottom:1px solid var(--line); }
.rv__list time{ color:var(--ink-3); font-size:.85rem; margin-left:6px; }
.rv__list p{ margin:6px 0 0; color:var(--ink-2); line-height:1.6; }
.rv__none{ color:var(--ink-3); }
.rv__form{ display:grid; gap:10px; max-width:480px; }
.rv__rate{ border:0; padding:0; margin:0; display:flex; gap:4px; }
.rv__rate legend{ font-size:.85rem; color:var(--ink-3); margin-bottom:4px; }
.rv__rate label{ cursor:pointer; font-size:1.6rem; color:var(--line); }
.rv__rate label.on{ color:var(--brick); }
.rv__in{ font:inherit; padding:10px 12px; border:1px solid var(--line); border-radius:12px; background:var(--white); }
.rv__trap{ position:absolute; left:-9999px; width:1px; height:1px; opacity:0; }
.rv__done{ color:var(--forest); font-weight:600; }
.rv__err{ color:var(--brick); margin:0; }
</style>
