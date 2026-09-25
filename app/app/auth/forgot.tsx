import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { t } from '@/lib/i18n'
import { setPending } from '@/lib/pending'
import { duration, ease, STAGGER } from '@/lib/motion'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui'
import { TextField } from '@/components/auth/TextField'
import { PasswordRules, passwordValid } from '@/components/auth/PasswordRules'
import { color, font, space } from '@/theme/tokens'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * A new password, confirmed by the emailed code. Also how someone who has
 * only ever signed in with a code or with Google sets a password.
 */
export default function Forgot () {
  const auth = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState(auth.remembered?.email ?? '')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [busy, setBusy] = useState(false)
  const pwRef = useRef<TextInput>(null)
  const pw2Ref = useRef<TextInput>(null)

  async function submit () {
    if (busy) return
    const e = {
      email: EMAIL.test(email.trim()) ? undefined : t('err.email'),
      password: passwordValid(password) ? undefined : t('err.password'),
      password2: password2 && password2 === password ? undefined : t('err.match'),
    }
    setErrors(e)
    if (Object.values(e).some(Boolean)) return

    setBusy(true)
    try {
      const ticket = await auth.forgotPassword(email.trim(), password)
      setPending({ kind: 'reset', email: email.trim(), ticket, password })
      router.push('/auth/verify')
    } catch (err) {
      const x = err as ApiError
      setErrors({ form: x.isOffline ? t('err.offline') : x.status === 429 ? t('err.tooMany') : t('err.generic') })
    } finally {
      setBusy(false)
    }
  }

  const enter = (i: number) => FadeInDown.delay(i * STAGGER).duration(duration.base).easing(ease.out)

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="chevron-left" size={22} color={color.ink} />
        </Pressable>

        <Animated.View entering={enter(0)} style={s.badge}>
          <Icon name="key" size={30} color={color.forest} />
        </Animated.View>
        <Animated.Text entering={enter(1)} style={s.title}>{t('forgot.title')}</Animated.Text>
        <Animated.Text entering={enter(2)} style={s.lead}>{t('forgot.lead')}</Animated.Text>

        <Animated.View entering={enter(3)}>
          <TextField
            label={t('f.email')} icon="envelope" value={email} onChangeText={setEmail} placeholder={t('ph.email')}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
            textContentType="username" returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} error={errors.email}
          />
          <TextField
            ref={pwRef} label={t('f.password')} icon="lock" secret value={password} onChangeText={setPassword}
            placeholder={t('ph.newPassword')} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
            returnKeyType="next" onSubmitEditing={() => pw2Ref.current?.focus()} error={errors.password}
          />
          <PasswordRules password={password} />
          <TextField
            ref={pw2Ref} label={t('f.password2')} icon="shield-lock" secret value={password2} onChangeText={setPassword2}
            placeholder={t('ph.password2')} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
            returnKeyType="go" onSubmitEditing={submit} error={errors.password2}
          />
          {errors.form ? <Text style={s.err}>{errors.form}</Text> : null}
          <Button title={t('forgot.cta')} onPress={submit} busy={busy} style={{ marginTop: 6 }} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  page: { paddingHorizontal: space.gutter + 4 },
  back: { width: 40, height: 40, marginLeft: -8, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  badge: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: color.leafXl,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontFamily: font.displaySemi, fontSize: 32, lineHeight: 36, color: color.ink, marginBottom: 8 },
  lead: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.ink3, marginBottom: 24 },
  err: { fontFamily: font.medium, fontSize: 13, color: color.brick, marginBottom: 10 },
})
