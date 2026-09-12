import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type PropsWithChildren,
} from 'react'
import { Platform } from 'react-native'
import { api, getToken, setToken, handleSessionExpiry, type User } from './api'
import { setLang, type Lang } from './i18n'
import { disablePush } from './push'

type AuthValue = {
  user: User | null
  ready: boolean
  signedIn: boolean
  /** A courier needs a name and a number to deliver anything. */
  profileComplete: boolean
  requestCode: (email: string, locale: Lang) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<User>
  updateProfile: (data: Partial<Pick<User, 'name' | 'phone' | 'locale'>>) => Promise<User>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

export function AuthProvider ({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

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

  const verifyCode = useCallback(async (email: string, code: string) => {
    const res = await api.verifyCode(email, code, deviceName())
    await setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const updateProfile = useCallback(async (data: Partial<Pick<User, 'name' | 'phone' | 'locale'>>) => {
    const { data: updated } = await api.updateMe(data)
    setUser(updated)
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
  }, [])

  const value = useMemo<AuthValue>(() => ({
    user,
    ready,
    signedIn: user !== null,
    profileComplete: Boolean(user?.profile_complete),
    requestCode, verifyCode, updateProfile, signOut, deleteAccount,
  }), [user, ready, requestCode, verifyCode, updateProfile, signOut, deleteAccount])

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
