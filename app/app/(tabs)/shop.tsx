import { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation,
} from 'react-native-reanimated'

import { useAuth } from '@/lib/auth'
import { useCatalogue } from '@/lib/catalogue'
import { pick, t, useLang } from '@/lib/i18n'
import { duration, ease } from '@/lib/motion'
import { productImage } from '@/assets/products'
import { BrandMark } from '@/components/BrandMark'
import { CategoryTile } from '@/components/CategoryTile'
import { Icon } from '@/components/Icon'
import { PressableScale } from '@/components/PressableScale'
import { ProductCard } from '@/components/ProductCard'
import { Note } from '@/components/ui'
import type { Product } from '@/lib/api'
import { color, font, space } from '@/theme/tokens'

const GAP = 10

/**
 * The catalogue's front: a search bar that opens search, the delivery promise,
 * the best sellers as a wide tile, every category as a tile, and a shelf of
 * each below — browse by picture first, then by row.
 */
export default function Shop () {
  const auth = useAuth()
  const catalogue = useCatalogue()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  useLang()

  const [refreshing, setRefreshing] = useState(false)
  const y = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y })

  // The header gains an edge once there is something under it.
  const header = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(y.value, [0, 24], [0, 0.08], Extrapolation.CLAMP),
    borderBottomColor: `rgba(27,41,22,${interpolate(y.value, [0, 24], [0, 0.08], Extrapolation.CLAMP)})`,
  }))

  const inner = Math.min(width, 560) - space.gutter * 2
  const tileW = Math.floor((inner - GAP * 2) / 3)
  const shelfCard = Math.min(156, Math.floor(inner / 2.35))

  const shelves = useMemo(() => catalogue.categories
    .map(c => ({ category: c, products: catalogue.inCategory(c.id) }))
    .filter(x => x.products.length > 0), [catalogue])

  const first = auth.user?.name?.trim().split(/\s+/)[0]
  const hours = catalogue.delivery ? { open: catalogue.delivery.open, close: catalogue.delivery.close } : { open: '10:00', close: '22:00' }

  async function onRefresh () {
    setRefreshing(true)
    try { await catalogue.refresh() } catch { /* the stale note says so */ } finally { setRefreshing(false) }
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <Animated.View style={[s.header, { paddingTop: insets.top + 6 }, header]}>
        <View style={s.headRow}>
          <BrandMark size={34} />
          <View style={{ flex: 1 }}>
            <Text style={s.hello} numberOfLines={1}>{first ? t('cat.greeting', { name: first }) : t('cat.title')}</Text>
            <View style={s.where}>
              <Icon name="geo-alt-fill" size={11} color={color.forest} />
              <Text style={s.whereText} numberOfLines={1}>{t('cat.bannerLead', hours)}</Text>
            </View>
          </View>
        </View>

        <PressableScale
          scaleTo={0.985}
          onPress={() => router.push('/search')}
          style={s.search}
          accessibilityRole="search"
          accessibilityLabel={t('cat.search')}
        >
          <Text style={s.searchText}>{t('cat.search')}</Text>
          <View style={s.searchBtn}><Icon name="search" size={16} color="#fff" /></View>
        </PressableScale>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.forest} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.pad, { maxWidth: 560 + space.gutter * 2 }]}>
          {catalogue.stale ? <View style={{ marginBottom: 12 }}><Note warn>{t('err.offline')}</Note></View> : null}

          <Animated.View entering={FadeInDown.duration(duration.base).easing(ease.out)} style={s.banner}>
            <View style={s.bannerIcon}><Icon name="truck" size={22} color={color.forest2} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>{t('cat.banner')}</Text>
              <Text style={s.bannerLead}>{t('cat.bannerLead', hours)}</Text>
            </View>
          </Animated.View>

          {catalogue.popular.length > 0 ? (
            <PopularTile products={catalogue.popular} onPress={() => router.push({ pathname: '/category/[id]', params: { id: 'popular' } })} />
          ) : null}

          <View style={s.grid}>
            {catalogue.categories.map((c, i) => {
              const items = catalogue.inCategory(c.id)
              return (
                <CategoryTile
                  key={c.id}
                  id={c.id}
                  name={pick(c.name)}
                  count={items.length}
                  fallbackPhoto={items[0]?.id}
                  index={i}
                  width={tileW}
                />
              )
            })}
          </View>

          <PressableScale
            onPress={() => router.push({ pathname: '/category/[id]', params: { id: 'all' } })}
            style={s.allRow}
            accessibilityRole="button"
          >
            <Icon name="grid" size={18} color={color.forest} />
            <Text style={s.allText}>{t('cat.all')}</Text>
            <Text style={s.allCount}>{catalogue.products.length}</Text>
            <Icon name="chevron-right" size={14} color={color.ink3} />
          </PressableScale>
        </View>

        {catalogue.popular.length > 0 ? (
          <Shelf
            title={t('cat.popular')}
            products={catalogue.popular}
            cardWidth={shelfCard}
            onAll={() => router.push({ pathname: '/category/[id]', params: { id: 'popular' } })}
          />
        ) : null}

        {shelves.map(({ category, products }) => (
          <Shelf
            key={category.id}
            title={pick(category.name)}
            products={products.slice(0, 10)}
            cardWidth={shelfCard}
            onAll={() => router.push({ pathname: '/category/[id]', params: { id: category.id } })}
          />
        ))}
      </Animated.ScrollView>
    </View>
  )
}

