import type { ExpoConfig } from 'expo/config';
import { nativeColors } from '@irodora/design-tokens';

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

/**
 * The lowest Android API level this app is built for.
 *
 * **It is a colour-correctness requirement, not a taste.** Below 26 the frame pipeline cannot
 * read a pixel buffer at all — see the `expo-build-properties` entry below and ADR-0079 — so
 * lowering it does not degrade the Lens, it removes it. Exported so a gate can check the number
 * instead of grepping for it.
 */
export const ANDROID_MIN_SDK = 26;

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

  /*
   * THE IDENTITY (F-142, FR-69).
   *
   * These four PNGs are GENERATED from `MARK` in `packages/ui/src/brand.tsx` by
   * `scripts/generate-brand-assets.mjs`, and `--check` byte-compares them on every lint run.
   * Editing one by hand is a gate failure.
   *
   * That matters more here than it looks. The usual way an app gets an icon is that somebody
   * exports a PNG from a drawing tool and commits it — after which the file has no relationship
   * to the code at all, the mark can move, and the icon stays whatever it was on the day it was
   * exported. An app icon is the one asset you stop seeing after a week, so nobody notices.
   *
   * Until this feature there was no `icon`, no `adaptiveIcon` and no `splash` here AT ALL — not
   * misconfigured, absent — so the app shipped whatever Expo defaults to, on both platforms.
   */
  icon: './assets/brand/icon.png',

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
    /*
     * THE FOREGROUND IS TRANSPARENT AND SMALLER THAN THE ICON, and the number behind that is
     * Android's rather than a taste: an adaptive icon is masked to a shape the launcher chooses,
     * and only the central **66 of 108** units are guaranteed visible — a circle of Ø 625.8 px on
     * this 1024 canvas. The mark's ink is 432 px square, so its diagonal is 610.9 and it fits
     * inside that circle whichever mask the device applies. `brand-assets.test.mjs` asserts the
     * arithmetic rather than trusting this comment.
     *
     * `backgroundColor` is the manifest's dark `background`, so the two layers compose into the
     * same image `icon.png` already is.
     */
    adaptiveIcon: {
      foregroundImage: './assets/brand/adaptive-icon.png',
      backgroundColor: nativeColors.dark.background,
    },
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
      // Added after gate 16 rejected the first signed release APK of the internal lane.
      //
      // `expo-image-picker`'s config plugin adds RECORD_AUDIO **by default** — its
      // `withAndroidImagePickerPermissions` is `if (microphonePermission !== false)`, so the
      // permission arrives unless it is switched off by name. It is there for callers who pick
      // or capture VIDEO. This app does not: `wardrobe/picker.ts` passes
      // `mediaTypes: ['images']`, and nothing in the product records audio at all.
      //
      // The plugin is configured with `microphonePermission: false` below, which is the real
      // fix. This entry is the belt to that pair of braces: `blockedPermissions` survives the
      // plugin options being dropped in a refactor, and a microphone permission on a colour
      // tool is the kind of thing a person reads on the install screen and closes the page.
      'android.permission.RECORD_AUDIO',
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
  plugins: [
    'expo-router',
    /*
     * LISTED ONLY TO TURN THE MICROPHONE OFF. Expo autolinks this plugin whether or not it
     * appears here, and its default is to ADD `android.permission.RECORD_AUDIO` — the option is
     * `if (microphonePermission !== false)`, so the permission is opt-OUT rather than opt-in.
     * It exists for callers who capture video; `wardrobe/picker.ts` passes `mediaTypes:
     * ['images']` and this product has no audio anywhere.
     *
     * Naming the plugin is the only way to pass it an option. Setting the flag also makes the
     * plugin block the permission itself, which is why this is the fix and the
     * `blockedPermissions` entry above is the backstop.
     */
    ['expo-image-picker', { microphonePermission: false }],
    /*
     * THE LENS DOES NOT WORK BELOW API 26, AND THIS IS THE ONLY PLACE THAT CAN SAY SO.
     *
     * `react-native-nitro-modules` guards its whole `AHardwareBuffer` implementation behind
     * `#if __ANDROID_API__ >= 26`, with a `throw` in the `#else`. `__ANDROID_API__` is set by
     * the NDK from Gradle's `minSdkVersion`, and Nitro reads the app's value directly. Expo
     * defaults it to 24 when nothing sets it, so the native tree compiled at 24 and the throw is
     * what shipped — while `Frame.hasPixelBuffer` kept returning `true`, because it reports what
     * the DEVICE can do and the fault is in what WE built. ADR-0079.
     *
     * 26 rather than 28: 26 is the compile-time requirement. A device on 26–27 never reaches the
     * HardwareBuffer path — it takes the single-plane branch, which works — so a higher floor
     * would drop API levels and buy nothing.
     *
     * This belongs HERE and not in `android/`, which is generated, untracked, and rebuilt by
     * `expo prebuild --clean` in both CI workflows.
     */
    ['expo-build-properties', { android: { minSdkVersion: ANDROID_MIN_SDK } }],
    /*
     * THE SPLASH (F-142), AND WHY IT IS A PLUGIN RATHER THAN A CONFIG KEY.
     *
     * SDK 52 removed the top-level `splash` key; in SDK 57 the only `splash` left on
     * `ExpoConfig` is `web.splash`, for a PWA this product does not have. So the splash is
     * configured here or it is not configured at all — and "not at all" is what shipped until
     * now, which meant Expo's default template splash reached the artefact.
     *
     * `expo-splash-screen` was added as a dependency for this. It is first-party Expo at the
     * SDK's own version, it is what `expo prebuild` already assumed (the placeholder
     * `splashscreen_logo.png` files under `android/` are its output), and it adds no permission.
     *
     * BOTH THEMES, from the manifest. The image is the mark in each theme's `foreground` on a
     * transparent ground, composited over that theme's `background` — so the launch screen is
     * the same two colours the first painted frame will be, and there is no flash of the wrong
     * polarity between them. `imageWidth` is 40 % of the narrow edge of a typical phone, which
     * keeps the mark well inside the safe area on every aspect ratio.
     */
    [
      'expo-splash-screen',
      {
        image: './assets/brand/splash-icon-light.png',
        backgroundColor: nativeColors.light.background,
        imageWidth: 160,
        dark: {
          image: './assets/brand/splash-icon-dark.png',
          backgroundColor: nativeColors.dark.background,
        },
      },
    ],
    './plugins/withReleaseSigning',
  ],

  experiments: {
    typedRoutes: true,
  },
};

export default config;
