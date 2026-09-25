import { Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { ARC, LEAF, SEEDS } from './logoPaths'
import { color, font } from '@/theme/tokens'

/** The mark, still — the same drawing the opening animation ends on. */
export function BrandMark ({ size = 44, tint = color.logo }: { size?: number; tint?: string }) {
  return (
    <Svg width={size} height={size * (300 / 415)} viewBox="340 0 415 300">
      <Path d={ARC} fill="none" stroke={tint} strokeWidth={7} strokeLinecap="round" strokeDasharray="18.7 17.2" opacity={0.9} />
      <Path d={LEAF} fill={tint} fillRule="evenodd" />
      {SEEDS.map((c, i) => <Circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={tint} />)}
    </Svg>
  )
}

/** Mark and name together, as a header. */
export function BrandLockup ({ size = 40 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <BrandMark size={size} />
      <View>
        <Text style={{ fontFamily: font.wordmark, fontSize: size * 0.5, lineHeight: size * 0.56, color: color.logo, letterSpacing: -0.4 }}>Freshness</Text>
        <Text style={{ fontFamily: font.wordmark, fontSize: size * 0.27, lineHeight: size * 0.32, color: color.logo }}>To Your Home</Text>
      </View>
    </View>
  )
}

/** Initials in a leaf-green disc: the person, without asking for a photo. */
export function Avatar ({ name, size = 52 }: { name: string | null | undefined; size?: number }) {
  const initials = (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '·'
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color.leafXl, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font.bold, fontSize: size * 0.36, color: color.forest2 }}>{initials}</Text>
    </View>
  )
}
