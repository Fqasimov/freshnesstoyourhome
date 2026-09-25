import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type PropsWithChildren,
} from 'react'
import { Platform } from 'react-native'
import { api, getToken, setToken, handleSessionExpiry, type Session, type SignUpForm, type User } from './api'
import { forget, getRemembered, remember, type Remembered } from './remember'
import { setLang, type Lang } from './i18n'
import { disablePush } from './push'

type AuthValue = {
  user: User | null
  ready: boolean
  signedIn: boolean
  /** A courier needs a name and a number to deliver anything. */
  profileComplete: boolean
  /** The last person signed in on this phone, kept through sign-out. */
  remembered: Remembered | null
  forgetRemembered: () => Promise<void>
  requestCode: (email: string, locale: Lang) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<User>
  /** Sign-up and reset both answer with a ticket; `confirm` finishes either. */
  register: (form: SignUpForm) => Promise<string>
  forgotPassword: (email: string, password: string) => Promise<string>
  confirm: (ticket: string, email: string, code: string) => Promise<User>
  login: (email: string, password: string) => Promise<User>
  social: (provider: 'google' | 'apple', idToken: string, name?: string | null) => Promise<User>
  updateProfile: (data: Partial<Pick<User, 'name' | 'phone' | 'locale' | 'date_of_birth'>>) => Promise<User>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

export function AuthProvider ({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [remembered, setRemembered] = useState<Remembered | null>(null)

  useEffect(() => { getRemembered().then(setRemembered) }, [])

  /**
   * Restore the session at launch.
   *
   * A token in the keychain is not proof of a live session — it may have
   * expired, or the account may have been deleted on another device — so it is
   * checked against the server before the app trusts it.
   */
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const token = await getToken()
      if (!token) { if (!cancelled) setReady(true); return }

      try {
        const { data } = await api.me()
        if (cancelled) return
        setUser(data)
        if (data.locale) await setLang(data.locale)
      } catch {
        // A 401 already cleared the token inside the client. Anything else is
        // most likely being offline, and the customer can retry.
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => { cancelled = true }
  }, [])

  // When the server rejects the token mid-session, drop the user so the
  // navigation guard sends them to sign in once, rather than every screen
  // failing separately.
  useEffect(() => {
    handleSessionExpiry(() => setUser(null))
  }, [])

  const requestCode = useCallback(async (email: string, locale: Lang) => {
    await api.requestCode(email, locale)
  }, [])

  /** Every way in ends here: keep the token, remember who it was. */
  const begin = useCallback(async (res: Session) => {
    await setToken(res.token)
    setUser(res.user)
    if (res.user.email) {
      const who = { name: res.user.name, email: res.user.email }
      setRemembered(who)
      await remember(who)
    }
    return res.user
  }, [])

  const verifyCode = useCallback(async (email: string, code: string) => {
    return begin(await api.verifyCode(email, code, deviceName()))
  }, [begin])

  const register = useCallback(async (form: SignUpForm) => {
    return (await api.register(form)).ticket
  }, [])

  const forgotPassword = useCallback(async (email: string, password: string) => {
    return (await api.forgotPassword({ email, password, password_confirmation: password })).ticket
  }, [])

  const confirm = useCallback(async (ticket: string, email: string, code: string) => {
    return begin(await api.confirm({ ticket, email, code, device_name: deviceName() }))
  }, [begin])

  const login = useCallback(async (email: string, password: string) => {
    return begin(await api.login({ email, password, device_name: deviceName() }))
  }, [begin])

  const social = useCallback(async (provider: 'google' | 'apple', idToken: string, name?: string | null) => {
    return begin(await api.social(provider, { id_token: idToken, name, device_name: deviceName() }))
  }, [begin])

  const forgetRemembered = useCallback(async () => {
    setRemembered(null)
    await forget()
  }, [])

  const updateProfile = useCallback(async (data: Partial<Pick<User, 'name' | 'phone' | 'locale' | 'date_of_birth'>>) => {
    const { data: updated } = await api.updateMe(data)
    setUser(updated)
    if (updated.email) {
      const who = { name: updated.name, email: updated.email }
      setRemembered(who)
      await remember(who)
    }
    return updated
  }, [])

  const signOut = useCallback(async () => {
    // Stop notifications first. A shared or sold phone must not keep receiving
    // somebody else's order updates, and after the token is gone we can no
    // longer authenticate the request that unregisters it.
    await disablePush()

    // Then tell the server, so the token is revoked rather than merely
    // forgotten — a token dropped from the device still works until it expires.
    try { await api.logout() } catch { /* offline: clear locally anyway */ }
    await setToken(null)
    setUser(null)
  }, [])

  const deleteAccount = useCallback(async () => {
    await disablePush()
    await api.deleteAccount()
    await setToken(null)
    setUser(null)
    // A deleted account is not someone to welcome back.
    setRemembered(null)
    await forget()
  }, [])

  const value = useMemo<AuthValue>(() => ({
    user,
    ready,
    signedIn: user !== null,
    profileComplete: Boolean(user?.profile_complete),
    remembered, forgetRemembered,
    requestCode, verifyCode, register, forgotPassword, confirm, login, social,
    updateProfile, signOut, deleteAccount,
  }), [user, ready, remembered, forgetRemembered, requestCode, verifyCode, register, forgotPassword,
    confirm, login, social, updateProfile, signOut, deleteAccount])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth (): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** A label the customer will recognise when revoking a device. */
function deviceName (): string {
  if (Platform.OS === 'ios') return 'iPhone'
  if (Platform.OS === 'android') return 'Android'
  return 'Web'
}
