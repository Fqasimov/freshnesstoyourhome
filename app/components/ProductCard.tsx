import { memo } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import { useCart } from '@/lib/cart'
import { pick, t } from '@/lib/i18n'
import { price } from '@/lib/money'
import { duration, ease } from '@/lib/motion'
import { productImage } from '@/assets/products'
import type { Product } from '@/lib/api'
import { Icon } from './Icon'
import { PressableScale } from './PressableScale'
import { color, font, space } from '@/theme/tokens'

const tap = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) }

/**
 * A product on a shelf: the photograph on a soft ground, the price in a pill
 * under it, the name below — the order a shopper's eye goes in. The "+" sits
 * on the photo's corner and becomes a − n + stepper once the product is in
 * the basket, so adding a second never means opening anything.
 */
export const ProductCard = memo(function ProductCard ({ product, width }: { product: Product; width?: number }) {
  const cart = useCart()
  const router = useRouter()

  const qty = cart.qtyOf(product.id)
  // Half-kilo steps for weighed goods, whole units for everything else.
  const step = product.is_weight_based ? 0.5 : 1
  const image = productImage(product.id)

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
      style={[s.card, width ? { width } : { flex: 1 }]}
      accessibilityRole="button"
      accessibilityLabel={pick(product.name)}
    >
      <View style={s.media}>
        {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : (
          <View style={s.noPhoto}><Icon name="basket" size={30} color={color.paper3} /></View>
        )}

        {product.is_popular ? (
          <View style={s.hit}>
            <Icon name="fire" size={10} color={color.brick} />
            <Text style={s.hitText}>{t('cat.hit')}</Text>
          </View>
        ) : null}

        <View style={s.corner}>
          {qty > 0 ? (
            <Animated.View entering={FadeIn.duration(duration.fast).easing(ease.out)} style={s.stepper}>
              <Pressable
                onPress={() => { tap(); cart.setQty(product.id, qty - step) }}
                hitSlop={6}
                style={s.stepBtn}
                accessibilityRole="button"
                accessibilityLabel={t('cart.remove')}
              >
                <Icon name="dash-lg" size={15} color="#fff" />
              </Pressable>
              <Animated.Text key={qty} entering={ZoomIn.duration(160).easing(ease.out)} style={s.qty}>
                {product.is_weight_based ? `${qty} ${t('unit.kg')}` : qty}
              </Animated.Text>
              <Pressable
                onPress={() => { tap(); cart.add(product.id, step) }}
                hitSlop={6}
                style={s.stepBtn}
                accessibilityRole="button"
                accessibilityLabel={t('shop.add')}
              >
                <Icon name="plus-lg" size={15} color="#fff" />
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(duration.fast)} exiting={FadeOut.duration(100)}>
              <PressableScale
                scaleTo={0.9}
                onPress={() => { tap(); cart.add(product.id, step) }}
                style={s.add}
                accessibilityRole="button"
                accessibilityLabel={t('shop.add')}
                hitSlop={6}
              >
                <Icon name="plus-lg" size={18} color={color.forest} />
              </PressableScale>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={s.body}>
        <View style={s.pricePill}>
          <Text style={s.price}>{price(product.price_minor, product.currency)}</Text>
          {product.is_weight_based ? <Text style={s.per}>/{t('unit.kg')}</Text> : null}
        </View>
        <Text style={s.name} numberOfLines={2}>{pick(product.name)}</Text>
        <Text style={s.unit} numberOfLines={1}>{pick(product.unit_label)}</Text>
      </View>
    </PressableScale>
  )
})

const s = StyleSheet.create({
  card: { },
  media: {
    aspectRatio: 1, borderRadius: space.radiusLg, overflow: 'hidden',
    backgroundColor: color.paper2,
  },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hit: {
    position: 'absolute', left: 8, top: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 3, paddingHorizontal: 7, borderRadius: 999,
    backgroundColor: color.acid,
  },
  hitText: { fontFamily: font.bold, fontSize: 10.5, color: color.ink, letterSpacing: 0.3 },
  corner: { position: 'absolute', right: 8, bottom: 8 },
  add: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1B2916', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  stepper: {
    flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 19,
    backgroundColor: color.forest, paddingHorizontal: 2,
    shadowColor: '#1B2916', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  stepBtn: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 26, textAlign: 'center', fontFamily: font.bold, fontSize: 13.5, color: '#fff' },
  body: { paddingTop: 9, paddingHorizontal: 2, gap: 4 },
  pricePill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'baseline',
    paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: color.paper2,
  },
  price: { fontFamily: font.bold, fontSize: 16, color: color.ink },
  per: { fontFamily: font.semi, fontSize: 12.5, color: color.ink2, marginLeft: 1 },
  name: { fontFamily: font.medium, fontSize: 14, lineHeight: 18.5, color: color.ink, marginTop: 2 },
  unit: { fontFamily: font.body, fontSize: 12.5, color: color.ink3 },
})
