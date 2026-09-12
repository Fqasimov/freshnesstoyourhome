import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCart } from '@/lib/cart'
import { useLang, t } from '@/lib/i18n'
import { color, font } from '@/theme/tokens'

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
          backgroundColor: color.paper,
          borderTopColor: color.line,
        },
        tabBarLabelStyle: { fontFamily: font.semi, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="shop"
        options={{
          title: t('nav.shop'),
          tabBarIcon: ({ color: c, size }) => <Ionicons name="leaf-outline" size={size} color={c} />,
        }}
      />
      <Tabs.Screen
        name="basket"
        options={{
          title: t('nav.basket'),
          tabBarIcon: ({ color: c, size }) => <Ionicons name="basket-outline" size={size} color={c} />,
          // Hidden when zero rather than showing a "0".
          tabBarBadge: cart.count > 0 ? cart.count : undefined,
          tabBarBadgeStyle: { backgroundColor: color.brick, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('nav.orders'),
          tabBarIcon: ({ color: c, size }) => <Ionicons name="receipt-outline" size={size} color={c} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color: c, size }) => <Ionicons name="person-outline" size={size} color={c} />,
        }}
      />
    </Tabs>
  )
}
