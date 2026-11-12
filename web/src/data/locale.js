/* Where each language lives: Azerbaijani at the root (freshness.az/kataloq),
   Russian and English under their own prefix (freshness.az/ru/kataloq). Plain
   functions, shared by the app and by web/scripts/prerender.mjs. */

export const LANGS = ['az', 'ru', 'en']
export const DEFAULT_LANG = 'az'
export const OG_LOCALE = { az: 'az_AZ', ru: 'ru_RU', en: 'en_US' }

/** "/kataloq" in this language: "/ru/kataloq". Query and hash are kept. */
export function withLang (path, lang) {
  const p = path || '/'
  if (!lang || lang === DEFAULT_LANG) return p
  return p === '/' || /^\/[?#]/.test(p) ? `/${lang}${p.slice(1)}` : `/${lang}${p}`
}

/** The language a path is in, and the path without its prefix. */
export function splitLang (path) {
  const m = String(path || '/').match(/^\/(ru|en)(?=\/|$|[?#])/)
  if (!m) return { lang: DEFAULT_LANG, path: path || '/' }
  const rest = path.slice(m[0].length)
  return { lang: m[1], path: rest.startsWith('/') ? rest : `/${rest}` }
}

/** The same page in every language, plus the default for everyone else. */
export function alternates (site, path) {
  return [
    ...LANGS.map(l => [l, `${site}${withLang(path, l)}`]),
    ['x-default', `${site}${withLang(path, DEFAULT_LANG)}`],
  ]
}
