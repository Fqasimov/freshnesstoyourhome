import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { App as CapApp } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

import App from './App.vue'
import { router } from './router'
import { loadLang } from './i18n'
import { handleSessionExpiry } from './api/client'
import { useAuth } from './stores/auth'
import { useCart } from './stores/cart'
import { useCatalogue } from './stores/catalogue'

import './styles/base.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const auth = useAuth(pinia)
const cart = useCart(pinia)
const catalogue = useCatalogue(pinia)

// When the server rejects a token, drop the session and send the customer to
// sign in rather than letting screens fail one request at a time.
handleSessionExpiry(() => {
  auth.clearSession()
  router.replace({ name: 'sign-in' })
})

async function boot () {
  await loadLang()

  // The session check and the basket are needed before the first screen paints;
  // the catalogue can arrive a moment later, since the cached copy renders
  // immediately and the shop screen shows its own loading state.
  await Promise.all([
    auth.restore(),
    cart.load(),
    catalogue.loadCached(),
  ])

  app.mount('#app')
  await router.isReady()

  // Held until the app is genuinely ready to show something, rather than
  // auto-hiding into a blank screen.
  try {
    await SplashScreen.hide()
    await StatusBar.setStyle({ style: Style.Dark })
  } catch { /* running in a browser */ }

  catalogue.load().catch(() => { /* the store records staleness itself */ })
}

// The Android back button must move back through the app and close it from the
// first screen — not exit immediately, which is a rejection on Play.
CapApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack && router.currentRoute.value.name !== 'shop') router.back()
  else CapApp.exitApp()
}).catch(() => { /* not on Android */ })

// The catalogue may have changed while the app was in the background.
CapApp.addListener('resume', () => {
  catalogue.load().catch(() => {})
}).catch(() => {})

boot()
