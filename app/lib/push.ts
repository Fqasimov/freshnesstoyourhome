import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from './api'
import { getLang, t } from './i18n'
import { color } from '@/theme/tokens'

/**
 * Order updates by push.
 *
 * The rule this file exists to enforce: **never ask for permission at launch.**
 * A prompt shown before the customer has any reason to want notifications is
 * the one they deny, and on iOS a denial is effectively permanent — the app
 * cannot ask again, only send them to Settings. So the ask happens after the
 * first order is placed, when "tell me when it is on its way" is an offer
 * rather than an interruption.
 */

const ASKED_KEY = 'push_asked_v1'
const TOKEN_KEY = 'push_token_v1'

/**
 * How a notification behaves while the app is open.
 *
 * Shown as a banner rather than swallowed: an order moving to "on the way"
 * matters whether or not the customer happens to be looking at the app.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Android needs the channel to exist before anything arrives, and the server
 * sends `channelId: 'orders'`. Without a matching channel the notification
 * lands in a silent default one and nobody hears it.
 */
export async function ensureAndroidChannel (): Promise<void> {
  if (Platform.OS !== 'android') return

  await Notifications.setNotificationChannelAsync('orders', {
    name: t('push.channel'),
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: color.forest,
  })
}

/** Has the customer already been asked, whatever they answered? */
export async function hasBeenAsked (): Promise<boolean> {
  try { return (await AsyncStorage.getItem(ASKED_KEY)) === '1' } catch { return false }
}

async function markAsked (): Promise<void> {
  try { await AsyncStorage.setItem(ASKED_KEY, '1') } catch { /* not fatal */ }
}

/**
 * Ask, and register the device if granted.
 *
 * Returns true when the app may send order updates. Safe to call more than
 * once: if permission is already granted this just refreshes the token, which
 * is worth doing at every launch because the OS can reissue one at any time and
 * a stale token fails silently.
 */
export async function enablePush (): Promise<boolean> {
  // A simulator has no push service. Asking there produces a confusing error
  // rather than a prompt.
  if (!Device.isDevice) return false

  try {
    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status

    if (status !== 'granted') {
      if (!existing.canAskAgain) {
        // iOS only lets an app ask once. After a denial the only route is
        // Settings, and pretending otherwise would loop forever.
        await markAsked()
        return false
      }

      const asked = await Notifications.requestPermissionsAsync()
      status = asked.status
      await markAsked()
    }

    if (status !== 'granted') return false

    await ensureAndroidChannel()

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId

    // Required outside Expo Go. Without it the token request fails with a
    // message that reads like a network problem.
    if (!projectId) {
      console.warn('[push] no EAS project id — run `eas init` before a real build')
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )

    await registerToken(token)
    return true
  } catch (e) {
    // Never let this break a screen. The customer has just placed an order;
    // a failure to register for notifications is not their problem.
    console.warn('[push] could not enable:', String(e))
    return false
  }
}

async function registerToken (token: string): Promise<void> {
  await api.registerPushToken({
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    device_name: Device.modelName ?? undefined,
  })
  try { await AsyncStorage.setItem(TOKEN_KEY, token) } catch { /* not fatal */ }
}

/**
 * Refresh the registration for a signed-in customer who already said yes.
 *
 * Called at launch. Does not prompt — if permission was never granted this
 * does nothing at all.
 */
export async function refreshPushRegistration (): Promise<void> {
  if (!Device.isDevice) return

  try {
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') return

    await ensureAndroidChannel()

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )

    await registerToken(token)
  } catch {
    // Offline, or no push service. It will be retried next launch.
  }
}

/**
 * Stop sending to this device.
 *
 * Called on sign out as well as from the profile toggle: a shared or sold
 * phone must not keep receiving somebody's order updates.
 */
export async function disablePush (): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY)
    if (token) await api.unregisterPushToken(token)
  } catch {
    // If the server cannot be reached the token stays registered; the next
    // successful sign-in on another account will move it anyway.
  } finally {
    try { await AsyncStorage.removeItem(TOKEN_KEY) } catch { /* not fatal */ }
  }
}

export async function isEnabledOnThisDevice (): Promise<boolean> {
  if (!Device.isDevice) return false
  try {
    const [{ status }, token] = await Promise.all([
      Notifications.getPermissionsAsync(),
      AsyncStorage.getItem(TOKEN_KEY),
    ])
    return status === 'granted' && Boolean(token)
  } catch {
    return false
  }
}
