import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    // Capacitor serves the build from the device's filesystem, so assets are
    // referenced relatively rather than from the root of a domain.
    assetsDir: 'assets',
    // The 54 product photos are bundled; inlining any of them as data URIs
    // would only bloat the JS that has to parse before first paint.
    assetsInlineLimit: 0,
  },
  server: { port: 5174 },
})
