---
kind: lesson
title: An oracle that normalises its input will silently adapt a mislabelled colour
severity: high
created: 2026-08-14
scope: [packages/color-spaces, packages/color-difference, packages/cvd-engine]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-gate-that-errors-is-failing-open]]
---

# An oracle that normalises its input will silently adapt a mislabelled colour

**`culori`'s ΔE00 read 9–13% low against every Sharma–Wu–Dalal reference pair. culori was
right. The colours were tagged with the wrong mode, and culori dutifully converted them
before measuring.**

## What happened

F-006's round-trip criterion is stated in ΔE00, and CIEDE2000 does not ship until F-007. The
plan resolved that by using `culori` as a dev-only tolerance oracle (ADR-0004) — correct — and
then specified the call:

> our D65 Lab triples are handed to `culori` tagged `mode: 'lab'` — telling it "these are
> already Lab coordinates, do not adapt them".

That reasoning is backwards. `culori`'s `lab` mode is **D50-referenced**, and
`differenceCiede2000` normalises its inputs with `converter('lab65')`. Tagging a D65 value
`lab` therefore asks culori to chromatically adapt D50 → D65 on a value that was already D65.

```
Sharma pair 1, reference ΔE00 = 2.0425
  mode: 'lab'     → 1.8566     (adapted first — wrong)
  mode: 'lab65'   → 2.0425     (identity — right)
```

Tagged `lab65`, all eight reference pairs reproduce to four decimal places.

## Why it matters more than the size suggests

**Being wrong by 10% is the dangerous magnitude.** A factor of two gets investigated. A
factor of 1.0001 gets ignored, correctly. Ten percent looks like "the tolerance needs
loosening" — and loosening a tolerance to accommodate a mislabelled unit is how a wrong
number becomes a committed baseline.

It also nearly went the other way: the first conclusion was *"culori's CIEDE2000 is wrong"*,
which would have meant discarding the one independent check available.

## How to apply

1. **Before trusting any oracle, reproduce its published reference values.** Not our values —
   *its*. `test/round-trip.test.ts` asserts eight Sharma–Wu–Dalal pairs before it measures
   anything, and pins the wrong-tag result as a decoy so the warning cannot decay into a
   comment nobody believes.
2. **Read what the library does to its inputs**, not what its parameter is called. Any colour
   library with a `mode` field has a normalisation step, and a mode name is an instruction to
   convert, never an annotation.
3. **The trap is symmetric and it is everywhere in this repository.** Our Lab is D65; CSS
   `lab()`, `culori`'s `lab` and most published Lab tables are D50. F-007's contrast maths,
   F-013's naming and any comparison against a colorimeter will each meet this again.

## Related

The same failure shape as [[a-gate-that-errors-is-failing-open]], one layer out: the
instrument worked, and the thing feeding it handed it something other than what was meant.
