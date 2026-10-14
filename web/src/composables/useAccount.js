import { ref, computed } from 'vue'
import { lang } from './useI18n'

/**
 * The customer's account on the website — the same account as in the app.
 *
 * Sign-up, sign-in and the emailed codes all go to the same endpoints the app
 * uses, so an account made here works there and the other way round. Having
 * one is optional: an order can be placed without it. It is what lets a
 * customer follow an order after placing it.
 *
 * The session is a bearer token kept in this browser. Nothing else about the
 * account is stored here; the profile and orders are fetched when needed.
 */

const API = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'fth.token'
const CLAIMS_KEY = 'fth.claims'

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch (e) { return fallback } }
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }

/* Module-level, so the nav, the basket and the account page share one session. */
const token = ref(read(TOKEN_KEY, null))
const user = ref(null)
const orders = ref([])
const ready = ref(false)

export const signedIn = computed(() => Boolean(token.value))
export const authToken = () => token.value

export class ApiError extends Error {
  constructor (message, status, payload) {
    super(message)
    this.status = status
    this.errors = payload?.errors ?? {}
    this.code = payload?.code ?? null
  }
}

async function api (path, { method = 'GET', body, auth = true } = {}) {
  if (!API) throw new ApiError('offline', 0)
  const headers = { Accept: 'application/json', 'Accept-Language': lang.value }
  if (body) headers['Content-Type'] = 'application/json'
  if (auth && token.value) headers.Authorization = `Bearer ${token.value}`

  let res
  try {
    res = await fetch(`${API}/api/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch (e) {
    throw new ApiError('offline', 0)
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (res.status === 401 && auth) forget()
  if (!res.ok) throw new ApiError(data?.message ?? 'error', res.status, data)
  return data
}

function remember (session) {
  token.value = session.token
  user.value = session.user
  write(TOKEN_KEY, session.token)
}

function forget () {
  token.value = null
  user.value = null
  orders.value = []
  write(TOKEN_KEY, null)
}

/* ── guest orders waiting to be claimed ─────────────────────────────────── */

/* A website order placed without an account comes back with a one-time
   token. It is kept here until the customer signs in, and then handed over so
   the order joins their account. Only this browser ever had it. */
export function rememberClaim (claimToken, code) {
  if (!claimToken) return
  const list = read(CLAIMS_KEY, []).filter(c => c.token !== claimToken)
  list.push({ token: claimToken, code, at: Date.now() })
  write(CLAIMS_KEY, list.slice(-20))
}
export const pendingClaims = () => read(CLAIMS_KEY, [])

async function claimAll () {
  const list = read(CLAIMS_KEY, [])
  if (!list.length || !token.value) return
  const left = []
  for (const c of list) {
    try {
      await api('orders/claim', { method: 'POST', body: { token: c.token } })
    } catch (e) {
      // Kept only if it might still work later (no network, rate limit).
      if (e.status === 0 || e.status === 429) left.push(c)
    }
  }
  write(CLAIMS_KEY, left.length ? left : null)
}

/* ── the account ─────────────────────────────────────────────────────────── */

async function loadOrders () {
  const res = await api('orders')
  orders.value = res?.data ?? []
  return orders.value
}

async function afterSignIn (session) {
  remember(session)
  await claimAll()
  await loadOrders().catch(() => {})
}

export function useAccount () {
  async function load () {
    if (!token.value) { ready.value = true; return }
    try {
      user.value = (await api('me'))?.data ?? null
      await claimAll()
    } catch (e) { /* a 401 has already signed us out */ }
    ready.value = true
  }

  /* Sign-up step one: the form is held on the server and a code is emailed. */
  const register = form => api('auth/register', { method: 'POST', auth: false, body: { ...form, locale: lang.value } })
  const forgot = form => api('auth/password/forgot', { method: 'POST', auth: false, body: { ...form, locale: lang.value } })

  /* Step two: the code. The account exists only from here. */
  async function confirm ({ ticket, email, code }) {
    const session = await api('auth/confirm', { method: 'POST', auth: false, body: { ticket, email, code, device_name: 'web' } })
    await afterSignIn(session)
  }

  async function login ({ email, password }) {
    const session = await api('auth/login', { method: 'POST', auth: false, body: { email, password, device_name: 'web' } })
    await afterSignIn(session)
  }

  async function logout () {
    try { await api('auth/logout', { method: 'POST' }) } catch (e) { /* signed out here either way */ }
    forget()
  }

  const cancel = id => api(`orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: {} })
  const updateProfile = body => api('me', { method: 'PATCH', body }).then(u => { user.value = u?.data ?? u; return user.value })

  return { user, orders, ready, signedIn, load, loadOrders, register, forgot, confirm, login, logout, cancel, updateProfile }
}
