# E-180 — Expo's transforms are read from its own output

**Link:** what `expo prebuild` does to the brand's assets — the 48·k and 108·k resizes, the round icon's
circle, the splash composited on a 288·k canvas at `imageWidth`·k, PNG bytes in `.webp` names, iOS's
`App-Icon-1024x1024@1x.png`, `SplashScreenLogo.imageset`, `SplashScreenBackground.colorset` and the
storyboard's image width → `brand-verdicts.mjs`, `verify-native-assets.mjs`, `verify-apk.mjs`
**Guard:** `verify-native-assets` reads the real prebuild output on every pull request (Android here, iOS
in CI with `--require-ios`); its `--prove` plants 12 defects into projects synthesised as Expo writes them
**Severity:** high **Feature:** F-231

---

## Why B changes when A does

The checks encode Expo's transforms — where the splash logo's mark sits in its canvas, which names carry
which layer, the formats it writes. An Expo upgrade or a plugin change can move any of them while the
source assets and the generator stay green. Reading Expo's ACTUAL output on every pull request is what
turns such a change into a failure rather than a silent mismatch at gate 16 on release day.

## What F-231 found by reading it

Gate 16 had never decoded a launcher layer (PNG bytes in `.webp` names, filtered by extension), read the
splash logo with the icon's signature (refusing every correct build), and a width of 206 would have put the
hdpi composite half a pixel off — sharp refuses that outright.

## F-231's review (2026-10-08)

The transforms come from two packages: `expo-splash-screen` (the splash composite, the iOS splash image set, colour set and storyboard) and `@expo/prebuild-config` (the Android icon resizes, the round icon's circle, PNG bytes in `.webp` names, and iOS's `App-Icon-1024x1024@1x.png` with its white no-icon square). An upgrade of either is what this link watches for.
