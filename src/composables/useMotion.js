import { ref } from 'vue'

/* One shared read of the user's motion preference. */
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* A transient status line — "added to basket" and friends. */
const message = ref('')
const showing = ref(false)
let timer = null

export function useToast () {
  function toast (text) {
    message.value = text
    showing.value = true
    clearTimeout(timer)
    timer = setTimeout(() => { showing.value = false }, 2300)
  }
  return { message, showing, toast }
}

/* Clones a product photo and throws it at the basket button. */
export function flyToCart (fromEl, toEl) {
  if (reducedMotion || !fromEl || !toEl) return
  const img = fromEl.matches('img') ? fromEl : fromEl.querySelector('img')
  if (!img) return
  const a = img.getBoundingClientRect()
  const b = toEl.getBoundingClientRect()
  const ghost = document.createElement('img')
  ghost.src = img.src
  ghost.className = 'fly'
  ghost.style.left = a.left + a.width / 2 - 37 + 'px'
  ghost.style.top  = a.top + a.height / 2 - 37 + 'px'
  document.body.appendChild(ghost)
  requestAnimationFrame(() => {
    const dx = b.left + b.width / 2 - (a.left + a.width / 2)
    const dy = b.top + b.height / 2 - (a.top + a.height / 2)
    ghost.style.transform = `translate(${dx}px,${dy}px) scale(.16) rotate(22deg)`
    ghost.style.opacity = '0'
  })
  setTimeout(() => ghost.remove(), 900)
}
