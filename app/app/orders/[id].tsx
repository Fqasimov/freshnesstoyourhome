import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import { api, ApiError, type Order } from '@/lib/api'
import { t, useLang } from '@/lib/i18n'
import { money } from '@/lib/money'
import { AppBar, Body, Button, Loading, Note, Row, Small } from '@/components/ui'
import { enablePush, hasBeenAsked } from '@/lib/push'
import { color, font, space } from '@/theme/tokens'

const STEPS = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'] as const

export default function OrderDetail () {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>()
  useLang()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Shown only on the screen that follows a freshly placed order, and only
  // once ever. See lib/push.ts for why the ask is not at launch.
  const [offerPush, setOfferPush] = useState(false)
  const [enablingPush, setEnablingPush] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.order(id)
      setOrder(data)
    } catch (e) {
      setError((e as ApiError).isOffline ? t('err.offline') : t('err.generic'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    // The moment this is worth asking: the customer has just placed an order
    // and "tell me when it is on its way" is an offer rather than an
    // interruption. Asking at launch is how an app gets permanently denied.
    if (placed === '1') {
      hasBeenAsked().then(asked => setOfferPush(!asked)).catch(() => {})
    }
  }, [placed])

  async function turnOnPush () {
    setEnablingPush(true)
    try { await enablePush() } finally {
      setEnablingPush(false)
      setOfferPush(false)
    }
  }

  async function cancel () {
    setCancelling(true)
    try {
      const data = await api.cancelOrder(id)
      setOrder(data)
      setConfirming(false)
    } catch (e) {
      setError((e as ApiError).message ?? t('err.generic'))
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <View style={{ flex: 1 }}><AppBar title={t('orders.title')} back /><Loading /></View>

  if (!order) {
    return (
      <View style={{ flex: 1 }}>
        <AppBar title={t('orders.title')} back />
        <View style={{ padding: space.gutter }}><Note warn>{error ?? t('err.generic')}</Note></View>
      </View>
    )
  }

  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number])
  const weighed = order.final_total_minor !== null

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={order.code} back />

      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: 36 }}>
        {placed === '1' ? (
          <View style={{ marginBottom: 18 }}><Note>✓ {t('status.placed')}</Note></View>
        ) : null}

        {offerPush ? (
          <View style={s.pushCard}>
            <Text style={s.pushTitle}>{t('push.askTitle')}</Text>
            <Small muted style={{ marginTop: 6 }}>{t('push.askBody')}</Small>
            <Button
              title={t('push.enable')}
              onPress={turnOnPush}
              busy={enablingPush}
              style={{ marginTop: 14 }}
            />
            <Button
              title={t('push.notNow')}
              variant="ghost"
              onPress={() => setOfferPush(false)}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : null}

        {order.status !== 'cancelled' ? (
          <View style={s.track}>
            {STEPS.map((step, i) => (
              <View key={step} style={{ flex: 1, gap: 7 }}>
                <View style={[s.dot, i <= stepIndex && { backgroundColor: color.forest }]} />
                <Text style={[s.trackLabel, i <= stepIndex && s.trackLabelOn]} numberOfLines={2}>
                  {t(`status.${step}`)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Note warn>
            {t('status.cancelled')}{order.cancel_reason ? ` — ${order.cancel_reason}` : ''}
          </Note>
        )}

        <Text style={s.heading}>{t('checkout.address')}</Text>
        <Body>{order.address_line}</Body>
        {order.address_notes ? <Small muted>{order.address_notes}</Small> : null}
        <Small muted style={{ marginTop: 8 }}>
          {order.delivery_date} · {order.payment_method === 'cash' ? t('checkout.cash') : t('checkout.pos')}
        </Small>

        <View style={{ marginTop: 24 }}>
          {(order.items ?? []).map(item => (
            <View key={item.id} style={s.item}>
              <View style={{ flex: 1 }}>
                <Body numberOfLines={2}>{item.name}</Body>
                <Small muted>
                  × {item.confirmed_qty ?? item.qty}{item.is_weight_based ? ' kg' : ''}
                  {item.is_weight_based && item.confirmed_qty === null ? ` (${t('cart.about')})` : ''}
                </Small>
              </View>
              <Text style={s.itemTotal}>
                {money(item.final_line_total_minor ?? item.line_total_minor, order.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <Row
            label={t('cart.subtotal')}
            value={money(
              weighed ? order.final_total_minor! - order.delivery_fee_minor : order.subtotal_minor,
              order.currency,
            )}
          />
          {order.delivery_fee_minor > 0 ? (
            <Row label={t('cart.delivery')} value={money(order.delivery_fee_minor, order.currency)} />
          ) : null}
          <Row
            label={weighed ? t('orders.final') : t('orders.estimate')}
            value={order.payable_display}
            strong
          />
        </View>

        {order.requires_weighing && !weighed ? (
          <View style={{ marginTop: 14 }}>
            <Note>{t('orders.weighedPending')} — {t('shop.weighedNote')}</Note>
          </View>
        ) : null}

        {order.can_cancel ? (
          <View style={{ marginTop: 26, gap: 10 }}>
            {!confirming ? (
              <Button title={t('orders.cancel')} variant="danger" onPress={() => setConfirming(true)} />
            ) : (
              <>
                <Note warn>{t('orders.cancelConfirm')}</Note>
                <Button title={t('orders.cancel')} variant="danger" onPress={cancel} busy={cancelling} />
                <Button title={t('cancel')} variant="ghost" onPress={() => setConfirming(false)} />
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  pushCard: {
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.lineSoft,
    borderRadius: space.radius,
    padding: 16,
    marginBottom: 18,
  },
  pushTitle: { fontFamily: font.displaySemi, fontSize: 19, color: color.ink },
  track: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  dot: { height: 4, borderRadius: 2, backgroundColor: color.paper3 },
  trackLabel: { fontFamily: font.body, fontSize: 10, lineHeight: 12, color: color.ink3 },
  trackLabelOn: { color: color.forest, fontFamily: font.semi },
  heading: { fontFamily: font.displaySemi, fontSize: 18, color: color.ink, marginTop: 26, marginBottom: 8 },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 12, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.lineSoft,
  },
  itemTotal: { fontFamily: font.semi, fontSize: 16, color: color.ink },
})
