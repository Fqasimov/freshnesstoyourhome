/**
 * Fail if anything generated from shared/ has drifted.
 *
 *   npm run check       at the repository root
 *
 * Run by the website's and the app's test commands. A hand-edit to a generated
 * file, or a change to shared/ that nobody synced, stops here rather than
 * shipping as a website and an app that quietly disagree.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FILES, ROOT, validate } from './shared-build.mjs'
import { syncPhotos } from './shared-photos.mjs'

validate()

const stale = []

for (const file of FILES) {
  let prev = null
  try { prev = readFileSync(join(ROOT, file.path), 'utf8') } catch { /* missing */ }
  if (prev !== file.build()) stale.push(file.path + (prev === null ? '  (missing)' : '  (differs)'))
}

const photos = syncPhotos({ write: false, log: false })
if (photos) stale.push(`${photos} product photo(s) out of step with shared/products`)

if (!stale.length) {
  console.log('In step with shared/: ' + FILES.length + ' generated file(s) and the photo library.')
  process.exit(0)
}

console.error('\nOut of step with shared/:\n')
for (const s of stale) console.error('  ' + s)
console.error('\nRun `npm run sync` at the repository root. If you edited one of these')
console.error('files by hand, move the change into shared/ instead — it is the only')
console.error('copy the other surface will ever see.\n')
process.exit(1)
