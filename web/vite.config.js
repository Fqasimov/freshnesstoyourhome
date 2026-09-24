import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

/* Three builds from one source:
   `npm run build`            → hashed assets for static hosting: the shop at
                                index.html and the admin panel at admin.html,
                                which the postbuild step below moves to
                                cms/index.html — see DEPLOY.md
   `npm run build:single`     → the shop as one self-contained .html, for previews
   `npm run build:admin-demo` → the panel as one self-contained .html, answering
                                from src/admin/demo.js instead of the network,
                                so the screens can be looked at without a server */
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  const adminDemo = mode === 'admin-demo'
  const oneFile = single || adminDemo

  return {
    /* Relative paths work from any depth for the self-contained previews,
       where everything is inlined and it does not matter either way. The
       standard build is served from real depth — the shop at the domain
       root, the panel moved a level down to cms/ — so its asset references
       have to be root-absolute or the panel's own request for its bundle
       resolves against /cms/ and 404s. */
    base: oneFile ? './' : '/',
    plugins: [vue(), ...(oneFile ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? 'dist-single' : adminDemo ? 'dist-admin-demo' : 'dist',

      /* Two pages, two bundles.
         
         The admin panel is a separate entry rather than a route inside the
         site, so none of it — not the screens, not the endpoint names, not the
         shape of the audit trail — ships to a customer browsing the shop. It
         is left out of the single-file build entirely, which exists only to
         preview the shop front. */
      rollupOptions: single
        ? {}
        : adminDemo
          ? { input: fileURLToPath(new URL('./admin.html', import.meta.url)) }
          : {
              input: {
                index: fileURLToPath(new URL('./index.html', import.meta.url)),
                admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
              },
            },

      // in single-file mode every image has to become a data: URI
      assetsInlineLimit: oneFile ? 100 * 1024 * 1024 : 4096,
      cssCodeSplit: !oneFile
    }
  }
})
