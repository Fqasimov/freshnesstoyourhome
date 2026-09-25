import { useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

import { useCatalogue } from '@/lib/catalogue'
import { pick, t, useLang } from '@/lib/i18n'
import { duration, ease } from '@/lib/motion'
import { Icon, type IconName } from '@/components/Icon'
import { PressableScale } from '@/components/PressableScale'
import { ProductGrid } from '@/components/ProductGrid'
import { Sheet } from '@/components/Sheet'
import { Empty } from '@/components/ui'
import type { Product } from '@/lib/api'
import { color, font, space } from '@/theme/tokens'

type Sort = 'popular' | 'cheap' | 'dear' | 'name'
const SORTS: { id: Sort; key: string; icon: IconName }[] = [
  { id: 'popular', key: 'cat.sortPopular', icon: 'fire' },
  { id: 'cheap', key: 'cat.sortCheap', icon: 'sort-down' },
  { id: 'dear', key: 'cat.sortDear', icon: 'sort-down' },
  { id: 'name', key: 'cat.sortName', icon: 'tag' },
]

/**
 * One category's shelf: its name large, the other categories as chips to
 * hop between, a sort, and the products two to a row.
 * "all" and "popular" are the two shelves that are not categories.
 */
export default function CategoryScreen () {
  const { id } = useLocalSearchParams<{ id: string }>()
  const catalogue = useCatalogue()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  useLang()

  const [current, setCurrent] = useState(id ?? 'all')
  const [sort, setSort] = useState<Sort>('popular')
  const [sorting, setSorting] = useState(false)

  // Bring the chosen chip into view, so the row always shows where you are.
  const chipRow = useRef<ScrollView>(null)
  const chipX = useRef<Record<string, number>>({})
  const reveal = (key: string) => {
    const x = chipX.current[key]
    if (x !== undefined) chipRow.current?.scrollTo({ x: Math.max(0, x - space.gutter), animated: true })
  }

  const title = current === 'all' ? t('cat.all')
    : current === 'popular' ? t('cat.popular')
      : pick(catalogue.categories.find(c => c.id === current)?.name)

  const products = useMemo(() => {
    const base: Product[] = current === 'popular' ? catalogue.popular : catalogue.inCategory(current)
    const list = [...base]
    if (sort === 'popular') list.sort((a, b) => Number(b.is_popular) - Number(a.is_popular))
    if (sort === 'cheap') list.sort((a, b) => a.price_minor - b.price_minor)
    if (sort === 'dear') list.sort((a, b) => b.price_minor - a.price_minor)
    if (sort === 'name') list.sort((a, b) => pick(a.name).localeCompare(pick(b.name)))
    return list
  }, [catalogue, current, sort])

  const chips = [
    { id: 'all', label: t('cat.all') },
    ...(catalogue.popular.length ? [{ id: 'popular', label: t('cat.popular') }] : []),
    ...catalogue.categories.map(c => ({ id: c.id, label: pick(c.name) })),
  ]

  const header = (
    <View>
      <Animated.Text key={`t-${current}`} entering={FadeInDown.duration(duration.base).easing(ease.out)} style={s.title}>
        {title}
      </Animated.Text>
      <Text style={s.count}>{t('cat.count', { n: products.length })}</Text>

      <ScrollView ref={chipRow} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={{ marginHorizontal: -space.gutter }}>
        {chips.map(c => {
          const on = c.id === current
          return (
            <PressableScale
              key={c.id}
              onLayout={(e) => {
                chipX.current[c.id] = e.nativeEvent.layout.x
                if (c.id === current) reveal(c.id)
              }}
              onPress={() => { setCurrent(c.id); reveal(c.id) }}
              style={[s.chip, on && s.chipOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.chipText, on && { color: '#fff' }]}>{c.label}</Text>
            </PressableScale>
          )
        })}
      </ScrollView>

      <View style={s.tools}>
        <Pressable onPress={() => setSorting(true)} style={s.tool} accessibilityRole="button">
          <Icon name="sliders" size={15} color={color.forest} />
          <Text style={s.toolText}>{t('cat.sort')}</Text>
        </Pressable>
        <Pressable onPress={() => setSorting(true)} style={s.tool} accessibilityRole="button">
          <Icon name="arrow-down-up" size={14} color={color.forest} />
          <Text style={s.toolText}>{t(SORTS.find(x => x.id === sort)!.key)}</Text>
        </Pressable>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <View style={[s.bar, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.icon} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="chevron-left" size={22} color={color.ink} />
        </Pressable>
        <Animated.Text key={`b-${current}`} entering={FadeIn.duration(duration.fast)} style={s.barTitle} numberOfLines={1}>
          {title}
        </Animated.Text>
        <Pressable onPress={() => router.push('/search')} hitSlop={10} style={s.icon} accessibilityRole="button" accessibilityLabel={t('cat.search')}>
          <Icon name="search" size={19} color={color.ink} />
        </Pressable>
      </View>

      <ProductGrid
        key={`${current}-${sort}`}
        products={products}
        header={header}
        empty={<Empty title={t('shop.empty')} />}
      />

      <Sheet open={sorting} onClose={() => setSorting(false)}>
        <Text style={s.sheetTitle}>{t('cat.sort')}</Text>
        {SORTS.map(o => {
          const on = o.id === sort
          return (
            <Pressable
              key={o.id}
              onPress={() => { setSort(o.id); setSorting(false) }}
              style={s.option}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
            >
              <Text style={[s.optionText, on && { color: color.forest, fontFamily: font.semi }]}>{t(o.key)}</Text>
              <View style={[s.radio, on && s.radioOn]}>{on ? <View style={s.radioDot} /> : null}</View>
            </Pressable>
          )
        })}
      </Sheet>
    </View>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.gutter - 6, paddingBottom: 6, backgroundColor: color.paper },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center', fontFamily: font.semi, fontSize: 15, color: color.ink },
  title: { fontFamily: font.displaySemi, fontSize: 34, lineHeight: 38, color: color.ink, marginTop: 4 },
  count: { fontFamily: font.medium, fontSize: 13, color: color.ink3, marginTop: 2, marginBottom: 14 },
  chips: { gap: 8, paddingHorizontal: space.gutter, paddingBottom: 4 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, backgroundColor: color.paper2 },
  chipOn: { backgroundColor: color.forest },
  chipText: { fontFamily: font.semi, fontSize: 13.5, color: color.ink2 },
  tools: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 16 },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6 },
  toolText: { fontFamily: font.semi, fontSize: 14, color: color.forest },
  sheetTitle: { fontFamily: font.displaySemi, fontSize: 26, color: color.ink, marginBottom: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line,
  },
  optionText: { fontFamily: font.body, fontSize: 16, color: color.ink },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.paper3, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: color.forest },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.forest },
})
