import { Easing } from 'react-native-reanimated'

/**
 * Motion, in one place.
 *
 * Short and front-loaded: an interface that answers at once and settles
 * softly feels fast; one that eases in feels like it is thinking. So almost
 * everything uses a strong ease-out, UI moves in 150–300ms, and nothing
 * starts from nothing — elements arrive from 96% and a few pixels away, not
 * from scale(0), which reads as a pop rather than an arrival.
 */
export const ease = {
  /** The default for anything entering or answering a touch. */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** For things moving from one place on screen to another. */
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  /** Leaving: quick to go, so it never holds up what comes next. */
  in: Easing.bezier(0.55, 0, 1, 0.45),
} as const

export const duration = {
  press: 120,
  fast: 180,
  base: 260,
  slow: 420,
} as const

/** Gentle, no overshoot to speak of — for sheets and moving pills. */
export const spring = { damping: 26, stiffness: 260, mass: 1 } as const

/** Stagger between list items arriving. Small, or the list feels slow. */
export const STAGGER = 40
