import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type PropsWithChildren,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, type BasketLine, type Quote } from './api'
import { useLang } from './i18n'
import { round3 } from './money'

/**
 * The basket.
 *
 * It holds product ids and quantities and nothing else. In particular it holds
 * no prices: every total shown to the customer comes from the server's own
 * quote endpoint, so the figure on the basket screen is the figure that will be
 * charged. A basket that adds up its own prices will eventually disagree with
 * the server, and the customer will be right to be annoyed about it.
 */
const CART_KEY = 'cart_v1'

type CartValue = {
  lines: BasketLine[]
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
}

const CartContext = createContext<CartValue | undefined>(undefined)

export function CartProvider ({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<BasketLine[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const lang = useLang()

  // Guards against an older quote landing after a newer one and overwriting it.
  const requestId = useRef(0)

  useEffect(() => {
    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_KEY)
        if (stored) setLines(JSON.parse(stored) as BasketLine[])
      } catch { /* first run */ }
      setHydrated(true)
    })()
  }, [])

  useEffect(() => {
    if (!hydrated) return
    AsyncStorage.setItem(CART_KEY, JSON.stringify(lines)).catch(() => {
      // Not fatal: the basket is a convenience, not a record.
    })
  }, [lines, hydrated])

  /**
   * Re-price whenever the basket, the zone or the language changes.
   *
   * The language matters because the server returns line names in it — the
   * basket must not keep showing English after a customer switches to
   * Azerbaijani.
   */
  useEffect(() => {
    if (!hydrated) return

    if (lines.length === 0) { setQuote(null); return }

    const id = ++requestId.current
    setQuoting(true)

    api.quote(lines, zoneId)
      .then(q => { if (id === requestId.current) setQuote(q) })
      .catch(() => { /* the screen surfaces the offline state */ })
      .finally(() => { if (id === requestId.current) setQuoting(false) })
  }, [lines, zoneId, lang, hydrated])

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
    setQuote(null)
  }, [])

  /**
   * Drop anything the shop no longer sells.
   *
   * Called when the server reports unavailable lines, so the basket matches
   * what the customer was just told rather than failing again on the next tap.
   */
  const dropUnavailable = useCallback(async (ids: string[]) => {
    setLines(prev => prev.filter(l => !ids.includes(l.product_id)))
  }, [])

  const value = useMemo<CartValue>(() => ({
    lines, quote, quoting,
    count: lines.length,
    isEmpty: lines.length === 0,
    qtyOf: (id) => lines.find(l => l.product_id === id)?.qty ?? 0,
    add, setQty, remove, clear,
    setZone: setZoneId,
    dropUnavailable,
  }), [lines, quote, quoting, add, setQty, remove, clear, dropUnavailable])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart (): CartValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
