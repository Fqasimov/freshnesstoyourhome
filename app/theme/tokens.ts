/**
 * Design tokens, shared with the website so the app and the site read as one
 * brand.
 *
 * Every colour here has been checked for WCAG AA contrast against the ground
 * it sits on. `ink3` and `leafDark` in particular are corrected values, not the
 * originals — do not lighten them without re-checking. `leafXl` exists because
 * `leafLight` only reaches 3.4:1 on the dark panels, which is fine for large
 * display type and not for anything a customer has to read.
 */
export const color = {
  paper: '#F6F3EA',
  paper2: '#EFEADC',
  paper3: '#E5DFCC',
  white: '#FFFFFF',

  ink: '#1B2916',
  ink2: '#3D4C35',
  ink3: '#5F6955',

  forest: '#3A6A2C',
  forest2: '#2C5121',
  leaf: '#84AB58',
  leafDark: '#52712F',
  leafLight: '#A8C782',
  leafXl: '#C9E6A4',

  brick: '#90452E',
  acid: '#EFE24E',

  line: 'rgba(27,41,22,0.14)',
  lineSoft: 'rgba(27,41,22,0.08)',
} as const

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
  displaySemi: 'Cormorant-SemiBold',
  displayBold: 'Cormorant-Bold',
  body: 'Onest-Regular',
  medium: 'Onest-Medium',
  semi: 'Onest-SemiBold',
  bold: 'Onest-Bold',
} as const

export const space = {
  gutter: 18,
  radius: 4,
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
