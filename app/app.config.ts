import type { ExpoConfig } from 'expo/config'

/**
 * Freshness To Your Home — customer app.
 *
 * Secrets are never in here. `EXPO_PUBLIC_*` values are inlined into the JS
 * bundle at build time and are readable by anyone who unpacks the app, so only
 * things that are safe to publish belong in them — an API base URL, yes; a key
 * of any kind, never.
 */
/**
 * The Expo project this app belongs to (expo.dev → the project → its ID).
 * Not a secret: it names the project, it grants nothing. Needed for push
 * notifications in a real build and for over-the-air updates.
 */
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? ''

const config: ExpoConfig = {
  name: 'Freshness To Your Home',
  slug: 'freshness-to-your-home',
  scheme: 'freshness',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],

  /*
   * Over-the-air updates (EAS Update). A change to the app's own code —
   * text, a screen, a fix — reaches phones without a store review; the app
   * picks it up the next time it starts. A change to native code (a new
   * library with native parts, a permission, the SDK) still needs a store
   * build. `fingerprint` enforces that line: an update only goes to builds
   * whose native side is identical to the one it was made from, so an
   * update can never land on a build it would crash.
   */
  runtimeVersion: { policy: 'fingerprint' },
  updates: {
    enabled: EAS_PROJECT_ID !== '',
    url: EAS_PROJECT_ID ? `https://u.expo.dev/${EAS_PROJECT_ID}` : undefined,
    checkAutomatically: 'ON_LOAD',
    // Start straight away with what is on the phone; a downloaded update is
    // used from the next launch. A customer never waits on a spinner for it.
    fallbackToCacheTimeout: 0,
  },

  ios: {
    bundleIdentifier: 'az.freshnesstoyourhome.app',
    supportsTablet: false,
    infoPlist: {
      // No encryption beyond standard HTTPS, which is exempt. Declaring this
      // saves a compliance question on every single App Store submission.
      ITSAppUsesNonExemptEncryption: false,
    },
    // Order updates arrive while the app is closed; nothing runs in the
    // background beyond receiving them.
    entitlements: {
      'aps-environment': 'production',
    },
  },

  android: {
    package: 'az.freshnesstoyourhome.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#3A6A2C',
    },
    // The app asks for nothing. It has no camera, no location, no contacts —
    // an empty permission list is the strongest privacy statement available
    // and the easiest Data Safety form to fill in honestly.
    permissions: [],
  },

  web: {
    bundler: 'metro',
    output: 'static',
  },

  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        imageWidth: 220,
        resizeMode: 'contain',
        backgroundColor: '#3A6A2C',
      },
    ],
    [
      'expo-notifications',
      {
        // Android uses this in the status bar. A white-on-transparent
        // silhouette is the only thing that renders correctly there — a full
        // colour logo comes out as a grey square.
        icon: './assets/notification-icon.png',
        color: '#3A6A2C',
      },
    ],
    [
      'expo-font',
      {
        // Bundled rather than fetched: a customer on a slow connection should
        // not wait on a font CDN, and a shop app should not announce itself to
        // a third party every time it opens.
        fonts: [
          './assets/fonts/Cormorant-SemiBold.ttf',
          './assets/fonts/Cormorant-Bold.ttf',
          './assets/fonts/Onest-Regular.ttf',
          './assets/fonts/Onest-Medium.ttf',
          './assets/fonts/Onest-SemiBold.ttf',
          './assets/fonts/Onest-Bold.ttf',
        ],
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    router: {},
    eas: {
      projectId: EAS_PROJECT_ID || undefined,
    },
  },
}

export default config
