/* A page's text (components/PageFields.vue) between the API's shape —
   { seo_title: { az, ru, en }, h1: { … }, faq: { az: [{ q, a }] }, … } — and
   the form's, one block per language. */
const FIELDS = ['seo_title', 'seo_description', 'h1', 'intro', 'body']
const LOCALES = ['az', 'ru', 'en']

export const pageForm = row => Object.fromEntries(LOCALES.map(l => [l, {
  ...Object.fromEntries(FIELDS.map(f => [f, row?.[f]?.[l] ?? ''])),
  faq: (row?.faq?.[l] ?? []).map(x => ({ q: x.q ?? '', a: x.a ?? '' })),
}]))

const pairs = list => list.map(x => ({ q: x.q.trim(), a: x.a.trim() })).filter(x => x.q && x.a)

/* Every field is sent, so one emptied in the form is emptied on the server. */
export const pageBody = form => Object.fromEntries(LOCALES.map(l => [l, {
  ...Object.fromEntries(FIELDS.map(f => [f, form[l][f].trim() || null])),
  faq: pairs(form[l].faq),
}]))

/* Back into the API's shape, for the row the list keeps. */
export const pageShape = form => ({
  ...Object.fromEntries(FIELDS.map(f => [f,
    Object.fromEntries(LOCALES.filter(l => form[l][f].trim()).map(l => [l, form[l][f].trim()]))])),
  faq: Object.fromEntries(LOCALES.filter(l => pairs(form[l].faq).length).map(l => [l, pairs(form[l].faq)])),
})
