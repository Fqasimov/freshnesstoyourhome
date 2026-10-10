import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { api, ApiError, type Address } from '@/lib/api'
import { useCatalogue } from '@/lib/catalogue'
import { pick, t, useLang } from '@/lib/i18n'
import { AppBar, Body, Button, Empty, Field, Loading, Note, Small, inputStyle } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { color, font, space } from '@/theme/tokens'
import { feeText, isRange, zoneById } from '@/lib/zones'
import { money } from '@/lib/money'

type Draft = {
  id: string | null
  label: string
  line: string
  notes: string
  delivery_zone_id: string
}

export default function Addresses () {
  const catalogue = useCatalogue()
  const router = useRouter()
  // Checkout opens this straight onto a new address and expects to be
  // returned to once it is saved.
  const { new: openNew } = useLocalSearchParams<{ new?: string }>()
  const fromCheckout = openNew === '1'
  useLang()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(
    fromCheckout ? { id: null, label: '', line: '', notes: '', delivery_zone_id: '' } : null,
  )

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
    setError(null)
    setDraft({ id: null, label: '', line: '', notes: '', delivery_zone_id: '' })
  }

  function startEdit (a: Address) {
    setError(null)
    setDraft({
      id: a.id,
      label: a.label ?? '',
      line: a.line,
      notes: a.notes ?? '',
      delivery_zone_id: a.delivery_zone_id ?? '',
    })
  }

  function close () {
    if (fromCheckout) router.back()
    else setDraft(null)
  }

  async function save () {
    if (!draft || !draft.line.trim() || !draft.delivery_zone_id) return
    setSaving(true); setError(null)

    // map_link is left out rather than cleared, so an address saved with a
    // link before keeps it. A real map picker will fill it later.
    const body = {
      label: draft.label.trim() || null,
      line: draft.line.trim(),
      notes: draft.notes.trim() || null,
      delivery_zone_id: draft.delivery_zone_id,
    }

    try {
      if (draft.id) await api.updateAddress(draft.id, body)
      else await api.createAddress(body)
      if (fromCheckout) { router.back(); return }
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

  if (draft) {
    return (
      <AddressForm
        draft={draft}
        setDraft={setDraft}
        error={error}
        saving={saving}
        onSave={save}
        onCancel={close}
        currency={catalogue.currency}
        zones={catalogue.zones}
      />
    )
  }

  if (loading) return <View style={{ flex: 1 }}><AppBar title={t('profile.addresses')} back /><Loading /></View>

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={t('profile.addresses')} back />
      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: 36 }}>
        <Button title={t('checkout.addAddress')} onPress={startNew} style={{ marginBottom: 18 }} />

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
      </ScrollView>
    </View>
  )
}

type Zone = ReturnType<typeof useCatalogue>['zones'][number]

function AddressForm ({ draft, setDraft, error, saving, onSave, onCancel, currency, zones }: {
  draft: Draft
  setDraft: (d: Draft) => void
  error: string | null
  saving: boolean
  onSave: () => void
  onCancel: () => void
  currency: string
  zones: Zone[]
}) {
  const [picking, setPicking] = useState(false)
  const chosen = zones.find(z => z.id === draft.delivery_zone_id)

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={t('address.title')} back />
      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
        <Field label={t('deliv.zone')}>
          <Pressable
            onPress={() => setPicking(true)}
            accessibilityRole="button"
            accessibilityLabel={t('deliv.zonePick')}
            style={[s.picker, chosen && { borderColor: color.forest }]}
          >
            <Icon name="geo-alt" size={18} color={chosen ? color.forest : color.ink3} />
            <Text style={[s.pickerText, !chosen && { color: color.ink3 }]} numberOfLines={2}>
              {chosen ? pick(chosen.name) : t('deliv.zonePick')}
            </Text>
            {chosen ? <Text style={s.fee}>{zoneFee(chosen, currency)}</Text> : null}
            <Icon name="chevron-down" size={14} color={color.ink3} />
          </Pressable>
          {chosen && quotedAsRange(chosen)
            ? <Small style={{ marginTop: 8 }}>{t('deliv.feeRange')}</Small>
            : null}
        </Field>

        <Field label={t('deliv.addr')}>
          <TextInput style={inputStyle} value={draft.line} maxLength={300}
            placeholder={t('deliv.addrPh')} placeholderTextColor={color.ink3}
            autoComplete="street-address" textContentType="fullStreetAddress"
            onChangeText={(v) => setDraft({ ...draft, line: v })} />
        </Field>

        <Field label={t('address.notes')}>
          <TextInput style={inputStyle} value={draft.notes} maxLength={200}
            onChangeText={(v) => setDraft({ ...draft, notes: v })} />
        </Field>

        <Field label={t('address.label')} error={error}>
          <TextInput style={inputStyle} value={draft.label} maxLength={40}
            onChangeText={(v) => setDraft({ ...draft, label: v })} />
        </Field>

        <Button title={t('address.save')} onPress={onSave} busy={saving}
          disabled={!draft.line.trim() || !draft.delivery_zone_id} />
        <Button title={t('cancel')} variant="ghost" onPress={onCancel} style={{ marginTop: 10 }} />
      </ScrollView>

      <ZoneSheet
        open={picking}
        zones={zones}
        currency={currency}
        selected={draft.delivery_zone_id}
        onClose={() => setPicking(false)}
        onPick={(id) => { setDraft({ ...draft, delivery_zone_id: id }); setPicking(false) }}
      />
    </View>
  )
}

