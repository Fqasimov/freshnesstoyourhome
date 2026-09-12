import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { AuthProvider } from '@/lib/auth'
import { CatalogueProvider } from '@/lib/catalogue'
import { CartProvider } from '@/lib/cart'
import { loadLang } from '@/lib/i18n'
import { color } from '@/theme/tokens'

// Held until the app can actually show something, rather than auto-hiding into
// a blank screen while fonts and the saved language are still loading.
SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout () {
  const [langReady, setLangReady] = useState(false)

  const [fontsLoaded, fontError] = useFonts({
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
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: color.paper },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="sign-in" options={{ animation: 'slide_from_bottom' }} />
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
