import { useEffect } from 'react'
import { Tabs } from 'expo-router'
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { useCart } from '@/lib/cart'
import { useLang, t } from '@/lib/i18n'
import { Icon, type IconName } from '@/components/Icon'
import { color, font } from '@/theme/tokens'

/** A tab's icon: outlined at rest, filled and nudged up a touch when chosen. */
function TabIcon ({ name, focused, tint }: { name: [IconName, IconName]; focused: boolean; tint: string }) {
  const lift = useSharedValue(0)

  useEffect(() => {
    lift.value = focused
      ? withSequence(withTiming(-3, { duration: 110 }), withSpring(0, { damping: 12, stiffness: 260 }))
      : 0
  }, [focused, lift])

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }))

  return (
    <Animated.View style={style}>
      <Icon name={focused ? name[1] : name[0]} size={22} color={tint} />
    </Animated.View>
  )
}

export default function TabsLayout () {
  const cart = useCart()

  // Subscribing to the language here re-renders the labels when it changes;
  // t() is a plain function and would not trigger a render on its own.
  useLang()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.forest,
        tabBarInactiveTintColor: color.ink3,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: color.lineSoft,
          height: 62,
          paddingTop: 6,
        },
        tabBarItemStyle: { paddingBottom: 4 },
        tabBarLabelStyle: { fontFamily: font.semi, fontSize: 11 },
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="shop"
        options={{
          title: t('cat.title'),
          tabBarIcon: ({ color: c, focused }) => <TabIcon name={['grid', 'grid-fill']} focused={focused} tint={String(c)} />,
        }}
      />
      <Tabs.Screen
        name="basket"
        options={{
          title: t('nav.basket'),
          tabBarIcon: ({ color: c, focused }) => <TabIcon name={['basket3', 'basket3-fill']} focused={focused} tint={String(c)} />,
          // Hidden when zero rather than showing a "0".
          tabBarBadge: cart.count > 0 ? cart.count : undefined,
          tabBarBadgeStyle: { backgroundColor: color.brick, fontSize: 10, fontFamily: font.bold },
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('nav.orders'),
          tabBarIcon: ({ color: c, focused }) => <TabIcon name={['receipt', 'receipt-cutoff']} focused={focused} tint={String(c)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color: c, focused }) => <TabIcon name={['person', 'person-fill']} focused={focused} tint={String(c)} />,
        }}
      />
    </Tabs>
  )
}
