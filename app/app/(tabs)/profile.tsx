import { useEffect, useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { LANGS, setLang, t, useLang, type Lang } from '@/lib/i18n'
import { disablePush, enablePush, isEnabledOnThisDevice } from '@/lib/push'
import { CONTACT } from '@/lib/brand'
import { duration, ease, STAGGER } from '@/lib/motion'
import { Avatar } from '@/components/BrandMark'
import { Icon, type IconName } from '@/components/Icon'
import { PressableScale } from '@/components/PressableScale'
import { Sheet } from '@/components/Sheet'
import { Button, Note } from '@/components/ui'
import { formatDob } from '@/components/auth/DateOfBirth'
import { color, font, space } from '@/theme/tokens'
import { leaveApp } from '@/lib/nav'

/**
 * The account: who you are, where things go, the switches, and the way out —
 * sign out, or delete the account for good (App Store 5.1.1(v) wants that
 * possible from inside the app, and a customer is entitled to it).
 */
export default function Profile () {
  const auth = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const lang = useLang()
  const user = auth.user

  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushBlocked, setPushBlocked] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { isEnabledOnThisDevice().then(setPushOn).catch(() => {}) }, [])

  async function togglePush (next: boolean) {
    setPushBusy(true); setPushBlocked(false)
    try {
      if (next) {
        const granted = await enablePush()
        setPushOn(granted)
        // Refused at the OS level: iOS will not ask twice, so say where the switch lives.
        setPushBlocked(!granted)
      } else {
        await disablePush()
        setPushOn(false)
      }
    } finally {
      setPushBusy(false)
    }
  }

  async function changeLang (l: Lang) {
    await setLang(l)
    // On the account too, so emails arrive in the language they read.
    try { await auth.updateProfile({ locale: l }) } catch { /* the local change stands */ }
  }

  async function signOut () {
    setSigningOut(true)
    try {
      await auth.signOut()
      leaveApp(router)
    } finally {
      setSigningOut(false)
    }
  }

  async function remove () {
    setDeleting(true); setError(null)
    try {
      await auth.deleteAccount()
      setConfirmDelete(false)
      leaveApp(router)
    } catch (e) {
      // 409: an order is on its way and someone is about to deliver it.
      const err = e as ApiError
      setError(err.status === 409 ? t('profile.deleteHint') : err.isOffline ? t('err.offline') : t('err.generic'))
    } finally {
      setDeleting(false)
    }
  }

  if (!user) return null

  const enter = (i: number) => FadeInDown.delay(i * STAGGER).duration(duration.base).easing(ease.out)

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(0)} style={s.hero}>
          <Avatar name={user.name ?? user.email} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={2}>{user.name || user.email}</Text>
            <Text style={s.mail} numberOfLines={1}>{user.email}</Text>
          </View>
        </Animated.View>

        {!auth.profileComplete ? (
          <Animated.View entering={enter(1)} style={{ marginBottom: 14 }}>
            <Note warn>{t('profile.complete')}</Note>
          </Animated.View>
        ) : null}

        <Animated.View entering={enter(1)}>
          <Section title={t('profile.personal')} action={{ label: t('profile.edit'), onPress: () => router.push('/profile/details') }}>
            <Info icon="person" label={t('profile.name')} value={user.name} />
            <Info icon="envelope" label={t('profile.email')} value={user.email} />
            <Info icon="calendar3" label={t('profile.dob')} value={user.date_of_birth ? formatDob(user.date_of_birth) : null} />
            <Info icon="telephone" label={t('profile.phone')} value={user.phone} last />
          </Section>
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <Section title={t('profile.account')}>
            <LinkRow icon="geo-alt" label={t('profile.addresses')} onPress={() => router.push('/profile/addresses')} />
            <LinkRow icon="receipt" label={t('orders.title')} onPress={() => router.push('/(tabs)/orders')} />
            <LinkRow icon="key" label={t('forgot.title')} onPress={() => router.push('/auth/forgot')} last />
          </Section>
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <Section title={t('profile.settings')}>
            <View style={s.row}>
              <RowIcon name="globe2" />
              <Text style={s.rowLabel}>{t('profile.language')}</Text>
              <View style={s.langs}>
                {LANGS.map((l: Lang) => (
                  <Pressable
                    key={l}
                    onPress={() => changeLang(l)}
                    style={[s.lang, lang === l && s.langOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: lang === l }}
                  >
                    <Text style={[s.langText, lang === l && { color: '#fff' }]}>{l.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={[s.row, s.last]}>
              <RowIcon name="bag-check" />
              <Text style={s.rowLabel}>{pushOn ? t('push.on') : t('push.off')}</Text>
              <Switch
                value={pushOn}
                onValueChange={togglePush}
                disabled={pushBusy}
                trackColor={{ true: color.leaf, false: color.paper3 }}
                thumbColor={pushOn ? color.forest : '#fff'}
              />
            </View>
          </Section>
          {pushBlocked ? (
            <Pressable onPress={() => Linking.openSettings()} style={{ marginTop: -6, marginBottom: 16 }}>
              <Note warn>{t('push.blocked')}</Note>
            </Pressable>
          ) : null}
        </Animated.View>

        <Animated.View entering={enter(4)}>
          <Section title={t('profile.support')}>
            <LinkRow icon="whatsapp" label="WhatsApp" hint={CONTACT.phoneDisplay} onPress={() => Linking.openURL(`https://wa.me/${CONTACT.whatsapp}`)} />
            <LinkRow icon="telephone" label={CONTACT.phoneDisplay} onPress={() => Linking.openURL(`tel:${CONTACT.phone}`)} />
            <LinkRow icon="file-earmark-text" label={t('profile.privacy')} onPress={() => Linking.openURL(CONTACT.privacyUrl)} last />
          </Section>
        </Animated.View>

        <Animated.View entering={enter(5)} style={{ gap: 10, marginTop: 6 }}>
          <PressableScale onPress={() => setConfirmOut(true)} style={s.out} accessibilityRole="button">
            <Icon name="box-arrow-right" size={18} color={color.ink} />
            <Text style={s.outText}>{t('profile.logout')}</Text>
          </PressableScale>
          <PressableScale onPress={() => { setError(null); setConfirmDelete(true) }} style={s.del} accessibilityRole="button">
            <Icon name="trash3" size={17} color={color.brick} />
            <Text style={s.delText}>{t('profile.deleteAccount')}</Text>
          </PressableScale>
        </Animated.View>
      </ScrollView>

      <Sheet open={confirmOut} onClose={() => setConfirmOut(false)}>
        <View style={s.sheetIcon}><Icon name="box-arrow-right" size={26} color={color.forest} /></View>
        <Text style={s.sheetTitle}>{t('profile.signOutConfirm')}</Text>
        <Button title={t('profile.logout')} onPress={signOut} busy={signingOut} style={{ marginTop: 18 }} />
        <Button title={t('cancel')} variant="ghost" onPress={() => setConfirmOut(false)} style={{ marginTop: 10 }} />
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <View style={[s.sheetIcon, { backgroundColor: '#F4E2D8' }]}><Icon name="trash3" size={24} color={color.brick} /></View>
        <Text style={s.sheetTitle}>{t('profile.deleteTitle')}</Text>
        <Text style={s.sheetLead}>{t('profile.deleteWarn')}</Text>
        {error ? <View style={{ marginTop: 12 }}><Note warn>{error}</Note></View> : null}
        <Button title={t('profile.deleteConfirm')} variant="danger" onPress={remove} busy={deleting} style={{ marginTop: 18 }} />
        <Button title={t('cancel')} variant="ghost" onPress={() => setConfirmDelete(false)} style={{ marginTop: 10 }} />
      </Sheet>
    </View>
  )
}

function Section ({ title, action, children }: {
  title: string; action?: { label: string; onPress: () => void }; children: React.ReactNode
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={s.secHead}>
        <Text style={s.secTitle}>{title}</Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={8} style={s.secAction} accessibilityRole="button">
            <Icon name="pencil" size={12} color={color.forest} />
            <Text style={s.secActionText}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={s.card}>{children}</View>
    </View>
  )
}

function RowIcon ({ name }: { name: IconName }) {
  return <View style={s.rowIcon}><Icon name={name} size={16} color={color.forest} /></View>
}

function Info ({ icon, label, value, last }: { icon: IconName; label: string; value: string | null | undefined; last?: boolean }) {
  return (
    <View style={[s.row, last && s.last]}>
      <RowIcon name={icon} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, !value && { color: color.ink3, fontFamily: font.body }]} numberOfLines={1}>
          {value || t('profile.notSet')}
        </Text>
      </View>
    </View>
  )
}

