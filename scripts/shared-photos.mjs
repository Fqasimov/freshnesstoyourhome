/**
 * One photo library, two bundles.
 *
 * shared/products/ is the library. A photograph filed there under a product id
 * appears on the website and in the app, in that order of no effort at all —
 * previously it had to be dropped into two folders and the app's require()
 * index edited by hand, and a photo that reached only one of them was invisible
 * until someone happened to open the other surface.
 *
 * The copies under web/src/assets/products and app/assets/products are build
 * output, not source: they are gitignored and rewritten by `npm run sync`.
 * Copies rather than a shared import because Metro resolves require() at build
 * time, only watches the app's own folder, and cannot take a computed path.
 *
 * shared/products/_incoming/ is staging — photographs received but not yet
 * matched to a listing. It is deliberately not copied anywhere, so a photo can
 * be committed and discussed without being shipped.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './shared-build.mjs'

const LIBRARY = join(ROOT, 'shared', 'products')
const COPIES = [join(ROOT, 'web/src/assets/products'), join(ROOT, 'app/assets/products')]
const INDEX = join(ROOT, 'app/assets/products/index.ts')

const photos = () => {
  try {
    return readdirSync(LIBRARY).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).sort()
  } catch { return [] }
}

const same = (a, b) => {
  try {
    if (statSync(a).size !== statSync(b).size) return false
    return readFileSync(a).equals(readFileSync(b))
  } catch { return false }
}

const buildIndex = (names) => `/**
 * Product photographs bundled with the app.
 *
 * Generated from shared/products — do not edit. Metro resolves require() at
 * build time and cannot take a computed path, so every image has to be named
 * literally. The key is the product id from the API, which is what keeps a
 * photo from drifting away from the row it belongs to.
 *
 * Run \`npm run sync\` at the repository root after adding a photograph.
 */

export const PRODUCT_IMAGES: Record<string, number> = {
${names.map(f => `  '${f.replace(/\.[^.]+$/, '')}': require('./${f}'),`).join('\n')}
}

/** Falls back to undefined, which renders the card without a photo. */
export function productImage (id: string): number | undefined {
  return PRODUCT_IMAGES[id]
}
`

/**
 * @param {{write: boolean, log: boolean}} opts
 * @returns the number of files that were out of step (and, when writing, fixed)
 */
export function syncPhotos ({ write, log }) {
  const names = photos()
  let off = 0

  for (const dir of COPIES) {
    if (write) mkdirSync(dir, { recursive: true })

    for (const name of names) {
      const dest = join(dir, name)
      if (same(join(LIBRARY, name), dest)) continue
      off++
      if (write) {
        copyFileSync(join(LIBRARY, name), dest)
        if (log) console.log('  photo    ' + dir.slice(ROOT.length + 1) + '/' + name)
      }
    }

    // A photo withdrawn from the library goes from both bundles too, or it
    // stays in whichever one nobody looked at.
    let present = []
    try { present = readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)) } catch { /* not created yet */ }
    for (const name of present) {
      if (names.includes(name)) continue
      off++
      if (write) {
        rmSync(join(dir, name))
        if (log) console.log('  removed  ' + dir.slice(ROOT.length + 1) + '/' + name)
      }
    }
  }

  const index = buildIndex(names)
  let prev = null
  try { prev = readFileSync(INDEX, 'utf8') } catch { /* new */ }
  if (prev !== index) {
    off++
    if (write) {
      mkdirSync(join(ROOT, 'app/assets/products'), { recursive: true })
      writeFileSync(INDEX, index)
      if (log) console.log('  updated  app/assets/products/index.ts')
    }
  }

  return off
}
