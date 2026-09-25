import { color } from '@/theme/tokens'

/**
 * How each category looks as a tile: a soft ground drawn from the brand
 * palette, and the photograph that stands for it. Categories added later in
 * the admin panel still get a tile — the fallback ground and their first
 * product's photo.
 */
export const CATEGORY_LOOK: Record<string, { bg: string; ink: string; photo: string }> = {
  smoked: { bg: '#F4E2D8', ink: color.brick, photo: 'smoked-salmon' },
  fresh: { bg: '#E2EED5', ink: color.forest2, photo: 'fresh-dorado' },
  seafood: { bg: '#E3EBE6', ink: color.forest2, photo: 'black-tiger-shrimp' },
  poultry: { bg: '#F5EBD2', ink: color.leafDark, photo: 'duck-fillet' },
  cheese: { bg: '#F7F1C9', ink: color.ink2, photo: 'burrata-plain' },
  pantry: { bg: '#EFE5DA', ink: color.brick, photo: 'frozen-croissant' },
}

export const FALLBACK_LOOK = { bg: color.paper2, ink: color.ink2, photo: '' }
