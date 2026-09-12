import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { api, ApiError, type Address } from '@/lib/api'
import { useCatalogue } from '@/lib/catalogue'
import { pick, t, useLang } from '@/lib/i18n'
import { AppBar, Body, Button, Empty, Field, Loading, Note, Small, inputStyle } from '@/components/ui'
import { color, font, space } from '@/theme/tokens'

type Draft = {
  id: string | null
  label: string
  line: string
  notes: string
  delivery_zone_id: string
}

export default function Addresses () {
  const catalogue = useCatalogue()
  useLang()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.addresses()
      setAddresses(data)
    } catch (e) {
      setError((e as ApiError).isOffline ? t('err.offline') : t('err.generic'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function startNew () {
    setDraft({
      id: null, label: '', line: '', notes: '',
      delivery_zone_id: catalogue.zones[0]?.id ?? '',
    })
  }

  function startEdit (a: Address) {
    setDraft({
      id: a.id,
      label: a.label ?? '',
      line: a.line,
      notes: a.notes ?? '',
      delivery_zone_id: a.delivery_zone_id ?? catalogue.zones[0]?.id ?? '',
    })
  }

  async function save () {
    if (!draft || !draft.line.trim() || !draft.delivery_zone_id) return
    setSaving(true); setError(null)

    const body = {
      label: draft.label.trim() || null,
      line: draft.line.trim(),
      notes: draft.notes.trim() || null,
      delivery_zone_id: draft.delivery_zone_id,
    }

    try {
      if (draft.id) await api.updateAddress(draft.id, body)
      else await api.createAddress(body)
      setDraft(null)
      await load()
    } catch (e) {
      setError(Object.values((e as ApiError).fieldErrors)[0] ?? t('err.generic'))
    } finally {
      setSaving(false)
    }
  }

  async function remove (id: string) {
    try { await api.deleteAddress(id); await load() }
    catch (e) { setError((e as ApiError).message ?? t('err.generic')) }
  }

  if (loading) return <View style={{ flex: 1 }}><AppBar title={t('profile.addresses')} back /><Loading /></View>

  if (draft) {
    return (
      <View style={{ flex: 1 }}>
        <AppBar title={t('address.title')} back />
        <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: 36 }}>
          <Field label={t('address.label')}>
            <TextInput style={inputStyle} value={draft.label} maxLength={40}
              onChangeText={(v) => setDraft({ ...draft, label: v })} />
          </Field>

          <Field label={t('address.line')}>
            <TextInput style={inputStyle} value={draft.line} maxLength={300}
              autoComplete="street-address" textContentType="fullStreetAddress"
              onChangeText={(v) => setDraft({ ...draft, line: v })} />
          </Field>

          <Field label={t('address.notes')}>
            <TextInput style={inputStyle} value={draft.notes} maxLength={200}
              onChangeText={(v) => setDraft({ ...draft, notes: v })} />
          </Field>

          <Field label={t('address.zone')} error={error}>
            <View style={{ gap: 10 }}>
              {catalogue.zones.map(z => (
                <Pressable
                  key={z.id}
                  onPress={() => setDraft({ ...draft, delivery_zone_id: z.id })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: draft.delivery_zone_id === z.id }}
                  style={[s.option, draft.delivery_zone_id === z.id && s.optionOn]}
                >
                  <View style={[s.dot, draft.delivery_zone_id === z.id && s.dotOn]} />
                  <Body>{pick(z.name)}</Body>
                </Pressable>
              ))}
            </View>
          </Field>

          <Button title={t('address.save')} onPress={save} busy={saving} disabled={!draft.line.trim()} />
          <Button title={t('cancel')} variant="ghost" onPress={() => setDraft(null)} style={{ marginTop: 10 }} />
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={t('profile.addresses')} back />
      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: 36 }}>
        {error ? <View style={{ marginBottom: 14 }}><Note warn>{error}</Note></View> : null}

        {addresses.length === 0 ? (
          <Empty title={t('address.none')} />
        ) : addresses.map(a => (
          <View key={a.id} style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {a.label ? <Text style={s.cardLabel}>{a.label}</Text> : null}
              {a.is_default ? <View style={s.badge}><Text style={s.badgeText}>✓</Text></View> : null}
            </View>
            <Body>{a.line}</Body>
            {a.notes ? <Small muted>{a.notes}</Small> : null}

            <View style={s.actions}>
              <Pressable onPress={() => startEdit(a)}><Text style={s.action}>{t('address.save')}</Text></Pressable>
              <Pressable onPress={() => remove(a.id)}>
                <Text style={[s.action, { color: color.brick }]}>{t('address.delete')}</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Button title={t('checkout.addAddress')} onPress={startNew} style={{ marginTop: 8 }} />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: space.radius,
    borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineSoft,
    padding: 15, marginBottom: 11, gap: 2,
  },
  cardLabel: { fontFamily: font.semi, fontSize: 16, color: color.ink },
  badge: { backgroundColor: color.leafXl, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: font.semi, fontSize: 11, color: color.forest2 },
  actions: { flexDirection: 'row', gap: 18, marginTop: 12 },
  action: { fontFamily: font.semi, fontSize: 14, color: color.forest, textDecorationLine: 'underline' },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: color.line,
    borderRadius: space.radius, padding: 14,
  },
  optionOn: { borderColor: color.forest, borderWidth: 2 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color.line },
  dotOn: { borderColor: color.forest, borderWidth: 6 },
})
