# Plan: F-121 — The frame thread can say what it threw, and deliver a reading without the push

|                       |                                                           |
| --------------------- | --------------------------------------------------------- |
| **Feature**           | F-121 — [`feature_list.json`](../state/feature_list.json)  |
| **Requirements**      | FR-13, FR-15                                               |
| **Service / package** | `mobile` — `apps/mobile/src/lens/viewfinder.tsx`           |
| **Author**            | Claude Code (generator)                                    |
| **Date**              | 2026-09-01                                                 |
| **Blockers**          | none                                                       |

---

## What the device said

F-120's diagnostic reported:

> **the frame processor ran 51 time(s) but nothing reached the app**

That sentence is worth reading precisely, because it is the most informative one the Lens has
produced so far. In two seconds:

- the worklet was **entered 51 times** — roughly 25 fps, a healthy camera;
- `onError` fired **not once**, so the session is configured and running;
- `onFrameDropped` fired **not once**, so the pipeline is not discarding anything;
- neither `deliver` nor `report` ran, so **nothing crossed back to the JS thread**.

Execution dies somewhere between `entered.setBlocking(...)` — the first statement — and
`scheduleOnRN`. There are exactly two things in between.

## Why the failure is silent, which is the part that has to change first

`react-native-vision-camera-worklets` installs our worklet like this
(`src/createRuntimeThreadProvider.ts`):

```ts
frameOutput.setOnFrameCallback((frame) => {
  try {
    onFrame(frame)
  } catch (e) {
    console.error(message, e)
  }
  return true
})
```

**Every throw our worklet produces is caught by the library and sent to `console.error`.** On a
release build on somebody's phone that is not a place a message can be read from. The frame
thread has been reporting the fault on every one of those 51 frames, into a void.

This is the same shape as F-120's finding one level down, and it is the thing to fix first: not
guess which of the two candidates it is, but **make the frame thread able to say it**.

## What I ruled out statically, so the device is not asked a question I could answer here

I ran the app's real Babel pipeline over `camera.ts` and `viewfinder.tsx` and read the output.
There is no `babel.config.js` in this repository, so Expo 57's Metro transformer falls back to
`expo/internal/babel-preset` with default options (`@expo/metro-config/build/loadBabelConfig.js`),
and `babel-preset-expo` adds `react-native-worklets/plugin` whenever it resolves — which it does,
from `apps/mobile`. So the plugin runs, and the transform confirms:

| symbol         | result                                                       |
| -------------- | ------------------------------------------------------------ |
| `sampleStride` | workletized — `__workletHash` present in `camera.ts` output   |
| `sampleFrame`  | workletized — `__workletHash 11591977399289`                  |
| `onFrame`      | workletized — `__workletHash 4463108513618`                   |

So **F-115's class of fault is not what this is.** The worklet chain is intact.

I also read `scheduleOnRN` in `react-native-worklets@0.11.4`. From a non-RN runtime it takes
`globalThis.__workletsModuleProxy.scheduleOnRN(fun, globalThis.__serializer(args))`; both globals
are installed by the native `WorkletRuntime` and by the `setupSerializer()` in
`createWorkletRuntime`'s initializer, which `createWorkletRuntimeForThread` uses. Its two helpers,
`isWorkletFunction` and `RuntimeKind`, are respectively a worklet and a plain enum, so neither is
a remote function on that runtime. **It is the documented path and it looks well-formed.**

That leaves two candidates I cannot separate from here:

1. `sampleFrame` throws — most likely inside `frame.getPixelBuffer()`, which `hasPixelBuffer`
   promises a *format* about, not a successful call.
2. `scheduleOnRN` fails out of VisionCamera's frame-processor runtime for a reason not visible
   in the TypeScript.

## The change

**Three parts, and the first two together mean one build settles it either way.**

### 1. Catch the throw and carry the message off the frame thread

A `Synchronizable<string | null>` written in a `catch` around the worklet body. A ref cannot be
written from a worklet and `scheduleOnRN` is itself a suspect, so the message goes into the one
mechanism already **proven working on this exact runtime** — `entered` is a `Synchronizable`, and
it is what produced the number 51.

### 2. A delivery path that does not depend on the push

The sample is written to a `Synchronizable` **before** `scheduleOnRN` is attempted, and the JS
side polls it four times a second. If candidate 2 is the fault, the Lens starts working on this
build rather than after another round trip.

**It costs nothing when the push works.** The poll early-returns on a `pushed` ref that only the
`scheduleOnRN` callbacks set. Deliberately not `seenFrame`: a polled reading setting *that* flag
would switch the poll off after one frame and freeze the viewfinder on it.

4 Hz, not per frame. NFR-4's live-pick budget is 50 ms perceived and this is a fallback, not the
design — if it becomes the design, that is an ADR, not a default.

### 3. Reading the pixel buffer becomes a refusal, not a throw

`FrameOutcome` already exists to carry a reason to the screen. A throw at `getPixelBuffer()`
discards one. Wrapping it converts candidate 1 from a crash into a sentence.

### Ordering: a reading beats an error

If `scheduleOnRN` is the fault, then **every frame writes both a good sample and a thrown
message.** Reading `thrown` first would paper a working viewfinder over with an error about a
mechanism nobody is using any more. The poll reads `latest`, then `refusal`, then `thrown` — the
throw is reported only when nothing was sampled and nothing was refused.

## What the next screenshot decides

| what appears                    | what it proves                                                   |
| ------------------------------- | ----------------------------------------------------------------- |
| **readings**                    | `scheduleOnRN` was the fault; the fallback is carrying the Lens    |
| *the frame processor threw: …*  | `sampleFrame` was the fault, and the message names it exactly      |
| *the pixel buffer could not…*   | `getPixelBuffer()` was the fault, now degraded to a refusal        |
| *N byte(s) per pixel — planar*  | the negotiated format is not what ADR-0075 asked for              |

Every branch is a sentence on the screen. **None of them is silence**, which is the thing this
feature is actually for.

## What is not tested, and why

The viewfinder cannot be rendered by jest — it imports the native module, which is the entire
reason `Lens` takes a node instead of building one. No test here can exercise a worklet, a
`Synchronizable` or a frame callback, and writing one that *appeared* to would be the
"registered with a render that never runs" failure `Lens.tsx`'s own header warns about.

What is checked is that nothing else broke. The Babel transform above was run **by hand, once**,
as part of this investigation — it is evidence, not a gate, and nothing in CI would notice if a
`'worklet'` directive were dropped tomorrow. Making that permanent is exactly F-116, already
filed for R5; doing it here would be scope creep against `wip_limit: 1`.

## Deliberately not done

- **Changing `pixelFormat` or `targetResolution` to see if it helps.** That is guessing at a
  rebuild per guess, and [ADR-0075](../../docs/adr/0075-the-frame-output-is-requested-as-rgb-because-yuv-would-mean-writing-a-colour-transform.md)
  chose `rgb` for a reason that still holds.
- **Making the poll the primary path.** It is a fallback until the device says otherwise. If it
  turns out to be the only path that works, that is a decision with an ADR behind it.
