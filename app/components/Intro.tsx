import { useEffect, useRef } from 'react'
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Svg, { Circle, G, Line, Path } from 'react-native-svg'
import Animated, {
  Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withTiming, type SharedValue,
} from 'react-native-reanimated'

import { ARC, LEAF, LEAF_LENGTH, SEEDS } from './logoPaths'
import { ease } from '@/lib/motion'
import { color, font } from '@/theme/tokens'

const APath = Animated.createAnimatedComponent(Path)
const ACircle = Animated.createAnimatedComponent(Circle)
const AG = Animated.createAnimatedComponent(G)

/* The website's opening sequence, on the phone: the leaf traced on by a pen,
   the seeds dropping in, the arc swinging home, and the wordmark filling with
   green from the bottom up. Same timeline as IntroSequence.vue, a touch
   quicker — a site is opened once, an app many times a day. */
const PACE = 0.85
const at = (ms: number) => Math.round(ms * PACE)
const END = at(3200)

/** The fill climbs steadily, so it reads as loading rather than snapping. */
const sap = Easing.bezier(0.42, 0.03, 0.35, 1)

export function Intro ({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const { width } = useWindowDimensions()
  const done = useRef(false)

  // One clock per element, each a 0 → 1 progress.
  const draw = useSharedValue(0)
  const ink = useSharedValue(0)
  const penOff = useSharedValue(0)
  const arc = useSharedValue(0)
  const seeds = [useSharedValue(0), useSharedValue(0), useSharedValue(0)]
  const ripples = [useSharedValue(0), useSharedValue(0), useSharedValue(0)]
  const rise = [useSharedValue(0), useSharedValue(0)]
  const fill = [useSharedValue(0), useSharedValue(0)]
  const leave = useSharedValue(0)

  function finish () {
    if (done.current) return
    done.current = true
    onDone()
  }

  function exit () {
    leave.value = withTiming(1, { duration: 380, easing: ease.in }, (ok) => {
      if (ok) runOnJS(finish)()
    })
  }

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(finish, 250)
      return () => clearTimeout(t)
    }

    const out = (d: number, ms: number) => withDelay(at(d), withTiming(1, { duration: at(ms), easing: ease.out }))

    draw.value = out(100, 1250)
    penOff.value = out(1450, 500)
    ink.value = out(1150, 600)
    arc.value = out(0, 1100)
    seeds.forEach((s, i) => { s.value = out(950 + i * 110, 550) })
    ripples.forEach((r, i) => { r.value = out(1450 + i * 160, 1050) })
    rise[0].value = out(350, 1100)
    rise[1].value = out(520, 1100)
    fill[0].value = withDelay(at(550), withTiming(1, { duration: at(2400), easing: sap }))
    fill[1].value = withDelay(at(720), withTiming(1, { duration: at(2400), easing: sap }))

    const t = setTimeout(exit, END)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  const pen = useAnimatedProps(() => ({
    strokeDashoffset: LEAF_LENGTH * (1 - draw.value),
    opacity: 1 - penOff.value,
  }))
  const inkProps = useAnimatedProps(() => ({ opacity: ink.value }))
  const arcProps = useAnimatedProps(() => ({
    opacity: 0.9 * arc.value,
    rotation: -16 * (1 - arc.value),
  }))

  const stage = useAnimatedStyle(() => ({
    opacity: 1 - leave.value,
    transform: [{ scale: 1 + 0.04 * leave.value }],
  }))

  const markWidth = Math.min(210, width * 0.52)
  const wordSize = Math.min(46, width * 0.115)

  return (
    <Pressable
      style={s.root}
      onPress={() => { if (!done.current) exit() }}
      accessibilityLabel="Freshness To Your Home"
      accessibilityRole="image"
    >
      <Texture />
      <Animated.View style={[s.stage, stage]}>
        <Svg width={markWidth} height={markWidth * (300 / 415)} viewBox="340 0 415 300" style={{ overflow: 'visible' }}>
          <G>
            {ripples.map((r, i) => <Ripple key={i} progress={r} />)}
          </G>
          <AG animatedProps={arcProps} originX={491} originY={151}>
            <Path d={ARC} fill="none" stroke={color.logo} strokeWidth={7} strokeLinecap="round" strokeDasharray="18.7 17.2" />
          </AG>
          <APath d={LEAF} fill={color.logo} fillRule="evenodd" animatedProps={inkProps} />
          <APath
            d={LEAF}
            fill="none"
            stroke={color.logo}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${LEAF_LENGTH} ${LEAF_LENGTH}`}
            animatedProps={pen}
          />
          {SEEDS.map((seed, i) => <Seed key={i} {...seed} progress={seeds[i]} />)}
        </Svg>

        <View style={{ marginTop: 18, alignItems: 'center' }}>
          <Wordmark text="Freshness" size={wordSize} rise={rise[0]} fill={fill[0]} />
          <Wordmark text="To Your Home" size={wordSize * 0.52} rise={rise[1]} fill={fill[1]} />
        </View>
      </Animated.View>
    </Pressable>
  )
}

function Seed ({ cx, cy, r, progress }: { cx: number; cy: number; r: number; progress: SharedValue<number> }) {
  // Grows from a fifth of its size, never from nothing.
  const props = useAnimatedProps(() => ({ r: r * (0.2 + 0.8 * progress.value), opacity: progress.value }))
  return <ACircle cx={cx} cy={cy} fill={color.logo} animatedProps={props} />
}

function Ripple ({ progress }: { progress: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({
    r: 70 * (0.3 + 2.2 * progress.value),
    opacity: progress.value === 0 ? 0 : 0.5 * (1 - progress.value),
  }))
  return <ACircle cx={510} cy={144} fill="none" stroke={color.leafDark} strokeWidth={1.5} animatedProps={props} />
}

/**
 * A line of the wordmark: it rides up from under its own edge while the green
 * climbs through the letters from the bottom — a faint copy underneath, a
 * solid copy in a window that grows upward over it.
 */
function Wordmark ({ text, size, rise, fill }: {
  text: string; size: number; rise: SharedValue<number>; fill: SharedValue<number>
}) {
  const lineHeight = Math.round(size * 1.12)

  const riseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lineHeight * 1.12 * (1 - rise.value) }],
  }))
  const windowStyle = useAnimatedStyle(() => ({ height: lineHeight * fill.value }))

  const type = { fontFamily: font.wordmark, fontSize: size, lineHeight, letterSpacing: -size * 0.02 }

  return (
    <View style={{ overflow: 'hidden', height: lineHeight }}>
      <Animated.View style={riseStyle}>
        <Text style={[type, { color: 'rgba(36,90,42,0.15)' }]}>{text}</Text>
        <Animated.View style={[s.window, windowStyle]}>
          <Text style={[type, { color: color.logo, position: 'absolute', bottom: 0 }]}>{text}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

/** The website's faint diagonal ruling, darkening the paper. */
function Texture () {
  const { width, height } = useWindowDimensions()
  const lines = []
  for (let x = -height; x < width + height; x += 47) {
    lines.push(<Line key={x} x1={x} y1={0} x2={x + height * 0.21} y2={height} stroke={color.logo} strokeWidth={1} />)
  }
  return (
    <Svg width={width} height={height} style={[StyleSheet.absoluteFill, { opacity: 0.07 }]} pointerEvents="none">
      {lines}
    </Svg>
  )
}

const s = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center' },
  stage: { alignItems: 'center' },
  window: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
})
