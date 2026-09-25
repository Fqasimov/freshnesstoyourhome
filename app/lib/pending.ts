import type { SignUpForm } from './api'

/**
 * A sign-up or reset waiting for its emailed code.
 *
 * Held in memory between the form and the code screen — never in route
 * params, which would put a password in the navigation state — and cleared
 * once the code is confirmed. The form is kept only so "send the code again"
 * can resubmit it; it dies with the app.
 */
export type Pending =
  | { kind: 'register'; email: string; ticket: string; form: SignUpForm }
  | { kind: 'reset'; email: string; ticket: string; password: string }

let pending: Pending | null = null

export const getPending = () => pending
export const setPending = (p: Pending | null) => { pending = p }
