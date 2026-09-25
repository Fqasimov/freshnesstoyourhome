import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated'
import { duration, ease } from '@/lib/motion'
import { color, font, space } from '@/theme/tokens'

export type OtpHandle = { shake: () => void; focus: () => void }

/**
 * Six boxes over one hidden field.
 *
 * One real input underneath means paste, the keyboard's "from Messages / Mail"
 * suggestion and backspace all just work; the boxes only draw it. A wrong code
 * shakes the row — side to side, the universal "no" — and clears it.
 */
export const OtpInput = forwardRef<OtpHandle, {
  value: string; onChange: (v: string) => void; onComplete: (v: string) => void; error?: boolean
}>(function OtpInput ({ value, onChange, onComplete, error }, ref) {
  const input = useRef<TextInput>(null)
  const [focused, setFocused] = useState(false)
  const x = useSharedValue(0)

  useImperativeHandle(ref, () => ({
    shake: () => {
      x.value = withSequence(
        withTiming(-9, { duration: 50 }), withRepeat(withTiming(9, { duration: 90 }), 3, true), withTiming(0, { duration: 60 }),
      )
    },
    focus: () => input.current?.focus(),
  }))

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  // autoFocus alone loses the race with the screen's own entrance on some
  // devices; asking again once it has settled makes the keyboard dependable.
  useEffect(() => {
    const id = setTimeout(() => input.current?.focus(), 350)
    return () => clearTimeout(id)
  }, [])

  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityRole="none">
      <Animated.View style={[s.row, row]}>
        {Array.from({ length: 6 }, (_, i) => (
          <Box
            key={i}
            digit={value[i] ?? ''}
            active={focused && (i === value.length || (i === 5 && value.length === 6))}
            error={Boolean(error)}
          />
        ))}
      </Animated.View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(v) => {
          const next = v.replace(/\D/g, '').slice(0, 6)
          onChange(next)
          if (next.length === 6) onComplete(next)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        autoFocus
        caretHidden
        style={s.hidden}
        accessibilityLabel="Code"
      />
    </Pressable>
  )
})

function Box ({ digit, active, error }: { digit: string; active: boolean; error: boolean }) {
  const pop = useSharedValue(1)
  const caret = useSharedValue(0)

  useEffect(() => {
    if (digit) pop.value = withSequence(withTiming(1.08, { duration: 70, easing: ease.out }), withSpring(1, { damping: 14, stiffness: 300 }))
  }, [digit, pop])

  useEffect(() => {
    caret.value = active ? withRepeat(withSequence(withTiming(1, { duration: 1 }), withTiming(1, { duration: 520 }), withTiming(0, { duration: 1 }), withTiming(0, { duration: 420 })), -1) : 0
  }, [active, caret])

  const box = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    borderColor: withTiming(error ? color.brick : active ? color.forest : digit ? 'rgba(58,106,44,0.45)' : 'rgba(27,41,22,0.12)', { duration: duration.fast }),
    backgroundColor: withTiming(active ? '#FFFFFF' : digit ? '#FFFFFF' : '#FBFAF5', { duration: duration.fast }),
  }), [error, active, digit])
  const bar = useAnimatedStyle(() => ({ opacity: caret.value }))

  return (
    <Animated.View style={[s.box, box]}>
      {digit ? <Text style={s.digit}>{digit}</Text> : <Animated.View style={[s.caret, bar]} />}
    </Animated.View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1, aspectRatio: 0.82, maxWidth: 58,
    borderWidth: 1.5, borderRadius: space.radius,
    alignItems: 'center', justifyContent: 'center',
  },
  digit: { fontFamily: font.bold, fontSize: 26, color: color.ink },
  caret: { width: 2, height: 26, borderRadius: 1, backgroundColor: color.forest },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
})
