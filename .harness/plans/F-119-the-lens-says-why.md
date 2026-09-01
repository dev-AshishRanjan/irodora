# Plan: F-119 — The Lens says why there is no reading

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-119 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | FR-13, FR-15                                              |
| **Service / package** | `mobile` — `src/lens`, `src/screens/Lens.tsx`             |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-01                                                |
| **Blockers**          | none                                                      |

---

## The report

> *The lens is opening, but nothing happens when I point the camera at a colour. The page just
> shows the camera feed. Is this expected? Is it not wired up?*

**It is wired up.** F-040 built the whole chain and it is all present: `useFrameOutput` with an
`rgb` pixel format, an `onFrame` worklet, `sampleFrame` walking the centre region,
`scheduleOnRN` handing the sample to the JS thread, `read()` reducing it through
`@irodora/color-sampling`, and `Lens` rendering the result. Every prop and every API was checked
against the installed VisionCamera 5.2.2 and every one of them is real and correctly used.

So something in that chain is producing nothing **and saying nothing about it.**

## What the code does when it cannot read a frame

```ts
if (size <= 0 || !frame.hasPixelBuffer) return null;
…
if (bytesPerPixel < 3) return null;
```

**Refusing is right.** A frame this cannot walk is not an RGBA frame by default, and the module
is arranged around never making that assumption — reading a planar buffer would produce a
plausible colour from the wrong bytes, which is worse than reading nothing.

**Refusing silently is not.** Four different failures — no frames at all, a GPU-only buffer, a
planar format, a zero-sized region — all present as a live preview with no reading, forever. A
frame processor that declines every frame and reports nothing is indistinguishable from one that
is not running, which is exactly the ambiguity the person reporting this is stuck in.

## Approach

`sampleFrame` returns a **discriminated outcome** rather than `null`: either the sample, or the
reason it refused. `onFrame` schedules whichever it got.

**And the one failure no frame can report: no frames at all.** If the output never starts,
`onFrame` never runs, so neither path is reached and the screen would wait forever with nothing
to say. A two-second JS-side timer covers it — long enough that a working camera has delivered
many frames, short enough that somebody is still holding the phone up.

The reason reaches the **screen**, not a log. A log on a phone is not something the person
holding it can read, and they are the only one who can see this happen.

### Where it is shown, and where it is not

Only in the empty state. **Never beside a reading** — that is structural, since the branch only
exists where the reading is null — and **never when access was refused**, which is a real
sequence rather than a hypothetical: grant, frames fail, a diagnostic lands in state, somebody
revokes the permission in Settings and comes back. The screen must explain the refusal, not a
frame problem from a camera that is no longer running.

The line is not in the product's voice and is not meant to be. It is the one thing on this
screen that exists to be read out to somebody else.

## Files to touch

```
apps/mobile/src/lens/viewfinder.tsx   — the outcome type, the reasons, the timer
apps/mobile/src/lens/CameraLens.tsx   — hold the reason, clear it on a reading
apps/mobile/src/screens/Lens.tsx      — an optional prop, shown in the empty state
apps/mobile/test/screens.test.tsx     — a conformance subject and four assertions
```

## Anticipated effects

| Change | Dependents | Guard |
| --- | --- | --- |
| `sampleFrame`'s return type | `onFrame` only — it is module-private | `gate:typecheck` |
| A new `Lens` prop | the conformance registry | `gate:a11y`, `gate:contrast` |

No effect link owed: nothing crosses a package boundary and no shared contract changes.

## Test plan

- **The reason reaches the empty state**, and the waiting copy stays with it.
- **It never appears beside a reading.** Structural, and asserted anyway so a refactor cannot
  quietly change it.
- **It never appears when access was refused** — the revoked-permission sequence above. This one
  is watched failing: removing the `permission !== 'granted'` guard fails exactly this test and
  nothing else. The first version of the suite did **not** catch that mutation, which is why the
  case was added.
- **A conformance subject** for granted-with-a-diagnostic, because that line still has to meet
  the same contrast and type rules as everything else.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:a11y && pnpm test:contrast
```

**This does not make the Lens read a colour.** It makes the Lens say which of four things is
stopping it — on the device, in one screenshot, the way F-117's screen did for the missing
package. That is the fastest route to the actual cause and it cannot be got at from here.

## Risks and open questions

- **The diagnostic is sent per refused frame.** A worklet cannot hold state to throttle, and
  React drops a `setState` to an identical string without re-rendering — so a steady stream of
  one reason costs a bridge hop per frame and no renders, on frames we are doing no work on.
  If it ever matters, the fix is a shared value, not a log.
- **If frames are arriving and being sampled**, the failure is downstream in `read()` or in the
  display derivation, and this will show nothing new. That is a real limit of this change and
  the next place to look.

## Out of scope

- Changing what `sampleFrame` accepts. Widening it to planar buffers is
  [ADR-0075](../../docs/adr/0075-the-frame-output-is-requested-as-rgb-because-yuv-would-mean-writing-a-colour-transform.md)'s
  decision to revisit, with a colour transform the engine does not have, and it is not a fix to
  make blind.
