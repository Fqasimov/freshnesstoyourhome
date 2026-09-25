import { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated'

import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { LANGS, setLang, t, useLang, type Lang } from '@/lib/i18n'
import { setPending } from '@/lib/pending'
import { CONTACT } from '@/lib/brand'
import { duration, ease, STAGGER } from '@/lib/motion'
import { Avatar, BrandLockup } from '@/components/BrandMark'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui'
import { TextField } from '@/components/auth/TextField'
import { PasswordRules, passwordValid } from '@/components/auth/PasswordRules'
import { DateOfBirthSheet, formatDob } from '@/components/auth/DateOfBirth'
import { Segmented } from '@/components/auth/Segmented'
import { SocialButtons } from '@/components/auth/SocialButtons'
import { color, font, space } from '@/theme/tokens'
import { enterApp } from '@/lib/nav'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
type Mode = 'signIn' | 'signUp'

/**
 * The front door: sign in or sign up, and Google / Apple.
 *
 * Someone who has used this phone before is greeted by name with their
 * address filled in, and lands on "Sign in". Everyone else lands on
 * "Sign up".
 */
export default function AuthScreen () {
  const auth = useAuth()
  const insets = useSafeAreaInsets()
  const lang = useLang()
  const [mode, setMode] = useState<Mode>(auth.remembered ? 'signIn' : 'signUp')
  const [social, setSocial] = useState<string | null>(null)

  // The remembered person can arrive a beat after the first frame.
  const decided = useRef(Boolean(auth.remembered))
  useEffect(() => {
    if (!decided.current && auth.remembered) { decided.current = true; setMode('signIn') }
  }, [auth.remembered])

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(duration.slow).easing(ease.out)} style={s.top}>
          <BrandLockup size={40} />
          <View style={s.langs}>
            {LANGS.map((l: Lang) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                accessibilityRole="button"
                accessibilityState={{ selected: lang === l }}
                hitSlop={4}
                style={[s.lang, lang === l && s.langOn]}
              >
                <Text style={[s.langText, lang === l && { color: '#fff' }]}>{l.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(60).duration(duration.slow).easing(ease.out)} style={s.lead}>
          {t('welcome.lead')}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(120).duration(duration.slow).easing(ease.out)} style={{ marginBottom: 22 }}>
          <Segmented<Mode>
            value={mode}
            onChange={(m) => { setMode(m); setSocial(null) }}
            options={[{ value: 'signIn', label: t('tab.signIn') }, { value: 'signUp', label: t('tab.signUp') }]}
          />
        </Animated.View>

        <Animated.View layout={LinearTransition.duration(duration.base).easing(ease.out)}>
          {mode === 'signIn' ? <SignInForm key="in" /> : <SignUpForm key="up" />}
        </Animated.View>

        <Animated.View layout={LinearTransition.duration(duration.base).easing(ease.out)}>
          <View style={s.or}>
            <View style={s.rule} />
            <Text style={s.orText}>{t('or')}</Text>
            <View style={s.rule} />
          </View>
          {social ? (
            <Animated.View entering={FadeIn.duration(duration.fast)} style={s.socialNote}>
              <Icon name="info-circle" size={14} color={color.ink2} />
              <Text style={s.socialNoteText}>{social}</Text>
            </Animated.View>
          ) : null}
          <SocialButtons onError={setSocial} />

          <Text style={s.terms}>
            {t('terms').split('{policy}')[0]}
            <Text style={s.termsLink} onPress={() => Linking.openURL(CONTACT.privacyUrl)}>{t('terms.policy')}</Text>
            {t('terms').split('{policy}')[1]}
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/* ─────────────────────────────── Sign in ─────────────────────────────── */

function SignInForm () {
  const auth = useAuth()
  const router = useRouter()
  const known = auth.remembered
  const [email, setEmail] = useState(known?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pwRef = useRef<TextInput>(null)

  async function submit () {
    if (busy) return
    if (!EMAIL.test(email.trim())) { setError(t('err.email')); return }
    if (!password) { setError(t('err.login')); return }

    setBusy(true); setError(null)
    try {
      await auth.login(email.trim(), password)
      enterApp(router)
    } catch (e) {
      const err = e as ApiError
      setError(err.isOffline ? t('err.offline') : err.status === 429 ? t('err.tooMany') : t('err.login'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Animated.View entering={FadeInDown.duration(duration.base).easing(ease.out)} exiting={FadeOut.duration(120)}>
      {known ? (
        <View style={s.known}>
          <Avatar name={known.name ?? known.email} size={50} />
          <View style={{ flex: 1 }}>
            <Text style={s.knownTitle} numberOfLines={2}>
              {t('welcome.back', { name: (known.name ?? '').split(' ')[0] || known.email.split('@')[0] })}
            </Text>
            <Text style={s.knownMail} numberOfLines={1}>{known.email}</Text>
            <Pressable
              onPress={() => { auth.forgetRemembered(); setEmail(''); setPassword('') }}
              hitSlop={8}
              accessibilityRole="button"
              style={{ alignSelf: 'flex-start', marginTop: 6 }}
            >
              <Text style={[s.link, { fontSize: 13 }]}>{t('welcome.notYou')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <TextField
          label={t('f.email')}
          icon="envelope"
          value={email}
          onChangeText={setEmail}
          placeholder={t('ph.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
        />
      )}

      <TextField
        ref={pwRef}
        label={t('f.password')}
        icon="lock"
        secret
        value={password}
        onChangeText={setPassword}
        placeholder={t('ph.passwordLogin')}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={error}
        autoFocus={Boolean(known)}
      />

      <Pressable onPress={() => router.push('/auth/forgot')} hitSlop={8} style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 18 }}>
        <Text style={s.link}>{t('forgot')}</Text>
      </Pressable>

      <Button title={t('signIn.cta')} onPress={submit} busy={busy} />
    </Animated.View>
  )
}

/* ─────────────────────────────── Sign up ─────────────────────────────── */

type Errors = Partial<Record<'name' | 'email' | 'dob' | 'password' | 'password2' | 'form', string>>

function SignUpForm () {
  const auth = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [dobOpen, setDobOpen] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  const emailRef = useRef<TextInput>(null)
  const pwRef = useRef<TextInput>(null)
  const pw2Ref = useRef<TextInput>(null)

  function check (): Errors {
    const e: Errors = {}
    if (name.trim().length < 2) e.name = t('err.name')
    if (!EMAIL.test(email.trim())) e.email = t('err.email')
    if (!dob) e.dob = t('err.dob')
    if (!passwordValid(password)) e.password = t('err.password')
    if (password2 !== password || !password2) e.password2 = t('err.match')
    return e
  }

  // Once they have tried to submit, errors clear as each field is fixed.
  useEffect(() => { if (tried) setErrors(check()) }, [name, email, dob, password, password2, tried]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit () {
    if (busy) return
    setTried(true)
    const e = check()
    setErrors(e)
    if (Object.keys(e).length) return

    setBusy(true)
    const form = {
      name: name.trim(),
      email: email.trim(),
      date_of_birth: dob!,
      password,
      password_confirmation: password2,
    }
    try {
      const ticket = await auth.register(form)
      setPending({ kind: 'register', email: form.email, ticket, form })
      router.push('/auth/verify')
    } catch (err) {
      const x = err as ApiError
      const f = x.fieldErrors ?? {}
      setErrors({
        name: f.name ? t('err.name') : undefined,
        email: f.email ? t('err.email') : undefined,
        dob: f.date_of_birth ? t('err.age') : undefined,
        password: f.password ? t('err.password') : undefined,
        form: Object.keys(f).length ? undefined : x.isOffline ? t('err.offline') : x.status === 429 ? t('err.tooMany') : t('err.generic'),
      })
    } finally {
      setBusy(false)
    }
  }

  const enter = (i: number) => FadeInDown.delay(i * STAGGER).duration(duration.base).easing(ease.out)

  return (
    <Animated.View exiting={FadeOut.duration(120)}>
      <Animated.View entering={enter(0)}>
        <TextField
          label={t('f.name')} icon="person" value={name} onChangeText={setName}
          placeholder={t('ph.name')} autoCapitalize="words" autoComplete="name" textContentType="name"
          returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} error={errors.name}
        />
      </Animated.View>
      <Animated.View entering={enter(1)}>
        <TextField
          ref={emailRef} label={t('f.email')} icon="envelope" value={email} onChangeText={setEmail}
          placeholder={t('ph.email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          autoComplete="email" textContentType="emailAddress" returnKeyType="next"
          onSubmitEditing={() => setDobOpen(true)} error={errors.email}
        />
      </Animated.View>

      <Animated.View entering={enter(2)} style={{ marginBottom: 14 }}>
        <Text style={s.fieldLabel}>{t('f.dob')}</Text>
        <Pressable
          onPress={() => setDobOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('f.dob')}
          style={[s.dob, errors.dob ? { borderColor: color.brick } : null]}
        >
          <Icon name="calendar3" size={17} color={dob ? color.forest : color.ink3} />
          <Text style={[s.dobText, !dob && { color: '#8C9384' }]}>{dob ? formatDob(dob) : t('ph.dob')}</Text>
          <Icon name="chevron-down" size={14} color={color.ink3} />
        </Pressable>
        {errors.dob ? (
          <Animated.View entering={FadeIn.duration(duration.fast)} style={s.errRow}>
            <Icon name="exclamation-circle" size={13} color={color.brick} />
            <Text style={s.err}>{errors.dob}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <TextField
          ref={pwRef} label={t('f.password')} icon="lock" secret value={password} onChangeText={setPassword}
          placeholder={t('ph.password')} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
          returnKeyType="next" onSubmitEditing={() => pw2Ref.current?.focus()} error={errors.password}
        />
        <PasswordRules password={password} />
      </Animated.View>
      <Animated.View entering={enter(4)}>
        <TextField
          ref={pw2Ref} label={t('f.password2')} icon="shield-lock" secret value={password2} onChangeText={setPassword2}
          placeholder={t('ph.password2')} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
          returnKeyType="go" onSubmitEditing={submit} error={errors.password2}
          right={password2 && password2 === password ? <Icon name="check-circle-fill" size={18} color={color.forest} /> : null}
        />
      </Animated.View>

      {errors.form ? <Text style={[s.err, { marginBottom: 12 }]}>{errors.form}</Text> : null}

      <Animated.View entering={enter(5)} style={{ marginTop: 4 }}>
        <Button title={t('signUp.cta')} onPress={submit} busy={busy} />
      </Animated.View>

      <DateOfBirthSheet
        open={dobOpen}
        value={dob}
        onClose={() => setDobOpen(false)}
        onPick={(iso) => { setDob(iso); setDobOpen(false); setTimeout(() => pwRef.current?.focus(), 250) }}
      />
    </Animated.View>
  )
}

const s = StyleSheet.create({
  page: { paddingHorizontal: space.gutter + 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  langs: { flexDirection: 'row', gap: 4, backgroundColor: color.paper2, borderRadius: 999, padding: 3 },
  lang: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999 },
  langOn: { backgroundColor: color.forest },
  langText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.5, color: color.ink2 },
  lead: { fontFamily: font.displaySemi, fontSize: 30, lineHeight: 33, color: color.ink, marginBottom: 22 },

  known: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18,
    padding: 14, borderRadius: space.radiusLg, backgroundColor: '#fff',
    borderWidth: 1, borderColor: color.lineSoft,
  },
  knownTitle: { fontFamily: font.semi, fontSize: 16, color: color.ink },
  knownMail: { fontFamily: font.body, fontSize: 13, color: color.ink3, marginTop: 2 },

  fieldLabel: { fontFamily: font.semi, fontSize: 13, color: color.ink2, marginBottom: 7, marginLeft: 2 },
  dob: {
    flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 54, paddingHorizontal: 15,
    borderWidth: 1.5, borderRadius: space.radius, borderColor: 'rgba(27,41,22,0.12)', backgroundColor: '#FBFAF5',
  },
  dobText: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.ink },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, marginLeft: 2 },
  err: { fontFamily: font.medium, fontSize: 13, color: color.brick },

  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 16 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  orText: { fontFamily: font.medium, fontSize: 13, color: color.ink3 },
  socialNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
    padding: 10, borderRadius: 10, backgroundColor: color.paper2,
  },
  socialNoteText: { fontFamily: font.medium, fontSize: 13, color: color.ink2, flexShrink: 1 },
  terms: { fontFamily: font.body, fontSize: 12.5, lineHeight: 18, color: color.ink3, textAlign: 'center', marginTop: 20 },
  link: { fontFamily: font.semi, fontSize: 14, color: color.forest },
  termsLink: { fontFamily: font.semi, color: color.forest, textDecorationLine: 'underline' },
})
