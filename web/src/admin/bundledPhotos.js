/**
 * The product pictures that ship inside the website's bundle.
 *
 * `?url` rather than the files themselves, so this module is a table of
 * strings and the browser fetches only the ones actually on screen. The panel
 * cannot manage these — they live in the repository, not on the server — but
 * it has to be able to *show* them, or every product photographed the old way
 * looks like it has no photograph at all.
 */
const FILES = import.meta.glob('../assets/products/*.jpg', {
  eager: true, query: '?url', import: 'default',
})

export const bundledPhoto = name =>
  name ? FILES[`../assets/products/${name}`] ?? null : null
