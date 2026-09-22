// Generated from shared/tokens.json — do not edit.
//
// Change the source and run `npm run sync` at the repository root. Editing
// this file directly makes the website and the app disagree, which is the
// one thing this arrangement exists to prevent; `npm run check` catches it.

export const color = {
  // the ground the whole brand sits on
  paper: '#F6F3EA',
  paper2: '#EFEADC',
  paper3: '#E5DFCC',
  white: '#FFFFFF',
  ink: '#1B2916',
  ink2: '#3D4C35',
  ink3: '#5F6955',
  forest: '#3A6A2C',
  forest2: '#2C5121',
  // the ink of the logo artwork itself, sampled from the supplied file —
  // close to forest2 but not it, and the mark should match its own file
  logo: '#245A2A',
  leaf: '#84AB58',
  leafDark: '#52712F',
  leafLight: '#A8C782',
  leafXl: '#C9E6A4',
  brick: '#90452E',
  brickLight: '#B15A3D',
  acid: '#EFE24E',
  line: 'rgba(27,41,22,0.14)',
  lineSoft: 'rgba(27,41,22,0.08)',
  lineInv: 'rgba(246,243,234,0.18)',
} as const

export type ColorName = keyof typeof color
