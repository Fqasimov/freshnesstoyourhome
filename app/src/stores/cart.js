import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'
import { api } from '../api/client'
import { currentLang } from '../i18n'

/**
 * The basket.
 *
 * It holds product ids and quantities — nothing else. In particular it holds no
 * prices: the totals shown to the customer come from the server's own quote
 * endpoint, so the number on the basket screen is the number that will be
 * charged. A basket that adds up its own prices will eventually disagree with
 * the server, and the customer will be right to be annoyed about it.
 */
const CART_KEY = 'cart_v1'

export const useCart = defineStore('cart', {
  state: () => ({
    lines: [],        // [{ product_id, qty }]
    quote: null,      // the server's pricing of the current basket
    quoting: false,
    zoneId: null,
  }),

  getters: {
    count: (s) => s.lines.length,
    isEmpty: (s) => s.lines.length === 0,
    qtyOf: (s) => (id) => s.lines.find((l) => l.product_id === id)?.qty ?? 0,
  },

  actions: {
    async load () {
      try {
        const { value } = await Preferences.get({ key: CART_KEY })
        if (value) this.lines = JSON.parse(value)
      } catch { /* first run */ }
    },

    async persist () {
      try {
        await Preferences.set({ key: CART_KEY, value: JSON.stringify(this.lines) })
      } catch { /* not fatal — the basket is a convenience, not a record */ }
    },

    /** `step` is 1 for goods sold by the piece and 0.5 for goods sold by the kilo. */
    async add (productId, step = 1) {
      const line = this.lines.find((l) => l.product_id === productId)
      if (line) line.qty = round3(line.qty + step)
      else this.lines.push({ product_id: productId, qty: step })
      await this.persist()
    },

    async setQty (productId, qty) {
      qty = round3(qty)
      if (qty <= 0) return this.remove(productId)

      const line = this.lines.find((l) => l.product_id === productId)
      if (line) line.qty = qty
      else this.lines.push({ product_id: productId, qty })
      await this.persist()
    },

    async remove (productId) {
      this.lines = this.lines.filter((l) => l.product_id !== productId)
      await this.persist()
    },

    async clear () {
      this.lines = []
      this.quote = null
      await this.persist()
    },

    /** Ask the server what this basket costs. */
    async refreshQuote (zoneId = this.zoneId) {
      this.zoneId = zoneId ?? null

      if (this.isEmpty) { this.quote = null; return null }

      this.quoting = true
      try {
        this.quote = await api.quote(this.lines, this.zoneId, currentLang.value)
        return this.quote
      } finally {
        this.quoting = false
      }
    },

    /**
     * Drop anything the shop no longer sells.
     *
     * Called when the server reports unavailable lines, so the customer's
     * basket matches what they were just told rather than failing again.
     */
    async dropUnavailable (ids) {
      this.lines = this.lines.filter((l) => !ids.includes(l.product_id))
      await this.persist()
    },
  },
})

// Weights are carried to three decimals, matching the scales and the column.
const round3 = (n) => Math.round(n * 1000) / 1000
