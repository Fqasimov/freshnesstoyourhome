/* A page's text (components/PageFields.vue) between the API's shape —
   { seo_title: { az, ru, en }, h1: { … }, … } — and the form's, one block
   per language. */
const FIELDS = ['seo_title', 'seo_description', 'h1', 'body']
const LOCALES = ['az', 'ru', 'en']

export const pageForm = row => Object.fromEntries(LOCALES.map(l => [l,
  Object.fromEntries(FIELDS.map(f => [f, row?.[f]?.[l] ?? '']))]))

/* Every field is sent, so one emptied in the form is emptied on the server. */
export const pageBody = form => Object.fromEntries(LOCALES.map(l => [l,
  Object.fromEntries(FIELDS.map(f => [f, form[l][f].trim() || null]))]))

/* Back into the API's shape, for the row the list keeps. */
export const pageShape = form => Object.fromEntries(FIELDS.map(f => [f,
  Object.fromEntries(LOCALES.filter(l => form[l][f].trim()).map(l => [l, form[l][f].trim()]))]))
