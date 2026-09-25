import { useCallback, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'

import { api, ApiError, type Order } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { t, useLang } from '@/lib/i18n'
import { AppBar, Button, Empty, Loading, Note, Small } from '@/components/ui'
import { color, font, space } from '@/theme/tokens'
import { leaveApp } from '@/lib/nav'

const LIVE = ['placed', 'confirmed', 'preparing', 'out_for_delivery']

export default function Orders () {
  const auth = useAuth()
  const router = useRouter()
  useLang()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!auth.signedIn) { setLoading(false); return }
    try {
      const { data } = await api.orders()
      setOrders(data)
      setError(null)
    } catch (e) {
      setError((e as ApiError).isOffline ? t('err.offline') : t('err.generic'))
    } finally {
      setLoading(false)
    }
  }, [auth.signedIn])

  // Refetch on focus: an order's status changes while the customer is looking
  // at another screen, and a stale list is the thing they came here to check.
  useFocusEffect(useCallback(() => { load() }, [load]))

  if (!auth.signedIn) {
    return (
      <View style={{ flex: 1 }}>
        <AppBar title={t('orders.title')} />
        <Empty title={t('auth.title')}>
          <Button title={t('auth.verify')} onPress={() => leaveApp(router)} style={{ marginTop: 16 }} />
        </Empty>
      </View>
    )
  }

  if (loading) return <View style={{ flex: 1 }}><AppBar title={t('orders.title')} /><Loading /></View>

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={t('orders.title')} />

      <FlatList<Order>
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: space.gutter, gap: 11 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }}
            tintColor={color.forest}
          />
        }
        ListHeaderComponent={error ? <Note warn>{error}</Note> : null}
        ListEmptyComponent={
          <Empty title={t('orders.empty')}>
            <Button
              title={t('cart.browse')}
              variant="ghost"
              onPress={() => router.push('/(tabs)/shop')}
              style={{ marginTop: 16 }}
            />
          </Empty>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}
            style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
          >
            <View style={s.head}>
              <Text style={s.code}>{item.code}</Text>
              <View style={[s.pill, pillStyle(item.status)]}>
                <Text style={[s.pillText, pillTextStyle(item.status)]}>{t(`status.${item.status}`)}</Text>
              </View>
            </View>

            <Small muted style={{ marginTop: 5 }}>
              {item.delivery_date ?? ''} · {item.items?.length ?? 0}
            </Small>

            <View style={s.foot}>
              {/* Until the goods are weighed the figure is an estimate, and the
                  screen says so rather than implying a precision we lack. */}
              {item.requires_weighing && item.final_total_minor === null ? (
                <Small muted>{t('cart.about')}</Small>
              ) : null}
              <Text style={s.total}>{item.payable_display}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  )
}

function pillStyle (status: string) {
  if (LIVE.includes(status)) return { backgroundColor: color.forest }
  if (status === 'delivered') return { backgroundColor: color.leafXl }
  return { backgroundColor: color.paper3 }
}

function pillTextStyle (status: string) {
  if (LIVE.includes(status)) return { color: '#fff' }
  if (status === 'delivered') return { color: color.forest2 }
  return { color: color.ink3 }
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: space.radius,
    borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineSoft,
    padding: 15,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  code: { fontFamily: font.displaySemi, fontSize: 19, letterSpacing: 0.4, color: color.ink },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { fontFamily: font.semi, fontSize: 11 },
  foot: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 5, marginTop: 11 },
  total: { fontFamily: font.bold, fontSize: 17, color: color.ink },
})
