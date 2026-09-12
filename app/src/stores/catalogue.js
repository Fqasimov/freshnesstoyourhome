import { defineStore } from 'pinia'
import { api } from '../api/client'
import { Preferences } from '@capacitor/preferences'

/**
 * The catalogue, fetched from the server and cached on the device.
 *
 * Prices live on the server so a change does not need an App Store review.
 * The cache is what makes the app usable on a bad connection or in a lift: the
 * last known catalogue renders immediately, and a fresh copy replaces it when
 * the network answers. It is never used to price an order — the server does
 * that at checkout, so a stale cache costs a corrected total, not a wrong bill.
 */
const CACHE_KEY = 'catalogue_cache_v1'

// The 54 product photos ship inside the app rather than being downloaded, so a
// customer on a slow connection still sees the shop. Keyed by product id, so a
// photo cannot drift from the row it belongs to.
const PHOTOS = import.meta.glob('../assets/products/*.jpg', { eager: true, import: 'default' })

export const useCatalogue = defineStore('catalogue', {
  state: () => ({
    categories: [],
    products: [],
    zones: [],
    delivery: null,
    currency: 'AZN',
    loaded: false,
    stale: false,     // showing a cached copy while the network is unreachable
  }),

  getters: {
    byId: (s) => (id) => s.products.find((p) => p.id === id),
    popular: (s) => s.products.filter((p) => p.is_popular),
    inCategory: (s) => (cat) =>
      cat === 'all' ? s.products : s.products.filter((p) => p.category_id === cat),
  },

  actions: {
    async load () {
      // Paint from cache first so the shop is never a spinner.
      if (!this.loaded) await this.loadCached()

      try {
        const data = await api.catalogue()
        this.apply(data)
        this.stale = false
        await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(data) })
      } catch (e) {
        // Offline with a cache is a usable app; offline without one is not.
        this.stale = true
        if (!this.loaded) throw e
      }
    },

    async loadCached () {
      try {
        const { value } = await Preferences.get({ key: CACHE_KEY })
        if (value) { this.apply(JSON.parse(value)); this.stale = true }
      } catch { /* no cache yet */ }
    },

    apply (data) {
      this.categories = data.categories ?? []
      this.products = (data.products ?? []).map((p) => ({
        ...p,
        photo: PHOTOS[`../assets/products/${p.image ?? p.id + '.jpg'}`] ?? null,
      }))
      this.zones = data.zones ?? []
      this.delivery = data.delivery ?? null
      this.currency = data.currency ?? 'AZN'
      this.loaded = true
    },
  },
})
