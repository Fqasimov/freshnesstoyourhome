import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import { glideTo } from './composables/glide'

/**
 * Two pages, at real addresses: freshnesstoyourhome.az/ and /kataloq.
 *
 * The site used to route on the part after a "#" (/#/kataloq), so it could
 * run from any static folder. On the real host Apache sends every unknown
 * path back to index.html (deploy/website.htaccess), so clean paths work —
 * and Google indexes /kataloq as a page of its own, which it never does for
 * an address that only differs after the "#".
 *
 * The single-file preview still uses the "#" form: it is opened straight
 * from disk, where nothing can do that rewriting.
 */
const SINGLE = import.meta.env.MODE === 'single'

// Old links and bookmarks (/#/kataloq) land on the clean address.
if (!SINGLE && location.hash.startsWith('#/')) {
  history.replaceState(null, '', location.hash.slice(1) || '/')
}

export const router = createRouter({
  history: SINGLE ? createWebHashHistory() : createWebHistory(),
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
    if (to.hash) {
      // Our own glide rather than the browser's, which is too quick to follow.
      // Coming from another page, wait a beat for the home page to render.
      setTimeout(() => glideTo(to.hash), from.name === to.name ? 0 : 120)
      return false
    }
    if (saved) return saved
    return { top: 0 }
  },
})

/* Each page says what it is, in the words people search for. The home page keeps
   the title and description written into index.html; the catalogue gets its own. */
const HOME_TITLE = document.title
const metaDesc = document.querySelector('meta[name="description"]')
const HOME_DESC = metaDesc?.getAttribute('content') ?? ''
const PAGES = {
  catalogue: {
    title: 'Kataloq — balıq, hisə verilmiş skumbriya, dəniz məhsulları | Freshness To Your Home',
    desc: 'Freshness To Your Home kataloqu: təzə balıq, hisə verilmiş skumbriya və skumbriya filesi, dəniz məhsulları, kürü, pendir, ət və şirniyyat. Qiymətlər AZN ilə, Bakıya çatdırılma.',
  },
}
router.afterEach(to => {
  const page = PAGES[to.name]
  document.title = page?.title ?? HOME_TITLE
  metaDesc?.setAttribute('content', page?.desc ?? HOME_DESC)
})
