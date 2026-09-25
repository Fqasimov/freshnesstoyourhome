import type { useRouter } from 'expo-router'

type Router = ReturnType<typeof useRouter>

/**
 * Crossing between signed-out and signed-in clears the history behind it.
 * Otherwise the sign-in form sits under the catalogue, and Android's back
 * button — or a swipe — walks a signed-in customer back onto it (or a signed-
 * out one back into the shop).
 */
function resetTo (router: Router, href: '/(tabs)/shop' | '/auth') {
  if (router.canDismiss()) router.dismissAll()
  router.replace(href)
}

export const enterApp = (router: Router) => resetTo(router, '/(tabs)/shop')
export const leaveApp = (router: Router) => resetTo(router, '/auth')
