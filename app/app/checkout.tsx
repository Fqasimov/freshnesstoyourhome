import { useCallback, useEffect, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'

import { api, ApiError, type Address } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { useCatalogue } from '@/lib/catalogue'
import { useAuth } from '@/lib/auth'
import { t, useLang } from '@/lib/i18n'
import { money } from '@/lib/money'
import { AppBar, Body, Button, Field, Loading, Note, Row, Small, inputStyle } from '@/components/ui'
import { color, font, space } from '@/theme/tokens'

export default function Checkout () {
  const cart = useCart()
  const catalogue = useCatalogue()
  const auth = useAuth()
  const router = useRouter()
  useLang()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [payment, setPayment] = useState<'cash' | 'pos'>('cash')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lead = catalogue.delivery?.lead_days ?? 1
  const minDate = isoDaysFromNow(lead)
  const maxDate = isoDaysFromNow(14)

  const load = useCallback(async () => {
    try {
      const { data } = await api.addresses()
      setAddresses(data)

      const chosen = data.find(a => a.is_default) ?? data[0]
      if (chosen) {
        setAddressId(chosen.id)
        // The delivery fee depends on the zone, so the basket is re-priced now
        // that one is known — it was quoted without a zone.
        cart.setZone(chosen.delivery_zone_id)
      }
      setDate(minDate)
    } catch (e) {
      setError((e as ApiError).isOffline ? t('err.offline') : t('err.generic'))
    } finally {
      setLoading(false)
    }
    // cart.setZone is stable; re-running on every cart change would refetch
    // addresses on every quantity tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDate])

  useEffect(() => { load() }, [load])

  function pickAddress (a: Address) {
    setAddressId(a.id)
    cart.setZone(a.delivery_zone_id)
  }

  const quote = cart.quote
  const canPlace = Boolean(addressId) && Boolean(date) && auth.profileComplete &&
    Boolean(quote?.meets_minimum) && !placing

  async function place () {
    if (!canPlace) return
    setPlacing(true); setError(null)

    try {
      // Ids and quantities only. No prices leave this device.
      const order = await api.placeOrder({
        address_id: addressId,
        delivery_date: date,
        payment_method: payment,
        note: note.trim() || undefined,
        lines: cart.lines,
      })

      await cart.clear()
      router.replace({ pathname: '/orders/[id]', params: { id: order.id, placed: '1' } })
    } catch (e) {
      const err = e as ApiError
      const unavailable = err.payload?.unavailable_product_ids as string[] | undefined

      if (unavailable?.length) {
        await cart.dropUnavailable(unavailable)
        setError(err.message)
      } else {
        setError(Object.values(err.fieldErrors)[0] ?? err.message ?? t('err.generic'))
      }
    } finally {
      setPlacing(false)
    }
  }

  if (loading) return <View style={{ flex: 1 }}><AppBar title={t('checkout.title')} back /><Loading /></View>

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={t('checkout.title')} back />

      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: 36 }}>
        {/* A courier cannot deliver to a customer with no name and no phone.
            The server refuses the order too, so this is a shortcut rather than
            the control. */}
        {!auth.profileComplete ? (
          <View style={{ marginBottom: 22 }}>
            <Note warn>{t('profile.complete')}</Note>
            <Button
              title={t('profile.title')}
              variant="ghost"
              onPress={() => router.push('/(tabs)/profile')}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : null}

        <Text style={s.heading}>{t('checkout.address')}</Text>

        {addresses.length ? addresses.map(a => (
          <Pressable
            key={a.id}
            onPress={() => pickAddress(a)}
            accessibilityRole="radio"
            accessibilityState={{ selected: addressId === a.id }}
            style={[s.option, addressId === a.id && s.optionOn]}
          >
            <View style={[s.dot, addressId === a.id && s.dotOn]} />
            <View style={{ flex: 1 }}>
              {a.label ? <Text style={s.optionTitle}>{a.label}</Text> : null}
              <Body>{a.line}</Body>
              {a.notes ? <Small muted>{a.notes}</Small> : null}
            </View>
          </Pressable>
        )) : <Small muted>{t('address.none')}</Small>}

        <Button
          title={t('checkout.addAddress')}
          variant="ghost"
          onPress={() => router.push('/profile/addresses')}
          style={{ marginTop: 12 }}
        />

        <Text style={[s.heading, { marginTop: 26 }]}>{t('checkout.date')}</Text>
        <Field hint={t('checkout.dateNote')}>
          <TextInput
            style={inputStyle}
            value={date}
            onChangeText={setDate}
            placeholder={minDate}
            placeholderTextColor={color.ink3}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10}
          />
        </Field>
        <Small muted style={{ marginTop: -8 }}>{minDate} — {maxDate}</Small>

        <Text style={[s.heading, { marginTop: 26 }]}>{t('checkout.payment')}</Text>
        {(['cash', 'pos'] as const).map(method => (
          <Pressable
            key={method}
            onPress={() => setPayment(method)}
            accessibilityRole="radio"
            accessibilityState={{ selected: payment === method }}
            style={[s.option, payment === method && s.optionOn]}
          >
            <View style={[s.dot, payment === method && s.dotOn]} />
            <Text style={s.optionTitle}>
              {method === 'cash' ? t('checkout.cash') : t('checkout.pos')}
            </Text>
          </Pressable>
        ))}
        <Small muted style={{ marginTop: 8 }}>{t('checkout.paymentNote')}</Small>

        <View style={{ marginTop: 26 }}>
          <Field label={t('checkout.note')}>
            <TextInput
              style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
            />
          </Field>
        </View>

        {quote ? (
          <View style={{ marginTop: 6 }}>
            <Row label={t('cart.subtotal')} value={money(quote.subtotal_minor, quote.currency)} />
            {quote.delivery_fee_minor > 0 ? (
              <Row label={t('cart.delivery')} value={money(quote.delivery_fee_minor, quote.currency)} />
            ) : null}
            <Row
              label={t('cart.total')}
              value={(quote.requires_weighing ? `${t('cart.about')} ` : '') + money(quote.total_minor, quote.currency)}
              strong
            />
            {quote.requires_weighing ? (
              <View style={{ marginTop: 14 }}>
                <Note>
                  {t('shop.weighedNote')}{' '}
                  {t('cart.upTo', { amount: money(quote.weighed_ceiling_minor, quote.currency) })}
                </Note>
              </View>
            ) : null}
          </View>
        ) : null}

        {error ? <View style={{ marginTop: 16 }}><Note warn>{error}</Note></View> : null}

        <Button
          title={placing ? t('checkout.placing') : t('checkout.place')}
          onPress={place}
          disabled={!canPlace}
          busy={placing}
          style={{ marginTop: 22 }}
        />
      </ScrollView>
    </View>
  )
}

function isoDaysFromNow (days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const s = StyleSheet.create({
  heading: { fontFamily: font.displaySemi, fontSize: 19, color: color.ink, marginBottom: 12 },
  option: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: color.line,
    borderRadius: space.radius, padding: 14, marginBottom: 10,
  },
  optionOn: { borderColor: color.forest, borderWidth: 2 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color.line, marginTop: 2 },
  dotOn: { borderColor: color.forest, borderWidth: 6 },
  optionTitle: { fontFamily: font.semi, fontSize: 16, color: color.ink },
})
