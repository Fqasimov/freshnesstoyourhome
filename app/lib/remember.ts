import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Who last used this phone, so the next visit can say "Welcome back, Nicat"
 * with the address already filled in.
 *
 * Kept through sign-out — that is the point of it — and forgotten when the
 * account is deleted or the person taps "Not you?". It is a name and an
 * address, so it goes in the keychain like the token, not in plain storage.
 * On web there is no keychain, and nothing is kept.
 */
export type Remembered = { name: string | null; email: string }

const KEY = 'remembered_user'
const NATIVE = Platform.OS !== 'web'
let memory: Remembered | null = null

export async function getRemembered (): Promise<Remembered | null> {
  if (!NATIVE) return memory
  try {
    const raw = await SecureStore.getItemAsync(KEY)
    return raw ? JSON.parse(raw) as Remembered : null
  } catch {
    return null
  }
}

export async function remember (who: Remembered): Promise<void> {
  memory = who
  if (!NATIVE) return
  try { await SecureStore.setItemAsync(KEY, JSON.stringify(who)) } catch { /* not fatal */ }
}

export async function forget (): Promise<void> {
  memory = null
  if (!NATIVE) return
  try { await SecureStore.deleteItemAsync(KEY) } catch { /* not fatal */ }
}
