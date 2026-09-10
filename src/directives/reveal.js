/* v-reveal — fades an element up the first time it scrolls into view.
   Replaces the hand-rolled IntersectionObserver bookkeeping of the
   vanilla build; the delay is passed as the binding value. */
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let io = null
const seen = new WeakMap()

function observer () {
  if (io) return io
  io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return
      e.target.classList.add('in')
      io.unobserve(e.target)
    })
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' })
  return io
}

export default {
  mounted (el, binding) {
    if (binding.value) el.style.setProperty('--d', binding.value)
    el.classList.add('reveal')
    if (RM) { el.classList.add('in'); return }
    seen.set(el, true)
    observer().observe(el)
  },
  unmounted (el) {
    if (io && seen.has(el)) io.unobserve(el)
  }
}