/* Fifty-one areas is too many to scroll past on the form itself, so they live
   in a sheet with a search box at the top. */
function ZoneSheet ({ open, zones, currency, selected, onClose, onPick }: {
  open: boolean
  zones: Zone[]
  currency: string
  selected: string
  onClose: () => void
  onPick: (id: string) => void
}) {
  const { height } = useWindowDimensions()
  const [query, setQuery] = useState('')

  useEffect(() => { if (open) setQuery('') }, [open])

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return zones
    // Matched against all three names, not the displayed one: people type
    // "Shuvalan" as often as "Şüvəlan".
    return zones.filter(z => {
      const shared = zoneById(z.id)
      const names = [z.name.az, z.name.ru, z.name.en, shared?.az, shared?.ru, shared?.en]
      return names.some(n => n?.toLowerCase().includes(needle))
    })
  }, [zones, query])

  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={s.sheetTitle}>{t('deliv.zonePick')}</Text>
      <TextInput
        style={[inputStyle, { marginBottom: 10 }]}
        value={query}
        onChangeText={setQuery}
        placeholder={t('deliv.zoneFind')}
        placeholderTextColor={color.ink3}
        autoCorrect={false}
      />
      <ScrollView style={{ maxHeight: Math.min(420, height * 0.5) }} keyboardShouldPersistTaps="handled">
        {shown.map(z => {
          const on = selected === z.id
          return (
            <Pressable
              key={z.id}
              onPress={() => onPick(z.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={s.row}
            >
              <View style={[s.dot, on && s.dotOn]} />
              <Body style={{ flex: 1 }}>{pick(z.name)}</Body>
              <Text style={s.fee}>{zoneFee(z, currency)}</Text>
            </Pressable>
          )
        })}
        {shown.length === 0 ? <Small style={{ paddingVertical: 14 }}>{t('deliv.zoneNone')}</Small> : null}
      </ScrollView>
    </Sheet>
  )
}

/* The panel's fee, always. The shared file's range is kept only while the
   panel's figure is still that range's low end — "5–7" is truer than "5" —
   so a fee changed in the panel shows here at once, as on the website. */
function sharedRange (z: Zone) {
  const shared = zoneById(z.id)
  return shared && shared.fee[0] * 100 === z.fee_minor ? shared : null
}

function zoneFee (z: Zone, currency: string): string {
  const shared = sharedRange(z)
  return shared ? `${feeText(shared)} ${currency}` : money(z.fee_minor, currency)
}

const quotedAsRange = (z: Zone) => isRange(sharedRange(z))

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
  picker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: color.line,
    borderRadius: space.radius, paddingHorizontal: 14, paddingVertical: 14,
  },
  pickerText: { flex: 1, fontFamily: font.medium, fontSize: 16, color: color.ink },
  sheetTitle: { fontFamily: font.displaySemi, fontSize: 22, color: color.ink, marginBottom: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line,
  },
  fee: { fontFamily: font.semi, fontSize: 13, color: color.ink2 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color.line },
  dotOn: { borderColor: color.forest, borderWidth: 6 },
})
