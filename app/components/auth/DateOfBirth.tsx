import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Sheet } from '../Sheet'
import { Wheel } from '../Wheel'
import { Button } from '../ui'
import { t } from '@/lib/i18n'
import { color, font } from '@/theme/tokens'

const pad = (n: number) => String(n).padStart(2, '0')
const daysIn = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

export const MIN_AGE = 13

/** "1995-04-12" → "12 April 1995", in the app's language. */
export function formatDob (iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${t('months').split(',')[m - 1]} ${y}`
}

/**
 * Three wheels — day, month, year — in a sheet. Starts on a plausible adult
 * birthday rather than today, so most people scroll a little, not decades.
 * Years stop at the minimum age, and the days follow the month (and leap
 * years), so an impossible date cannot be picked.
 */
export function DateOfBirthSheet ({ open, value, onClose, onPick }: {
  open: boolean; value: string | null; onClose: () => void; onPick: (iso: string) => void
}) {
  const now = new Date()
  const newest = now.getFullYear() - MIN_AGE
  const years = useMemo(() => {
    const out: number[] = []
    for (let y = newest; y >= 1920; y--) out.push(y)
    return out
  }, [newest])

  const initial = value ? value.split('-').map(Number) : [newest - 17, 1, 1]
  const [year, setYear] = useState(initial[0])
  const [month, setMonth] = useState(initial[1] - 1)
  const [day, setDay] = useState(initial[2])

  const months = t('months').split(',')
  const dayCount = daysIn(year, month)
  const safeDay = Math.min(day, dayCount)
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => String(i + 1)), [dayCount])

  // The newest year is only allowed up to today's date in it.
  const tooYoung = year === newest && (month > now.getMonth() || (month === now.getMonth() && safeDay > now.getDate()))

  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={s.title}>{t('dob.title')}</Text>
      <View style={s.heads}>
        <Text style={[s.head, { width: '24%' }]}>{t('dob.day')}</Text>
        <Text style={[s.head, { width: '44%' }]}>{t('dob.month')}</Text>
        <Text style={[s.head, { width: '28%' }]}>{t('dob.year')}</Text>
      </View>
      <View style={s.wheels}>
        <Wheel width="24%" items={days} index={safeDay - 1} onChange={(i) => setDay(i + 1)} />
        <Wheel width="44%" items={months} index={month} onChange={setMonth} />
        <Wheel width="28%" items={years.map(String)} index={Math.max(0, years.indexOf(year))} onChange={(i) => setYear(years[i])} />
      </View>
      {tooYoung ? <Text style={s.warn}>{t('err.age')}</Text> : null}
      <Button
        title={t('dob.done')}
        disabled={tooYoung}
        onPress={() => onPick(`${year}-${pad(month + 1)}-${pad(safeDay)}`)}
        style={{ marginTop: 16 }}
      />
    </Sheet>
  )
}

const s = StyleSheet.create({
  title: { fontFamily: font.displaySemi, fontSize: 26, color: color.ink, marginBottom: 12 },
  heads: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  head: { fontFamily: font.semi, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase', color: color.ink3, textAlign: 'center' },
  wheels: { flexDirection: 'row', justifyContent: 'space-between' },
  warn: { fontFamily: font.medium, fontSize: 13, color: color.brick, textAlign: 'center', marginTop: 8 },
})
