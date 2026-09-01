# Plan: F-115 — The Lens crashed on its first frame

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-115 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | FR-13, FR-15                                              |
| **Service / package** | `mobile` — `apps/mobile/src/lens`                         |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-01                                                |
| **Blockers**          | none                                                      |

---

## The report

> *Read a colour with the camera is not working. It stopping the app.*

## The root cause

`sampleFrame` in [`viewfinder.tsx`](../../apps/mobile/src/lens/viewfinder.tsx) is a worklet — it
runs on VisionCamera's frame-processor thread and carries `'worklet'`. It calls:

```ts
const stride = sampleStride(size * size);
```

`sampleStride` lives in [`camera.ts`](../../apps/mobile/src/lens/camera.ts) and **had no
`'worklet'` directive**. A worklet may only call other worklets: the Worklets babel plugin
captures an unmarked import as an ordinary JS-thread function, and invoking it from the frame
thread throws — **on the first frame**, which is the moment the Lens opens.

That is the whole of it. One missing directive, three words.

## What I checked before believing it

I got a first hypothesis wrong and want the record to say so. I thought the cause was
`react-native-vision-camera@5`'s peer dependencies — `react-native-nitro-modules` and
`react-native-nitro-image` are not declared by the app and, under pnpm, are linked only inside
VisionCamera's own `node_modules`. **It was a good story and it was false.** React Native's
autolinker walks the dependency tree rather than the app's `node_modules`, and
`expo-modules-autolinking react-native-config` reports all four modules resolved. That is also
why the APK built. I reverted the dependency change I had already made.

Then, and only then, the frame path:

- `sampleFrame` — marked. ✓
- `onFrame` — marked, and calls only `sampleFrame` and `scheduleOnRN`. ✓
- **`sampleStride` — the one cross-module call in the worklet, and unmarked.** ✗
- Everything else in the worklet is `Math.*`, `Uint8Array`, array literals and `frame.*`.
- `readCaptureSpace` is called from `onSessionConfigSelected`, on the JS thread. ✓
- `pixelFormat: 'rgb'` is valid — `TargetVideoPixelFormat = 'native' | 'yuv' | 'rgb'`. ✓

Three worklets exist in the whole repository, and after this change every function they reach
is marked.

## The harness already said this was unproven

F-040's first attestation is **outstanding**:

> *VisionCamera frame processors run on a worklet thread and the UI thread never blocks on
> colour maths*

Gate 0 has printed that on every run since F-040 closed. It shipped attested-but-unproven,
because proving it needs a device — and the first person to open the Lens found what nobody had
run.

## Why no gate here can catch it

**Jest has one runtime.** There is no worklet boundary in the test environment, so
`sampleStride` is an ordinary function that the existing tests call directly and always passed.
Typecheck sees a normal function call. Lint sees an import that resolves.

This is the same shape as
[[a-global-that-exists-in-your-test-runtime-is-invisible-to-every-check]] — `crypto` is real in
Node and absent in Hermes, seventeen gates were green, and the app died on the first screen that
generated an id.

## Approach

**The fix is the directive**, plus the reason beside it in the source — so removing it later
reads as a change rather than as tidying up an odd string.

**Not built here:** a static check that every function reachable from a `'worklet'` is itself a
worklet. It is a real check and the right shape for this repository, and it is a separate piece
of work. Filed.

## Files to touch

```
apps/mobile/src/lens/camera.ts    — the directive on sampleStride, and why
```

## Anticipated effects

| Change | Dependents | Guard |
| --- | --- | --- |
| `sampleStride` becomes a worklet | `sampleFrame`, and the JS-thread tests | `gate:test` (it still works on the JS thread) |

**A link is owed.** The worklet boundary is a runtime contract that no static check in this
repository can see, and it now has a documented instance. Decided at the trace.

## Test plan

- **The existing `lens.test.ts` cases still pass.** A `'worklet'` function is still an ordinary
  function when called from the JS thread; if that were not true these would go red, which is
  itself the check that the directive changed nothing for existing callers.
- **Every worklet in the repository is enumerated** and each function it reaches is confirmed
  marked — three worklets, one previously-unmarked callee.
- **The screen suite still renders the Lens.** `Viewfinder` is imported by the route rather than
  the screen precisely so jest can render `Lens` without a native module, so this change cannot
  affect it — asserted rather than assumed.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:a11y
```

**The fix cannot be verified here.** It needs a device with a camera. What this workstation can
show is that nothing else broke; the crash itself is on the other side of F-040's outstanding
attestation, and that attestation stays outstanding.

## Risks and open questions

- **I cannot prove the Lens now works**, only that the one mechanism that would crash it on the
  first frame is removed. Said plainly rather than smoothed over.
- If it still crashes, the next candidates are the frame-output configuration and the device's
  reported `bytesPerRow` — but neither would have crashed before the first frame arrived.

## Out of scope

- The static worklet check (filed).
- Anything about what the Lens computes. `read()` and the engine run on the JS thread via
  `scheduleOnRN` and are unchanged.
