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

**`scripts/verify-worklet-reach.mjs`, since F-116.** It parses `apps/mobile/src` with the
TypeScript compiler API, takes every function whose body opens with the `'worklet'` prologue as a
root, walks the calls each makes — **across module boundaries**, because the defect was an import
and a same-file check would have passed — and fails when a resolved callee carries no directive.
It runs on every pull request.

**It was watched failing on this exact defect.** `--prove` removes the directive from
`sampleStride` in `camera.ts` and asserts the finding names it and its caller in
`viewfinder.tsx`; a second plant removes `sampleFrame`'s, so "it follows imports" is not carried
by a case that never needed to.

**And on the false positive that would get it switched off.** `readCaptureSpace` lives in the
same module as `sampleStride`, carries no directive, and is correctly never reported — asserted
while `camera.ts` IS producing a finding, because on a clean tree "not among the problems" is
true of an empty list and proves nothing.

### What it still does not see, and this half has not changed

A function reached through a **variable**, one **passed in as a callback**, or one looked up on a
**dynamic property**. The check counts and names every call it declined to resolve — 23 on the
tree as it stands, mostly `Math.*` and `frame.*` — on every run including a green one, so a
reader of a pass sees the size of the gap rather than inferring there is none.

It also proves the **source** says so, not that Babel emitted it. F-121 established the transform
is intact by running the real pipeline by hand, and that stays evidence rather than a gate.

**The device is still the only thing that proves the whole claim**, and F-040's first attestation
is still outstanding. What changed is that the half which can regress silently no longer does.
