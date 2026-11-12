import { ref, watch } from 'vue'
import { I18N } from '../data/messages'
import { CATEGORIES } from '../data/catalogue'

import { LANGS, splitLang, withLang } from '../data/locale'

export { LANGS }

/* The language a visitor chose last time, if any: the router sends them to
   that version when they arrive at an address without a language in it. */
export const storedLang = (() => { try { return localStorage.getItem('fth.lang') } catch (e) { return null } })()

/* Module-level state, so every component shares one language. The address
   decides it (/ru/…, /en/…, Azerbaijani otherwise); the router keeps the two
   in step (router.js). */
export const lang = ref(typeof location === 'undefined' ? 'az' : splitLang(location.pathname).lang)

/** A path inside the site, in the current language: lp('/kataloq') → '/ru/kataloq'. */
export const lp = path => withLang(path, lang.value)

watch(lang, v => {
  try { localStorage.setItem('fth.lang', v) } catch (e) {}
  document.documentElement.lang = v
  document.documentElement.setAttribute('data-lang', v)
}, { immediate: true })

/* Reads the field for the active language off any record that carries
   az / ru / en keys, falling back through Azerbaijani to English. */
const pick = (obj, prefix = '') => {
  if (!obj) return ''
  return obj[prefix + lang.value] || obj[prefix + 'az'] || obj[prefix + 'en'] || ''
}

export function useI18n () {
  return {
    lang,
    lp,
    t:       k => (I18N[lang.value] && I18N[lang.value][k]) || I18N.en[k] || k,
    nm:      p => pick(p),
    /* A second line under the name: the English name, except in English,
       where the Azerbaijani one is the more useful cross-reference. */
    alt:     p => (lang.value === 'en' ? p.az : p.en),
    dsc:     p => pick(p, 'd'),
    catName: id => pick(CATEGORIES.find(c => c.id === id) || CATEGORIES[0]),
    unitOf:  (p, v) => pick(v || p.unit)
  }
}
