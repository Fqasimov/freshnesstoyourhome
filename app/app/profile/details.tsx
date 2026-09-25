import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeIn } from 'react-native-reanimated'

import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { t, useLang } from '@/lib/i18n'
import { duration } from '@/lib/motion'
import { AppBar, Button } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { TextField } from '@/components/auth/TextField'
import { DateOfBirthSheet, formatDob } from '@/components/auth/DateOfBirth'
import { color, font, space } from '@/theme/tokens'

/** Name, phone and birth date. The address is the account, so it stays put. */
export default function Details () {
  const auth = useAuth()
  const router = useRouter()
  useLang()
  const user = auth.user

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [dob, setDob] = useState<string | null>(user?.date_of_birth ?? null)
  const [dobOpen, setDobOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save () {
    if (busy) return
    if (name.trim().length < 2) { setErrors({ name: t('err.name') }); return }
    setBusy(true); setErrors({}); setSaved(false)
    try {
      await auth.updateProfile({
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(dob ? { date_of_birth: dob } : {}),
      })
      setSaved(true)
      setTimeout(() => router.back(), 600)
    } catch (e) {
      const err = e as ApiError
      const f = err.fieldErrors
      setErrors(Object.keys(f).length ? f : { form: err.isOffline ? t('err.offline') : t('err.generic') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppBar title={t('profile.personal')} back />
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <TextField
          label={t('f.name')} icon="person" value={name} onChangeText={setName} placeholder={t('ph.name')}
          autoCapitalize="words" autoComplete="name" textContentType="name" error={errors.name}
        />

        <View style={{ marginBottom: 14 }}>
          <Text style={s.label}>{t('profile.email')}</Text>
          <View style={[s.static]}>
            <Icon name="envelope" size={18} color={color.ink3} />
            <Text style={s.staticText} numberOfLines={1}>{user?.email}</Text>
            <Icon name="lock" size={14} color={color.ink3} />
          </View>
        </View>

        <View style={{ marginBottom: 14 }}>
          <Text style={s.label}>{t('f.dob')}</Text>
          <Pressable onPress={() => setDobOpen(true)} style={s.dob} accessibilityRole="button">
            <Icon name="calendar3" size={17} color={dob ? color.forest : color.ink3} />
            <Text style={[s.dobText, !dob && { color: '#8C9384' }]}>{dob ? formatDob(dob) : t('ph.dob')}</Text>
            <Icon name="chevron-down" size={14} color={color.ink3} />
          </Pressable>
          {errors.date_of_birth ? <Text style={s.err}>{t('err.age')}</Text> : null}
        </View>

        <TextField
          label={t('profile.phone')} icon="telephone" value={phone} onChangeText={setPhone} placeholder={t('profile.phonePh')}
          keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={errors.phone}
        />

        {errors.form ? <Text style={s.err}>{errors.form}</Text> : null}
        {saved ? (
          <Animated.View entering={FadeIn.duration(duration.fast)} style={s.saved}>
            <Icon name="check-circle-fill" size={15} color={color.forest} />
            <Text style={s.savedText}>{t('profile.saved')}</Text>
          </Animated.View>
        ) : null}

        <Button title={t('profile.save')} onPress={save} busy={busy} style={{ marginTop: 8 }} />
      </ScrollView>

      <DateOfBirthSheet
        open={dobOpen}
        value={dob}
        onClose={() => setDobOpen(false)}
        onPick={(iso) => { setDob(iso); setDobOpen(false) }}
      />
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  page: { padding: space.gutter + 2, paddingBottom: 40 },
  label: { fontFamily: font.semi, fontSize: 13, color: color.ink2, marginBottom: 7, marginLeft: 2 },
  static: {
    flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 54, paddingHorizontal: 15,
    borderRadius: space.radius, backgroundColor: color.paper2,
  },
  staticText: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.ink2 },
  dob: {
    flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 54, paddingHorizontal: 15,
    borderWidth: 1.5, borderRadius: space.radius, borderColor: 'rgba(27,41,22,0.12)', backgroundColor: '#FBFAF5',
  },
  dobText: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.ink },
  err: { fontFamily: font.medium, fontSize: 13, color: color.brick, marginTop: 7, marginBottom: 6 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  savedText: { fontFamily: font.semi, fontSize: 14, color: color.forest },
})
