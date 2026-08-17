---
kind: lesson
title: A decoy written against old values quietly stops discriminating when the values move
created: 2026-08-15
feature: F-003
severity: high
scope: [packages, scripts, .harness/verification]
links: [[a-decoy-that-is-not-broken-proves-nothing]]
---

# A passing mutation proof can decay into a passing mutation

F-008 established that a decoy which is not actually broken proves nothing
[[a-decoy-that-is-not-broken-proves-nothing]]. F-003 found the next form of it: **a decoy
that WAS discriminating, and stopped.**

The gate-10 mutation for the design system pushed `dark.status.ok` from `L 0.730` to `L
0.800` and asserted the `cvd` gate went red. It did, and it was recorded as proof.

Then `dark.status.warn` moved — for an unrelated reason, on a design reviewer's advice — and
gained separation headroom. Re-running the proof:

```
BAD gate 10 — a cvdPair pushed below minSeparation: baseline exit 0, mutated exit 0
```

The mutation still applied. The gate still ran. It simply no longer collapsed any pair, so
the "proof" was two green runs being reported as a red one. Nothing in the mutation's text
said which values it depended on, and nothing recomputed whether it still bit.

## Why this is worse than the F-008 case

An initially-broken decoy fails the first time you run it. This one **passed when written and
rotted afterwards**, and the rot was caused by a change nobody would connect to it. If the
proof had been recorded once in prose rather than kept as a runnable script, it would have
read as evidence forever.

## What to do

- **Keep mutation proofs as a script that runs, not a paragraph that claims.**
  `scripts/verify-contrast-proof.mjs` is in CI beside the gate it proves.
- **Make the decoy's own effect measurable, and put the number in its name.** The replacement
  is "success rotated 48 degrees toward caution (65.2 → 30.0)" — a reader can see how much
  slack it has, and a 48° rotation will not stop collapsing a red-green pair because of a
  lightness tweak.
- **Prefer a mutation that attacks the mechanism, not the margin.** Nudging a value until it
  crosses a threshold depends on where the threshold sits. Rotating a hue into a confusion
  line attacks the property being asserted.
- **Re-run every proof after changing the data it mutates**, not only after changing the
  gate. This one was caught because the proof script was re-run out of habit; the habit is
  the control.
