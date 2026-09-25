/**
 * The app's theme.
 *
 * The palette comes from shared/tokens.json by way of palette.ts, which the
 * website reads too — change a colour there, run `npm run sync` at the
 * repository root, and both surfaces change together. Everything else in this
 * file is the app's own: type sizes and tap targets that a phone wants and a
 * desktop page does not. See shared/README.md.
 */
export { color } from './palette'
export type { ColorName } from './palette'

/**
 * Font families are referenced through these names, never as literal strings
 * in a component. Onest carries Cyrillic and Latin Extended and Cormorant
 * carries both as well — which is what keeps the Azerbaijani schwa (ə) and the
 * Russian alphabet in the real face rather than a per-glyph fallback.
 *
 * Verify any replacement covers `ə Ə ş Ş ğ Ğ ı İ ç Ç ö Ö ü Ü` and Cyrillic
 * before adopting it.
 */
export const font = {
  // The brand's name and nothing else, as on the website. Latin only, like
  // the name itself.
  wordmark: 'Fraunces-SemiBold',
  displaySemi: 'Cormorant-SemiBold',
  displayBold: 'Cormorant-Bold',
  body: 'Onest-Regular',
  medium: 'Onest-Medium',
  semi: 'Onest-SemiBold',
  bold: 'Onest-Bold',
} as const

export const space = {
  gutter: 16,
  // Soft corners: the catalogue is tiles and photographs, and rounded ones
  // read as things to pick up. radiusLg is for tiles and sheets.
  radius: 14,
  radiusLg: 22,
  // 48 is the smallest target reliably hit with a thumb.
  tap: 48,
} as const

export const type = {
  h1: { fontFamily: font.displaySemi, fontSize: 32, lineHeight: 36 },
  h2: { fontFamily: font.displaySemi, fontSize: 24, lineHeight: 28 },
  h3: { fontFamily: font.displaySemi, fontSize: 18, lineHeight: 22 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  tiny: { fontFamily: font.body, fontSize: 12, lineHeight: 16 },
  label: {
    fontFamily: font.semi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
  },
} as const

/**
 * The browser's own focus ring, removed from fields that draw their own
 * (the web preview only — phones have none). The field's border already
 * shows focus, so the ring would be a second, clashing outline.
 */
export const WEB_NO_OUTLINE = { outlineWidth: 0 } as object
