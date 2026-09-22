import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { api, ApiError, type Address } from '@/lib/api'
import { useCatalogue } from '@/lib/catalogue'
import { pick, t, useLang } from '@/lib/i18n'
import { AppBar, Body, Button, Empty, Field, Loading, Note, Small, inputStyle } from '@/components/ui'
import { color, font, space } from '@/theme/tokens'
import { mapsUrl } from '@/lib/brand'
import { feeText, isRange, zoneById } from '@/lib/zones'
import { money } from '@/lib/money'

type Draft = {
  id: string | null
  label: string
  line: string
  notes: string
  mapLink: string
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
  /* Fifty-one areas is too many to scroll past looking for yours. */
  const [zoneQuery, setZoneQuery] = useState('')

  const zones = useMemo(() => {
    const needle = zoneQuery.trim().toLowerCase()
    if (!needle) return catalogue.zones
    // Matched against all three names, not the displayed one: people type
    // "Shuvalan" as often as "Şüvəlan", and an Azerbaijani keyboard is not
    // always what is to hand.
    return catalogue.zones.filter(z => {
      const shared = zoneById(z.id)
      const names = [z.name.az, z.name.ru, z.name.en, shared?.az, shared?.ru, shared?.en]
      return names.some(n => n?.toLowerCase().includes(needle))
    })
  }, [catalogue.zones, zoneQuery])

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
      id: null, label: '', line: '', notes: '', mapLink: '',
      delivery_zone_id: catalogue.zones[0]?.id ?? '',
    })
  }

  function startEdit (a: Address) {
    setDraft({
      id: a.id,
      label: a.label ?? '',
      line: a.line,
      notes: a.notes ?? '',
      mapLink: a.map_link ?? '',
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
      map_link: draft.mapLink.trim() || null,
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

          <Field label={t('deliv.addr')}>
            <TextInput style={inputStyle} value={draft.line} maxLength={300}
              autoComplete="street-address" textContentType="fullStreetAddress"
              onChangeText={(v) => setDraft({ ...draft, line: v })} />
          </Field>

          <Field label={t('address.notes')}>
            <TextInput style={inputStyle} value={draft.notes} maxLength={200}
              onChangeText={(v) => setDraft({ ...draft, notes: v })} />
          </Field>

          {/* The same slot the website's basket carries. A Baku street
              address and a courier's idea of it are not always the same
              place, and the link a phone's Share button produces already
              resolves to an exact point — no Maps key needed. When there is
              one, the embedded picker goes here and writes into this field. */}
          <Field label={t('deliv.map')}>
            <TextInput
              style={inputStyle}
              value={draft.mapLink}
              maxLength={500}
              placeholder={t('deliv.mapPh')}
              placeholderTextColor={color.ink3}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onChangeText={(v) => setDraft({ ...draft, mapLink: v })}
            />
            <Pressable onPress={() => Linking.openURL(mapsUrl())} style={{ marginTop: 8 }}>
              <Text style={s.action}>{t('deliv.mapOpen')}</Text>
            </Pressable>
            <Small style={{ marginTop: 8 }}>{t('deliv.mapHint')}</Small>
          </Field>

          <Field label={t('deliv.zone')} error={error}>
            <TextInput
              style={[inputStyle, { marginBottom: 12 }]}
              value={zoneQuery}
              onChangeText={setZoneQuery}
              placeholder={t('deliv.zoneFind')}
              placeholderTextColor={color.ink3}
              autoCorrect={false}
            />

            <View style={{ gap: 10 }}>
              {zones.map(z => {
                /* The fee shown is the shared file's, because the server holds
                   one integer per area and half of these are quoted as a range
                   — telling a customer "20" for an area that costs 20 to 25 is
                   the failure worth writing code to avoid. Where the id is one
                   the shared file does not know, the server's figure stands. */
                const shared = zoneById(z.id)
                const fee = shared
                  ? `${feeText(shared)} ${catalogue.currency}`
                  : money(z.fee_minor, catalogue.currency)

                return (
                  <Pressable
                    key={z.id}
                    onPress={() => setDraft({ ...draft, delivery_zone_id: z.id })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: draft.delivery_zone_id === z.id }}
                    style={[s.option, draft.delivery_zone_id === z.id && s.optionOn]}
                  >
                    <View style={[s.dot, draft.delivery_zone_id === z.id && s.dotOn]} />
                    <Body style={{ flex: 1 }}>{pick(z.name)}</Body>
                    <Text style={s.fee}>{fee}</Text>
                  </Pressable>
                )
              })}

              {zones.length === 0 ? <Small>{t('deliv.zoneNone')}</Small> : null}
            </View>

            {isRange(zoneById(draft.delivery_zone_id))
              ? <Small style={{ marginTop: 10 }}>{t('deliv.feeRange')}</Small>
              : null}
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
  fee: { fontFamily: font.semi, fontSize: 13, color: color.ink2 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color.line },
  dotOn: { borderColor: color.forest, borderWidth: 6 },
})
