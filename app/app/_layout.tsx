import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { AuthProvider } from '@/lib/auth'
import { CatalogueProvider } from '@/lib/catalogue'
import { CartProvider } from '@/lib/cart'
import { loadLang } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { refreshPushRegistration } from '@/lib/push'
import * as Notifications from 'expo-notifications'
import { color } from '@/theme/tokens'
import { leaveApp } from '@/lib/nav'

// Held until the app can actually show something, rather than auto-hiding into
// a blank screen while fonts and the saved language are still loading.
SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout () {
  const [langReady, setLangReady] = useState(false)

  const [fontsLoaded, fontError] = useFonts({
    'Fraunces-SemiBold': require('../assets/fonts/Fraunces-SemiBold.ttf'),
    'Cormorant-SemiBold': require('../assets/fonts/Cormorant-SemiBold.ttf'),
    'Cormorant-Bold': require('../assets/fonts/Cormorant-Bold.ttf'),
    'Onest-Regular': require('../assets/fonts/Onest-Regular.ttf'),
    'Onest-Medium': require('../assets/fonts/Onest-Medium.ttf'),
    'Onest-SemiBold': require('../assets/fonts/Onest-SemiBold.ttf'),
    'Onest-Bold': require('../assets/fonts/Onest-Bold.ttf'),
  })

  useEffect(() => {
    loadLang().finally(() => setLangReady(true))
  }, [])

  // A font that fails to load must not hold the app hostage — the system face
  // is a worse result than the brand face, and far better than a splash screen
  // that never goes away.
  const ready = (fontsLoaded || Boolean(fontError)) && langReady

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {})
  }, [ready])

  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CatalogueProvider>
            <CartProvider>
              <PushBridge />
              <AuthGate />
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: color.paper },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="index" options={{ animation: 'none' }} />
                <Stack.Screen name="auth/index" options={{ animation: 'fade' }} />
                <Stack.Screen name="auth/verify" />
                <Stack.Screen name="auth/forgot" />
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                <Stack.Screen name="category/[id]" />
                <Stack.Screen name="search" options={{ animation: 'fade' }} />
                <Stack.Screen
                  name="product/[id]"
                  options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
                />
                <Stack.Screen name="profile/details" />
                <Stack.Screen name="checkout" />
                <Stack.Screen name="orders/[id]" />
                <Stack.Screen name="profile/addresses" />
              </Stack>
            </CartProvider>
          </CatalogueProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/**
 * The shop is for signed-in customers. Anyone else — signed out, or whose
 * session ran out mid-use — is sent to the front door, from wherever they
 * are. The opening animation and the auth screens are the only places open
 * without an account.
 */
function AuthGate () {
  const auth = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!auth.ready) return
    const first = segments[0] as string | undefined
    const open = first === undefined || first === 'index' || first === 'auth'
    if (!auth.signedIn && !open) leaveApp(router)
  }, [auth.ready, auth.signedIn, segments, router])

  return null
}

/**
 * Connects push notifications to navigation.
 *
 * Lives inside the providers because it needs to know whether anyone is signed
 * in — there is nobody to register a device against otherwise.
 */
function PushBridge () {
  const auth = useAuth()
  const router = useRouter()

  // Refresh the token whenever a customer is signed in. The OS can reissue one
  // at any time and a stale token fails silently, so this runs at every launch
  // rather than only at registration. It never prompts.
  useEffect(() => {
    if (auth.signedIn) refreshPushRegistration()
  }, [auth.signedIn])

  useEffect(() => {
    // Tapping a notification should land on the order it is about, not on the
    // home screen leaving the customer to find it.
    const open = (data: any) => {
      if (data?.type === 'order' && typeof data.order_id === 'string') {
        router.push({ pathname: '/orders/[id]', params: { id: data.order_id } })
      }
    }

    // The app was closed and the notification is what opened it.
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        if (response) open(response.notification.request.content.data)
      })
      .catch(() => {})

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      open(response.notification.request.content.data)
    })

    return () => sub.remove()
  }, [router])

  return null
}
