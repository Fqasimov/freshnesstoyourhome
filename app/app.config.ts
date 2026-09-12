import type { ExpoConfig } from 'expo/config'

/**
 * Freshness To Your Home — customer app.
 *
 * Secrets are never in here. `EXPO_PUBLIC_*` values are inlined into the JS
 * bundle at build time and are readable by anyone who unpacks the app, so only
 * things that are safe to publish belong in them — an API base URL, yes; a key
 * of any kind, never.
 */
const config: ExpoConfig = {
  name: 'Freshness To Your Home',
  slug: 'freshness-to-your-home',
  scheme: 'freshness',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],

  ios: {
    bundleIdentifier: 'az.freshnesstoyourhome.app',
    supportsTablet: false,
    infoPlist: {
      // No encryption beyond standard HTTPS, which is exempt. Declaring this
      // saves a compliance question on every single App Store submission.
      ITSAppUsesNonExemptEncryption: false,
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
      // Filled in by `eas init` on first build.
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
}

export default config
