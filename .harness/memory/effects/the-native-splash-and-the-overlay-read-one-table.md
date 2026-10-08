# E-178 — The native splash and the overlay read one table

**Link:** `apps/mobile/assets/brand/brand-assets.json` (the generator's drawings table, `splash.imageWidth`,
the glow) → `app.config.ts`, `src/launch.tsx`, `launch.test`, `verify-native-assets.mjs`, `verify-apk.mjs`
**Guard:** `generate-brand-assets.mjs --check`; `launch.test` (the native grid within 0.1 dp of the splash
lockup's, F-230's 120 dp and the old 160 as decoys); `verify-native-assets` on the prebuild output
**Severity:** high **Feature:** F-231

---

## Why B changes when A does

The native splash is an image Expo shows at `imageWidth`; its mark sits on a grid inside it. The overlay
that takes over draws that grid at that size, where the image puts it — `SPLASH_MARK` and `SPLASH_MARK_DY`
are derived from the table, never typed. F-230 found the two disagreeing by a third (a 120 dp grid under a
160 dp overlay): two copies of one number drifted, and the mark jumped at the moment the eye is on it.

## What moves it

A change to the splash drawing's grid, offset or `imageWidth` in the generator changes the image and the
JSON together (`--check` refuses one without the other), and the app follows the JSON. The pair is
constrained twice: a whole number of units, and a width that is a multiple of 4 — Expo's hdpi composite
offset is (288 − w) × 1.5 / 2. `launch.test` then holds the result to `lockupGeometry('splash').mark`.
