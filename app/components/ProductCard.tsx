import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useCart } from '@/lib/cart'
import { useCatalogue } from '@/lib/catalogue'
import { pick, t } from '@/lib/i18n'
import { money } from '@/lib/money'
import { productImage } from '@/assets/products'
import type { Product } from '@/lib/api'
import { color, font, space } from '@/theme/tokens'

export const ProductCard = memo(function ProductCard ({ product }: { product: Product }) {
  const cart = useCart()
  const catalogue = useCatalogue()

  const qty = cart.qtyOf(product.id)

  // Half-kilo steps for weighed goods, whole units for everything else. Asking
  // someone to type 0.5 on a phone to buy half a kilo of cheese is a bad screen.
  const step = product.is_weight_based ? 0.5 : 1

  const category = catalogue.categories.find(c => c.id === product.category_id)
  const image = productImage(product.id)

  return (
    <View style={s.card}>
      <View style={s.media}>
        {image ? (
          <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
        ) : null}
        {product.is_weight_based ? (
          <View style={s.flag}><Text style={s.flagText}>{t('shop.perKg')}</Text></View>
        ) : null}
      </View>

      <View style={s.body}>
        {category ? <Text style={s.cat}>{pick(category.name)}</Text> : null}
        <Text style={s.name} numberOfLines={2}>{pick(product.name)}</Text>
        <Text style={s.unit}>{pick(product.unit_label)}</Text>

        <View style={s.foot}>
          <Text style={s.price}>{money(product.price_minor, product.currency)}</Text>

          {qty > 0 ? (
            <View style={s.stepper}>
              <Pressable
                onPress={() => cart.setQty(product.id, qty - step)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('cart.remove')}
                style={s.stepBtn}
              >
                <Text style={s.stepText}>−</Text>
              </Pressable>
              <Text style={s.qty}>{product.is_weight_based ? `${qty} kg` : qty}</Text>
              <Pressable
                onPress={() => cart.add(product.id, step)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('shop.add')}
                style={s.stepBtn}
              >
                <Text style={s.stepText}>+</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => cart.add(product.id, step)}
              accessibilityRole="button"
              accessibilityLabel={t('shop.add')}
              // String transform, not the legacy [{ scale }] array: React
              // Native Web 0.21 throws on the array form and takes the whole
              // screen down with it on the first tap.
              style={({ pressed }) => [s.add, pressed && { opacity: 0.8, transform: 'scale(0.92)' }]}
            >
              <Text style={s.addText}>+</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
})

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: space.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.lineSoft,
    overflow: 'hidden',
  },
  media: { aspectRatio: 1, backgroundColor: color.paper3 },
  flag: {
    position: 'absolute', left: 0, top: 10,
    backgroundColor: color.forest,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  flagText: {
    fontFamily: font.semi, fontSize: 10, color: '#fff',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  body: { padding: 11, paddingBottom: 13, flex: 1, gap: 3 },
  cat: {
    fontFamily: font.semi, fontSize: 10, letterSpacing: 0.7,
    textTransform: 'uppercase', color: color.leafDark,
  },
  name: { fontFamily: font.displaySemi, fontSize: 17, lineHeight: 20, color: color.ink },
  unit: { fontFamily: font.body, fontSize: 13, color: color.ink3 },
  foot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, marginTop: 'auto', paddingTop: 8,
  },
  price: { fontFamily: font.bold, fontSize: 17, color: color.ink },
  add: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: color.forest, alignItems: 'center', justifyContent: 'center',
  },
  addText: { color: '#fff', fontSize: 22, lineHeight: 24, fontFamily: font.medium },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: color.paper2, borderRadius: 999,
  },
  stepBtn: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, fontFamily: font.semi, color: color.ink },
  qty: { minWidth: 40, textAlign: 'center', fontFamily: font.semi, fontSize: 13, color: color.ink },
})
