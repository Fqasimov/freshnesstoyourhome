/**
 * Google and Apple sign-in — the web build's side of it, which has neither.
 * Phones use social.native.ts; Metro picks the right file per platform.
 */
export type SocialResult = { idToken: string; name?: string | null } | null

export const googleAvailable = (): boolean => false
export const appleAvailable = async (): Promise<boolean> => false

export async function signInWithGoogle (): Promise<SocialResult> {
  throw new Error('unavailable')
}

export async function signInWithApple (): Promise<SocialResult> {
  throw new Error('unavailable')
}
