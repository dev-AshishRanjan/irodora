import type { ExpoConfig } from 'expo/config';

/**
 * Irodora — the app. The only surface ([ADR-0051](../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)).
 *
 * ## What is deliberately absent
 *
 * **No network permission is requested, on either platform.** The product's central privacy
 * claim (NFR-12) is that nothing is transmitted, and the strongest form of that claim is an app
 * that cannot transmit. Android's `INTERNET` permission is added by default by many libraries;
 * it is explicitly blocked below, and F-040's e2e suite asserts the process opens no socket.
 *
 * Adding it back is not a config tweak — it would falsify a requirement, and needs an ADR.
 *
 * **No `expo-updates` / OTA channel yet.** ADR-0051 names OTA as the corpus-correction path,
 * but shipping the client before there is a corpus to correct would add a network capability
 * for nothing. It arrives with F-012's bundle.
 *
 * ## Development client, not Expo Go
 *
 * VisionCamera is a native module and F-040 needs frame processors, so Expo Go can never run
 * this app. Choosing the dev client here rather than at F-040 avoids a migration on the feature
 * that can least afford one.
 */
const config: ExpoConfig = {
  name: 'Irodora',
  slug: 'irodora',
  version: '0.0.0',
  orientation: 'portrait',
  scheme: 'irodora',
  userInterfaceStyle: 'automatic',

  // NOTE: there is no `newArchEnabled` flag here, and its absence is correct rather than an
  // omission. The New Architecture has been MANDATORY since SDK 55 with no opt-out, so the
  // field is not part of ExpoConfig any more — setting it would be a typecheck error, and
  // reading its absence as "we forgot" is the mistake this comment exists to prevent.

  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.irodora.app',
    infoPlist: {
      // The camera is the Lens (F-040). The string is user-facing copy and is bound by the
      // claims lint: it says what we do with the frame, and does not promise accuracy.
      NSCameraUsageDescription:
        'Irodora reads colour from the camera on this device. Frames are analysed and discarded, and are never sent anywhere.',
    },
  },

  android: {
    package: 'com.irodora.app',
    // NFR-12, as a build-time fact rather than a promise. `INTERNET` is absent from the
    // permission list AND blocked, because a library that declares it would otherwise have it
    // merged in silently.
    permissions: ['android.permission.CAMERA'],
    blockedPermissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
  },

  plugins: ['expo-router'],

  experiments: {
    typedRoutes: true,
  },
};

export default config;
