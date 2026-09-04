# Plan: F-160 — The Lens captures on purpose

| | |
|---|---|
| **Feature** | F-160 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-13, FR-15, FR-40, NFR-21 |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-05 |

---

## Intent

The Lens has no idea what **a capture** is. It samples every frame, pushes a new reading
several times a second, and the result panel is opened by the arrival of a reading — so
dismissing it survives for one frame. Reported from a device as *"we are not able to go
back"*, *"uncontrolled and unusable"*.

Done, to a person holding the phone: the camera shows a preview and reads **nothing** until
they ask. One obvious control takes a reading. The result stays until they close it, and
closing it goes back to the frame. A live mode exists for people who want the continuous
readout FR-13 specifies, it says it is running, and choosing *Tap to read* stops it.

## Approach

**One concept, and the three reported symptoms are consequences of its absence.** Once a
capture is a thing, the sheet is about *one* capture and dismissal means something; "stop" is
coherent because something is running; and the sampling can be switched off, which is what
"optimised and controlled" actually requires.

**Reused:** `read()` and `MODE_CEILING` from `src/lens/modes.ts` (no colour arithmetic moves,
and none is added). `Sheet`, `Button`, `Chip`, `Swatch`, `Surface`, `Row`, `Stack`, `Text`
from `@irodora/ui` — `Chip`'s `selected` is F-163's selection rule, reused rather than a new
control. `createSynchronizable` from react-native-worklets, already the mechanism the
viewfinder uses to reach the frame thread. The reducer shape and its test discipline come
from `src/lens/sheet.ts`, which this replaces.

**New:**

- `src/lens/capture.ts` — `LensMode`, `SampleDemand`, `CaptureState`, `nextCapture`,
  `demandFor`, `modeFor`. A pure module, replacing `sheet.ts`.
- `docs/adr/0091-…` — a deliberate capture is FR-15's precision pick, and why that is not
  the ceiling raise ADR-0087 refused.

**The screen becomes presentational.** `Lens` holds no state at all: it takes `mode`,
`reading` (the held capture), `live`, `awaiting` and four callbacks. The reducer lives in
`CameraLens`, which cannot be rendered by jest — and costs nothing, because the reducer is a
pure function tested directly and what remains there is wiring. This is strictly better than
today, where the sheet's state was inside the screen and could not be driven from a subject.

**The demand reaches the frame thread.** `Viewfinder` takes `demand: 'off' | 'live' |
'capture'`, mirrored into a `Synchronizable` the worklet reads **first**. `off` returns before
the pixel buffer is touched, so an idle Lens does no sampling, no bridge traffic and no
renders. The demand is passed back with the sample, so the reading is read under the mode the
frame was sampled for — not under whatever the mode became while it was in flight.

**Increments:**

1. `capture.ts` + its test. Nothing wired; the build stays green.
2. `Lens` becomes presentational; screen subjects and tests updated.
3. `Viewfinder` takes the demand; the worklet gates on it.
4. `CameraLens` wires the reducer, the timeout and the demand.
5. Copy, in both locales.
6. ADR-0091.

## Files to touch

```
apps/mobile/src/lens/capture.ts            — NEW. The state machine.
apps/mobile/src/lens/sheet.ts              — DELETED. Superseded; the latch was a stopgap.
apps/mobile/src/lens/viewfinder.tsx        — demand prop; worklet gate; mode per sample; memo.
apps/mobile/src/lens/CameraLens.tsx        — the reducer, the timeout, the demand.
apps/mobile/src/screens/Lens.tsx           — mode chips, shutter, live readout; no state.
apps/mobile/src/i18n/en.ts, ja.ts          — the new copy.
apps/mobile/test/lens-capture.test.ts      — NEW, replacing lens-sheet.test.ts.
apps/mobile/test/screens.test.tsx          — subjects for still, live and awaiting.
docs/adr/0091-…                            — the precision-pick decision.
```

## Anticipated effects

- **`Lens`'s props change shape** ⇒ `CameraLens` and every conformance subject. Guard:
  `typecheck`, and `scripts/a11y-scope.mjs` fails a screen the registry does not reach.
- **The frame processor stops by default** ⇒ the "no frames" diagnostic must key off the
  demand, or it fires on an idle Lens and reports a fault that is the design. Guard: the
  diagnostic effect is scoped to a non-`off` demand; asserted in the reducer test that
  `demandFor` is `off` at rest.
- **A capture reports FR-15's ceiling (1) rather than live's (0.7)** ⇒ a claims change,
  NFR-21 and rule 11. Guard: ADR-0091 states it, `lens.test.ts` asserts the mapping, and the
  reading's confidence is still bounded by space, illumination and quality — the observed
  inputs ADR-0087 says the number must come from.
- **`sheet.ts` is deleted** ⇒ `lens-sheet.test.ts`. Guard: `typecheck` and the suite.

## Test plan

- **Unit:** `nextCapture` as a sequence — the F-158 defect replayed (dismiss, then four
  frames, still shut), a shutter with no camera timing out, live readings ignored while a
  capture is held, identity preserved when nothing changed.
- **`demandFor`** for every state, including the two that must be `off`: at rest in still
  mode, and while a result is on screen.
- **Conformance:** `screens/Lens (still)`, `(live)`, `(awaiting)`, `(reading)` — four
  subjects, because they draw disjoint trees.
- **Negative + decoy:** a reducer that never opens the sheet passes the dismissal test; the
  decoy is the assertion that a capture reading *does* hold. A reducer that samples always
  passes every reading test; the decoy is `demandFor` at rest.

## Verification

```
node scripts/verify-state.mjs
pnpm verify:ci
```

## Risks and open questions

- **None of the worklet gating can be verified here.** jest has no frame thread. Whether an
  idle Lens actually stops sampling is a device attestation, and it will be recorded as one.
- **`precision` for a single deliberate frame.** The PRD's J2 names this interaction
  precision-pick and `MODE_CEILING`'s own note says live's penalty is for a crosshair that has
  not settled. It is still a ceiling change and it gets an ADR rather than a commit message.

## Out of scope

- **Gallery import (item 7) is NOT in this feature.** Reading pixels out of a picked image
  needs a decoder this app does not have and deliberately avoids —
  `packages/store/src/image.ts` bounds hostile images by reading headers and says *"this
  module never decodes anything"*. Adding one is a dependency decision with a security review
  and a claims question of its own (an imported photo has no stated illumination and may have
  been edited). It is split to **F-166**, next in sequence, with its own ADR.
- The torch, zoom, tap-to-focus, and any region chooser (FR-14 is F-135).
