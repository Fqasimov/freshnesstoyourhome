import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

/**
 * Two pages.
 *
 * Hash history rather than HTML5 history, because this site is built as static
 * files and also as a single self-contained .html for previews. Clean paths
 * would need the host to rewrite every unknown URL back to index.html, and a
 * deep link would 404 anywhere that is not configured for it. Switching is one
 * import once there is hosting that rewrites.
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/kataloq',
      name: 'catalogue',
      // Split out: the catalogue page carries the filtering and every product
      // card, and somebody who only reads the front page should not download it.
      component: () => import('./views/CatalogueView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],

  /**
   * An anchor on the current page scrolls to it; anything else starts at the
   * top. Without this, arriving at the catalogue from halfway down the home
   * page drops you halfway down the catalogue.
   */
  scrollBehavior (to, from, saved) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    if (saved) return saved
    return { top: 0 }
  },
})
