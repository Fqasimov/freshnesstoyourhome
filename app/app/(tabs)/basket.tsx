import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'

import { useCart } from '@/lib/cart'
import { useCatalogue } from '@/lib/catalogue'
import { useAuth } from '@/lib/auth'
import { pick, t, useLang } from '@/lib/i18n'
import { money } from '@/lib/money'
import { bundlePhoto, productPhoto } from '@/lib/photos'
import { AppBar, Body, Button, Empty, Note, Row, Small } from '@/components/ui'
import { color, font, space } from '@/theme/tokens'
import { leaveApp } from '@/lib/nav'

export default function Basket () {
  const cart = useCart()
  const catalogue = useCatalogue()
  const auth = useAuth()
  const router = useRouter()
  useLang()

  const quote = cart.quote

  function checkout () {
    if (!auth.signedIn) {
      leaveApp(router)
      return
    }
    router.push('/checkout')
  }

  if (cart.isEmpty) {
    return (
      <View style={{ flex: 1 }}>
        <AppBar title={t('cart.title')} />
        <Empty title={t('cart.empty')}>
          <Button
            title={t('cart.browse')}
            variant="ghost"
            onPress={() => router.push('/(tabs)/shop')}
            style={{ marginTop: 16 }}
          />
        </Empty>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={t('cart.title')} />

      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: 32 }}>
        {(quote?.bundles ?? []).map(set => {
          const bundle = catalogue.bundleById(set.bundle_id)
          const image = (bundle && bundlePhoto(bundle)) ?? productPhoto(catalogue.byId(bundle?.items[0]?.product_id ?? ''))

          return (
            <View key={`set-${set.bundle_id}`} style={s.row}>
              <View style={s.media}>
                {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={2}>{set.name}</Text>
                <Small muted>{t('sets.badge', { off: set.discount_percent })}</Small>

                <View style={s.controls}>
                  <View style={s.stepper}>
                    <Pressable
                      onPress={() => cart.setSetQty(set.bundle_id, set.qty - 1)}
                      hitSlop={6} style={s.stepBtn}
                      accessibilityRole="button" accessibilityLabel={t('cart.remove')}
                    >
                      <Text style={s.stepText}>−</Text>
                    </Pressable>
                    <Text style={s.qty}>{set.qty}</Text>
                    <Pressable
                      onPress={() => cart.setSetQty(set.bundle_id, set.qty + 1)}
                      hitSlop={6} style={s.stepBtn}
                      accessibilityRole="button" accessibilityLabel={t('shop.add')}
                    >
                      <Text style={s.stepText}>+</Text>
                    </Pressable>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.was}>{money(set.full_minor, quote?.currency)}</Text>
                    <Text style={s.lineTotal}>{money(set.price_minor, quote?.currency)}</Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => cart.setSetQty(set.bundle_id, 0)}
                hitSlop={8}
                accessibilityRole="button" accessibilityLabel={t('cart.remove')}
              >
                <Text style={s.remove}>×</Text>
              </Pressable>
            </View>
          )
        })}

        {(quote?.lines ?? []).filter(line => !line.bundle_id).map(line => {
          const product = catalogue.byId(line.product_id)
          const step = line.is_weight_based ? 0.5 : 1
          const image = productPhoto(product)

          return (
            <View key={line.product_id} style={s.row}>
              <View style={s.media}>
                {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={2}>{line.name}</Text>
                {product ? <Small muted>{pick(product.unit_label)}</Small> : null}

                <View style={s.controls}>
                  <View style={s.stepper}>
                    <Pressable
                      onPress={() => cart.setQty(line.product_id, line.qty - step)}
                      hitSlop={6} style={s.stepBtn}
                      accessibilityRole="button" accessibilityLabel={t('cart.remove')}
                    >
                      <Text style={s.stepText}>−</Text>
                    </Pressable>
                    <Text style={s.qty}>{line.is_weight_based ? `${line.qty} kg` : line.qty}</Text>
                    <Pressable
                      onPress={() => cart.add(line.product_id, step)}
                      hitSlop={6} style={s.stepBtn}
                      accessibilityRole="button" accessibilityLabel={t('shop.add')}
                    >
                      <Text style={s.stepText}>+</Text>
                    </Pressable>
                  </View>

                  <Text style={s.lineTotal}>{money(line.line_total_minor, quote?.currency)}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => cart.remove(line.product_id)}
                hitSlop={8}
                accessibilityRole="button" accessibilityLabel={t('cart.remove')}
              >
                <Text style={s.remove}>×</Text>
              </Pressable>
            </View>
          )
        })}

        {quote ? (
          <View style={{ marginTop: 18 }}>
            <Row label={t('cart.subtotal')} value={money(quote.subtotal_minor, quote.currency)} />
            {quote.discount_minor > 0 ? (
              <Row label={t('sets.discount')} value={`−${money(quote.discount_minor, quote.currency)}`} />
            ) : null}
            {quote.delivery_fee_minor > 0 ? (
              <Row label={t('cart.delivery')} value={money(quote.delivery_fee_minor, quote.currency)} />
            ) : null}
            <Row
              label={t('cart.total')}
              value={
                (quote.requires_weighing ? `${t('cart.about')} ` : '') +
                money(quote.total_minor, quote.currency)
              }
              strong
            />

            {/* Weighed goods: the customer agrees to an estimate and a ceiling,
                not to a figure we cannot actually promise. */}
            {quote.requires_weighing ? (
              <View style={{ marginTop: 14 }}>
                <Note>
                  {t('shop.weighedNote')}{' '}
                  {t('cart.upTo', { amount: money(quote.weighed_ceiling_minor, quote.currency) })}
                </Note>
              </View>
            ) : null}

            {!quote.meets_minimum ? (
              <View style={{ marginTop: 12 }}>
                <Note warn>{t('cart.minimum', { amount: money(quote.minimum_order_minor, quote.currency) })}</Note>
              </View>
            ) : null}
          </View>
        ) : null}

        <Button
          title={t('cart.checkout')}
          onPress={checkout}
          busy={cart.quoting}
          disabled={!quote || !quote.meets_minimum}
          style={{ marginTop: 22 }}
        />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 13, alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.lineSoft,
  },
  media: { width: 74, height: 74, borderRadius: space.radius, backgroundColor: color.paper3, overflow: 'hidden' },
  name: { fontFamily: font.displaySemi, fontSize: 17, lineHeight: 20, color: color.ink },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.paper2, borderRadius: 999 },
  stepBtn: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, fontFamily: font.semi, color: color.ink },
  qty: { minWidth: 42, textAlign: 'center', fontFamily: font.semi, fontSize: 13, color: color.ink },
  lineTotal: { fontFamily: font.semi, fontSize: 16, color: color.ink },
  was: { fontFamily: font.body, fontSize: 12, color: color.ink3, textDecorationLine: 'line-through' },
  remove: { fontSize: 22, color: color.ink3, paddingHorizontal: 4 },
})
