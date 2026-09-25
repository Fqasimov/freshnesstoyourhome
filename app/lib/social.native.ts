import { Platform } from 'react-native'

/**
 * Google and Apple sign-in on the phone.
 *
 * Each hands back the provider's signed ID token and nothing else is trusted:
 * the server checks the signature, the issuer and that the token was made for
 * this app before it signs anyone in (SocialTokenVerifier).
 *
 * The native modules are loaded lazily, so a build without them (Expo Go, an
 * older store build receiving this code over the air) shows the buttons as
 * unavailable instead of crashing at launch.
 *
 * Google needs the OAuth client ids from Google Cloud, set as build
 * variables — see DEPLOY.md → "Google and Apple sign-in":
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID  (the token's audience on Android)
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
 */
export type SocialResult = { idToken: string; name?: string | null } | null

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''

function google (): any | null {
  try { return require('@react-native-google-signin/google-signin') } catch { return null }
}

function apple (): any | null {
  try { return require('expo-apple-authentication') } catch { return null }
}

let configured = false

export function googleAvailable (): boolean {
  if (WEB_CLIENT_ID === '' || (Platform.OS === 'ios' && IOS_CLIENT_ID === '')) return false
  return google() !== null
}

export async function signInWithGoogle (): Promise<SocialResult> {
  const mod = google()
  if (!mod || !googleAvailable()) throw new Error('unavailable')
  const { GoogleSignin, isSuccessResponse } = mod

  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID || undefined })
    configured = true
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
  const res = await GoogleSignin.signIn()

  // Closing the account picker is not an error; it is a change of mind.
  if (!isSuccessResponse(res) || !res.data.idToken) return null
  return { idToken: res.data.idToken }
}

/** Apple sign-in exists on iPhones only; on Android the button is not shown. */
export async function appleAvailable (): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  const mod = apple()
  if (!mod) return false
  try { return await mod.isAvailableAsync() } catch { return false }
}

export async function signInWithApple (): Promise<SocialResult> {
  const mod = apple()
  if (!mod) throw new Error('unavailable')

  try {
    const cred = await mod.signInAsync({
      requestedScopes: [
        mod.AppleAuthenticationScope.FULL_NAME,
        mod.AppleAuthenticationScope.EMAIL,
      ],
    })
    if (!cred.identityToken) return null

    // Apple tells the app the name once, on the very first sign-in, and never
    // puts it in the token — so it travels alongside.
    const n = cred.fullName
    const name = [n?.givenName, n?.familyName].filter(Boolean).join(' ') || null
    return { idToken: cred.identityToken, name }
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return null
    throw e
  }
}
