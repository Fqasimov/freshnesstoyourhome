import { ref, computed, watch } from 'vue'
import { PRODUCTS, SETS, CONTACT, money, setPricing } from '../data/catalogue'
import { useI18n } from './useI18n'

const read = () => {
  try { const v = JSON.parse(localStorage.getItem('fth.cart') || '[]'); return Array.isArray(v) ? v : [] }
  catch (e) { return [] }
}

/* Shared across the app: the basket itself, and whether the drawer is open. */
const items = ref(read())
const open  = ref(false)

watch(items, v => {
  try { localStorage.setItem('fth.cart', JSON.stringify(v)) } catch (e) {}
}, { deep: true })

const keyOf = (id, v, kind) => kind + ':' + id + '::' + (v == null ? '-' : v)

export function useCart () {
  const { t, nm, unitOf } = useI18n()

  /* Resolve a stored line into something the drawer can render. A set is
     one line at its bundle price, not its contents at full price. */
  function resolve (it) {
    if (it.kind === 'set') {
      const s = SETS.find(x => x.id === it.id)
      if (!s) return null
      const { items, price } = setPricing(s)
      return {
        key: it.key, qty: it.qty, isSet: true,
        product: { ...s, img: items[0] && items[0].img },
        price,
        unit: `${t('ui.set')} · ${items.length}`
      }
    }
    const p = PRODUCTS.find(x => x.id === it.id)
    if (!p) return null
    const v = (p.variants && it.v != null) ? p.variants[it.v] : null
    return {
      key: it.key, qty: it.qty, product: p,
      price: v ? v.price : p.price,
      unit:  unitOf(p, v)
    }
  }

  const lines = computed(() => items.value.map(resolve).filter(Boolean))
  const count = computed(() => items.value.reduce((s, c) => s + c.qty, 0))
  const total = computed(() => lines.value.reduce((s, l) => s + l.price * l.qty, 0))

  function add (id, v = null, qty = 1, kind = 'product') {
    const key = keyOf(id, v, kind)
    const hit = items.value.find(c => c.key === key)
    if (hit) hit.qty += qty
    else items.value.push({ key, id, v, qty, kind })
  }

  function setQty (key, delta) {
    const it = items.value.find(c => c.key === key)
    if (!it) return
    it.qty += delta
    if (it.qty <= 0) remove(key)
  }

  const remove = key => { items.value = items.value.filter(c => c.key !== key) }

  /* Nothing is charged online — the basket is handed to WhatsApp already
     written out, which is how the shop actually takes orders. */
  const whatsapp = computed(() => {
    let msg = t('ui.waIntro') + '\n\n'
    lines.value.forEach(l => {
      msg += `• ${nm(l.product)} — ${l.unit} × ${l.qty} = ${money(l.price * l.qty)} AZN\n`
    })
    msg += `\n${t('ui.waTotal')}: ${money(total.value)} AZN\n\n${t('ui.waOutro')}`
    return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}`
  })

  return { items, lines, count, total, open, add, setQty, remove, whatsapp }
}
