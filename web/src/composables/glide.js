import { reducedMotion } from './useMotion'

/* Unhurried scrolling for the menu links and "back to top".
 *
 * The browser's own smooth scroll covers a whole page in a few hundred
 * milliseconds whatever the distance, which reads as a jolt rather than a
 * move. This one takes longer for longer trips (0.7s to 1.4s), eases in and
 * out so it starts and settles gently, and stops short of the fixed header
 * so the section title is not hidden under it. A wheel or touch cancels it —
 * the reader is never fought for control of the page. */
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

let running = 0

export function glideTo (target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 76
  const to = el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - (el.id === 'top' ? 0 : navH - 8)) : 0

  if (reducedMotion) { window.scrollTo(0, to); return Promise.resolve() }

  const from = window.scrollY
  const distance = to - from
  if (Math.abs(distance) < 2) return Promise.resolve()

  const duration = Math.min(1400, Math.max(700, Math.abs(distance) * 0.35))
  const id = ++running

  return new Promise(resolve => {
    const stop = () => { running++; cleanup(); resolve() }
    const cleanup = () => {
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
    }
    window.addEventListener('wheel', stop, { passive: true, once: true })
    window.addEventListener('touchstart', stop, { passive: true, once: true })

    const start = performance.now()
    const step = now => {
      if (id !== running) return
      const t = Math.min(1, (now - start) / duration)
      window.scrollTo(0, from + distance * easeInOut(t))
      if (t < 1) requestAnimationFrame(step)
      else { cleanup(); resolve() }
    }
    requestAnimationFrame(step)
  })
}
