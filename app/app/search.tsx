import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn } from 'react-native-reanimated'

import { useCatalogue } from '@/lib/catalogue'
import { pick, t, useLang } from '@/lib/i18n'
import { duration } from '@/lib/motion'
import { Icon } from '@/components/Icon'
import { PressableScale } from '@/components/PressableScale'
import { ProductGrid } from '@/components/ProductGrid'
import { color, font, space, WEB_NO_OUTLINE } from '@/theme/tokens'

/**
 * Search, across all three languages at once: someone who knows a product as
 * «лосось» finds it with the app in Azerbaijani.
 */
export default function Search () {
  const catalogue = useCatalogue()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  useLang()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const results = useMemo(() => q
    ? catalogue.products.filter(p => Object.values(p.name ?? {}).some(n => String(n).toLowerCase().includes(q)))
    : [], [catalogue.products, q])

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <View style={[s.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="chevron-left" size={22} color={color.ink} />
        </Pressable>
        <View style={s.field}>
          <Icon name="search" size={16} color={color.forest} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('cat.search')}
            placeholderTextColor="#8C9384"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={s.input}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear">
              <Icon name="x-circle-fill" size={17} color={color.ink3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {q ? (
        <ProductGrid
          key={q}
          products={results}
          header={<Text style={s.count}>{t('cat.count', { n: results.length })}</Text>}
          empty={
            <View style={s.empty}>
              <Icon name="search" size={30} color={color.paper3} />
              <Text style={s.emptyTitle}>{t('search.empty')}</Text>
              <Text style={s.hint}>{t('search.hint')}</Text>
            </View>
          }
        />
      ) : (
        <Animated.View entering={FadeIn.duration(duration.base)} style={s.suggest}>
          <Text style={s.suggestTitle}>{t('cat.popular')}</Text>
          <View style={s.tags}>
            {catalogue.popular.slice(0, 10).map(p => (
              <PressableScale key={p.id} onPress={() => setQuery(pick(p.name))} style={s.tag} accessibilityRole="button">
                <Icon name="search" size={11} color={color.ink3} />
                <Text style={s.tagText} numberOfLines={1}>{pick(p.name)}</Text>
              </PressableScale>
            ))}
          </View>
          <Text style={[s.hint, { textAlign: 'left', marginTop: 18 }]}>{t('search.hint')}</Text>
        </Animated.View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.gutter - 6, paddingBottom: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  field: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16,
    borderRadius: 999, borderWidth: 2, borderColor: color.forest, backgroundColor: '#fff', marginRight: 6,
  },
  input: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.ink, paddingVertical: 10, ...WEB_NO_OUTLINE },
  count: { fontFamily: font.medium, fontSize: 13, color: color.ink3, marginBottom: 12 },
  empty: { alignItems: 'center', paddingTop: 50, gap: 8, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: font.displaySemi, fontSize: 24, color: color.ink },
  hint: { fontFamily: font.body, fontSize: 13.5, lineHeight: 19, color: color.ink3, textAlign: 'center' },
  suggest: { paddingHorizontal: space.gutter, paddingTop: 6 },
  suggestTitle: { fontFamily: font.displaySemi, fontSize: 22, color: color.ink, marginBottom: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: color.paper2,
  },
  tagText: { fontFamily: font.medium, fontSize: 13.5, color: color.ink2, flexShrink: 1 },
})
