import { FlatList, StyleSheet, View, useWindowDimensions, type ListRenderItem } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import type { ReactElement } from 'react'
import type { Product } from '@/lib/api'
import { duration, ease } from '@/lib/motion'
import { ProductCard } from './ProductCard'
import { space } from '@/theme/tokens'

const GAP = 12

/** Two columns of cards; the first screenful arrives in a short cascade. */
export function ProductGrid ({ products, header, empty }: {
  products: Product[]; header?: ReactElement | null; empty?: ReactElement | null
}) {
  const { width } = useWindowDimensions()
  const inner = Math.min(width, 620) - space.gutter * 2
  const card = Math.floor((inner - GAP) / 2)

  const render: ListRenderItem<Product> = ({ item, index }) => (
    <Animated.View
      entering={index < 8 ? FadeInDown.delay(index * 35).duration(duration.base).easing(ease.out) : undefined}
      style={{ width: card }}
    >
      <ProductCard product={item} width={card} />
    </Animated.View>
  )

  return (
    <FlatList<Product>
      data={products}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={s.list}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={render}
      initialNumToRender={8}
      windowSize={7}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
    />
  )
}

const s = StyleSheet.create({
  list: { paddingHorizontal: space.gutter, paddingBottom: 40, maxWidth: 620, width: '100%', alignSelf: 'center' },
})
