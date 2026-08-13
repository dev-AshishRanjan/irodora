# ADR-0006 — VisionCamera frame processors on mobile, `getUserMedia` + canvas on web

## Status

Accepted

## Date

2026-08-13

## Context

The Lens needs **real pixel data at a known colour space**, not a photograph. Precision
pick samples ≥ 1000 pixels per measurement (FR-15) and live pick sustains ≥ 15 updates per
second (FR-13). Anything that routes through a compressed JPEG has already lost the
information we are trying to measure.

Platform capabilities differ materially:

- **iOS** exposes capture colour space (`AVCaptureColorSpace`), and supported devices
  capture Display-P3.
- **Android** has explicit `ColorSpace` APIs with varying vendor fidelity.
- **The web** can access a stream via `getUserMedia`, and Canvas supports explicit
  `srgb` and `display-p3` colour spaces — but exposes far less about capture settings.

Expo's `expo-camera` is excellent for taking pictures. It does not give per-frame pixel
access at the rate and fidelity the Lens needs.

## Decision

| Surface | Mechanism |
|---|---|
| **Mobile** | `react-native-vision-camera` frame processors, running on a worklet thread |
| **Web** | `getUserMedia` → `<video>` → `OffscreenCanvas` with an explicit `colorSpace` |
| **Both** | Sampling, rejection and averaging performed by the shared engine, identically |

Specifics:

1. Mobile requires **Expo with a development client**, not Expo Go, because VisionCamera
   is a native module ([ADR-0019](0019-mobile-expo-dev-client-new-architecture.md)).
2. Prefer the **`yuv` pixel format** and convert in the frame processor. It is roughly
   2.6× less bandwidth than `rgb` and is what the pipeline natively produces; requesting
   `rgb` forces an extra conversion on every frame.
3. **Frames are disposed explicitly** after use. A retained frame stalls the capture
   pipeline within a second or two.
4. **Capture colour space is read, never assumed.** A P3 frame interpreted as sRGB is
   wrong in exactly the saturated colours the product cares most about. When the platform
   will not tell us, provenance records `unknown` and confidence is capped.
5. The frame processor performs sampling and rejection, then hands a small numeric result
   to the JS thread. Passing frames across the bridge would defeat the purpose.
6. **The engine is shared.** The platform layer produces pixels; every decision about
   which pixels count and how they combine lives in `@irodora/color-core`, so mobile and
   web cannot drift.

## Consequences

**Good.** Real per-frame pixel access at the required rate. Colour space is known rather
than guessed on the platform where it matters most. The UI thread never blocks on colour
maths. Sampling logic exists once, so a fix to outlier rejection fixes both surfaces.

**Bad.** No Expo Go — contributors need a development build, which raises onboarding cost.
VisionCamera is a significant native dependency with its own upgrade risk across React
Native versions. Web has less colour-space control, so web captures will generally carry
lower confidence than mobile ones; that is honest, and the provenance field says so.
Frame-processor code runs in a worklet, which has real constraints on what it may capture
from the enclosing scope.

**Neutral.** Web Lens ships first (R1) despite being the less capable surface, because it
requires no install and proves the engine publicly.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **`expo-camera` only** | Would keep Expo Go working and cut a native dependency. But it cannot deliver per-frame pixel access at 15 fps, so live pick and precision pick are not implementable |
| **Take a photo, then analyse** | Simple and portable. But JPEG compression alters colour before we measure it, and it makes live pick impossible. Measuring a lossy re-encoding of the fabric is not measuring the fabric |
| **Native modules written by us** | Maximum control. Enormous ongoing cost across two platforms for capability VisionCamera already provides well |
| **Server-side frame analysis** | Would centralise the logic. Breaks NFR-12 (no image transmission), NFR-17 (offline), and NFR-4 (latency), for no accuracy gain — the loss happens at capture, not at analysis |

## Revisit when

- VisionCamera's maintenance status changes materially.
- Web gains capture-parameter access comparable to native (`ImageCapture` with colour
  space metadata reaching general availability would qualify).
