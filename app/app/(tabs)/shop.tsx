import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useCatalogue } from '@/lib/catalogue'
import { useCart } from '@/lib/cart'
import { pick, t, useLang } from '@/lib/i18n'
import { ProductCard } from '@/components/ProductCard'
import { Empty, Loading, Note, Small, inputStyle } from '@/components/ui'
import type { Product } from '@/lib/api'
import { color, font, space } from '@/theme/tokens'

export default function Shop () {
  const catalogue = useCatalogue()
  const cart = useCart()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  useLang()

  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const categories = useMemo(
    () => [{ id: 'all', name: { az: t('shop.all'), ru: t('shop.all'), en: t('shop.all') } }, ...catalogue.categories],
    [catalogue.categories]
  )

  const results = useMemo(() => {
    let list = catalogue.inCategory(category)
    const q = query.trim().toLowerCase()

    if (q) {
      // Searches all three languages at once: someone who knows a product as
      // "лосось" should find it with the app set to Azerbaijani.
      list = list.filter(p =>
        Object.values(p.name ?? {}).some(n => String(n).toLowerCase().includes(q))
      )
    }

    return list
  }, [catalogue, category, query])

  const showPopular = category === 'all' && !query.trim() && catalogue.popular.length > 0

  async function onRefresh () {
    setRefreshing(true)
    try { await catalogue.refresh() } catch { /* the stale banner reports it */ }
    finally { setRefreshing(false) }
  }

  if (!catalogue.loaded) return <Loading />

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.header, { paddingTop: insets.top }]}>
        <View style={s.headerIn}>
          <Text style={s.title}>{t('app.name')}</Text>
        </View>

        <View style={{ paddingHorizontal: space.gutter, paddingBottom: 10 }}>
          <TextInput
            style={inputStyle}
            value={query}
            onChangeText={setQuery}
            placeholder={t('shop.search')}
            placeholderTextColor={color.ink3}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          {categories.map(c => (
            <Pressable
              key={c.id}
              onPress={() => setCategory(c.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: category === c.id }}
              style={[s.chip, category === c.id && { backgroundColor: color.forest }]}
            >
              <Text style={[s.chipText, category === c.id && { color: '#fff' }]}>{pick(c.name)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList<Product>
        data={results}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={[s.list, !cart.isEmpty && { paddingBottom: 92 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.forest} />}
        ListHeaderComponent={
          <>
            {catalogue.stale ? (
              <View style={{ marginBottom: 14 }}><Note warn>{t('err.offline')}</Note></View>
            ) : null}

            {showPopular ? (
              <>
                <Text style={s.heading}>{t('shop.popular')}</Text>
                <View style={s.popularGrid}>
                  {catalogue.popular.map(p => (
                    <View key={p.id} style={{ width: '48%' }}><ProductCard product={p} /></View>
                  ))}
                </View>
                <Text style={s.heading}>{t('shop.all')}</Text>
              </>
            ) : null}
          </>
        }
        renderItem={({ item }) => <ProductCard product={item} />}
        ListEmptyComponent={<Empty title={t('shop.empty')} />}
        // Rendering 54 photo cards at once is what makes a shop screen stutter.
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
      />

      {/* A running total that follows the customer down the page, so they never
          have to open the basket to know where they are. */}
      {!cart.isEmpty ? (
        <Pressable
          onPress={() => router.push('/(tabs)/basket')}
          accessibilityRole="button"
          style={s.bar}
        >
          <View style={s.barCount}><Text style={s.barCountText}>{cart.count}</Text></View>
          <Text style={s.barText}>{t('cart.title')}</Text>
          <Text style={[s.barText, { marginLeft: 'auto' }]}>→</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    backgroundColor: color.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.lineSoft,
  },
  headerIn: { minHeight: 52, justifyContent: 'center', paddingHorizontal: space.gutter },
  title: { fontFamily: font.displaySemi, fontSize: 22, color: color.ink },
  chips: { gap: 8, paddingHorizontal: space.gutter, paddingBottom: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 999, backgroundColor: color.paper2 },
  chipText: { fontFamily: font.semi, fontSize: 13, color: color.ink2 },
  list: { padding: space.gutter, gap: 14, paddingBottom: 24 },
  heading: { fontFamily: font.displaySemi, fontSize: 20, color: color.ink, marginBottom: 12 },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 22 },
  bar: {
    position: 'absolute', left: space.gutter, right: space.gutter, bottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: color.forest, borderRadius: 999,
    paddingVertical: 14, paddingHorizontal: 18,
    shadowColor: '#1B2916', shadowOpacity: 0.25, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  barCount: {
    minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 999,
    backgroundColor: color.acid, alignItems: 'center', justifyContent: 'center',
  },
  barCountText: { fontFamily: font.bold, fontSize: 12, color: color.ink },
  barText: { fontFamily: font.semi, fontSize: 15, color: '#fff' },
})
