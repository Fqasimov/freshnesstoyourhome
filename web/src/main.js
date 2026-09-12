import { createApp } from 'vue'
import App from './App.vue'
import { loadCatalogue } from './data/catalogue'
import reveal from './directives/reveal'
import favicon from './assets/logo-mark.png'
import './styles/base.css'

/* Set at runtime so the icon is inlined in the single-file build and
   hashed in the normal one, rather than living in public/. */
for (const rel of ['icon', 'apple-touch-icon']) {
  const link = document.createElement('link')
  link.rel = rel
  link.href = favicon
  document.head.appendChild(link)
}

createApp(App).directive('reveal', reveal).mount('#app')

/* Not awaited: the bundled catalogue is already on screen, and the live one
   replaces it in place the moment the API answers. Making first paint wait on
   the network would trade a correct price for a blank page. */
loadCatalogue()
