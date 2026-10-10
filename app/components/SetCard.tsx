import { memo } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'

import type { Bundle } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { useCatalogue } from '@/lib/catalogue'
import { pick, t } from '@/lib/i18n'
import { price } from '@/lib/money'
import { bundlePhoto, productPhoto } from '@/lib/photos'
import { Icon } from './Icon'
import { color, font, space } from '@/theme/tokens'

const tap = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) }

/**
 * What a set costs, before and after the panel's discount — rounded the way
 * the server rounds it, so the card agrees with the basket. Display only:
 * the basket's figure comes from the server's quote.
 */
export function setPricing (bundle: Bundle, byId: ReturnType<typeof useCatalogue>['byId']) {
  const full = bundle.items.reduce((sum, i) => sum + Math.round((byId(i.product_id)?.price_minor ?? 0) * i.qty), 0)
  const now = full - Math.floor(full * bundle.discount_percent / 100)
  return { full, now }
}

/**
 * A set on the shop's front: its own photograph if the shop took one,
 * otherwise its products side by side; the discount, what is in it, and one
 * button that puts the whole set in the basket.
 */
export const SetCard = memo(function SetCard ({ bundle, width }: { bundle: Bundle; width: number }) {
  const cart = useCart()
  const catalogue = useCatalogue()

  const products = bundle.items.map(i => ({ item: i, product: catalogue.byId(i.product_id) }))
  const own = bundlePhoto(bundle)
  const { full, now } = setPricing(bundle, catalogue.byId)
  const qty = cart.setsOf(bundle.id)

  return (
    <View style={[s.card, { width }]}>
      <View style={s.media}>
        {own ? (
          <Image source={own} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <View style={s.strip}>
            {products.slice(0, 4).map(({ item, product }) => {
              const photo = productPhoto(product)
              return (
                <View key={item.product_id} style={s.stripCell}>
                  {photo ? <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
                </View>
              )
            })}
          </View>
        )}
        <View style={s.badge}><Text style={s.badgeText}>−{bundle.discount_percent}%</Text></View>
      </View>

      <View style={s.body}>
        <Text style={s.name} numberOfLines={2}>{pick(bundle.name)}</Text>
        <Text style={s.items} numberOfLines={2}>
          {products.map(({ item, product }) =>
            (product ? pick(product.name) : item.product_id) + (item.qty !== 1 ? ` ×${item.qty}` : '')).join(' · ')}
        </Text>

        <View style={s.foot}>
          <View>
            <Text style={s.was}>{price(full)}</Text>
            <Text style={s.now}>{price(now)}</Text>
          </View>

          {qty > 0 ? (
            <View style={s.stepper}>
              <Pressable onPress={() => { tap(); cart.setSetQty(bundle.id, qty - 1) }} hitSlop={6} style={s.stepBtn}
                accessibilityRole="button" accessibilityLabel={t('cart.remove')}>
                <Icon name="dash-lg" size={15} color="#fff" />
              </Pressable>
              <Text style={s.qty}>{qty}</Text>
              <Pressable onPress={() => { tap(); cart.setSetQty(bundle.id, qty + 1) }} hitSlop={6} style={s.stepBtn}
                accessibilityRole="button" accessibilityLabel={t('sets.add')}>
                <Icon name="plus-lg" size={15} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { tap(); cart.setSetQty(bundle.id, 1) }} style={s.add}
              accessibilityRole="button" accessibilityLabel={t('sets.add')}>
              <Icon name="plus-lg" size={14} color="#fff" />
              <Text style={s.addText}>{t('sets.add')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
})

const s = StyleSheet.create({
  card: {
    borderRadius: space.radiusLg, backgroundColor: '#fff', overflow: 'hidden',
    borderWidth: 1, borderColor: color.lineSoft,
  },
  media: { height: 140, backgroundColor: color.paper3 },
  strip: { flex: 1, flexDirection: 'row' },
  stripCell: { flex: 1, borderRightWidth: 2, borderRightColor: '#fff', overflow: 'hidden' },
  badge: {
    position: 'absolute', top: 10, left: 10, backgroundColor: color.brick,
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10,
  },
  badgeText: { fontFamily: font.bold, fontSize: 13, color: '#fff' },
  body: { padding: 14 },
  name: { fontFamily: font.displaySemi, fontSize: 19, lineHeight: 22, color: color.ink },
  items: { fontFamily: font.body, fontSize: 12.5, lineHeight: 17, color: color.ink3, marginTop: 4, minHeight: 34 },
  foot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  was: { fontFamily: font.body, fontSize: 12.5, color: color.ink3, textDecorationLine: 'line-through' },
  now: { fontFamily: font.bold, fontSize: 19, color: color.forest },
  add: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color.forest,
    borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14,
  },
  addText: { fontFamily: font.semi, fontSize: 13.5, color: '#fff' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.forest, borderRadius: 999 },
  stepBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 24, textAlign: 'center', fontFamily: font.bold, fontSize: 14, color: '#fff' },
})
