// Generated from shared/brand.json — do not edit.
//
// Change the source and run `npm run sync` at the repository root. Editing
// this file directly makes the website and the app disagree, which is the
// one thing this arrangement exists to prevent; `npm run check` catches it.

export const CONTACT = {
  name: 'Freshness To Your Home',
  phone: '+994503521919',
  phoneDisplay: '+994 50 352 19 19',
  whatsapp: '994503521919',
  instagram: 'freshness_to_your_home',
  email: 'info@freshnesstoyourhome.az',
  privacyUrl: 'https://freshnesstoyourhome.az/privacy/',
  hours: { az: 'Həftənin 7 günü · 10:00 – 22:00', ru: '7 дней в неделю · 10:00 – 22:00', en: '7 days a week · 10:00 – 22:00' },
  city: { az: 'Bakı, Azərbaycan', ru: 'Баку, Азербайджан', en: 'Baku, Azerbaijan' },
} as const

/* Where the map opens before a pin exists. */
export const MAP_CENTRE = { lat: 40.3777, lng: 49.892, zoom: 13 } as const

export const mapsUrl = () =>
  `https://www.google.com/maps/@${MAP_CENTRE.lat},${MAP_CENTRE.lng},${MAP_CENTRE.zoom}z`

/* How each category looks as a tile: its ground, its ink, its photo. */
export const CATEGORY_LOOK: Record<string, { bg: string; ink: string; photo: string }> = {
  smoked: { bg: '#F4E2D8', ink: '#90452E', photo: 'smoked-salmon' },
  fresh: { bg: '#E2EED5', ink: '#2C5121', photo: 'fresh-dorado' },
  seafood: { bg: '#E3EBE6', ink: '#2C5121', photo: 'black-tiger-shrimp' },
  poultry: { bg: '#F5EBD2', ink: '#52712F', photo: 'duck-fillet' },
  cheese: { bg: '#F7F1C9', ink: '#3D4C35', photo: 'burrata-plain' },
  pantry: { bg: '#EFE5DA', ink: '#90452E', photo: 'frozen-croissant' },
}