function LinkRow ({ icon, label, hint, onPress, last }: {
  icon: IconName; label: string; hint?: string; onPress: () => void; last?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, last && s.last, pressed && { backgroundColor: color.paper }]}
      accessibilityRole="button"
    >
      <RowIcon name={icon} />
      <Text style={s.rowLabel} numberOfLines={1}>{label}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      <Icon name="chevron-right" size={13} color={color.ink3} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  page: { paddingHorizontal: space.gutter, paddingBottom: 40, maxWidth: 620, width: '100%', alignSelf: 'center' },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 18,
    borderRadius: space.radiusLg, backgroundColor: color.forest,
  },
  name: { fontFamily: font.displaySemi, fontSize: 26, lineHeight: 29, color: '#fff' },
  mail: { fontFamily: font.body, fontSize: 13.5, color: color.leafXl, marginTop: 3 },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  secTitle: { fontFamily: font.semi, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: color.ink3 },
  secAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  secActionText: { fontFamily: font.semi, fontSize: 13, color: color.forest },
  card: { backgroundColor: '#fff', borderRadius: space.radiusLg, borderWidth: 1, borderColor: color.lineSoft, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line,
  },
  last: { borderBottomWidth: 0 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF4E6', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, color: color.ink },
  hint: { fontFamily: font.body, fontSize: 13, color: color.ink3 },
  infoLabel: { fontFamily: font.body, fontSize: 12, color: color.ink3 },
  infoValue: { fontFamily: font.medium, fontSize: 15, color: color.ink, marginTop: 1 },
  langs: { flexDirection: 'row', gap: 3, backgroundColor: color.paper2, borderRadius: 999, padding: 3 },
  lang: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999 },
  langOn: { backgroundColor: color.forest },
  langText: { fontFamily: font.bold, fontSize: 11, color: color.ink2 },
  out: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 54,
    borderRadius: space.radius, backgroundColor: color.paper2,
  },
  outText: { fontFamily: font.semi, fontSize: 16, color: color.ink },
  del: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50 },
  delText: { fontFamily: font.semi, fontSize: 15, color: color.brick },
  sheetIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: color.leafXl,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  sheetTitle: { fontFamily: font.displaySemi, fontSize: 26, lineHeight: 30, color: color.ink },
  sheetLead: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.ink2, marginTop: 6 },
})
