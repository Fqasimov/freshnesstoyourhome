import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { t } from '@/lib/i18n'
import { getPending, setPending } from '@/lib/pending'
import { duration, ease } from '@/lib/motion'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui'
import { OtpInput, type OtpHandle } from '@/components/auth/OtpInput'
import { color, font, space } from '@/theme/tokens'
import { enterApp } from '@/lib/nav'

const RESEND_AFTER = 60

/**
 * The six-digit code. The account is created by this screen, not by the form
 * before it — nothing exists until the code is right (RegistrationService).
 *
 * The code is sent by the server's mailer today; moving that to Resend is a
 * server setting and changes nothing here.
 */
export default function Verify () {
  const auth = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  // Held in state: the shared copy is cleared the moment the code is right,
  // and this screen still has its "account ready" moment to show after that.
  const [pending, setLocalPending] = useState(getPending)

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [wait, setWait] = useState(RESEND_AFTER)
  const otp = useRef<OtpHandle>(null)

  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])

  // The envelope breathes while it waits for the code.
  const breath = useSharedValue(1)
  useEffect(() => {
    breath.value = withRepeat(withSequence(
      withTiming(1.05, { duration: 1100, easing: ease.inOut }),
      withTiming(1, { duration: 1100, easing: ease.inOut }),
    ), -1)
  }, [breath])
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }))


  if (done) {
    return (
      <View style={[s.doneWrap, { paddingTop: insets.top }]}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={s.doneBadge}>
          <Icon name="check-lg" size={44} color="#fff" />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(120).duration(duration.base).easing(ease.out)} style={s.doneTitle}>
          {t('otp.done')}
        </Animated.Text>
      </View>
    )
  }

  if (!pending) return <Redirect href="/auth" />

  async function submit (value = code) {
    if (busy || value.length !== 6 || !pending) return
    setBusy(true); setError(null); setNote(null)

    try {
      await auth.confirm(pending.ticket, pending.email, value)
      setPending(null)
      setDone(true)
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      setTimeout(() => enterApp(router), 1100)
    } catch (e) {
      const err = e as ApiError
      setError(err.isOffline ? t('err.offline') : err.status === 429 ? t('err.tooMany') : t('otp.wrong'))
      setCode('')
      otp.current?.shake()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  async function resend () {
    if (wait > 0 || !pending) return
    setError(null)
    try {
      const ticket = pending.kind === 'register'
        ? await auth.register(pending.form)
        : await auth.forgotPassword(pending.email, pending.password)
      const next = { ...pending, ticket }
      setPending(next)
      setLocalPending(next)
      setWait(RESEND_AFTER)
      setNote(t('otp.resent'))
      otp.current?.focus()
    } catch (e) {
      const err = e as ApiError
      setError(err.isOffline ? t('err.offline') : err.status === 429 ? t('err.tooMany') : t('err.generic'))
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back} accessibilityRole="button" accessibilityLabel={t('otp.change')}>
          <Icon name="chevron-left" size={22} color={color.ink} />
        </Pressable>

        <Animated.View entering={FadeIn.duration(duration.slow)} style={[s.badge, badge]}>
          <Icon name="envelope-check" size={34} color={color.forest} />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(40).duration(duration.base).easing(ease.out)} style={s.title}>
          {t('otp.title')}
        </Animated.Text>
        <Animated.View entering={FadeInDown.delay(80).duration(duration.base).easing(ease.out)}>
          <Text style={s.lead}>{t('otp.lead')}</Text>
          <Text style={s.email}>{pending.email}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(duration.base).easing(ease.out)} style={{ marginTop: 28 }}>
          <OtpInput ref={otp} value={code} onChange={(v) => { setCode(v); if (error) setError(null) }} onComplete={submit} error={Boolean(error)} />
        </Animated.View>

        <View style={{ minHeight: 44, justifyContent: 'center' }}>
          {error ? (
            <Animated.View entering={FadeIn.duration(duration.fast)} style={s.msgRow}>
              <Icon name="exclamation-circle" size={14} color={color.brick} />
              <Text style={[s.msg, { color: color.brick }]}>{error}</Text>
            </Animated.View>
          ) : note ? (
            <Animated.View entering={FadeIn.duration(duration.fast)} style={s.msgRow}>
              <Icon name="check-circle-fill" size={14} color={color.forest} />
              <Text style={[s.msg, { color: color.forest }]}>{note}</Text>
            </Animated.View>
          ) : null}
        </View>

        <Button title={t('otp.verify')} onPress={() => submit()} disabled={code.length !== 6} busy={busy} />

        <Pressable onPress={resend} disabled={wait > 0} style={s.resend} accessibilityRole="button">
          <Icon name="arrow-clockwise" size={15} color={wait > 0 ? color.ink3 : color.forest} />
          <Text style={[s.resendText, wait > 0 && { color: color.ink3 }]}>
            {wait > 0 ? t('otp.resendIn', { s: wait }) : t('otp.resend')}
          </Text>
        </Pressable>

        <View style={s.hint}>
          <Icon name="info-circle" size={14} color={color.ink3} />
          <Text style={s.hintText}>{t('otp.spam')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  page: { paddingHorizontal: space.gutter + 4 },
  back: { width: 40, height: 40, marginLeft: -8, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  badge: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: color.leafXl,
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  title: { fontFamily: font.displaySemi, fontSize: 32, lineHeight: 36, color: color.ink, marginBottom: 10 },
  lead: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.ink3 },
  email: { fontFamily: font.semi, fontSize: 16, color: color.ink, marginTop: 2 },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  msg: { fontFamily: font.medium, fontSize: 13.5 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  resendText: { fontFamily: font.semi, fontSize: 14, color: color.forest },
  hint: {
    flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12,
    borderRadius: 12, backgroundColor: color.paper2,
  },
  hintText: { fontFamily: font.body, fontSize: 13, color: color.ink2, flexShrink: 1 },
  doneWrap: { flex: 1, backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center', gap: 20 },
  doneBadge: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: color.forest,
    alignItems: 'center', justifyContent: 'center',
  },
  doneTitle: { fontFamily: font.displaySemi, fontSize: 30, color: color.ink },
})
