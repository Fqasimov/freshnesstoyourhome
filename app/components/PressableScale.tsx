import { type PropsWithChildren } from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { duration, ease } from '@/lib/motion'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * Anything tappable that should answer the finger.
 *
 * Shrinks a little on press-in, straight away, and comes back on release — the
 * feedback has to start the instant the finger lands or the tap feels lost.
 * 0.97 is enough to be felt; much further and buttons look squashed.
 */
export function PressableScale ({ children, style, scaleTo = 0.97, disabled, ...rest }: PropsWithChildren<
  Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number }
>) {
  const scale = useSharedValue(1)
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: duration.press, easing: ease.out })
        rest.onPressIn?.(e)
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: duration.fast, easing: ease.out })
        rest.onPressOut?.(e)
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  )
}
