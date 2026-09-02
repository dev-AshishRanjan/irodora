# ADR-0079 — The Android minimum is API 26, because the pixel buffer is compiled out below it

## Status

**Accepted.** Raises the Android `minSdkVersion` from Expo's default of 24 to 26.

## Date

2026-09-01

## Context

Reading a colour with the camera failed on device across four builds. F-121's instrumentation
finally produced the cause verbatim:

> **the pixel buffer could not be read: `Frame.getPixelBuffer(...)`:
> `java.lang.RuntimeException: ArrayBuffer(HardwareBuffer) requires NDK API 26 or above!
> (minSdk >= 26)`**

The chain, end to end:

**1. Nitro guards its `AHardwareBuffer` support at compile time.** In
`react-native-nitro-modules/android/src/main/cpp/utils/JHardwareBufferUtils.cpp`, every entry
point is wrapped in `#if __ANDROID_API__ >= 26 … #else throw std::runtime_error(…) #endif`.

**2. `__ANDROID_API__` comes from the app's `minSdkVersion`.** The NDK toolchain sets it from
Gradle, and Nitro takes the app's value directly — `minSdkVersion getExtOrIntegerDefault("minSdkVersion")`.

**3. This repository never set one.** `ExpoRootProjectPlugin.kt` fills
`rootProject.ext.minSdkVersion` from `versionCatalogs.getVersionOrDefault("minSdk", "24")`. So
the entire native tree was compiled at API 24 and the `#else` branch is what shipped.

**4. The device takes that branch on every frame.** `ImageProxy+getPixelBuffer.kt` prefers a
CPU-readable HardwareBuffer whenever `Build.VERSION.SDK_INT >= P` (28), and
[ADR-0075](0075-the-frame-output-is-requested-as-rgb-because-yuv-would-mean-writing-a-colour-transform.md)'s
`pixelFormat: 'rgb'` gives CameraX an RGBA_8888 `ImageProxy` that is exactly that.

### The part worth remembering

`Frame.hasPixelBuffer` returns **true** in this situation. It asks the same question with only
the runtime half:

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
  hardwareBuffer?.use { if (it.isCpuReadable) return true }
}
```

**The guard and the call disagreed because one is a property of the device and the other is a
property of our build.** Nothing on the JavaScript side could have bridged that gap, and no test
in this repository can either — jest has no NDK.

### The chain, verified

Every link below was read in the installed sources, and the first was observed rather than
inferred — `expo prebuild --platform android --clean` was run and the generated file read back.

| step | how it travels | evidence |
| --- | --- | --- |
| `app.config.ts` → `android/gradle.properties` | `expo-build-properties` | **observed**: `android.minSdkVersion=26` |
| `android.minSdkVersion` → catalog key `minSdk` | `ExpoAutolinkingSettingsExtension.kt:117` | source |
| `minSdk` → `rootProject.ext.minSdkVersion` | `ExpoRootProjectPlugin.kt:53` | source |
| that → Nitro's own module | `minSdkVersion getExtOrIntegerDefault("minSdkVersion")` | source |
| that → `__ANDROID_API__` | the NDK toolchain, from Gradle | source |

**The one step not run here is the NDK compile itself**, which needs an Android toolchain this
workstation does not have. That is gate 16's job and F-039's attestation, still outstanding.

## Decision

**`minSdkVersion` is 26**, declared in `apps/mobile/app.config.ts` via `expo-build-properties`.

`app.config.ts` is the only source that survives: `apps/mobile/android/` is generated and
untracked, and both `android-build.yml` and `release.yml` run
`expo prebuild --platform android --clean`, which erases anything written into it by hand.

**26, not 28.** 26 is the compile-time requirement in Nitro's guard. A device on API 26–27 never
reaches the HardwareBuffer path — it falls to the single-plane branch, which works at any level —
so raising the floor to 28 would drop two more API levels and buy nothing.

## Consequences

### What it costs

**Android 7.0 and 7.1 (API 24–25) are no longer supported.**

This is the real cost and it should be stated plainly rather than waved past. Those devices can
no longer install the app at all — not "the Lens degrades", but the Play Store will not offer it
to them.

### Why that cost is close to zero here

**The app already did not work below 26.** Reading a colour with the camera is a core journey and
it threw on every frame. Declaring 24 was a claim the binary could not honour; declaring 26 makes
the manifest agree with what was actually shipped.

**NFR-7 already sets a much higher bar** — *responsive on a four-year-old mid-range Android*,
which in 2026 means API 31 or above. API 26 is Android 8.0, from August 2017.

### What it does not change

`targetSdkVersion` and `compileSdkVersion` are untouched. Neither is implicated, and moving them
brings behavioural changes of its own that belong to their own decision.

## Alternatives considered

**Request `pixelFormat: 'yuv'` and take the planar branch.** This is the only lever that exists
on the JavaScript side, and it is the one ADR-0075 already refused: a planar buffer means writing
a YUV→RGB transform, which `packages/color-core/AGENTS.md` will not accept without golden data
and which [E-008](../../.harness/state/effects.json) records as the way a surface comes to
measure differently on two platforms. Trading a two-level SDK bump for a hand-written colour
transform is a bad trade in a colour product.

**Detect and fall back at runtime.** There is nothing to detect. The failure is a compile-time
`#if`, and `hasPixelBuffer` — the only signal the API offers — reports the device's capability,
not our binary's. A JS-side fallback could only be a `try`/`catch` that gives up, which is what
F-121 already added and which is a diagnostic, not a feature.

**Set the value in `apps/mobile/android/` directly.** It would work locally and vanish on the
next `--clean` prebuild, which is how a fix becomes a mystery two weeks later.

**Leave it at 24 and drop the Lens on Android.** The Lens is the product.

## What guards it

A minimum living only in a config file is one careless edit away from a repeat, and the symptom
would be several device round trips to rediscover a number. A check asserts that the declared
Android minimum is at least what the frame pipeline needs — failing on a *lowered* value, not
merely a missing one — so the next regression is a red gate rather than a black screen.
