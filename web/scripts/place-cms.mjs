/**
 * The admin panel lives at /cms, not /admin.html.
 *
 * Vite builds it as admin.html because that is the entry file vite.config.js
 * points at — Vite has no notion of "build this entry into a subdirectory".
 * This moves the built file into place afterwards: dist/admin.html becomes
 * dist/cms/index.html, so a request for /cms resolves the way any other
 * directory index would, and admin.html itself no longer exists to be found
 * by a crawler or a guess. Its bundled JS and CSS stay in dist/assets/,
 * unmoved — vite.config.js gives the standard build root-absolute asset
 * paths for exactly this: cms/index.html and index.html both request
 * /assets/... regardless of which directory they are served from.
 *
 * Run automatically after `npm run build` — never needed by hand.
 */
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const from = join(webRoot, 'dist', 'admin.html')
const toDir = join(webRoot, 'dist', 'cms')
const to = join(toDir, 'index.html')

if (!existsSync(from)) {
  throw new Error(`place-cms: ${from} does not exist — did the build actually produce admin.html?`)
}

mkdirSync(toDir, { recursive: true })
renameSync(from, to)
console.log('  cms      dist/admin.html -> dist/cms/index.html')
