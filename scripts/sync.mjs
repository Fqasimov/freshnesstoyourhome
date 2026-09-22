/**
 * Regenerate every file derived from shared/.
 *
 *   npm run sync        at the repository root
 *
 * Runs automatically before the website builds and before the app starts or
 * exports, so a clone is never one forgotten command away from a stale copy.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { FILES, ROOT } from './shared-build.mjs'
import { syncPhotos } from './shared-photos.mjs'

let changed = 0

for (const file of FILES) {
  const full = join(ROOT, file.path)
  const next = file.build()
  let prev = null
  try { prev = readFileSync(full, 'utf8') } catch { /* new file */ }

  if (prev === next) continue
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, next)
  console.log('  ' + (prev === null ? 'new    ' : 'updated') + '  ' + file.path)
  changed++
}

changed += syncPhotos({ write: true, log: true })

console.log(changed ? `\n${changed} file(s) written from shared/.` : 'Everything already matches shared/.')
