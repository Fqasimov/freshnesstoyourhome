import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { Capacitor } from '@capacitor/core'

/**
 * The API client.
 *
 * Two things here are deliberate.
 *
 * The base URL comes from the build, with no fallback. A build that forgets to
 * set it fails loudly at startup rather than quietly pointing at localhost and
 * appearing to work in review.
 *
 * The token lives in the platform keychain — iOS Keychain, Android Keystore —
 * and never in localStorage. A WebView's local storage is readable by anything
 * that gets script into the page and survives in plain text on a rooted or
 * jailbroken device; the keychain is hardware-backed and wiped with the app.
 */
const BASE = import.meta.env.VITE_API_URL

if (!BASE) {
  throw new Error(
    'VITE_API_URL is not set. The app has no default API address on purpose — ' +
    'a build that points at the wrong server should not start.'
  )
}

const TOKEN_KEY = 'auth_token'

/**
 * Only a real device has a keychain.
 *
 * The secure-storage plugin quietly falls back to localStorage in a browser,
 * which would put the token in exactly the place this module exists to keep it
 * out of. So the fallback is refused: on the web the token is held in memory
 * for the life of the page and nowhere else. The session ends on reload, which
 * is the correct trade for a surface that has no safe place to keep it.
 */
const NATIVE = Capacitor.isNativePlatform()

let cachedToken = null

export async function getToken () {
  if (cachedToken !== null) return cachedToken
  if (!NATIVE) return null

  try {
    cachedToken = await SecureStorage.get(TOKEN_KEY)
  } catch {
    // No entry yet: not signed in.
    cachedToken = null
  }
  return cachedToken
}

export async function setToken (token) {
  cachedToken = token
  if (!NATIVE) return

  try {
    if (token === null) await SecureStorage.remove(TOKEN_KEY)
    else await SecureStorage.set(TOKEN_KEY, token)
  } catch (e) {
    // The keychain refusing a write is worth knowing about: the customer will
    // be asked to sign in again next launch.
    console.warn('[auth] could not write to secure storage')
  }
}

export class ApiError extends Error {
  constructor (message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload ?? {}
  }

  /** Field-level messages from Laravel's validator, flattened for display. */
  get fieldErrors () {
    const errs = this.payload.errors
    if (!errs) return {}
    return Object.fromEntries(
      Object.entries(errs).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)])
    )
  }
}

/** Raised when the session is gone, so the app can send the customer to sign in. */
export class SessionExpired extends ApiError {}

let onSessionExpired = () => {}
export function handleSessionExpiry (fn) { onSessionExpired = fn }

export async function request (path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = await getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${BASE}/api/${path.replace(/^\/+/, '')}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    // Distinguished from a server error so the UI can say "you appear to be
    // offline" rather than "something went wrong".
    throw new ApiError('offline', 0)
  }

  const text = await response.text()
  let payload = null
  if (text) {
    try { payload = JSON.parse(text) } catch { payload = null }
  }

  if (response.status === 401) {
    await setToken(null)
    onSessionExpired()
    throw new SessionExpired('Your session has ended. Please sign in again.', 401, payload)
  }

  if (!response.ok) {
    const message = payload?.message ?? `Request failed (${response.status}).`
    throw new ApiError(message, response.status, payload)
  }

  return payload
}

export const api = {
  requestCode: (email, locale) =>
    request('auth/request-code', { method: 'POST', body: { email, locale }, auth: false }),

  verifyCode: (email, code, device_name) =>
    request('auth/verify-code', { method: 'POST', body: { email, code, device_name }, auth: false }),

  catalogue: () => request('catalogue', { auth: false }),

  me: () => request('me'),
  updateMe: (data) => request('me', { method: 'PATCH', body: data }),
  deleteAccount: () => request('me', { method: 'DELETE' }),
  logout: () => request('auth/logout', { method: 'POST' }),

  addresses: () => request('addresses'),
  createAddress: (data) => request('addresses', { method: 'POST', body: data }),
  updateAddress: (id, data) => request(`addresses/${id}`, { method: 'PUT', body: data }),
  deleteAddress: (id) => request(`addresses/${id}`, { method: 'DELETE' }),

  // The locale goes with the request: the endpoint is public, so the server
  // may have no account to read a language preference from.
  quote: (lines, zone_id, locale) =>
    request('orders/quote', { method: 'POST', body: { lines, zone_id, locale }, auth: false }),
  orders: () => request('orders'),
  order: (id) => request(`orders/${id}`),
  placeOrder: (payload) => request('orders', { method: 'POST', body: payload }),
  cancelOrder: (id, reason) => request(`orders/${id}/cancel`, { method: 'POST', body: { reason } }),
}
