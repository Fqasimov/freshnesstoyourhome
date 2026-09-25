import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { productImage } from '@/assets/products'
import { CATEGORY_LOOK, FALLBACK_LOOK } from '@/lib/categoryStyle'
import { duration, ease, STAGGER } from '@/lib/motion'
import { PressableScale } from './PressableScale'
import { color, font, space } from '@/theme/tokens'

/**
 * A category as a tile: its name top-left on a soft ground, and its
 * photograph in a round plate breaking out of the bottom-right corner.
 */
export function CategoryTile ({ id, name, count, fallbackPhoto, index, width }: {
  id: string; name: string; count: number; fallbackPhoto?: string; index: number; width: number
}) {
  const router = useRouter()
  const look = CATEGORY_LOOK[id] ?? FALLBACK_LOOK
  const photo = productImage(look.photo) ?? (fallbackPhoto ? productImage(fallbackPhoto) : undefined)
  const plate = width * 0.78

  return (
    <Animated.View entering={FadeInDown.delay(80 + index * STAGGER).duration(duration.base).easing(ease.out)}>
      <PressableScale
        onPress={() => router.push({ pathname: '/category/[id]', params: { id } })}
        style={[s.tile, { width, height: width * 1.08, backgroundColor: look.bg }]}
        accessibilityRole="button"
        accessibilityLabel={name}
      >
        <Text style={[s.name, { color: color.ink }]} numberOfLines={3}>{name}</Text>
        <Text style={[s.count, { color: look.ink }]}>{count}</Text>
        {photo ? (
          <View style={[s.plate, { width: plate, height: plate, borderRadius: plate / 2, right: -plate * 0.2, bottom: -plate * 0.2 }]}>
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          </View>
        ) : null}
      </PressableScale>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  tile: { borderRadius: space.radiusLg, overflow: 'hidden', padding: 12 },
  name: { fontFamily: font.semi, fontSize: 14, lineHeight: 17.5, maxWidth: '92%' },
  count: { fontFamily: font.bold, fontSize: 11.5, marginTop: 4, opacity: 0.8 },
  plate: {
    position: 'absolute', overflow: 'hidden',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.75)', backgroundColor: color.paper3,
  },
})
