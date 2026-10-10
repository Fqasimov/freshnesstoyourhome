import { ref, computed, watch } from 'vue'
import { PRODUCTS, SETS, CONTACT, money, setPricing } from '../data/catalogue'
import { zoneById, feeText } from '../data/delivery'
import { useI18n } from './useI18n'

const read = () => {
  try { const v = JSON.parse(localStorage.getItem('fth.cart') || '[]'); return Array.isArray(v) ? v : [] }
  catch (e) { return [] }
}

const readDelivery = () => {
  try { return JSON.parse(localStorage.getItem('fth.delivery') || '{}') || {} }
  catch (e) { return {} }
}

/* Shared across the app: the basket itself, and whether the drawer is open. */
const items = ref(read())
const open  = ref(false)

/* Where it is going. Kept beside the basket and remembered the same way — a
   customer who orders every week should not retype their address every week. */
const saved = readDelivery()
const zoneId  = ref(saved.zoneId || '')
const address = ref(saved.address || '')
const mapLink = ref(saved.mapLink || '')
const name    = ref(saved.name || '')
const phone   = ref(saved.phone || '')

watch([zoneId, address, mapLink, name, phone], ([z, a, m, n, p]) => {
  try { localStorage.setItem('fth.delivery', JSON.stringify({ zoneId: z, address: a, mapLink: m, name: n, phone: p })) }
  catch (e) {}
})

/* The code of the order just placed, shown in the drawer once it is sent. */
const placedCode = ref('')
const sending = ref(false)

/* The server's pricing of the current basket. Null until it answers, and on a
   static build with no API it stays null for good. */
const quote = ref(null)
const quoting = ref(false)

const API = import.meta.env.VITE_API_URL

/* Guards against a slow quote for an old basket landing after a fast one for
   the current basket and overwriting it. */
let quoteId = 0

watch(items, v => {
  try { localStorage.setItem('fth.cart', JSON.stringify(v)) } catch (e) {}
}, { deep: true })

const keyOf = (id, v, kind) => kind + ':' + id + '::' + (v == null ? '-' : v)

/* What the order is made of, as the server understands it: products, and
   sets by name. A set's contents and its discount are the panel's, so the
   server prices it — the total here, in the message and in the panel is one
   figure. */
function orderBody () {
  return {
    lines: items.value.filter(it => it.kind !== 'set').map(it => ({ product_id: it.id, qty: it.qty })),
    bundles: items.value.filter(it => it.kind === 'set').map(it => ({ bundle_id: it.id, qty: it.qty })),
  }
}

