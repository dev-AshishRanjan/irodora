# Plan: F-170 — The crosshair moves

| | |
|---|---|
| **Feature** | F-170 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-13, FR-15 |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-06 |

---

## Intent

*"In lens, add feature to change the position of crosshair, like we change in normal camera."*

Done, to a person: they tap the part of the frame they want read, the marks move there, and the
colour that comes back is the colour they pointed at.

## Approach

**Half of it already exists.** F-166 built `pointFrom`, `reticleBox` and a clamp that keeps a
region inside its image — pure, and tested against a four-quadrant fixture where a tap in each
corner must return that corner's colour. The live viewfinder still hard-centres:

```ts
const left = Math.floor((frame.width - size) / 2);
```

So most of this is consolidation: **one geometry module, one reticle, two sources.**

### The part that is genuinely new, and it is not the plumbing

A tap lands on the **preview**. The region is sampled from the **frame**. Those are not the same
rectangle: the preview box is `3/4` and the Camera's default `resizeMode` is `cover`, so a frame
of any other aspect is **cropped** to fill it. A preview fraction is therefore not a frame
fraction, and a reticle drawn at one while the engine reads the other is the exact failure
`viewfinder.tsx` already warns about — *a reticle that lies about where the colour is read is
worse than none.*

**The conversion is exact and belongs on the frame thread**, because that is the only place the
frame's dimensions exist:

```
visible = previewAspect / frameAspect        (when the frame is wider than the preview)
fx      = (1 - visible) / 2 + px * visible   — x cropped, y untouched
```

and the mirror image when the frame is taller. It is arithmetic on four numbers, so it goes in
`camera.ts` beside `sampleStride`, **marked `'worklet'`** — F-116's rule: anything a worklet
reaches must say so in its own source, and the caller being marked is not enough.

That keeps the alternatives out: no `resizeMode="contain"` (letterboxes, and then the bars are in
the mapping), and no reporting the frame's aspect back to JS to reshape the box (the first frame
arrives *after* the shutter in still mode, so the box would be wrong at exactly the moment
somebody aims).

### The reticle moves to the screen

It is four corner marks derived from `REGION_FRACTION`, currently drawn inside `viewfinder.tsx` —
a file jest cannot render. `Lens.tsx` already draws the same marks for a photograph. Moving the
camera's reticle up to the screen means **one implementation, checked by the conformance suite for
the first time**, and the screen owns the preview box, which is what its own docblock says it
does.

**Reused:** `pointFrom`, `reticleBox`, `PHOTO_POINT`/`PHOTO_CENTRE` and the clamp from
`lens/photo.ts`; `sampleStride` and `FrameSample` from `lens/camera.ts`; the demand
`Synchronizable` pattern from F-160, which is exactly how the point must reach the frame thread —
capturing it in the worklet closure would rebuild the frame output on every tap, and rebuilding
the frame output is a session reconfiguration.

**Increments:**

1. `framePoint` in `camera.ts` + its test. Nothing wired.
2. `capture.ts` gains the camera's aim; the reducer's `point` covers both sources.
3. `viewfinder.tsx` takes the aim and samples there; its reticle is deleted.
4. `Lens.tsx` owns the preview box, the tap target and the one reticle.

## Files to touch

```
apps/mobile/src/lens/camera.ts        — framePoint, PREVIEW_ASPECT
apps/mobile/src/lens/capture.ts       — the camera's aim
apps/mobile/src/lens/viewfinder.tsx   — the aim on the frame thread; the reticle goes
apps/mobile/src/screens/Lens.tsx      — the preview box, the tap, one reticle
apps/mobile/test/lens.test.ts         — framePoint
apps/mobile/test/lens-capture.test.ts — the aim through the reducer
apps/mobile/test/screens.test.tsx     — a subject with the crosshair moved
```

## Anticipated effects

- **`sampleFrame` takes a point** ⇒ the worklet, and `verify-worklet-defaults.mjs`, which reads
  the plugin's emitted code. Guard: that script — and `framePoint` must carry its own `'worklet'`
  directive or it throws on the first frame, which is F-116's defect exactly.
- **The reticle leaves `viewfinder.tsx`** ⇒ `REGION_EDGE`, `BRACKET` and `CORNERS` go with it.
  Guard: `verify-viewport.mjs` scans for stray size literals; the marks land in a file it already
  watches.
- **The preview box moves to the screen** ⇒ the `Surface` wrapping the viewfinder, and the a11y
  grouping on it. Guard: the conformance suite, which draws the Lens in four states.

## Test plan

- **The conversion, both crops and the identity.** A frame wider than the preview maps a centre
  tap to the centre and an edge tap inward by exactly the cropped fraction; a taller frame does
  the mirror; a frame of the preview's own aspect maps 1:1, which is the case that would hide a
  wrong formula if it were the only one tested.
- **The clamp at the edges**, which is criterion 2: a tap in a corner reads a full region from
  inside the frame rather than a smaller one hanging off it.
- **The reducer:** the aim survives a mode change — the camera is still pointing at the same
  scene — and a tap with no photograph open moves the camera's aim rather than being ignored.
- **Negative + decoy:** a `framePoint` that returned its input would pass the identity case. The
  decoy is the two crop cases, which must move the point.

## Verification

```
node scripts/verify-state.mjs
pnpm verify:ci
```

## Risks and open questions

- **`resizeMode` is assumed to be `cover`.** It is VisionCamera's default and this code does not
  set it; if that default changes, the mapping silently becomes wrong in a way no test here can
  see. The constant and the assumption are stated together in `camera.ts`, and it is set
  explicitly on the `Camera` rather than left to the default.
- **None of the worklet half can run here.** jest has no frame thread, so *the region is sampled
  where the marks are drawn* is arithmetic in this repository and an observation only on a phone.

## Out of scope

- Pinch to zoom, tap to focus, and exposure. VisionCamera offers gestures for the last two and
  they are a different feature; this is about where the colour is read.
