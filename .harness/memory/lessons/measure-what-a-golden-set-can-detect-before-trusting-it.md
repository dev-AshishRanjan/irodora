---
kind: lesson
title: Measure what a golden set can detect, before trusting it to detect anything
severity: medium
created: 2026-08-14
scope: [packages/color-spaces, packages/color-difference, packages/cvd-engine, content]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]]
---

# Measure what a golden set can detect, before trusting it to detect anything

**Ottosson publishes OKLab reference values to three decimal places. Retyping the fourth
decimal of a matrix element is a 0.11% error, and the published set cannot see it.**

## What happened

The decoy for the OKLab golden set was a plausible transcription slip — `0.8189330101`
becoming `0.8198330101`. The test asserted the set would catch it. It did not, and the
failure was the finding: three decimal places do not resolve 0.11%.

The instinct at that point is to pick a bigger mutation until the test goes green. That
produces a test that proves the number chosen, not the set. So the set's discriminating power
was measured instead, by perturbing every element in both directions and bisecting:

```
2%   in any element of M1, either sign   → caught (all 18 cases)
1%   in M1[6], downward only             → NOT caught  (sensitivity is asymmetric)
0.1% anywhere                            → NOT caught
```

All three are now asserted, including the two that are limitations.

## Why it matters

A golden set's job is to fail. "It reproduces the published values" says nothing about what
it would reject — a set of four entries quoted to three decimals reproduces correctly for a
whole family of wrong implementations.

**Stating the blind spot is what lets a second check be aimed at it.** Here the sub-1% band is
covered by oracle cross-validation against `culori` and `colorjs.io`, which carry the same
matrices at full precision. Two checks, different blind spots, each written down. Without the
measurement, the blind spot would have been covered by luck rather than by design.

## How to apply

For any golden dataset added to this repository:

1. **Write a mutation the set is supposed to catch, and run it.** If it passes, that is a
   result, not an inconvenience.
2. **Bisect for the threshold** rather than picking a mutation size that works. State the
   number in the test.
3. **Assert the limitation as its own test**, with a note naming the check that covers the
   gap. A limitation asserted is a limitation someone can close; a limitation implied is one
   someone will rediscover as a bug.
4. **Watch for asymmetry.** Sensitivity to `+1%` and to `−1%` were different here, and a test
   that only perturbed upward would have reported a threshold twice as good as the real one.

## Related

[[a-decoy-that-is-not-broken-proves-nothing]] is about a decoy that was secretly correct. This
is the neighbouring failure: the decoy is genuinely broken, and the check is genuinely blind.
