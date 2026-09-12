import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

/* Two builds from one source:
   `npm run build`        → a normal hashed-asset site for static hosting
   `npm run build:single` → one self-contained .html (used for Artifact previews) */
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: './',
    plugins: [vue(), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',

      /* Two pages, two bundles.
         
         The admin panel is a separate entry rather than a route inside the
         site, so none of it — not the screens, not the endpoint names, not the
         shape of the audit trail — ships to a customer browsing the shop. It
         is left out of the single-file build entirely, which exists only to
         preview the shop front. */
      rollupOptions: single ? {} : {
        input: {
          index: fileURLToPath(new URL('./index.html', import.meta.url)),
          admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
        },
      },

      // in single-file mode every image has to become a data: URI
      assetsInlineLimit: single ? 100 * 1024 * 1024 : 4096,
      cssCodeSplit: !single
    }
  }
})
