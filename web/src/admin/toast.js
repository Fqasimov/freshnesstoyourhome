import { ref } from 'vue'

export const toast = ref(null)
let timer = null

export function say (message, kind = 'ok') {
  toast.value = { message, kind }
  clearTimeout(timer)
  timer = setTimeout(() => { toast.value = null }, kind === 'err' ? 6000 : 2600)
}

/** Turns an ApiError into something a shopkeeper can act on. */
export function complain (error) {
  const first = error?.errors && Object.values(error.errors)[0]?.[0]
  say(first || error?.message || 'Something went wrong.', 'err')
}
