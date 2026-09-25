import { memo, useEffect, useRef } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import Animated, {
  interpolate, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation, type SharedValue,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { color, font } from '@/theme/tokens'

export const ITEM = 44
const VISIBLE = 5

/**
 * A scroll wheel — the slider for one part of a date.
 *
 * Snaps to a row, and the rows curve away from the middle: smaller and fainter
 * the further they are from the selection band, which is what makes a flat
 * list read as a drum. A light tick under the finger on each row it passes.
 */
export function Wheel ({ items, index, onChange, width }: {
  items: string[]; index: number; onChange: (i: number) => void; width: number | `${number}%`
}) {
  const ref = useRef<Animated.ScrollView>(null)
  const y = useSharedValue(index * ITEM)
  const tickAt = useSharedValue(index)
  const last = useRef(index)

  useEffect(() => {
    // Jump without animating when the list itself changes (days in a month).
    ref.current?.scrollTo({ y: index * ITEM, animated: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y
    const i = Math.round(e.contentOffset.y / ITEM)
    if (i !== tickAt.value) {
      tickAt.value = i
      runOnJS(tick)()
    }
  })

  function settle (offset: number) {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(offset / ITEM)))
    if (i !== last.current) {
      last.current = i
      onChange(i)
    }
  }

  return (
    <View style={{ width, height: ITEM * VISIBLE }}>
      <View pointerEvents="none" style={s.band} />
      <Animated.ScrollView
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.y)}
        snapToInterval={ITEM}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: index * ITEM }}
        contentContainerStyle={{ paddingVertical: ITEM * 2 }}
      >
        {items.map((label, i) => <Row key={`${label}-${i}`} label={label} i={i} y={y} />)}
      </Animated.ScrollView>
      {/* The web has no momentum-end event: settle once the wheel stops. */}
      {Platform.OS === 'web' ? <WebSettle y={y} onSettle={settle} /> : null}
    </View>
  )
}

function tick () {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
}

/** Reports the resting position on the web, where scrolling has no end event. */
function WebSettle ({ y, onSettle }: { y: SharedValue<number>; onSettle: (o: number) => void }) {
  useEffect(() => {
    let prev = -1
    const id = setInterval(() => {
      if (y.value === prev) onSettle(y.value)
      prev = y.value
    }, 160)
    return () => clearInterval(id)
  }, [y, onSettle])
  return null
}

const Row = memo(function Row ({ label, i, y }: { label: string; i: number; y: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = (y.value - i * ITEM) / ITEM
    return {
      opacity: interpolate(Math.abs(d), [0, 1, 2.5], [1, 0.45, 0.15], Extrapolation.CLAMP),
      transform: [
        { perspective: 600 },
        { rotateX: `${interpolate(d, [-2.5, 0, 2.5], [55, 0, -55], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(Math.abs(d), [0, 2], [1, 0.86], Extrapolation.CLAMP) },
      ],
    }
  })

  return (
    <Animated.View style={[s.row, style]}>
      <Text style={s.text} numberOfLines={1}>{label}</Text>
    </Animated.View>
  )
})

const s = StyleSheet.create({
  band: {
    position: 'absolute', left: 0, right: 0, top: ITEM * 2, height: ITEM,
    borderRadius: 12, backgroundColor: color.paper2,
  },
  row: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: font.semi, fontSize: 18, color: color.ink },
})
