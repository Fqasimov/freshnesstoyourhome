import { useRef, useState } from 'react'
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '@/lib/auth'
import { useCatalogue } from '@/lib/catalogue'
import { LANGS, setLang, t, useLang, type Lang } from '@/lib/i18n'
import { ApiError } from '@/lib/api'
import { Body, Button, Field, Note, Small, inputStyle } from '@/components/ui'
import { color, font, space } from '@/theme/tokens'

export default function SignIn () {
  const auth = useAuth()
  const catalogue = useCatalogue()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const lang = useLang()

  const { next } = useLocalSearchParams<{ next?: string }>()

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const codeInput = useRef<TextInput>(null)

  const ttl = catalogue.delivery?.code_ttl_minutes ?? 10
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
  const codeValid = /^\d{6}$/.test(code)

  async function sendCode () {
    if (!emailValid || busy) return
    setBusy(true); setError(null)

    try {
      await auth.requestCode(email.trim(), lang)
      setStep('code')
      setTimeout(() => codeInput.current?.focus(), 250)
    } catch (e) {
      // The server answers identically whether or not the account exists, so
      // nothing here can leak it. A 429 is the one case worth naming, because
      // the customer can act on it by waiting.
      const err = e as ApiError
      setError(err.status === 429 ? t('auth.sent') : err.isOffline ? t('err.offline') : t('err.generic'))
    } finally {
      setBusy(false)
    }
  }

  async function verify () {
    if (!codeValid || busy) return
    setBusy(true); setError(null)

    try {
      await auth.verifyCode(email.trim(), code)
      if (next) router.replace(next as never)
      else router.replace('/(tabs)/shop')
    } catch (e) {
      const err = e as ApiError
      setError(err.isOffline ? t('err.offline') : t('err.code'))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: color.forest }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={[s.top, { paddingTop: insets.top + 18 }]}>
          <View style={s.langs}>
            {LANGS.map((l: Lang) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                accessibilityRole="button"
                style={[s.lang, lang === l && { backgroundColor: color.acid }]}
              >
                <Text style={[s.langText, lang === l && { color: color.ink }]}>{l.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.brand}>Freshness{'\n'}To Your Home</Text>
          <Text style={s.tagline}>{t('app.tagline')}</Text>
        </View>

        <View style={[s.panel, { paddingBottom: insets.bottom + 26 }]}>
          {step === 'email' ? (
            <>
              <Text style={s.h2}>{t('auth.title')}</Text>
              <Small muted style={{ marginTop: 8, marginBottom: 22 }}>{t('auth.lead')}</Small>

              <Field label={t('auth.email')} error={error}>
                <TextInput
                  style={inputStyle}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ad@example.com"
                  placeholderTextColor={color.ink3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={sendCode}
                />
              </Field>

              <Button title={t('auth.send')} onPress={sendCode} disabled={!emailValid} busy={busy} />
            </>
          ) : (
            <>
              <Text style={s.h2}>{t('auth.codeTitle')}</Text>
              <Small muted style={{ marginTop: 8, marginBottom: 22 }}>
                {t('auth.codeLead', { email: email.trim(), minutes: ttl })}
              </Small>

              <Field label={t('auth.code')} error={error}>
                <TextInput
                  ref={codeInput}
                  style={[inputStyle, s.code]}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={color.paper3}
                  keyboardType="number-pad"
                  // Lets iOS and Android offer the code straight from the
                  // notification, which is most of why this flow feels quick.
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  returnKeyType="go"
                  onSubmitEditing={verify}
                />
              </Field>

              <Button title={t('auth.verify')} onPress={verify} disabled={!codeValid} busy={busy} />

              <View style={s.alt}>
                <Pressable onPress={() => { setStep('email'); setCode(''); setError(null) }}>
                  <Text style={s.altText}>{t('auth.back')}</Text>
                </Pressable>
                <Pressable onPress={sendCode} disabled={busy}>
                  <Text style={s.altText}>{t('auth.resend')}</Text>
                </Pressable>
              </View>

              <View style={{ marginTop: 24 }}>
                <Note warn>{t('auth.never')}</Note>
              </View>
              <Small muted style={{ marginTop: 12 }}>{t('auth.spam')}</Small>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  top: { paddingHorizontal: space.gutter, paddingBottom: 34 },
  langs: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginBottom: 26 },
  lang: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
  langText: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.5, color: '#fff' },
  brand: { fontFamily: font.displaySemi, fontSize: 40, lineHeight: 42, color: '#fff' },
  // leafXl rather than leafLight: this is small text on a dark ground.
  tagline: { fontFamily: font.body, fontSize: 15, color: color.leafXl, marginTop: 10, letterSpacing: 0.3 },
  panel: {
    flex: 1,
    backgroundColor: color.paper,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: space.gutter,
    paddingTop: 26,
  },
  h2: { fontFamily: font.displaySemi, fontSize: 26, color: color.ink },
  code: { fontFamily: font.bold, fontSize: 26, letterSpacing: 12, textAlign: 'center' },
  alt: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  altText: { fontFamily: font.semi, fontSize: 14, color: color.forest, textDecorationLine: 'underline', paddingVertical: 10 },
})
