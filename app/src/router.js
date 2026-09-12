import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from './stores/auth'

/**
 * Hash history, not HTML5 history.
 *
 * Capacitor serves the build from the device filesystem, where there is no
 * server to rewrite unknown paths back to index.html. With history mode a
 * reload or a deep link lands on a 404 inside the WebView.
 */
const routes = [
  { path: '/', redirect: '/shop' },

  { path: '/sign-in', name: 'sign-in', component: () => import('./views/SignIn.vue'), meta: { public: true, plain: true } },

  // Browsing does not require an account: an empty app behind a login wall is
  // both worse for customers and a reliable App Store rejection.
  { path: '/shop', name: 'shop', component: () => import('./views/Shop.vue'), meta: { public: true, tab: true } },
  { path: '/basket', name: 'basket', component: () => import('./views/Basket.vue'), meta: { public: true, tab: true } },

  { path: '/checkout', name: 'checkout', component: () => import('./views/Checkout.vue') },
  { path: '/orders', name: 'orders', component: () => import('./views/Orders.vue'), meta: { tab: true } },
  { path: '/orders/:id', name: 'order', component: () => import('./views/OrderDetail.vue'), props: true },
  { path: '/profile', name: 'profile', component: () => import('./views/Profile.vue'), meta: { tab: true } },
  { path: '/profile/addresses', name: 'addresses', component: () => import('./views/Addresses.vue') },

  { path: '/:pathMatch(.*)*', redirect: '/shop' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuth()

  // Wait for the startup session check, or a refresh on a protected route
  // bounces the customer to sign-in before their saved session is restored.
  if (!auth.ready) await auth.restore()

  if (to.meta.public) return true

  if (!auth.isSignedIn) {
    return { name: 'sign-in', query: { next: to.fullPath } }
  }

  return true
})
