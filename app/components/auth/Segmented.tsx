import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { spring } from '@/lib/motion'
import { color, font } from '@/theme/tokens'

/** Two choices and a pill that glides between them. */
export function Segmented<T extends string> ({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void
}) {
  const [width, setWidth] = useState(0)
  const index = Math.max(0, options.findIndex(o => o.value === value))
  const seg = width / options.length

  const pill = useAnimatedStyle(() => ({
    width: seg - 8,
    transform: [{ translateX: withSpring(index * seg, spring) }],
  }), [index, seg])

  return (
    <View style={s.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {width > 0 ? <Animated.View style={[s.pill, pill]} /> : null}
      {options.map(o => (
        <Pressable
          key={o.value}
          style={s.option}
          onPress={() => onChange(o.value)}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.value === value }}
        >
          <Text style={[s.label, o.value === value && { color: color.ink }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: color.paper2, borderRadius: 999, padding: 4, height: 50 },
  pill: {
    position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999, backgroundColor: '#fff',
    shadowColor: '#1B2916', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: font.semi, fontSize: 15, color: color.ink3 },
})
