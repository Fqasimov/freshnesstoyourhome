import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { getLang, type Lang } from './i18n'

/**
 * The API client.
 *
 * Two decisions here are load-bearing.
 *
 * The base URL comes from the build and has no fallback. A build that forgets
 * to set it fails loudly rather than quietly pointing at localhost and
 * appearing to work all the way through App Store review.
 *
 * The token lives in the platform keychain — iOS Keychain, Android Keystore —
 * via expo-secure-store, never in AsyncStorage. AsyncStorage is unencrypted
 * plain text on disk: readable on a rooted or jailbroken device, and included
 * in some device backups. A long-lived session token does not belong there.
 */
const BASE = process.env.EXPO_PUBLIC_API_URL

if (!BASE) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. The app has no default API address on ' +
    'purpose — a build pointing at the wrong server should not start. See eas.json.'
  )
}

const TOKEN_KEY = 'auth_token'

/**
 * Only a real device has a keychain.
 *
 * On web there is no secure storage, and falling back to localStorage would put
 * the token in exactly the place this module exists to avoid. So the fallback
 * is refused: on web the token is held in memory for the life of the page and
 * the session ends on reload. That is the right trade for a surface with
 * nowhere safe to keep it.
 */
const NATIVE = Platform.OS !== 'web'

let cachedToken: string | null = null

export async function getToken (): Promise<string | null> {
  if (cachedToken !== null) return cachedToken
  if (!NATIVE) return null

  try {
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    cachedToken = null
  }
  return cachedToken
}

export async function setToken (token: string | null): Promise<void> {
  cachedToken = token
  if (!NATIVE) return

  try {
    if (token === null) await SecureStore.deleteItemAsync(TOKEN_KEY)
    else await SecureStore.setItemAsync(TOKEN_KEY, token)
  } catch {
    // The keychain refusing a write is worth knowing about: the customer will
    // have to sign in again next launch.
    console.warn('[auth] could not write to secure storage')
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly payload: Record<string, any>

  constructor (message: string, status: number, payload?: Record<string, any> | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload ?? {}
  }

  /** Laravel reports validation failures as { message, errors }; flatten for display. */
  get fieldErrors (): Record<string, string> {
    const errs = this.payload.errors
    if (!errs) return {}
    return Object.fromEntries(
      Object.entries(errs).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)])
    )
  }

  /** No network at all, as opposed to a server that answered with a problem. */
  get isOffline (): boolean {
    return this.status === 0
  }
}

let onSessionExpired: () => void = () => {}
export function handleSessionExpiry (fn: () => void): void { onSessionExpired = fn }

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

export async function request<T> (path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = await getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${BASE}/api/${path.replace(/^\/+/, '')}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e
    // Distinguished from a server error so the UI can say "you appear to be
    // offline" rather than "something went wrong".
    throw new ApiError('offline', 0)
  }

  const text = await response.text()
  let payload: any = null
  if (text) {
    try { payload = JSON.parse(text) } catch { payload = null }
  }

  if (response.status === 401) {
    await setToken(null)
    onSessionExpired()
    throw new ApiError('Your session has ended. Please sign in again.', 401, payload)
  }

  if (!response.ok) {
    throw new ApiError(payload?.message ?? `Request failed (${response.status}).`, response.status, payload)
  }

  return payload as T
}

/* ── Shapes the API returns ───────────────────────────────────────────── */

export type LocaleMap = Partial<Record<Lang, string>>

export type Product = {
  id: string
  category_id: string
  price_minor: number
  currency: string
  unit_kind: string
  unit_qty: number
  is_weight_based: boolean
  is_popular: boolean
  image: string | null
  name: LocaleMap
  description: LocaleMap
  unit_label: LocaleMap
}

export type Category = { id: string; name: LocaleMap }

export type Zone = {
  id: string
  name: LocaleMap
  fee_minor: number
  min_order_minor: number
}

