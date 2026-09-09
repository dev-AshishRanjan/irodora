# A feature can be answered before it is built

**Effect:** [E-115](../../state/effects.json) · **Feature:** F-192 · **Date:** 2026-09-09

F-192 was *"the mark is a mark"*. Its first criterion asked for a mark that **"says something
about colour that a ring of discs does not"** — written when two marks had been rejected at the
one step no gate here can discharge, and F-165's third had not yet been looked at.

Then the person looked at the third and said it was good.

**The criterion was now a request to replace an approved mark.** Building the feature as written
would have made the product worse, and every gate would have stayed green while it happened.

## What "done" turned out to mean

| criterion | what it needed |
|---|---|
| reads at 16px, under three CVD sims | **verify** — `brand.test.tsx` already covered both |
| generated from one geometry, all assets | **one missing asset**, and only one |
| gate 16 on a built artefact | still attested; no APK can be built here |
| somebody looks at it | **done, by the person** |

Three of four were satisfied or unbuildable. The whole of the real work was a themed-icon layer
nobody had noticed was absent, because `adaptiveIcon` looked complete with two of its three
fields set.

## The habit

**When a blocking attestation is discharged, re-read the feature it unblocked before starting
it.** A feature blocked on somebody's judgement was written *in anticipation* of that judgement,
and the judgement can invalidate its premise as easily as confirm it. The backlog records what
was believed when it was written; evidence arriving later does not rewrite it.

The same shape has appeared repeatedly in this repository from the other direction — criteria
over-specified against an audit rather than the code. This is the first time one was
**over-specified against a future that did not happen**.

[[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
