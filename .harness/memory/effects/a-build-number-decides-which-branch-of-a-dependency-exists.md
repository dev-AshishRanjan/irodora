---
kind: effect
id: E-054
title: A build number decides which branch of a dependency's C++ exists, and the runtime guard cannot see it
severity: critical
created: 2026-09-01
scope: [apps/mobile]
links: [[a-worklet-may-only-call-worklets-and-jest-has-one-runtime]], [[a-fallback-that-marks-itself-as-working-stops-being-a-fallback]], [[a-dependency-can-ship-a-capability-no-source-file-mentions]], [[saying-not-run-here-is-necessary-and-it-is-not-sufficient]]
---

# E-054 — a build number decides which branch of a dependency's C++ exists

**One integer in one config file chose, at compile time, whether the Lens could read a pixel.**

`react-native-nitro-modules` guards its entire `AHardwareBuffer` implementation like this:

```cpp
#if __ANDROID_API__ >= 26
  AHardwareBuffer_describe(hardwareBuffer, &description);
  …
#else
  throw std::runtime_error("ArrayBuffer(HardwareBuffer) requires NDK API 26 or above! (minSdk >= 26)");
#endif
```

`__ANDROID_API__` is set by the NDK toolchain from Gradle's `minSdkVersion`, and Nitro takes the
app's value directly — `minSdkVersion getExtOrIntegerDefault("minSdkVersion")`.

**This repository never set one.** Expo's `ProjectConfiguration.kt` falls back to
`warnIfNotDefined("minSdkVersion", 24)`. So the `#else` is what shipped.

## The guard and the call disagreed, and that is the part to remember

`Frame.hasPixelBuffer` returned **true** the whole time. It asks the same question with only the
*runtime* half:

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
  hardwareBuffer?.use { if (it.isCpuReadable) return true }
}
```

| the check                    | what it is a property of |
| ---------------------------- | ------------------------ |
| `hasPixelBuffer`             | the **device**           |
| the `#if` inside `getPixelBuffer()` | **our build**     |

**No runtime check on the JavaScript side could ever have bridged that.** Asking the API whether
it can do the thing is not the same as asking whether the thing was compiled in — and only one of
those questions has an API.

That is why the `try`/`catch` around `getPixelBuffer()` was worth adding: it is what turned an
invisible throw into a sentence, and it took four device round trips to get there.

## Why nothing here can catch it

**Jest has no NDK.** Typecheck sees an integer. Lint sees a plugin entry that resolves. The
failure appears only on a phone, on every frame, inside
`react-native-vision-camera-worklets`' own `try`/`catch`, as a `console.error` — which is to say
nowhere a person holding the phone can read.

## Why it lives in `app.config.ts` and nowhere else

`apps/mobile/android/` is **generated and untracked**, and both `android-build.yml` and
`release.yml` run `expo prebuild --platform android --clean`. A value written into the generated
project by hand works locally and vanishes on the next run — which is how a fix becomes a mystery
a fortnight later.

## 26, not 28

26 is the number in the `#if`. A device on API 26 or 27 never reaches the HardwareBuffer path at
all — it falls to the single-plane branch, which works at any level. A higher floor would drop
two API levels and buy nothing.

## What it costs

Android 7.0 and 7.1 can no longer install the app. **That cost is close to zero, because the app
already did not work there** — reading a colour is a core journey and it threw on every frame —
and because NFR-7 sets the bar at *a four-year-old mid-range Android*, which in 2026 means API 31
or above. Declaring 24 was a claim the binary could not honour.

See [ADR-0079](../../../docs/adr/0079-the-android-minimum-is-api-26-because-the-pixel-buffer-is-compiled-out-below-it.md).
