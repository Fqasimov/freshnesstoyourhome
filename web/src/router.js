import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import { glideTo } from './composables/glide'
import { setPageHead } from './composables/usePageMeta'

/**
 * Real addresses: freshness.az/, /kataloq and a page per product at /mehsul/{slug}.
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
    {
      path: '/mehsul/:slug',
      name: 'product',
      // A page per product, so Google can show each one for its own name
      // ("burrata Bakı", "qırmızı kürü qiymət"). The build also writes a
      // plain HTML copy of each — see web/scripts/prerender.mjs.
      component: () => import('./views/ProductView.vue'),
    },
    {
      path: '/hesab',
      name: 'account',
      // The personal cabinet: sign in or up, and follow orders. Optional —
      // an order never needs it — and split out like the catalogue.
      component: () => import('./views/AccountView.vue'),
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
   the title and description written into index.html; the catalogue gets its own,
   and a product page sets its own from the product (ProductView). The words lead
   with what the shop mostly sells — smoked salmon, red caviar, burrata and the
   other cheeses — rather than with any single fish. */
const HOME_TITLE = document.title
const metaDesc = document.querySelector('meta[name="description"]')
const HOME_DESC = metaDesc?.getAttribute('content') ?? ''
const ogImage = document.querySelector('meta[property="og:image"]')
const HOME_IMAGE = ogImage?.getAttribute('content') ?? ''
const PAGES = {
  catalogue: {
    title: 'Kataloq — hisə verilmiş qızıl balıq, kürü, burrata və pendirlər | Freshness To Your Home',
    desc: 'Kataloq: hisə verilmiş qızıl balıq və beluqa, qırmızı və qara kürü, burrata, mozzarella, parmezan, təzə balıq, krevet və dəniz məhsulları. Qiymətlər AZN ilə, Bakıya çatdırılma.',
  },
}
router.afterEach(to => {
  // A product page writes its own head once it knows the product.
  if (to.name === 'product') return
  const page = PAGES[to.name]
  document.title = page?.title ?? HOME_TITLE
  metaDesc?.setAttribute('content', page?.desc ?? HOME_DESC)
  if (ogImage && HOME_IMAGE) ogImage.setAttribute('content', HOME_IMAGE)
  if (HOME_IMAGE) document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', HOME_IMAGE)
  setPageHead({ path: to.path, title: document.title, desc: page?.desc ?? HOME_DESC })
})
