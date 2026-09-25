import { useEffect, useState, type PropsWithChildren } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { duration, ease, spring } from '@/lib/motion'
import { color, space } from '@/theme/tokens'

/**
 * A bottom sheet. Rises on a soft spring, leaves on a quick ease-in so it
 * never holds up what comes after, and the backdrop fades with it. Tapping
 * outside closes it.
 */
export function Sheet ({ open, onClose, children }: PropsWithChildren<{ open: boolean; onClose: () => void }>) {
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(open)
  const y = useSharedValue(1)

  useEffect(() => {
    if (open) {
      setMounted(true)
      y.value = withSpring(0, spring)
    } else if (mounted) {
      y.value = withTiming(1, { duration: duration.fast, easing: ease.in }, (ok) => {
        if (ok) runOnJS(setMounted)(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * 520 }] }))
  const backdrop = useAnimatedStyle(() => ({ opacity: 1 - y.value }))

  if (!mounted) return null

  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose} animationType="none">
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View style={[s.panel, { paddingBottom: insets.bottom + 16 }, panel]}>
        <View style={s.grip} />
        {children}
      </Animated.View>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(27,41,22,0.42)' },
  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: color.paper,
    borderTopLeftRadius: space.radiusLg, borderTopRightRadius: space.radiusLg,
    paddingHorizontal: space.gutter, paddingTop: 10,
  },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.paper3, marginBottom: 12 },
})
