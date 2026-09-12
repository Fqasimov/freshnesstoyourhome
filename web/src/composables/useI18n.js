import { ref, watch } from 'vue'
import { I18N } from '../data/messages'
import { CATEGORIES } from '../data/catalogue'

export const LANGS = ['az', 'ru', 'en']

/* Module-level state, so every component shares one language. */
const stored = (() => { try { return localStorage.getItem('fth.lang') } catch (e) { return null } })()

/* Azerbaijani is the default for a first-time visitor; a saved choice wins. */
export const lang = ref(LANGS.includes(stored) ? stored : 'az')

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
