# Plan: F-120 — The Lens listens to the camera error channel it had always ignored

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-120 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | FR-13, FR-15                                              |
| **Service / package** | `mobile` — `apps/mobile/src/lens/viewfinder.tsx`          |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-01                                                |
| **Blockers**          | none                                                      |

---

## What the device said

F-119's diagnostic reported:

> **no frames reached the frame processor**

The preview is live — the screenshot shows a wall through the viewfinder with the crosshair drawn
over it — so the session runs, the device is fine and the permission is granted. **`onFrame` is
simply not delivering.**

That rules out every sampling failure: the region size, the GPU-only buffer, the planar format.
None of them is reached.

## My own diagnostic was ambiguous, and this fixes that first

`seenFrame` was set inside `deliver` and `report`, which run on the **JS** thread via
`scheduleOnRN`. So a worklet that *is* invoked and then throws — a serialization failure, a
missing runtime, anything before the schedule call — produced **exactly the same message** as a
frame processor that was never called at all.

Two completely different faults, one sentence. That is the same defect F-119 was written to
remove, one level down, and I introduced it.

**Fixed with a `Synchronizable` counter incremented on the frame thread**, as the first statement
in the worklet, before anything that can throw. A ref cannot be written from a worklet, and a
`scheduleOnRN` ping per frame would be bridge traffic at frame rate to carry a number nobody
reads until something is wrong.

The message now distinguishes them:

- *the frame processor was never called — the camera delivered no frames to it*
- *the frame processor ran N time(s) but nothing reached the app*

## The channel nobody was listening to

`useCamera` accepts **`onError`**, `onStarted`, `onStopped` and `onInterruptionStarted`. This
screen handled **none of them**, and `onError` defaults to a handler that logs.

So a session that starts a preview and then fails to configure the frame output reports it in
exactly one place: **a log on a phone**, which is not a thing the person holding it can read.
That is the whole reason "a working preview and no readings" was the entire symptom.

`onFrameDropped` is the same story — `useFrameOutput` installs a `console.warn` when you do not
supply one. **A camera producing frames and discarding every one is a completely different fault
from one producing none**, and until now the screen showed the same nothing for both.

Both now reach the screen.

## Files to touch

```
apps/mobile/src/lens/viewfinder.tsx   — onError, onFrameDropped, the frame-thread counter
```

`Lens.tsx` and `CameraLens.tsx` are untouched: the diagnostic channel F-119 built already
carries whatever these produce.

## Anticipated effects

| Change | Dependents | Guard |
| --- | --- | --- |
| Two new camera callbacks | nothing — they only feed `onDiagnostic` | `gate:typecheck` |
| A `Synchronizable` in the viewfinder | the frame worklet | a device |

No effect link owed. Nothing crosses a package boundary and no shared contract changes.

## Test plan

The viewfinder is **not renderable by jest** — it imports the native module, which is the whole
reason `Lens` takes a node instead. So there is no test here that can exercise these callbacks,
and pretending otherwise would be the "registered with a render that never runs" failure
`Lens.tsx`'s own header warns about.

What is checked: the app still typechecks, lints, and every existing gate stays green, including
the 414 mobile tests and both accessibility gates. **That is the honest extent of it.**

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:a11y && pnpm test:contrast
```

**This changes what the next screenshot can tell us, not whether the Lens works.** Said plainly
because three fixes in a row have needed the device to adjudicate, and this one does too.

## Risks and open questions

- **If `onError` never fires and the count stays 0**, the frame output is being created and
  attached without complaint and still delivering nothing — which points at the output's
  configuration (`targetResolution` of HD 16:9, `pixelFormat: 'rgb'`) rather than at our code,
  and that is the next thing to vary.
- The counter reads `getBlocking()` on the JS thread once, in a timer. It is a diagnostic, not a
  hot path.

## Out of scope

- Changing `pixelFormat` or `targetResolution` to see if it helps. That is guessing with a
  rebuild per guess, and ADR-0075 chose `rgb` for a reason that still holds. If the evidence
  points there, it is a decision to make with the evidence in hand.
