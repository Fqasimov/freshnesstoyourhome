import { forwardRef, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import Animated, { FadeInUp, FadeOut, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { Icon, type IconName } from '../Icon'
import { duration, ease } from '@/lib/motion'
import { t } from '@/lib/i18n'
import { color, font, space, WEB_NO_OUTLINE } from '@/theme/tokens'

type Props = TextInputProps & {
  label: string
  icon: IconName
  error?: string | null
  /** A password field: adds the show/hide eye. */
  secret?: boolean
  right?: ReactNode
}

/**
 * A labelled field with its icon. The border answers focus and error; the
 * error slides in under the field rather than jumping the layout about.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField (
  { label, icon, error, secret, right, onFocus, onBlur, style, ...input }, ref,
) {
  const [focused, setFocused] = useState(false)
  const [shown, setShown] = useState(false)

  const frame = useAnimatedStyle(() => ({
    borderColor: withTiming(error ? color.brick : focused ? color.forest : 'rgba(27,41,22,0.12)', { duration: duration.fast, easing: ease.out }),
    backgroundColor: withTiming(focused ? '#FFFFFF' : '#FBFAF5', { duration: duration.fast, easing: ease.out }),
  }), [error, focused])

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <Animated.View style={[s.frame, frame]}>
        <Icon name={icon} size={18} color={focused ? color.forest : color.ink3} />
        <TextInput
          ref={ref}
          {...input}
          secureTextEntry={secret && !shown}
          placeholderTextColor="#8C9384"
          onFocus={(e) => { setFocused(true); onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); onBlur?.(e) }}
          style={[s.input, style]}
        />
        {secret ? (
          <Pressable
            onPress={() => setShown(v => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={shown ? t('pw.hide') : t('pw.show')}
          >
            <Icon name={shown ? 'eye-slash' : 'eye'} size={19} color={color.ink3} />
          </Pressable>
        ) : right}
      </Animated.View>
      {error ? (
        <Animated.View entering={FadeInUp.duration(duration.fast).easing(ease.out)} exiting={FadeOut.duration(120)} style={s.errRow}>
          <Icon name="exclamation-circle" size={13} color={color.brick} />
          <Text style={s.err}>{error}</Text>
        </Animated.View>
      ) : null}
    </View>
  )
})

const s = StyleSheet.create({
  label: { fontFamily: font.semi, fontSize: 13, color: color.ink2, marginBottom: 7, marginLeft: 2 },
  frame: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    minHeight: 54, paddingHorizontal: 15,
    borderWidth: 1.5, borderRadius: space.radius,
  },
  // 16 or iOS zooms the page when the field is focused.
  input: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.ink, paddingVertical: 14, ...WEB_NO_OUTLINE },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, marginLeft: 2 },
  err: { fontFamily: font.medium, fontSize: 13, color: color.brick, flexShrink: 1 },
})