/* Ask the server what the basket costs. */
async function refreshQuote () {
  if (!API) return

  const basket = orderBody()

  if (basket.lines.length === 0 && basket.bundles.length === 0) { quote.value = null; return }

  const id = ++quoteId
  quoting.value = true

  try {
    const response = await fetch(`${API}/api/orders/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        ...basket,
        /* The endpoint has always taken this; the site simply never sent it,
           so every basket was priced as though delivery were free. An id the
           table does not know resolves to no zone and no fee, which is why
           sending our own ids is safe while the Zonalar tab is still the two
           seeded placeholders. */
        zone_id: zoneId.value || null,
        locale: document.documentElement.lang || 'az',
      }),
    })
    if (!response.ok) return

    const data = await response.json()
    if (id === quoteId) quote.value = data
  } catch {
    // Offline. The browser's own figure stands, and the drawer says nothing
    // about a ceiling it cannot vouch for.
  } finally {
    if (id === quoteId) quoting.value = false
  }
}

/* Re-price whenever the basket changes. Deep, because quantities are mutated
   in place on the existing line objects. The zone is watched too: it moves the
   total as surely as adding a line does. */
watch(items, refreshQuote, { deep: true, immediate: true })
watch(zoneId, refreshQuote)

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

  /* What the browser thinks the basket comes to.
     Shown while the server's figure is in flight, and used as the fallback on
     a purely static build with no API configured. It is a display convenience,
     never the number the shop is asked to honour. */
  const localTotal = computed(() => lines.value.reduce((s, l) => s + l.price * l.qty, 0))

  /* What the server says it comes to.
     This is the figure that goes into the WhatsApp message, because the shop
     has to be able to stand behind the number a customer sends it. A total the
     browser worked out is a total that disagrees with the till the first time
     a price changes. */
  const total = computed(() => (quote.value ? quote.value.total_minor / 100 : localTotal.value))

  /* Most of this catalogue is sold by the kilo, and a kilo is never exactly a
     kilo. The server returns the ceiling it would quote an app customer; the
     drawer shows the same thing rather than implying a precision we do not
     have. */
  const weighed = computed(() => Boolean(quote.value?.requires_weighing))
  const ceiling = computed(() =>
    quote.value?.weighed_ceiling_minor ? quote.value.weighed_ceiling_minor / 100 : null)

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
     written out, which is how the shop actually takes orders.

     The total in that message is the server's, so the figure a customer sends
     and the figure the shop expects are the same one. Where the basket holds
     goods sold by weight the message says so, with the ceiling: a number
     presented as exact, that then is not, is an argument at the door. */
  const zone = computed(() => zoneById(zoneId.value))

  /* Delivery is quoted separately rather than folded into the total, because
     for six of the nineteen zones it is a range and no single number is
     truthful. The shop settles it in the same reply that confirms the
     weights, which is a conversation it was always going to have. */
  const deliveryText = computed(() => (zone.value ? `${feeText(zone.value)} AZN` : ''))

  /* Nowhere to send it is as incomplete a basket as nothing in it. */
  const canSend = computed(() => Boolean(
    zone.value && address.value.trim() && name.value.trim().length >= 2 &&
    /^\+?[0-9 ()-]{7,20}$/.test(phone.value.trim())))

  const messageFor = code => {
    let msg = t('ui.waIntro') + '\n\n'
    if (code) msg += `${t('ui.waCode')}: ${code}\n\n`
    lines.value.forEach(l => {
      msg += `• ${nm(l.product)} — ${l.unit} × ${l.qty} = ${money(l.price * l.qty)} AZN\n`
    })

    msg += `\n${t('ui.waTotal')}: ${money(total.value)} AZN`
    if (weighed.value && ceiling.value) {
      msg += ` (${t('ui.waWeighed')} ${money(ceiling.value)} AZN)`
    }

    if (zone.value) msg += `\n${t('ui.waDeliv')}: ${nm(zone.value)} — ${deliveryText.value}`
    if (address.value.trim()) msg += `\n${t('ui.waAddr')}: ${address.value.trim()}`
    if (mapLink.value.trim()) msg += `\n${t('ui.waMap')}: ${mapLink.value.trim()}`

    if (name.value.trim()) msg += `\n${t('deliv.name')}: ${name.value.trim()}`
    if (phone.value.trim()) msg += `\n${t('deliv.phone')}: ${phone.value.trim()}`

    msg += `\n\n${t('ui.waOutro')}`

    return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}`
  }

  const whatsapp = computed(() => messageFor(placedCode.value))

  /**
   * Place the order, then open WhatsApp.
   *
   * The order goes to the shop's system first, so it is on the panel beside
   * the app's orders with "website" on it; the WhatsApp message carries its
   * code, and is where the shop confirms the time and the weights. If the
   * system cannot be reached the message still goes — a customer is never
   * stopped from ordering by our server.
   *
   * The tab is opened before the request, while the click still counts as the
   * customer's own, or the browser would block it as a popup.
   */
  async function send () {
    if (!canSend.value || sending.value) return
    const tab = window.open('', '_blank')
    sending.value = true
    let code = ''

    if (API) {
      try {
        const res = await fetch(`${API}/api/orders/web`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            ...orderBody(),
            zone_id: zoneId.value,
            contact_name: name.value.trim(),
            contact_phone: phone.value.trim(),
            address_line: address.value.trim(),
            map_link: mapLink.value.trim() || null,
          }),
        })
        if (res.ok) code = (await res.json()).code ?? ''
      } catch (e) { /* offline: WhatsApp alone still works */ }
    }

    const url = messageFor(code)
    if (tab) tab.location.href = url
    else window.location.href = url

    placedCode.value = code
    if (code) items.value = []
    sending.value = false
  }

  /* How many of a plain product (no tin size chosen) are in the basket, and
     a step up or down — what a card's − n + stepper reads and writes. */
  const qtyOf = id => items.value.find(c => c.key === keyOf(id, null, 'product'))?.qty ?? 0
  const step = (id, delta) => setQty(keyOf(id, null, 'product'), delta)

  return {
    items, lines, count, total, localTotal, open,
    add, setQty, remove, whatsapp, qtyOf, step,
    quote, quoting, weighed, ceiling,
    zoneId, address, mapLink, zone, deliveryText, canSend,
    name, phone, send, sending, placedCode,
  }
}
