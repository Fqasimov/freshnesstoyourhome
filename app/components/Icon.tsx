import { memo } from 'react'
import Svg, { Path } from 'react-native-svg'
import { ICONS } from './icons.generated'

export type IconName = keyof typeof ICONS

/**
 * Bootstrap Icons — the same set the website uses, so the two read as one
 * brand. Drawn from the path data rather than a font: crisp at any size, and
 * no icon font to load before the first frame.
 */
export const Icon = memo(function Icon ({ name, size = 20, color = '#1B2916' }: {
  name: IconName; size?: number; color?: string
}) {
  const paths = ICONS[name] as ReadonlyArray<readonly [string] | readonly [string, 1]>

  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      {paths.map(([d, evenOdd], i) => (
        <Path key={i} d={d} fillRule={evenOdd ? 'evenodd' : 'nonzero'} />
      ))}
    </Svg>
  )
})
