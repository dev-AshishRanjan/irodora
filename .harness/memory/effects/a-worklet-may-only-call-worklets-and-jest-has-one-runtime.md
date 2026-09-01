---
kind: effect
id: E-050
title: A worklet may only call worklets, and jest has one runtime — so nothing here can see a missing directive
severity: critical
created: 2026-09-01
scope: [apps/mobile]
links: [[a-global-that-exists-in-your-test-runtime-is-invisible-to-every-check]], [[saying-not-run-here-is-necessary-and-it-is-not-sufficient]]
---

# E-050 — a worklet may only call worklets, and jest has one runtime

**The Lens crashed on its first frame, and the cause was three words.**

`sampleFrame` runs on VisionCamera's frame-processor thread and carries `'worklet'`. It called
`sampleStride` from `camera.ts`, which carried nothing. The Worklets babel plugin captures an
unmarked import as an ordinary JS-thread function, and invoking it from the frame thread throws
— the moment a frame arrives, which is the moment the Lens opens.

## The directive is a property of the callee, not of the call site

Marking `sampleFrame` says nothing about what `sampleFrame` may *reach*. Every function
reachable from a worklet has to declare itself one, **in its own source**, and a caller being
correct is not evidence about its callees.

## Why nothing here could catch it

**Jest has one runtime.** There is no worklet boundary in the test environment, so a function
missing the directive is an ordinary function that the existing lens tests call directly and
pass. Typecheck sees a normal call. Lint sees an import that resolves.

And the symmetry is what makes it invisible: `'worklet'` **does not change JS-thread
behaviour**, so the tests pass identically before and after the fix. No JS-thread test can
distinguish the two states — which means a green suite is not evidence either way.

Same shape as [[a-global-that-exists-in-your-test-runtime-is-invisible-to-every-check]]:
`crypto` is real in Node and absent in Hermes, seventeen gates were green, and the app died on
the first screen that generated an id.

## It was already written down as unproven

F-040 attested:

> *VisionCamera frame processors run on a worklet thread and the UI thread never blocks on
> colour maths*

**Status: outstanding.** Gate 0 has printed it on every run since F-040 closed. The feature
shipped with the one claim that would have caught this explicitly unproven, and the first person
to open the Lens found what nobody had run.

**An outstanding attestation is not paperwork. It is the list of things nobody has run.**

## The surface is small, and now enumerated

Three worklets exist in this repository:

| worklet | where |
|---|---|
| `onFrame` | `viewfinder.tsx` |
| `sampleFrame` | `viewfinder.tsx` |
| `sampleStride` | `camera.ts` — the fix |

After the fix, every function they reach is marked. `readCaptureSpace` is deliberately **not**
marked: it is called from `onSessionConfigSelected`, on the JS thread.

## Guard

**None that runs here**, and that is the finding rather than an omission. The only thing that
catches this is a device. [F-116](../../state/feature_list.json) files the static check —
every function reachable from a `'worklet'` must itself carry one — which is the shape this
repository already uses for boundaries a type system cannot express.
