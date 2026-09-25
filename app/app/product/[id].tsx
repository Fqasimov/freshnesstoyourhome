import { useEffect } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import { useCart } from '@/lib/cart'
import { useCatalogue } from '@/lib/catalogue'
import { pick, t, useLang } from '@/lib/i18n'
import { price } from '@/lib/money'
import { duration, ease, spring } from '@/lib/motion'
import { productImage } from '@/assets/products'
import { Icon } from '@/components/Icon'
import { PressableScale } from '@/components/PressableScale'
import { color, font, space } from '@/theme/tokens'

/**
 * A product, close up, in a sheet over the shelf it came from — so closing
 * it puts you back exactly where you were.
 */
export default function ProductSheet () {
  const { id } = useLocalSearchParams<{ id: string }>()
  const catalogue = useCatalogue()
  const cart = useCart()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { height, width } = useWindowDimensions()
  useLang()

  const product = catalogue.byId(id ?? '')
  const category = catalogue.categories.find(c => c.id === product?.category_id)
  const image = product ? productImage(product.id) : undefined
  const qty = product ? cart.qtyOf(product.id) : 0
  const step = product?.is_weight_based ? 0.5 : 1

  const y = useSharedValue(height)
  useEffect(() => { y.value = withSpring(0, spring) }, [y])

  function close () {
    y.value = withTiming(height, { duration: duration.base, easing: ease.in }, (ok) => {
      if (ok) runOnJS(router.back)()
    })
  }

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  const backdrop = useAnimatedStyle(() => ({ opacity: 1 - y.value / height }))

  const tap = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) }

  if (!product) return null

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('product.close')} />
      </Animated.View>

      <Animated.View style={[s.panel, { maxHeight: height - insets.top - 24, maxWidth: 620, alignSelf: 'center', width: '100%' }, panel]}>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          <View style={[s.photo, { height: Math.min(width, 620) * 0.82 }]}>
            {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
            <PressableScale onPress={close} style={s.close} accessibilityRole="button" accessibilityLabel={t('product.close')}>
              <Icon name="x-lg" size={16} color={color.ink} />
            </PressableScale>
            {product.is_popular ? (
              <View style={s.hit}>
                <Icon name="fire" size={11} color={color.brick} />
                <Text style={s.hitText}>{t('cat.hit')}</Text>
              </View>
            ) : null}
          </View>

          <View style={s.body}>
            {category ? <Text style={s.cat}>{pick(category.name)}</Text> : null}
            <Text style={s.name}>{pick(product.name)}</Text>
            <Text style={s.unit}>{pick(product.unit_label)}</Text>

            <View style={s.priceRow}>
              <View style={s.pricePill}>
                <Text style={s.price}>{price(product.price_minor, product.currency)}</Text>
                {product.is_weight_based ? <Text style={s.per}>/{t('unit.kg')}</Text> : null}
              </View>
            </View>

            {product.is_weight_based ? (
              <View style={s.note}>
                <Icon name="info-circle" size={15} color={color.forest} />
                <View style={{ flex: 1 }}>
                  <Text style={s.noteTitle}>{t('shop.weighed')}</Text>
                  <Text style={s.noteText}>{t('shop.weighedNote')}</Text>
                </View>
              </View>
            ) : null}

            {pick(product.description) ? (
              <>
                <Text style={s.about}>{t('product.about')}</Text>
                <Text style={s.desc}>{pick(product.description)}</Text>
              </>
            ) : null}
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          {qty > 0 ? (
            <Animated.View entering={FadeIn.duration(duration.fast)} style={s.footRow}>
              <View style={s.stepper}>
                <Pressable onPress={() => { tap(); cart.setQty(product.id, qty - step) }} style={s.stepBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('cart.remove')}>
                  <Icon name="dash-lg" size={18} color={color.ink} />
                </Pressable>
                <Text style={s.qty}>{product.is_weight_based ? `${qty} ${t('unit.kg')}` : qty}</Text>
                <Pressable onPress={() => { tap(); cart.add(product.id, step) }} style={s.stepBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('shop.add')}>
                  <Icon name="plus-lg" size={18} color={color.ink} />
                </Pressable>
              </View>
              <PressableScale onPress={() => { close(); setTimeout(() => router.push('/(tabs)/basket'), 260) }} style={[s.cta, { flex: 1 }]} accessibilityRole="button">
                <Icon name="basket3-fill" size={17} color="#fff" />
                <Text style={s.ctaText}>{t('product.inBasket')}</Text>
              </PressableScale>
            </Animated.View>
          ) : (
            <PressableScale onPress={() => { tap(); cart.add(product.id, step) }} style={s.cta} accessibilityRole="button">
              <Icon name="plus-lg" size={17} color="#fff" />
              <Text style={s.ctaText}>{t('product.add')}</Text>
              <Text style={s.ctaPrice}>{price(product.price_minor, product.currency)}</Text>
            </PressableScale>
          )}
        </View>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(27,41,22,0.45)' },
  panel: {
    position: 'absolute', bottom: 0,
    backgroundColor: color.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
  },
  photo: { backgroundColor: color.paper2 },
  close: {
    position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  hit: {
    position: 'absolute', left: 14, top: 14, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: color.acid,
  },
  hitText: { fontFamily: font.bold, fontSize: 11.5, color: color.ink },
  body: { padding: space.gutter + 2 },
  cat: { fontFamily: font.semi, fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase', color: color.leafDark },
  name: { fontFamily: font.displaySemi, fontSize: 30, lineHeight: 33, color: color.ink, marginTop: 6 },
  unit: { fontFamily: font.body, fontSize: 14, color: color.ink3, marginTop: 4 },
  priceRow: { flexDirection: 'row', marginTop: 14 },
  pricePill: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 6, paddingHorizontal: 13, borderRadius: 999, backgroundColor: color.paper2 },
  price: { fontFamily: font.bold, fontSize: 22, color: color.ink },
  per: { fontFamily: font.semi, fontSize: 14, color: color.ink2, marginLeft: 2 },
  note: {
    flexDirection: 'row', gap: 10, marginTop: 18, padding: 14,
    borderRadius: space.radius, backgroundColor: '#EEF4E6',
  },
  noteTitle: { fontFamily: font.semi, fontSize: 14, color: color.forest2 },
  noteText: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.ink2, marginTop: 2 },
  about: { fontFamily: font.displaySemi, fontSize: 20, color: color.ink, marginTop: 22, marginBottom: 6 },
  desc: { fontFamily: font.body, fontSize: 15, lineHeight: 23, color: color.ink2 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.gutter, paddingTop: 12,
    backgroundColor: 'rgba(246,243,234,0.97)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line,
  },
  footRow: { flexDirection: 'row', gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: space.radius, backgroundColor: color.paper2, height: 54 },
  stepBtn: { width: 48, height: 54, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 44, textAlign: 'center', fontFamily: font.bold, fontSize: 16, color: color.ink },
  cta: {
    height: 54, borderRadius: space.radius, backgroundColor: color.forest,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18,
  },
  ctaText: { fontFamily: font.semi, fontSize: 16, color: '#fff' },
  ctaPrice: { fontFamily: font.bold, fontSize: 15, color: color.acid, marginLeft: 4 },
})
