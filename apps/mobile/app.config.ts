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

/**
 * The version, from the tag that is building — not from a number edited by hand.
 *
 * `IRODORA_VERSION_NAME` and `IRODORA_VERSION_CODE` are set by `.github/workflows/release.yml`
 * from the git tag, and both are documented in `.env.example` (the `state` gate enforces
 * that). Absent — a workstation run, or the on-demand test build — the defaults below make an
 * obviously-not-a-release `0.0.0` build code 1, which is what should appear on a phone
 * somebody handed a debug APK to.
 *
 * `versionCode` is the number Android compares when deciding whether an install is an
 * upgrade, and it is **monotonic forever**: a release published with a code is a code that can
 * never be reused. Deriving it from the tag rather than incrementing a committed integer is
 * what stops two branches minting the same one.
 *
 * Gate 16 reads the built APK and fails if either value did not reach it, because an
 * environment variable that silently defaulted looks exactly like one that was set.
 */
/**
 * One environment read, narrowed at runtime rather than trusted.
 *
 * `process.env` is typed here and NOT typed under the linter's program — they disagree, and
 * a cast to make the disagreement go away would be asserting something neither tool checked.
 * A `typeof` narrowing is true in both, and it is also the honest description of an
 * environment variable: a string if something set it, and nothing otherwise.
 */
function readEnvironment(key: string): string | undefined {
  const value: unknown = process.env[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

const versionName = readEnvironment('IRODORA_VERSION_NAME') ?? '0.0.0';
const rawVersionCode = readEnvironment('IRODORA_VERSION_CODE');
const versionCode = Number.parseInt(rawVersionCode ?? '1', 10);

if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2_100_000_000)
  throw new Error(
    `IRODORA_VERSION_CODE must be an integer in 1..2100000000, got ${String(rawVersionCode)}. ` +
      'Google Play rejects anything outside that range, and a build that fails here is cheaper ' +
      'than one that fails at upload.',
  );

const config: ExpoConfig = {
  name: 'Irodora',
  slug: 'irodora',
  version: versionName,
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
      // The wardrobe photograph (FR-40, F-043). A DIFFERENT operation from the sentence above
      // and it says so: this one is kept, and the string has to be honest about that or the
      // camera string becomes false the first time somebody adds a garment.
      NSPhotoLibraryUsageDescription:
        'Irodora can attach a photo you choose to an item in your wardrobe. It is stored in the encrypted database on this device and is never sent anywhere.',
    },
  },

  android: {
    package: 'com.irodora.app',
    versionCode,
    // NFR-12, as a build-time fact rather than a promise. `INTERNET` is absent from the
    // permission list AND blocked, because a library that declares it would otherwise have it
    // merged in silently.
    permissions: ['android.permission.CAMERA'],
    blockedPermissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      // Added after gate 16 rejected the first real release APK, which is the whole reason
      // that gate reads the artefact rather than this file (E-018).
      //
      // `expo-file-system` declares INTERNET, READ_EXTERNAL_STORAGE and WRITE_EXTERNAL_STORAGE
      // in `android/src/main/`, so they merge into a RELEASE build. It is not a dependency of
      // this app — nothing here imports it — it arrives transitively and is autolinked, and
      // the manifest merger takes its permissions silently and by design. INTERNET was already
      // blocked; these two were not, and they would have shipped.
      //
      // They are also the wrong permissions to ship on any modern Android: scoped storage made
      // WRITE ineffective at API 29 and granular media permissions replaced READ at API 33.
      // The database lives in app-private storage, which needs neither, and F-035's export
      // reads and writes "a file the person chose" through the Storage Access Framework, which
      // needs neither either.
      //
      // THE LIMIT, so it is a decision rather than an oversight: on API 24-28 a write to
      // SHARED storage does require WRITE_EXTERNAL_STORAGE. If the export flow ever needs
      // that, it is an ADR and a permission a person can see — not a line that reappeared.
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      // "Draw over other apps" — one of the most alarming entries in Android's own settings
      // screen, and Expo's prebuild template adds it to `src/main` by default, so it reaches
      // RELEASE and not just the dev client that wants it for the debug overlay.
      //
      // Nothing in a shipped Irodora draws over another app. A colour tool asking for this
      // would be a fair reason to refuse to install it.
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    // NOT blocked, and the omission is a decision: `VIBRATE` also arrives from Expo's default
    // manifest, and unlike the others it is WANTED. `apps/mobile/AGENTS.md` commits to "haptic
    // confirmation on selection, a non-visual channel that costs nothing" — which is an
    // accessibility promise (NFR-9: never colour alone), not a nicety. It is a normal-level
    // permission that grants no access to anything. Gate 16 expects it by name.
  },

  /*
   * `withReleaseSigning` is what stops a `release` build being signed with the debug key that
   * ships in every React Native template (F-080). It is a plugin rather than an edit to
   * `android/` because that directory is regenerated — see the file's own header, and
   * `AGENTS.md`: hand-edited native projects lose the edit silently on the next prebuild.
   */
  plugins: ['expo-router', './plugins/withReleaseSigning'],

  experiments: {
    typedRoutes: true,
  },
};

export default config;
