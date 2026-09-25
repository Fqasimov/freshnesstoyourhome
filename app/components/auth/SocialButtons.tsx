import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Icon } from '../Icon'
import { PressableScale } from '../PressableScale'
import { useAuth } from '@/lib/auth'
import { appleAvailable, googleAvailable, signInWithApple, signInWithGoogle } from '@/lib/social'
import { t } from '@/lib/i18n'
import { ApiError } from '@/lib/api'
import { color, font, space } from '@/theme/tokens'
import { enterApp } from '@/lib/nav'

/**
 * "Continue with Google" and, on iPhone, "Continue with Apple".
 *
 * Google shows everywhere; until its client ids are set in the build it says
 * so when tapped rather than disappearing, so the layout is the real one.
 * Apple is iPhone-only — Apple does not offer it inside Android apps.
 */
export function SocialButtons ({ onError }: { onError: (msg: string | null) => void }) {
  const auth = useAuth()
  const router = useRouter()
  const [apple, setApple] = useState(false)
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null)

  useEffect(() => { appleAvailable().then(setApple) }, [])

  async function go (provider: 'google' | 'apple') {
    if (busy) return
    onError(null)

    if (provider === 'google' && !googleAvailable()) {
      onError(t('social.off'))
      return
    }

    setBusy(provider)
    try {
      const res = provider === 'google' ? await signInWithGoogle() : await signInWithApple()
      if (!res) return
      await auth.social(provider, res.idToken, res.name)
      enterApp(router)
    } catch (e) {
      const err = e as ApiError
      onError(err?.status === 503 || err?.message === 'unavailable'
        ? t('social.off')
        : err?.isOffline ? t('err.offline') : t('err.generic'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <PressableScale style={[s.btn, s.google]} onPress={() => go('google')} accessibilityRole="button">
        {busy === 'google' ? <ActivityIndicator color={color.ink} /> : <GoogleG />}
        <Text style={s.text}>{t('google')}</Text>
      </PressableScale>
      {apple || Platform.OS === 'ios' ? (
        <PressableScale style={[s.btn, s.apple]} onPress={() => go('apple')} accessibilityRole="button">
          {busy === 'apple' ? <ActivityIndicator color="#fff" /> : <Icon name="apple" size={19} color="#fff" />}
          <Text style={[s.text, { color: '#fff' }]}>{t('apple')}</Text>
        </PressableScale>
      ) : null}
    </View>
  )
}

/** The Bootstrap Google glyph, in Google's blue. */
function GoogleG () {
  return <Icon name="google" size={18} color="#4285F4" />
}

const s = StyleSheet.create({
  btn: {
    minHeight: 52, borderRadius: space.radius, flexDirection: 'row', gap: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  google: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(27,41,22,0.12)' },
  apple: { backgroundColor: '#000' },
  text: { fontFamily: font.semi, fontSize: 15, color: color.ink },
})