/** Best sellers as one wide tile: three of them fanned out on forest green. */
function PopularTile ({ products, onPress }: { products: Product[]; onPress: () => void }) {
  const photos = products.map(p => productImage(p.id)).filter(Boolean).slice(0, 3) as number[]

  return (
    <Animated.View entering={FadeInDown.delay(40).duration(duration.base).easing(ease.out)}>
      <PressableScale onPress={onPress} style={s.popular} accessibilityRole="button" accessibilityLabel={t('cat.popular')}>
        <View style={{ flex: 1, zIndex: 1 }}>
          <View style={s.popularTag}>
            <Icon name="fire" size={11} color={color.ink} />
            <Text style={s.popularTagText}>{t('cat.hit')}</Text>
          </View>
          <Text style={s.popularTitle}>{t('cat.popular')}</Text>
          <Text style={s.popularLead}>{t('cat.popularLead')}</Text>
        </View>
        <View style={s.fan}>
          {photos.map((src, i) => (
            <View key={i} style={[s.fanPlate, { right: i * 38, top: i % 2 ? 26 : 4, zIndex: 3 - i, transform: [{ rotate: `${(i - 1) * 6}deg` }] }]}>
              <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          ))}
        </View>
      </PressableScale>
    </Animated.View>
  )
}

function Shelf ({ title, products, cardWidth, onAll }: {
  title: string; products: Product[]; cardWidth: number; onAll: () => void
}) {
  return (
    <View style={{ marginTop: 26 }}>
      <View style={s.shelfHead}>
        <Text style={s.shelfTitle} numberOfLines={1}>{title}</Text>
        <PressableScale onPress={onAll} style={s.seeAll} accessibilityRole="button" hitSlop={8}>
          <Text style={s.seeAllText}>{t('cat.seeAll')}</Text>
          <Icon name="chevron-right" size={12} color={color.forest} />
        </PressableScale>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 12 }}
        decelerationRate="fast"
        snapToInterval={cardWidth + 12}
      >
        {products.map(p => <ProductCard key={p.id} product={p} width={cardWidth} />)}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    backgroundColor: color.paper, paddingHorizontal: space.gutter, paddingBottom: 12, zIndex: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1B2916', shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  hello: { fontFamily: font.displaySemi, fontSize: 24, lineHeight: 27, color: color.ink },
  where: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  whereText: { fontFamily: font.medium, fontSize: 12, color: color.ink3, flexShrink: 1 },

  search: {
    flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 999,
    borderWidth: 2, borderColor: color.forest, backgroundColor: '#fff', paddingLeft: 18, paddingRight: 4,
  },
  searchText: { flex: 1, fontFamily: font.body, fontSize: 15.5, color: '#8C9384' },
  searchBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.forest, alignItems: 'center', justifyContent: 'center' },

  pad: { paddingHorizontal: space.gutter, paddingTop: 14, width: '100%', alignSelf: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: GAP,
    borderRadius: space.radiusLg, backgroundColor: '#fff', borderWidth: 1, borderColor: color.lineSoft,
  },
  bannerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.leafXl, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontFamily: font.semi, fontSize: 14.5, lineHeight: 19, color: color.ink },
  bannerLead: { fontFamily: font.body, fontSize: 12.5, color: color.ink3, marginTop: 2 },

  popular: {
    height: 128, borderRadius: space.radiusLg, overflow: 'hidden', marginBottom: GAP,
    backgroundColor: color.forest, padding: 16, flexDirection: 'row',
  },
  popularTag: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: color.acid, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, marginBottom: 8,
  },
  popularTagText: { fontFamily: font.bold, fontSize: 11, color: color.ink },
  popularTitle: { fontFamily: font.displaySemi, fontSize: 26, lineHeight: 28, color: '#fff' },
  popularLead: { fontFamily: font.medium, fontSize: 12.5, color: color.leafXl, marginTop: 3 },
  fan: { width: 150, height: '100%' },
  fanPlate: {
    position: 'absolute', width: 86, height: 86, borderRadius: 43, overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: color.paper3,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  allRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: GAP,
    paddingVertical: 15, paddingHorizontal: 16, borderRadius: space.radiusLg, backgroundColor: color.paper2,
  },
  allText: { flex: 1, fontFamily: font.semi, fontSize: 15, color: color.ink },
  allCount: { fontFamily: font.bold, fontSize: 13, color: color.ink3 },

  shelfHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.gutter, marginBottom: 12 },
  shelfTitle: { fontFamily: font.displaySemi, fontSize: 24, color: color.ink, flexShrink: 1 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: color.leafXl },
  seeAllText: { fontFamily: font.semi, fontSize: 13, color: color.forest2 },
})
