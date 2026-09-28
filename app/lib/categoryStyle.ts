import { color } from '@/theme/tokens'

/**
 * How each category looks as a tile: a soft ground drawn from the brand
 * palette, and the photograph that stands for it. The table itself lives in
 * shared/brand.json, so the website's tiles are the same ones. Categories
 * added later in the admin panel still get a tile — the fallback ground and
 * their first product's photo.
 */
export { CATEGORY_LOOK } from './brand'

export const FALLBACK_LOOK = { bg: color.paper2, ink: color.ink2, photo: '' }
