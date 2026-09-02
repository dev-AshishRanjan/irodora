# Plan: F-128 — The Lens needs minSdk 26, because the pixel buffer it reads is compiled out below it

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-128 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | FR-13, FR-15, NFR-7                                       |
| **Service / package** | `mobile` — `apps/mobile/app.config.ts`                    |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-01                                                |
| **Blockers**          | none                                                      |

---

## The device named it

F-121's instrumentation was built to make one build settle a two-way split. It did:

> **the pixel buffer could not be read: Frame.getPixelBuffer(...):
> java.lang.RuntimeException: ArrayBuffer(HardwareBuffer) requires NDK API 26 or above!
> (minSdk >= 26)**
>
> ```
> at com.margelo.nitro.core.ArrayBuffer.initHybridBoxedHardwareBuffer(Native Method)
> at com.margelo.nitro.camera.extensions.ImageProxy_getPixelBufferKt.getPixelBuffer(…:57)
> at com.margelo.nitro.camera.hybrids.instances.HybridFrame.getPixelBuffer(HybridFrame.kt:97)
> ```

**This is not a JavaScript fault, and no amount of TypeScript could have found it.** It is a
build-configuration fault, thrown from C++, through Kotlin, into a worklet.

## The mechanism, end to end

`react-native-nitro-modules` guards its whole `AHardwareBuffer` implementation on a **compile-time**
constant (`android/src/main/cpp/utils/JHardwareBufferUtils.cpp`):

```cpp
#if __ANDROID_API__ >= 26
  AHardwareBuffer_describe(hardwareBuffer, &description);
  …
#else
  throw std::runtime_error("ArrayBuffer(HardwareBuffer) requires NDK API 26 or above! (minSdk >= 26)");
#endif
```

`__ANDROID_API__` is set by the NDK toolchain from the Gradle `minSdkVersion`, and Nitro takes
that straight from the app: `minSdkVersion getExtOrIntegerDefault("minSdkVersion")`.

**This repository never sets one.** Expo's `ProjectConfiguration.kt` falls back to
`logger.warnIfNotDefined("minSdkVersion", 24)`, so the whole native tree — Nitro included — is
compiled at API 24 and the `#else` branch is what shipped.

Then, on the device (`ImageProxy+getPixelBuffer.kt`):

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
  hardwareBuffer?.use { hardwareBuffer ->
    if (hardwareBuffer.isCpuReadable) {
      val arrayBuffer = ArrayBuffer.wrap(hardwareBuffer)   // ← the compiled-out branch
```

A modern phone is on API 28+, and `pixelFormat: 'rgb'` gives CameraX an RGBA_8888 `ImageProxy`
that **is** HardwareBuffer-backed and **is** CPU-readable. So the device takes the fast path on
every frame, and the fast path is a `throw`.

### Why `hasPixelBuffer` said yes

Because it asks the same question with the *runtime* half only:

```kotlin
val ImageProxy.hasPixelBuffer: Boolean
  get() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      hardwareBuffer?.use { if (it.isCpuReadable) return true }
    }
    return planes.isNotEmpty()
  }
```

**The guard and the call disagree because one is a property of the device and the other is a
property of our build.** No runtime check on the JS side could ever have bridged that, which is
exactly why F-121's guard around `getPixelBuffer()` was worth having — it is what turned an
invisible throw into this sentence.

## Why there is no JavaScript fix

The fast path is chosen by `SDK_INT` and by the buffer's own usage flags. **Neither is reachable
from our code.** The only remaining lever would be `pixelFormat: 'yuv'`, which takes the planar
branch — and that is precisely what
[ADR-0075](../../docs/adr/0075-the-frame-output-is-requested-as-rgb-because-yuv-would-mean-writing-a-colour-transform.md)
refused, because it means writing a YUV→RGB transform the engine does not have and that
`packages/color-core/AGENTS.md` will not accept without golden data.

**So the fix is the one the error names: build at API 26.**

## The change

Declare the minimum in `app.config.ts` through `expo-build-properties`. That file is the **only**
source CI prebuilds from — `apps/mobile/android/` is generated and untracked, and both
`android-build.yml` and `release.yml` run `expo prebuild --platform android --clean`, so a value
written into the generated project by hand would be erased on the next run.

```ts
['expo-build-properties', { android: { minSdkVersion: 26 } }],
```

**26, not 28.** 26 is the compile-time requirement. A device on API 26–27 does not take the fast
path at all — it falls to the single-plane branch, which works — so raising the floor to 28 would
drop two API levels to buy nothing.

## What it costs, and why it is not a real cost here

It drops Android 7.0 and 7.1 (API 24–25). That is a deviation from Expo's default, so it takes an
ADR — but it is **not** a deviation from anything this product promised. NFR-7 sets the bar at *a
four-year-old mid-range Android*, which in 2026 means API 31 or above. API 26 is 2017.

And the honest framing: **the app already does not work below 26.** Reading a colour with the
camera is a core journey, and it throws on every frame. Declaring 24 was a claim we could not
honour; declaring 26 makes the manifest agree with the binary.

## The guard

A minimum that lives only in a config file is one careless edit from being back at 24, and the
symptom would be F-118 through F-121 all over again — several device round trips to rediscover a
number. **A check asserts that the declared Android minimum is at least what the Lens needs**, in
the same place the other build-configuration checks live, so the failure is a red gate rather
than a black screen.

The decoy matters: the check must fail when the value is lowered, not merely when it is absent.

## Verification

`state`, `typecheck`, `lint`, `format`, `test`, and the new check with its decoy watched failing.

**Not run here:** the Android build itself. Gate 16 needs an Android toolchain this workstation
does not have — that is F-039's attestation, still outstanding, and CI is what runs it.

## Deliberately not done

- **Touching `apps/mobile/android/`.** It is generated and untracked. Editing it would look like
  a fix and would survive exactly until the next `--clean` prebuild.
- **Changing `pixelFormat`.** ADR-0075 still holds, and this fault is not evidence against it.
- **Raising `targetSdkVersion` or `compileSdkVersion`.** Neither is implicated, and moving them
  is a separate decision with its own behavioural changes.
