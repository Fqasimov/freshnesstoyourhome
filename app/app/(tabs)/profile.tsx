import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { LANGS, setLang, t, useLang, type Lang } from '@/lib/i18n'
import { AppBar, Body, Button, Empty, Field, Note, Small, inputStyle } from '@/components/ui'
import { color, font, space } from '@/theme/tokens'

export default function Profile () {
  const auth = useAuth()
  const router = useRouter()
  const lang = useLang()

  const [name, setName] = useState(auth.user?.name ?? '')
  const [phone, setPhone] = useState(auth.user?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Two taps to delete an account, never one.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setName(auth.user?.name ?? '')
    setPhone(auth.user?.phone ?? '')
  }, [auth.user])

  async function save () {
    setSaving(true); setSaved(false); setError(null)
    try {
      await auth.updateProfile({ name: name.trim(), phone: phone.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2400)
    } catch (e) {
      setError(Object.values((e as ApiError).fieldErrors)[0] ?? t('err.generic'))
    } finally {
      setSaving(false)
    }
  }

  async function changeLang (l: Lang) {
    await setLang(l)
    // Persisted on the account too, so sign-in emails arrive in the language
    // the customer actually reads.
    if (auth.signedIn) {
      try { await auth.updateProfile({ locale: l }) } catch { /* the local change stands */ }
    }
  }

  async function remove () {
    setDeleting(true); setError(null)
    try {
      await auth.deleteAccount()
      router.replace('/(tabs)/shop')
    } catch (e) {
      // 409: an order is in flight and someone is about to deliver it.
      setError((e as ApiError).message ?? t('err.generic'))
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (!auth.signedIn) {
    return (
      <View style={{ flex: 1 }}>
        <AppBar title={t('profile.title')} />
        <Empty title={t('auth.title')}>
          <Button title={t('auth.verify')} onPress={() => router.push('/sign-in')} style={{ marginTop: 16 }} />
        </Empty>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={t('profile.title')} />

      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: 40 }}>
        {!auth.profileComplete ? (
          <View style={{ marginBottom: 18 }}><Note warn>{t('profile.complete')}</Note></View>
        ) : null}

        <Field label={t('profile.name')}>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            returnKeyType="done"
          />
        </Field>

        <Field label={t('profile.phone')} error={error}>
          <TextInput
            style={inputStyle}
            value={phone}
            onChangeText={setPhone}
            placeholder="+994 50 000 00 00"
            placeholderTextColor={color.ink3}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
        </Field>

        <Button title={saved ? t('profile.saved') : t('profile.save')} onPress={save} busy={saving} />

        <Text style={s.heading}>{t('profile.language')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {LANGS.map((l: Lang) => (
            <Pressable
              key={l}
              onPress={() => changeLang(l)}
              style={[s.chip, lang === l && { backgroundColor: color.forest }]}
            >
              <Text style={[s.chipText, lang === l && { color: '#fff' }]}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={s.linkRow} onPress={() => router.push('/profile/addresses')}>
          <Text style={s.linkText}>{t('profile.addresses')}</Text>
          <Ionicons name="chevron-forward" size={20} color={color.ink3} />
        </Pressable>

        <Button
          title={t('profile.logout')}
          variant="ghost"
          onPress={async () => { await auth.signOut(); router.replace('/(tabs)/shop') }}
          style={{ marginTop: 22 }}
        />

        {/* Apple Guideline 5.1.1(v): deleting the account must be possible from
            inside the app. It destroys the personal data rather than hiding it. */}
        <View style={{ marginTop: 30 }}>
          {!confirmingDelete ? (
            <Pressable onPress={() => setConfirmingDelete(true)} style={{ paddingVertical: 10 }}>
              <Text style={s.deleteLink}>{t('profile.deleteAccount')}</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 10 }}>
              <Note warn>{t('profile.deleteWarn')}</Note>
              <Button title={t('profile.deleteConfirm')} variant="danger" onPress={remove} busy={deleting} />
              <Button title={t('cancel')} variant="ghost" onPress={() => setConfirmingDelete(false)} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  heading: { fontFamily: font.displaySemi, fontSize: 18, color: color.ink, marginTop: 26, marginBottom: 11 },
  chip: { paddingVertical: 9, paddingHorizontal: 17, borderRadius: 999, backgroundColor: color.paper2 },
  chipText: { fontFamily: font.semi, fontSize: 13, color: color.ink2 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineSoft,
    borderRadius: space.radius, padding: 16, marginTop: 26,
  },
  linkText: { fontFamily: font.semi, fontSize: 16, color: color.ink },
  deleteLink: { fontFamily: font.body, fontSize: 15, color: color.brick, textDecorationLine: 'underline' },
})
