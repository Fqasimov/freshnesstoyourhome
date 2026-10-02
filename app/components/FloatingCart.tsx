import { useEffect } from 'react'
import { StyleSheet, Text } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, ZoomIn, ZoomOut } from 'react-native-reanimated'

import { useCart } from '@/lib/cart'
import { t, useLang } from '@/lib/i18n'
import { Icon } from '@/components/Icon'
import { PressableScale } from '@/components/PressableScale'
import { color, font } from '@/theme/tokens'

export const TAB_BAR_HEIGHT = 62

const TABS_WITH_BUTTON = new Set(['/shop', '/orders', '/profile'])
const SCREENS_WITH_BUTTON = new Set(['category', 'search'])

/**
 * A way back to an unfinished basket from wherever the customer is browsing.
 * Shown only while the basket has something in it, and never on the basket,
 * checkout or product sheet, where it would point at the screen already open.
 */
export function FloatingCart () {
  const cart = useCart()
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  useLang()

  // The path, not the segments: the root layout's segments can lag behind a
  // tab switch, and route groups like (tabs) never appear in the path.
  const first = pathname.split('/')[1] ?? ''
  const inTabs = TABS_WITH_BUTTON.has(pathname)
  const visible = cart.count > 0 && (inTabs || SCREENS_WITH_BUTTON.has(first))

  const bump = useSharedValue(1)
  useEffect(() => {
    if (cart.count > 0) bump.value = withSequence(withTiming(1.18, { duration: 110 }), withSpring(1, { damping: 10, stiffness: 260 }))
  }, [cart.count, bump])
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }))

  if (!visible) return null

  const bottom = (inTabs ? TAB_BAR_HEIGHT + insets.bottom : insets.bottom) + 16

  return (
    <Animated.View entering={ZoomIn.duration(180)} exiting={ZoomOut.duration(140)} style={[s.wrap, { bottom }]} pointerEvents="box-none">
      <PressableScale
        onPress={() => router.navigate('/(tabs)/basket')}
        accessibilityRole="button"
        accessibilityLabel={`${t('nav.basket')}: ${cart.count}`}
        scaleTo={0.92}
        style={s.button}
      >
        <Icon name="cart3" size={26} color="#fff" />
        <Animated.View style={[s.badge, badgeStyle]}>
          <Text style={s.badgeText}>{cart.count > 99 ? '99+' : cart.count}</Text>
        </Animated.View>
      </PressableScale>
    </Animated.View>
  )
}

const SIZE = 60

const s = StyleSheet.create({
  wrap: { position: 'absolute', right: 18 },
  button: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2,
    backgroundColor: color.forest,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1B2916', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6,
    backgroundColor: color.brick,
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: font.bold, fontSize: 12, color: '#fff' },
})
