---
kind: lesson
title: Two oracles agreeing with each other and not with you is evidence about you
severity: high
created: 2026-08-14
scope: [packages/color-spaces, packages/color-difference, packages/cvd-engine]
links: [[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]], [[measure-what-a-golden-set-can-detect-before-trusting-it]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# Two oracles agreeing with each other and not with you is evidence about you

**`culori` and `colorjs.io` both differed from our OKLab by 1.24e-4, to within 1e-9 of each
other. That was written up as proof of a structural difference. It was proof we were wrong.**

## What happened

F-006 implemented OKLab from Ottosson's published ten-decimal matrices and found both oracles
disagreeing by an identical amount. The conclusion drawn — and committed as
[ADR-0039](../../../docs/adr/0039-oklab-is-derived-through-xyz-not-from-srgb-directly.md) —
was:

> Both oracles differ from us by the **same** amount to within 1e-9, which is the signature of
> a path difference rather than of two coincidentally similar defects.

The premise is true and the inference does not follow. An identical disagreement means the two
libraries share something we do not. It says **nothing about which side of the difference is
correct**, and "they share a path we deliberately rejected" was one explanation among several
— the flattering one.

Reading `colorjs.io`'s source took two minutes and refuted it: `base: XYZ_D65`,
`fromBase (XYZ)`. The same path as ours. What the two libraries actually shared was **CSS
Color 4's recalculated matrices**; we had Ottosson's originals. Adopting the recalculated
constants took the disagreement to **zero — bitwise** ([ADR-0040](../../../docs/adr/0040-oklab-uses-the-css-color-4-recalculated-matrices.md)).

## Why the wrong conclusion was so comfortable

It explained the evidence, it required no change, and it made a defect into a *decision* —
complete with an ADR, a measured cost, and a note about what it meant for downstream features.
The write-up was careful, quantified and confidently wrong. **Rigour applied to a false
premise produces a more durable error, not a smaller one.**

It also widened a tolerance. The oracle assertion became `worst < 2e-4` to accommodate the
"structural" 1.24e-4 — and that headroom is what let a separate dropped-digit transcription
error pass unnoticed.

## How to apply

1. **When an oracle disagrees, read its source before theorising.** ADR-0004 says a
   disagreement is a finding, not automatically our bug. The corollary is that it is not
   automatically *theirs* either, and the source is usually one file away.
2. **Treat "they all agree with each other" as the strongest possible signal against your own
   implementation**, not as evidence of a shared quirk. Independent implementations converging
   is what correctness looks like from the outside.
3. **Never widen a tolerance to accommodate an unexplained disagreement.** The widened
   tolerance becomes the hiding place for the next defect. If the disagreement is real,
   explain it and assert its exact size; if it cannot be explained, it is not yet understood.
4. **An ADR is not a way to make a problem go away.** Writing one about a difference you have
   not root-caused converts an open question into a settled decision, and settled decisions
   are re-examined far less often.

## Related

The mirror image of
[[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]], where the
first conclusion was "culori's ΔE00 is wrong" and the fault was again ours. Both times the
instinct was to explain the disagreement outward.
