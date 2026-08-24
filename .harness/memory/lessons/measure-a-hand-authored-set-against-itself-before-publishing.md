---
kind: lesson
title: A hand-authored set of values can contain two names for one thing, and only measuring the set against itself finds it
category: technique
confidence: 0.95
created: 2026-08-24
scope: [content, packages/color-difference]
links: [[deltae00-is-the-ranking-authority]], [[a-batch-edit-that-reports-its-own-success-is-not-evidence]], [[corpus-version-pins-caches-and-envelopes]]
---

# Measure a hand-authored set against itself before publishing it

**Every file can be individually correct and the set still be wrong.** F-012 authored 120
colours in five groups of twenty-four. Each group was designed for even spacing *within itself*,
every entry passed the schema, and the content gate was green over all of them.

A pairwise ΔE00 scan across the whole set found **two pairs a reader would call one colour**:

```
usu-mizu  (Indigo Studies, "Thin Water")   /  usu-rai  (Seasonal winter, "Thin Ice")   ΔE00 1.51
sabi-suna (Earth and Clay, "Rust Sand")    /  chiri-ba (Seasonal autumn, "Scattered Leaf") ΔE00 2.40
```

Both were **cross-group**, which is exactly why neither was visible while authoring: nobody
designs the Seasonal winter colours while looking at the Indigo ladder. Both had unrelated
names, unrelated descriptions and unrelated editorial reasoning attached to what is, to the eye,
the same colour.

## Why no gate would ever catch this

There is nothing to catch. Two entries at ΔE00 1.5 are not a schema violation, a duplicate slug,
a dangling relation or a checksum mismatch. They are two valid records. The defect is a
**property of the set**, and the set is not a thing any per-record check looks at.

Nor should it become a gate with a threshold — the right minimum separation is a judgement that
differs by group. Inside the Quiet Neutrals ramp, ΔE00 2.33 is the *point*: a neutrals family is
supposed to be finely spaced, and two entries that close there are deliberate. The same number
across two unrelated groups is a mistake.

## The general shape

Whenever a feature authors **many values by hand**, the check that pays is the one that compares
them to each other rather than to the schema:

| Authoring | Ask the set |
|---|---|
| Colours | nearest pair by the perceptual metric — not by RGB distance |
| Copy keys | two keys whose text is identical, or differs only in punctuation |
| Tokens | two names resolving to the same value |
| Test fixtures | two fixtures exercising the same branch |

Print the extreme, not a pass/fail. `closest pair: usu-gami / kai-jiro at ΔE00 2.33` is a number
a person can judge; `no duplicates found` is a sentence that would have been printed anyway.

## And run it before the values are published, not after

A published corpus version is immutable (ADR-0046). Finding this one commit later would have
meant superseding 120 entries to move two of them, or shipping the collision. The scan cost
about twenty lines and ran in under a second.