export type CatalogueResponse = {
  categories: Category[]
  products: Product[]
  zones: Zone[]
  currency: string
  delivery: {
    open: string
    close: string
    lead_days: number
    weight_tolerance_percent: number
    code_ttl_minutes: number
  }
}

export type User = {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  locale: Lang
  profile_complete: boolean
}

export type Address = {
  id: string
  label: string | null
  line: string
  notes: string | null
  delivery_zone_id: string | null
  is_default: boolean
}

export type QuoteLine = {
  product_id: string
  name: string
  qty: number
  unit_price_minor: number
  line_total_minor: number
  is_weight_based: boolean
}

export type Quote = {
  lines: QuoteLine[]
  unavailable_product_ids: string[]
  subtotal_minor: number
  delivery_fee_minor: number
  discount_minor: number
  total_minor: number
  requires_weighing: boolean
  weighed_ceiling_minor: number
  minimum_order_minor: number
  meets_minimum: boolean
  currency: string
}

export type OrderItem = {
  id: number
  product_id: string | null
  name: string
  unit_kind: string
  unit_price_minor: number
  qty: number
  is_weight_based: boolean
  confirmed_qty: number | null
  line_total_minor: number
  final_line_total_minor: number | null
}

export type Order = {
  id: string
  code: string
  status: 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
  currency: string
  subtotal_minor: number
  delivery_fee_minor: number
  discount_minor: number
  total_minor: number
  requires_weighing: boolean
  final_total_minor: number | null
  weighed_at: string | null
  payable_minor: number
  payable_display: string
  delivery_date: string | null
  delivery_slot: string | null
  payment_method: string
  address_line: string | null
  address_notes: string | null
  contact_name: string | null
  contact_phone: string | null
  note: string | null
  can_cancel: boolean
  placed_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  items?: OrderItem[]
}

export type BasketLine = { product_id: string; qty: number }

/* ── Endpoints ────────────────────────────────────────────────────────── */

export const api = {
  requestCode: (email: string, locale: Lang) =>
    request<{ status: string; message: string }>('auth/request-code', {
      method: 'POST', body: { email, locale }, auth: false,
    }),

  verifyCode: (email: string, code: string, device_name: string) =>
    request<{ token: string; expires_at: string; user: User }>('auth/verify-code', {
      method: 'POST', body: { email, code, device_name }, auth: false,
    }),

  catalogue: () => request<CatalogueResponse>('catalogue', { auth: false }),

  me: () => request<{ data: User }>('me'),
  updateMe: (data: Partial<Pick<User, 'name' | 'phone' | 'locale'>>) =>
    request<{ data: User }>('me', { method: 'PATCH', body: data }),
  deleteAccount: () => request<{ status: string }>('me', { method: 'DELETE' }),
  logout: () => request<{ status: string }>('auth/logout', { method: 'POST' }),

  addresses: () => request<{ data: Address[] }>('addresses'),
  createAddress: (data: Partial<Address>) =>
    request<Address>('addresses', { method: 'POST', body: data }),
  updateAddress: (id: string, data: Partial<Address>) =>
    request<Address>(`addresses/${id}`, { method: 'PUT', body: data }),
  deleteAddress: (id: string) =>
    request<{ status: string }>(`addresses/${id}`, { method: 'DELETE' }),

  /**
   * Pricing is public, and the language goes with the request — there may be
   * no account to read a preference from, and a customer who has just switched
   * language expects their basket to follow before that choice is saved.
   */
  quote: (lines: BasketLine[], zone_id: string | null) =>
    request<Quote>('orders/quote', {
      method: 'POST', body: { lines, zone_id, locale: getLang() }, auth: false,
    }),

  orders: () => request<{ data: Order[] }>('orders'),
  order: (id: string) => request<{ data: Order }>(`orders/${id}`),
  placeOrder: (payload: Record<string, unknown>) =>
    request<Order>('orders', { method: 'POST', body: payload }),
  cancelOrder: (id: string, reason?: string) =>
    request<Order>(`orders/${id}/cancel`, { method: 'POST', body: { reason } }),
}
