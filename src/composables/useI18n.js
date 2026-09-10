import { ref, watch } from 'vue'
import { I18N } from '../data/messages'
import { CATEGORIES } from '../data/catalogue'

/* Module-level state, so every component shares one language. */
const stored = (() => { try { return localStorage.getItem('fth.lang') } catch (e) { return null } })()

/* Azerbaijani is the default for a first-time visitor; a saved choice wins. */
export const lang = ref(stored === 'en' || stored === 'az' ? stored : 'az')

watch(lang, v => {
  try { localStorage.setItem('fth.lang', v) } catch (e) {}
  document.documentElement.lang = v
  document.documentElement.setAttribute('data-lang', v)
}, { immediate: true })

export function useI18n () {
  const az = () => lang.value === 'az'
  return {
    lang,
    t:       k => (I18N[lang.value] && I18N[lang.value][k]) || I18N.en[k] || k,
    nm:      p => az() ? p.az : p.en,
    alt:     p => az() ? p.en : p.az,
    dsc:     p => az() ? p.daz : p.den,
    catName: id => {
      const c = CATEGORIES.find(x => x.id === id) || CATEGORIES[0]
      return az() ? c.az : c.en
    },
    unitOf:  (p, v) => { const u = v || p.unit; return az() ? u.az : u.en }
  }
}
