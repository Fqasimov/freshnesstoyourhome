import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type PropsWithChildren,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, type BasketLine, type BasketSet, type Quote } from './api'
import { useLang } from './i18n'
import { useAuth } from './auth'
import { useCatalogue } from './catalogue'
import { round3 } from './money'

/**
 * The basket.
 *
 * It holds product ids and quantities and nothing else. In particular it holds
 * no prices: every total shown to the customer comes from the server's own
 * quote endpoint, so the figure on the basket screen is the figure that will be
 * charged. A basket that adds up its own prices will eventually disagree with
 * the server, and the customer will be right to be annoyed about it.
 *
 * Sets are held by name, not as their contents: what is in a set and what it
 * takes off are the panel's, and the server prices them.
 */
const CART_KEY = 'cart_v1'
const SETS_KEY = 'cart_sets_v2'

type CartValue = {
  lines: BasketLine[]
  sets: BasketSet[]
  quote: Quote | null
  quoting: boolean
  count: number
  isEmpty: boolean
  qtyOf: (productId: string) => number
  add: (productId: string, step?: number) => Promise<void>
  setQty: (productId: string, qty: number) => Promise<void>
  remove: (productId: string) => Promise<void>
  clear: () => Promise<void>
  setZone: (zoneId: string | null) => void
  dropUnavailable: (ids: string[]) => Promise<void>
  setsOf: (bundleId: string) => number
  setSetQty: (bundleId: string, qty: number) => void
}

const CartContext = createContext<CartValue | undefined>(undefined)

export function CartProvider ({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<BasketLine[]>([])
  const [sets, setSets] = useState<BasketSet[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const lang = useLang()

  // What is in each set, so a set whose product sold out leaves the basket
  // with it. Read through a ref: the catalogue refreshes every minute.
  const catalogue = useCatalogue()
  const bundleItems = useRef<Record<string, string[]>>({})
  bundleItems.current = Object.fromEntries(catalogue.bundles.map(b => [b.id, b.items.map(i => i.product_id)]))

  // Guards against an older quote landing after a newer one and overwriting it.
  const requestId = useRef(0)

  useEffect(() => {
    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_KEY)
        if (stored) setLines(JSON.parse(stored) as BasketLine[])
        const storedSets = await AsyncStorage.getItem(SETS_KEY)
        if (storedSets) setSets(JSON.parse(storedSets) as BasketSet[])
      } catch { /* first run */ }
      setHydrated(true)
    })()
  }, [])

  /* One person's basket is not the next person's. When the signed-in account
     changes — signing out, or someone else signing in on a shared phone — the
     basket and its saved copy are emptied. The first value is only noted:
     opening the app signed in must not lose the basket. */
  const { user } = useAuth()
  const owner = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const id = user?.id ?? null
    if (owner.current !== undefined && owner.current !== null && owner.current !== id) {
      setLines([])
      setSets([])
      setQuote(null)
      AsyncStorage.removeItem(CART_KEY).catch(() => {})
      AsyncStorage.removeItem(SETS_KEY).catch(() => {})
    }
    if (id !== null || owner.current !== undefined) owner.current = id
  }, [user?.id])

  useEffect(() => {
    if (!hydrated) return
    AsyncStorage.setItem(CART_KEY, JSON.stringify(lines)).catch(() => {
      // Not fatal: the basket is a convenience, not a record.
    })
  }, [lines, hydrated])

  useEffect(() => {
    if (!hydrated) return
    AsyncStorage.setItem(SETS_KEY, JSON.stringify(sets)).catch(() => {})
  }, [sets, hydrated])

  /**
   * Re-price whenever the basket, the zone or the language changes.
   *
   * The language matters because the server returns line names in it — the
   * basket must not keep showing English after a customer switches to
   * Azerbaijani.
   */
  useEffect(() => {
    if (!hydrated) return

    if (lines.length === 0 && sets.length === 0) { setQuote(null); return }

    const id = ++requestId.current
    setQuoting(true)

    api.quote(lines, sets, zoneId)
      .then(q => { if (id === requestId.current) setQuote(q) })
      .catch(() => { /* the screen surfaces the offline state */ })
      .finally(() => { if (id === requestId.current) setQuoting(false) })
  }, [lines, sets, zoneId, lang, hydrated])

  const add = useCallback(async (productId: string, step = 1) => {
    setLines(prev => {
      const existing = prev.find(l => l.product_id === productId)
      if (!existing) return [...prev, { product_id: productId, qty: step }]
      return prev.map(l =>
        l.product_id === productId ? { ...l, qty: round3(l.qty + step) } : l
      )
    })
  }, [])

  const remove = useCallback(async (productId: string) => {
    setLines(prev => prev.filter(l => l.product_id !== productId))
  }, [])

  const setQty = useCallback(async (productId: string, qty: number) => {
    const next = round3(qty)
    if (next <= 0) { await remove(productId); return }

    setLines(prev => {
      const existing = prev.find(l => l.product_id === productId)
      if (!existing) return [...prev, { product_id: productId, qty: next }]
      return prev.map(l => (l.product_id === productId ? { ...l, qty: next } : l))
    })
  }, [remove])

  const clear = useCallback(async () => {
    setLines([])
    setSets([])
    setQuote(null)
  }, [])

  const setSetQty = useCallback((bundleId: string, qty: number) => {
    const next = Math.max(0, Math.round(qty))
    setSets(prev => {
      if (next === 0) return prev.filter(x => x.id !== bundleId)
      if (!prev.some(x => x.id === bundleId)) return [...prev, { id: bundleId, qty: next }]
      return prev.map(x => (x.id === bundleId ? { ...x, qty: next } : x))
    })
  }, [])

  /**
   * Drop anything the shop no longer sells.
   *
   * Called when the server reports unavailable lines, so the basket matches
   * what the customer was just told rather than failing again on the next tap.
   */
  const dropUnavailable = useCallback(async (ids: string[]) => {
    // The server names a switched-off set as `bundle:<id>`, and a set whose
    // product sold out by that product's id — either way the set goes.
    const goneSets = new Set(ids.filter(i => i.startsWith('bundle:')).map(i => i.slice(7)))
    setLines(prev => prev.filter(l => !ids.includes(l.product_id)))
    setSets(prev => prev.filter(x => !goneSets.has(x.id) &&
      !(bundleItems.current[x.id] ?? []).some(p => ids.includes(p))))
  }, [])

  const value = useMemo<CartValue>(() => ({
    lines, sets, quote, quoting,
    count: lines.length + sets.length,
    isEmpty: lines.length === 0 && sets.length === 0,
    qtyOf: (id) => lines.find(l => l.product_id === id)?.qty ?? 0,
    add, setQty, remove, clear,
    setZone: setZoneId,
    dropUnavailable,
    setsOf: (id) => sets.find(x => x.id === id)?.qty ?? 0,
    setSetQty,
  }), [lines, sets, quote, quoting, add, setQty, remove, clear, dropUnavailable, setSetQty])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart (): CartValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
