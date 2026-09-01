---
kind: effect
id: E-051
title: A fallback that marks itself as working stops being a fallback, and the failure looks like success
severity: critical
created: 2026-09-01
scope: [apps/mobile]
links: [[a-worklet-may-only-call-worklets-and-jest-has-one-runtime]], [[saying-not-run-here-is-necessary-and-it-is-not-sufficient]], [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
---

# E-051 — a fallback that marks itself as working stops being a fallback

**The Lens now has two delivery paths and one boolean separates them.**

`scheduleOnRN` pushes a sample from the frame runtime to the JS thread. A `Synchronizable`
written **before** that push is polled at 4 Hz as a fallback — because F-120 showed the frame
worklet running 51 times in two seconds while nothing at all arrived on the JS side.

`pushed` is what switches the fallback off. It is set **only** inside `deliver` and `report`,
the two callbacks `scheduleOnRN` invokes.

## Set it from the poll and the Lens freezes on one frame

The first polled reading would mark the push as working. The interval would early-return
forever after. The screen would hold a single colour that never updates.

**That is a worse failure than the one being fixed, because it looks like success.** A reading
is on screen, with its provenance, at the right confidence. Nothing about it says it is two
seconds stale, and nothing about it says it is the same two seconds an hour later. The fault
this replaced — a blank viewfinder — at least announced itself.

## It is deliberately not `seenFrame`, and the two are one line apart

| flag        | the question it answers          | who may set it       |
| ----------- | -------------------------------- | -------------------- |
| `seenFrame` | has anything at all arrived?     | either path          |
| `pushed`    | did the **push** mechanism work? | only the push        |

`seenFrame` is what the 2-second "nothing reached the app" timer reads, and the poll is entitled
to set it — a reading arrived, whichever road it took. `pushed` is a claim about a *mechanism*,
and only that mechanism can make it.

Collapsing them into one flag is the obvious simplification. It is also the bug.

## The order inside the poll is part of the same contract

If `scheduleOnRN` is what fails, then every frame writes **both** a good sample and a thrown
message. Reading `thrown` before `latest` would paper a working viewfinder over with an error
about a mechanism nobody is using any more.

The poll reads `latest`, then `refusal`, then `thrown`. **The throw is reported only when
nothing was sampled and nothing was refused.**

## Why nothing here can catch it

Jest has one runtime, no worklet boundary and no camera. **Neither delivery path executes in any
test** — the viewfinder is the entire reason `Lens` takes a node instead of building one.
Typecheck sees a boolean ref. Lint sees a ref that is read and written.

And because the failure mode is a Lens that still shows *a* reading, even a device check has to
ask whether the colour **changes when the camera moves** — not whether one appeared.

F-040's first attestation — *frame processors run on a worklet thread and the UI thread never
blocks on colour maths* — is still **outstanding**, and remains the only thing that could cover
this.

## Why the fallback is not simply the design

4 Hz, against NFR-4's 50 ms live-pick budget. It is a path that keeps the Lens usable while the
device tells us which of the two candidates the real fault is. Promoting it to the design would
be a decision, and decisions take an ADR.
