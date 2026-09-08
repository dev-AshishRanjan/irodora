# Plan: F-190 — The launch sequence resolves into the app

| | |
|---|---|
| **Feature** | F-190 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69, NFR-8 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

*"Add some animation to splash screen."*

Reading the code first found something worse than a missing animation.

**Nothing calls `SplashScreen.preventAutoHideAsync()`.** `expo-splash-screen` hides the native
splash as soon as the React root renders its first frame — and `RootLayout` renders `<></>`
while the Japanese font subset loads. So the launch is:

```
native splash  →  BLANK SCREEN  →  the app
```

Not a cut with no animation. A **gap**, on every cold start, for as long as the font takes. The
missing animation is the second defect; the blank frame is the first, and it is the one somebody
would report as "the app flashes white on open".

## Approach

**Three things, in this order, because the second is pointless without the first.**

**1. Hold the splash.** `preventAutoHideAsync()` at module scope, beside `installRandomSource()`
and for the same reason: the root layout is the first module Expo Router loads, which makes it
the earliest point that is also a place somebody would think to look.

**2. Hand over, rather than cut.** When the font is ready, our own overlay renders **the same
mark, at the same size, on the same ground** the native splash was showing — `imageWidth: 160`,
centred, on `background`, from `app.config.ts`. Then the native splash is hidden. The first
JavaScript frame is pixel-comparable to the last native one, which is what "no visible cut"
means; hiding first and drawing after is the gap again, one layer up.

**3. Resolve.** The petals settle around the eye, the overlay fades, and the app is underneath
it the whole time. Because the overlay's ground and the app's ground are the same token, the
fade is only the mark leaving.

**The size is imported, not retyped.** `SPLASH_IMAGE_WIDTH` is exported from `app.config.ts` and
read by both, so the overlay cannot drift from the thing it is continuing. That is the same
mechanism `ANDROID_MIN_SDK` already uses in that file.

## Bounded, and the budget is the motion scale

The sequence is `view` + `local` from the manifest — no new number. Under reduced motion it is
**zero**: the resting frame, then straight through, which is what the setting asks for.

A cold start must not wait on decoration, so the overlay never *blocks* the app: the app mounts
underneath immediately and the overlay is a sibling that leaves.

## Files to touch

```
apps/mobile/app.config.ts             — export SPLASH_IMAGE_WIDTH
apps/mobile/src/launch.tsx            — new. The overlay and its sequence.
apps/mobile/app/_layout.tsx           — preventAutoHide, and the hand-over
apps/mobile/test/launch.test.tsx      — new
```

## Test plan

- **The overlay's mark is the splash's width**, read from the same export — a decoy changing one
  must fail.
- **The native splash is hidden AFTER the overlay has rendered**, asserted by call order, because
  the reverse is the blank frame this feature exists to remove.
- **Reduced motion resolves immediately** and still reveals the app.
- **`verify-motion` still passes**: opacity and transform only.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · motion · build`. Not run: `cvd`,
`color-golden`, `content` — no colour value, no maths, no corpus.

## Risks

- **The hand-over cannot be proven in jest.** Whether the two frames actually match is a device
  observation; what is checkable is that they are drawn from the same number and in the right
  order. Attested.
- **This draws the CURRENT mark.** F-192 may replace it, and F-193 exists to make the icon, the
  wordmark and this sequence one artefact. Building on today's geometry is correct: it is
  generated from `markDiscs()`, so a new mark moves this with it.

## Out of scope

The mark itself (F-192), and unifying the three renderers (F-193).
