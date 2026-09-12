import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type PropsWithChildren,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, type CatalogueResponse, type Category, type Product, type Zone } from './api'

/**
 * The catalogue, fetched from the server and cached on the device.
 *
 * Prices live on the server so a change does not need an App Store review. The
 * cache is what makes the app usable on a bad connection or in a lift: the last
 * known catalogue renders immediately and a fresh copy replaces it when the
 * network answers.
 *
 * It is never used to price an order — the server does that at checkout — so a
 * stale cache costs a corrected total, not a wrong bill. AsyncStorage is the
 * right home for it precisely because none of it is secret.
 */
const CACHE_KEY = 'catalogue_cache_v1'

type CatalogueValue = {
  categories: Category[]
  products: Product[]
  zones: Zone[]
  delivery: CatalogueResponse['delivery'] | null
  currency: string
  loaded: boolean
  /** Showing a cached copy because the network could not be reached. */
  stale: boolean
  refresh: () => Promise<void>
  byId: (id: string) => Product | undefined
  popular: Product[]
  inCategory: (categoryId: string) => Product[]
}

const CatalogueContext = createContext<CatalogueValue | undefined>(undefined)

export function CatalogueProvider ({ children }: PropsWithChildren) {
  const [data, setData] = useState<CatalogueResponse | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [stale, setStale] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const fresh = await api.catalogue()
      setData(fresh)
      setLoaded(true)
      setStale(false)
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh))
    } catch (e) {
      // Offline with a cache is a usable app; offline without one is not.
      setStale(true)
      throw e
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      // Paint from cache first, so the shop is never just a spinner.
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY)
        if (cached && !cancelled) {
          setData(JSON.parse(cached) as CatalogueResponse)
          setLoaded(true)
          setStale(true)
        }
      } catch { /* no cache yet */ }

      if (!cancelled) {
        try { await refresh() } catch { /* the stale flag reports it */ }
      }
    })()

    return () => { cancelled = true }
  }, [refresh])

  const value = useMemo<CatalogueValue>(() => {
    const products = data?.products ?? []

    return {
      categories: data?.categories ?? [],
      products,
      zones: data?.zones ?? [],
      delivery: data?.delivery ?? null,
      currency: data?.currency ?? 'AZN',
      loaded,
      stale,
      refresh,
      byId: (id) => products.find(p => p.id === id),
      popular: products.filter(p => p.is_popular),
      inCategory: (categoryId) =>
        categoryId === 'all' ? products : products.filter(p => p.category_id === categoryId),
    }
  }, [data, loaded, stale, refresh])

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>
}

export function useCatalogue (): CatalogueValue {
  const ctx = useContext(CatalogueContext)
  if (!ctx) throw new Error('useCatalogue must be used inside <CatalogueProvider>')
  return ctx
}
