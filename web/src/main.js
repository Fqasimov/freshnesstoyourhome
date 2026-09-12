import { createApp } from 'vue'
import App from './App.vue'
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
