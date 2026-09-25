import { type PropsWithChildren, type ReactNode } from 'react'
import {
  ActivityIndicator, Pressable, StyleSheet, Text, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Icon } from './Icon'
import { PressableScale } from './PressableScale'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, font, space, type as ty } from '@/theme/tokens'

/* Every piece of text goes through these so the brand face is never forgotten
   and a system font never sneaks in. */

export function H1 ({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[ty.h1, { color: color.ink }, style]}>{children}</Text>
}

export function H2 ({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[ty.h2, { color: color.ink }, style]}>{children}</Text>
}

export function H3 ({ children, style, numberOfLines }: PropsWithChildren<{
  style?: StyleProp<TextStyle>; numberOfLines?: number
}>) {
  return <Text numberOfLines={numberOfLines} style={[ty.h3, { color: color.ink }, style]}>{children}</Text>
}

export function Body ({ children, style, numberOfLines }: PropsWithChildren<{
  style?: StyleProp<TextStyle>; numberOfLines?: number
}>) {
  return <Text numberOfLines={numberOfLines} style={[ty.body, { color: color.ink }, style]}>{children}</Text>
}

export function Small ({ children, style, muted, numberOfLines }: PropsWithChildren<{
  style?: StyleProp<TextStyle>; muted?: boolean; numberOfLines?: number
}>) {
  return (
    <Text numberOfLines={numberOfLines} style={[ty.small, { color: muted ? color.ink3 : color.ink }, style]}>
      {children}
    </Text>
  )
}

export function Label ({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[ty.label, { color: color.ink2 }, style]}>{children}</Text>
}

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  busy?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button ({ title, onPress, variant = 'primary', disabled, busy, style }: ButtonProps) {
  const inert = disabled || busy

  return (
    <PressableScale
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inert), busy: Boolean(busy) }}
      style={[
        s.btn,
        variant === 'primary' && { backgroundColor: color.forest },
        variant === 'ghost' && { backgroundColor: color.paper2 },
        variant === 'danger' && { borderWidth: 1, borderColor: color.brick },
        inert && { opacity: 0.5 },
        style,
      ]}
    >
      {busy && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#fff' : color.forest}
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={[
        s.btnText,
        { color: variant === 'primary' ? '#fff' : variant === 'danger' ? color.brick : color.ink },
      ]}>
        {title}
      </Text>
    </PressableScale>
  )
}

export function Field ({ label, error, hint, children }: PropsWithChildren<{
  label?: string; error?: string | null; hint?: string
}>) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Label style={{ marginBottom: 6 }}>{label}</Label> : null}
      {children}
      {error ? <Small style={{ color: color.brick, marginTop: 6 }}>{error}</Small> : null}
      {hint && !error ? <Small muted style={{ marginTop: 6 }}>{hint}</Small> : null}
    </View>
  )
}

export function Note ({ children, warn }: PropsWithChildren<{ warn?: boolean }>) {
  return (
    <View style={[s.note, { borderLeftColor: warn ? color.brick : color.leaf }]}>
      <Small style={{ color: color.ink2 }}>{children}</Small>
    </View>
  )
}

export function AppBar ({ title, back, right }: {
  title: string; back?: boolean; right?: ReactNode
}) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[s.bar, { paddingTop: insets.top }]}>
      <View style={s.barIn}>
        {back ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            style={{ marginLeft: -6, marginRight: 4 }}
          >
            <Icon name="chevron-left" size={22} color={color.ink} />
          </Pressable>
        ) : null}
        <Text numberOfLines={1} style={s.barTitle}>{title}</Text>
        <View style={{ flex: 1 }} />
        {right}
      </View>
    </View>
  )
}

export function Empty ({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={s.empty}>
      <H3 style={{ marginBottom: 10, textAlign: 'center' }}>{title}</H3>
      {children}
    </View>
  )
}

export function Loading () {
  return (
    <View style={s.empty}>
      <ActivityIndicator color={color.forest} />
    </View>
  )
}

export function Row ({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={[ty.body, { color: strong ? color.ink : color.ink3 }, strong && { fontFamily: font.bold, fontSize: 18 }]}>
        {label}
      </Text>
      <Text style={[ty.body, strong && { fontFamily: font.bold, fontSize: 18 }, { color: color.ink }]}>
        {value}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  btn: {
    minHeight: 54,
    borderRadius: space.radius,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: font.semi, fontSize: 16 },
  note: {
    backgroundColor: color.paper2,
    borderLeftWidth: 3,
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bar: {
    backgroundColor: color.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  barIn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: space.gutter,
  },
  barTitle: { fontFamily: font.displaySemi, fontSize: 22, color: color.ink, flexShrink: 1 },
  empty: { paddingVertical: 60, paddingHorizontal: space.gutter, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.lineSoft,
  },
})

export const inputStyle: TextStyle = {
  minHeight: 50,
  paddingVertical: 12,
  paddingHorizontal: 14,
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: color.line,
  borderRadius: space.radius,
  // 16 minimum or iOS zooms the page when the field is focused.
  fontSize: 16,
  fontFamily: font.body,
  color: color.ink,
}
