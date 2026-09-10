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
      // in single-file mode every image has to become a data: URI
      assetsInlineLimit: single ? 100 * 1024 * 1024 : 4096,
      cssCodeSplit: !single
    }
  }
})
