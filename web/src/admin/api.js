import { ref } from 'vue'

/**
 * The panel's side of the admin API.
 *
 * The token lives in sessionStorage rather than localStorage: it dies with the
 * tab, so a shared machine in the shop does not keep an admin signed in until
 * somebody notices. It is deliberately not in a cookie either — the API is
 * token-authenticated and adding a session cookie would mean adding CSRF
 * protection to defend a door that is not otherwise open.
 *
 * Everything the panel knows about its own authority comes from the server on
 * every request. There is no "is admin" flag in here to tamper with; a
 * non-admin simply gets 404s, which is what the role middleware returns.
 */
const KEY = 'fth.admin.token'
const API = import.meta.env.VITE_API_URL ?? ''

export const token = ref(read())
export const me = ref(null)

function read () {
  try { return sessionStorage.getItem(KEY) } catch { return null }
}

export function setToken (value) {
  token.value = value
  try {
    value ? sessionStorage.setItem(KEY, value) : sessionStorage.removeItem(KEY)
  } catch {
    // Private mode, or storage disabled. The panel still works for this tab;
    // it just will not survive a reload.
  }
}

export class ApiError extends Error {
  constructor (status, body) {
    super(body?.message || `Request failed (${status})`)
    this.status = status
    this.body = body
    // Laravel's validation shape, flattened to the first message per field.
    this.errors = body?.errors ?? null
  }
}

export async function api (path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && token.value) headers.Authorization = `Bearer ${token.value}`

  const response = await fetch(`${API}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return null

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    // 401 means the token is gone or the account was blocked mid-session; the
    // only correct response is to stop pretending to be signed in.
    if (response.status === 401) {
      setToken(null)
      me.value = null
    }
    throw new ApiError(response.status, payload)
  }

  return payload
}

export async function signIn (email, code) {
  const data = await api('/auth/verify-code', {
    method: 'POST',
    auth: false,
    body: { email, code, device_name: 'admin-panel' },
  })

  setToken(data.token)

  // The token is proof of the address, not of authority. This is the request
  // that decides whether the panel opens at all.
  await loadMe()

  return data
}

export async function loadMe () {
  const user = await api('/me')
  me.value = user.data ?? user

  try {
    await api('/admin/dashboard')
  } catch (error) {
    setToken(null)
    me.value = null
    // 404 is what EnsureRole gives a signed-in caller who is not an admin.
    throw new ApiError(403, { message: error.status === 404 ? 'not-admin' : error.message })
  }

  return me.value
}

export function signOut () {
  // Best effort: revoke server-side, but drop the local token either way.
  api('/auth/logout', { method: 'POST' }).catch(() => {})
  setToken(null)
  me.value = null
}

/* ── Money ──────────────────────────────────────────────────────────────
   Everything crossing the wire is an integer number of qəpik. These two are
   the only places the panel converts, and nothing else is allowed to do
   arithmetic on a displayed string. */

export const toAzn = minor => (Number(minor ?? 0) / 100).toFixed(2)
export const toMinor = azn => Math.round(Number(String(azn).replace(',', '.')) * 100)

export const money = (minor, currency = 'AZN') =>
  `${toAzn(minor)} ${currency}`
