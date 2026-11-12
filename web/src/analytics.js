/* Google Analytics 4, when the deploy gives it an id (the GitHub variable
   GA4_ID → VITE_GA4_ID). Without one nothing loads and track() is a no-op.

   The site's Content-Security-Policy allows Google's tag only in that case:
   scripts/package-deploy.sh adds the hosts when VITE_GA4_ID is set. No inline
   script is needed — gtag is defined here, in our own bundle.

   Events: page_view on every route (the app is one page), add_to_cart,
   begin_checkout (the order is sent, WhatsApp opens), whatsapp_click and
   phone_click on any such link. */
const ID = import.meta.env.VITE_GA4_ID
const ON = typeof window !== 'undefined' && /^G-[A-Z0-9]{4,}$/.test(ID ?? '')

export function track (name, params = {}) {
  if (ON && window.gtag) window.gtag('event', name, params)
}

export function initAnalytics (router) {
  if (!ON) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  // Page views are sent by hand below: the address changes without a page load.
  window.gtag('config', ID, { send_page_view: false })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`
  document.head.appendChild(s)

  router.afterEach(() => {
    // After the page has set its own title.
    setTimeout(() => track('page_view', {
      page_location: location.href, page_title: document.title, language: document.documentElement.lang,
    }), 300)
  })

  document.addEventListener('click', e => {
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null
    if (!a) return
    const href = a.getAttribute('href') ?? ''
    if (href.startsWith('tel:')) track('phone_click', { link_url: href })
    else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) track('whatsapp_click', { link_url: href.split('?')[0] })
  }, true)
}
