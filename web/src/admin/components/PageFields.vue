<script setup>
/**
 * The text of a page on the website, per language: what Google shows for it
 * (title and description), its heading, and a text under the products.
 * Shared by categories and collections. Every field may stay empty — the
 * website then writes its own from the name and prices.
 *
 * v-model is { az: { seo_title, seo_description, h1, body }, en: …, ru: … }.
 */
import { words as templateWords } from '../../data/productSchema'

const model = defineModel({ type: Object, required: true })
defineProps({ name: { type: Object, default: () => ({}) } })

const LANGS = [
  { id: 'az', label: 'Azərbaycanca' },
  { id: 'ru', label: 'Rusca' },
  { id: 'en', label: 'İngiliscə' },
]
// The same limits the server checks (App\Support\PageContent).
const MAX = { seo_title: 70, seo_description: 170, h1: 120, intro: 2000, body: 12000, q: 200, a: 1000 }
// What Google shows in full; longer still saves, but is cut in the results.
const SHOWN = { seo_title: 60, seo_description: 160 }

const len = (l, f) => (model.value[l]?.[f] ?? '').length
const count = text => String(text ?? '').trim().split(/\s+/).filter(Boolean).length
const addQ = l => { if (model.value[l].faq.length < 10) model.value[l].faq.push({ q: '', a: '' }) }
const words = l => (model.value[l]?.body ?? '').replace(/^##\s/gm, '').trim().split(/\s+/).filter(Boolean).length
</script>

<template>
  <div class="a-langs">
    <div v-for="l in LANGS" :key="l.id" class="a-lang">
      <b>{{ l.label }}</b>
      <div class="a-field">
        <label :for="`pf-t-${l.id}`">
          Google başlığı (title)
          <span class="a-muted" :style="len(l.id, 'seo_title') > SHOWN.seo_title ? 'color:var(--warn)' : ''">
            {{ len(l.id, 'seo_title') }}/{{ SHOWN.seo_title }}
          </span>
        </label>
        <input :id="`pf-t-${l.id}`" v-model="model[l.id].seo_title" class="a-in" :maxlength="MAX.seo_title"
               :placeholder="name[l.id] ? templateWords(l.id).catTitle(name[l.id]) : ''">
      </div>
      <div class="a-field">
        <label :for="`pf-d-${l.id}`">
          Google təsviri (description)
          <span class="a-muted" :style="len(l.id, 'seo_description') > SHOWN.seo_description ? 'color:var(--warn)' : ''">
            {{ len(l.id, 'seo_description') }}/{{ SHOWN.seo_description }}
          </span>
        </label>
        <textarea :id="`pf-d-${l.id}`" v-model="model[l.id].seo_description" class="a-in" rows="2"
                  :maxlength="MAX.seo_description"></textarea>
      </div>
      <div class="a-field">
        <label :for="`pf-h-${l.id}`">Səhifə başlığı (H1)</label>
        <input :id="`pf-h-${l.id}`" v-model="model[l.id].h1" class="a-in" :maxlength="MAX.h1"
               :placeholder="name[l.id] ?? ''">
      </div>
      <div class="a-field">
        <label :for="`pf-i-${l.id}`">
          Giriş (məhsulların üstündə)
          <span class="a-muted">{{ count(model[l.id].intro) }} söz · 100–200</span>
        </label>
        <textarea :id="`pf-i-${l.id}`" v-model="model[l.id].intro" class="a-in" rows="4" :maxlength="MAX.intro"></textarea>
      </div>
      <div class="a-field">
        <label :for="`pf-b-${l.id}`">
          Mətn (məhsulların altında)
          <span class="a-muted">{{ words(l.id) }} söz</span>
        </label>
        <textarea :id="`pf-b-${l.id}`" v-model="model[l.id].body" class="a-in" rows="7" :maxlength="MAX.body"></textarea>
      </div>
      <div class="a-field">
        <label>Tez-tez verilən suallar <span class="a-muted">(3–5)</span></label>
        <div v-for="(x, i) in model[l.id].faq" :key="i" class="pf-faq">
          <input v-model="x.q" class="a-in" :maxlength="MAX.q" :aria-label="`Sual ${i + 1}`" placeholder="Sual">
          <textarea v-model="x.a" class="a-in" rows="2" :maxlength="MAX.a" :aria-label="`Cavab ${i + 1}`" placeholder="Cavab"></textarea>
          <button type="button" class="a-btn a-btn--sm a-btn--ghost" aria-label="Sualı sil" @click="model[l.id].faq.splice(i, 1)">×</button>
        </div>
        <button type="button" class="a-btn a-btn--sm a-btn--ghost" :disabled="model[l.id].faq.length >= 10" @click="addQ(l.id)">+ Sual əlavə et</button>
      </div>
    </div>
  </div>
  <p class="a-muted" style="font-size:.76rem; margin:8px 0 0">
    Boş sahə üçün sayt özü yazır (ad və qiymətlərdən). Mətndə boş sətir yeni abzasdır,
    “## ” ilə başlayan sətir isə alt başlıq. Məqsəd 300–500 sözdür.
    Saytda dərhal görünür; Google-un oxuduğu nüsxə hər gecə yenilənir.
    Sualı və ya cavabı boş olan sual saxlanılmır.
  </p>
</template>

<style scoped>
.pf-faq{ display:grid; grid-template-columns:1fr auto; gap:6px; margin-bottom:10px; }
.pf-faq textarea{ grid-column:1; }
.pf-faq button{ grid-column:2; grid-row:1; }
</style>
