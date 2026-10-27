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
const MAX = { seo_title: 70, seo_description: 170, h1: 120, body: 12000 }
// What Google shows in full; longer still saves, but is cut in the results.
const SHOWN = { seo_title: 60, seo_description: 160 }

const len = (l, f) => (model.value[l]?.[f] ?? '').length
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
        <label :for="`pf-b-${l.id}`">
          Mətn (məhsulların altında)
          <span class="a-muted">{{ words(l.id) }} söz</span>
        </label>
        <textarea :id="`pf-b-${l.id}`" v-model="model[l.id].body" class="a-in" rows="7" :maxlength="MAX.body"></textarea>
      </div>
    </div>
  </div>
  <p class="a-muted" style="font-size:.76rem; margin:8px 0 0">
    Boş sahə üçün sayt özü yazır (ad və qiymətlərdən). Mətndə boş sətir yeni abzasdır,
    “## ” ilə başlayan sətir isə alt başlıq. Məqsəd 300–500 sözdür.
    Saytda dərhal görünür; Google-un oxuduğu nüsxə hər gecə yenilənir.
  </p>
</template>
