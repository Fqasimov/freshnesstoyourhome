import { defineStore } from 'pinia'
import { api, setToken, getToken, ApiError } from '../api/client'
import { setLang } from '../i18n'

export const useAuth = defineStore('auth', {
  state: () => ({
    user: null,
    ready: false,      // the startup check has finished
    signingIn: false,
  }),

  getters: {
    isSignedIn: (s) => s.user !== null,
    // A courier needs a name and a number to deliver anything, so checkout is
    // blocked until both are on file. The server enforces this too.
    profileComplete: (s) => Boolean(s.user?.profile_complete),
  },

  actions: {
    /**
     * Restore the session at launch.
     *
     * A token in the keychain is not proof of a live session — it may have
     * expired, or the account may have been deleted on another device — so it
     * is checked against the server before the app trusts it.
     */
    async restore () {
      const token = await getToken()
      if (!token) { this.ready = true; return }

      try {
        const { data } = await api.me()
        this.user = data
        if (data.locale) await setLang(data.locale)
      } catch (e) {
        // 401 already cleared the token inside the client.
        if (!(e instanceof ApiError) || e.status !== 0) this.user = null
      } finally {
        this.ready = true
      }
    },

    async requestCode (email, locale) {
      await api.requestCode(email, locale)
    },

    async verifyCode (email, code) {
      this.signingIn = true
      try {
        const res = await api.verifyCode(email, code, deviceName())
        await setToken(res.token)
        this.user = res.user
        return res.user
      } finally {
        this.signingIn = false
      }
    },

    async updateProfile (data) {
      const { data: user } = await api.updateMe(data)
      this.user = user
      return user
    },

    async signOut () {
      // Tell the server first so the token is revoked rather than merely
      // forgotten — a token dropped from the device still works until it
      // expires.
      try { await api.logout() } catch { /* offline: clear locally anyway */ }
      await setToken(null)
      this.user = null
    },

    async deleteAccount () {
      await api.deleteAccount()
      await setToken(null)
      this.user = null
    },

    /** Called by the API client when the server rejects the token. */
    clearSession () {
      this.user = null
    },
  },
})

/** A label the customer will recognise when revoking a device. */
function deviceName () {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return 'Android'
  return 'App'
}
