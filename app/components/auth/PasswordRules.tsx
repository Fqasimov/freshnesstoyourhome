import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated'
import { Icon } from '../Icon'
import { duration, ease } from '@/lib/motion'
import { t } from '@/lib/i18n'
import { color, font } from '@/theme/tokens'

/** The server's rule, checked as the person types (AccountAuthController). */
export function passwordChecks (pw: string) {
  return {
    len: pw.length >= 8,
    upper: /[A-ZА-ЯƏÖÜĞİŞÇ]/u.test(pw),
    lower: /[a-zа-яəöüğışç]/u.test(pw),
    digit: /\d/.test(pw),
    symbol: /[^\p{L}\p{N}\s]/u.test(pw),
  }
}

export const passwordValid = (pw: string) => Object.values(passwordChecks(pw)).every(Boolean)

export function PasswordRules ({ password }: { password: string }) {
  const checks = passwordChecks(password)

  return (
    <View style={s.wrap}>
      {(Object.keys(checks) as (keyof typeof checks)[]).map(k => <Rule key={k} ok={checks[k]} label={t(`pw.${k}`)} />)}
    </View>
  )
}

function Rule ({ ok, label }: { ok: boolean; label: string }) {
  const dot = useAnimatedStyle(() => ({
    backgroundColor: withTiming(ok ? color.forest : 'rgba(27,41,22,0.1)', { duration: duration.fast, easing: ease.out }),
    transform: [{ scale: withSpring(ok ? 1 : 0.9, { damping: 14, stiffness: 320 }) }],
  }), [ok])

  return (
    <View style={s.rule}>
      <Animated.View style={[s.dot, dot]}>
        {ok ? <Icon name="check-lg" size={10} color="#fff" /> : null}
      </Animated.View>
      <Text style={[s.text, ok && { color: color.forest2 }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4, marginBottom: 16 },
  rule: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingLeft: 5, paddingRight: 10,
    borderRadius: 999, backgroundColor: color.paper2,
  },
  dot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: font.medium, fontSize: 12, color: color.ink3 },
})
