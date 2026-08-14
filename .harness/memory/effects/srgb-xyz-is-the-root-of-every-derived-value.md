---
kind: effect
id: E-001
title: sRGB→XYZ is the root of every derived value in the corpus
severity: critical
guard: gate:color-golden
confidence: 0.98
created: 2026-08-13
scope: [packages/color-spaces, packages/color-difference, content]
links: [[the-color-type-reaches-every-surface]], [[deltae00-is-the-ranking-authority]]
---

# sRGB→XYZ is the root of every derived value

**If `srgbToXyz` changes, every stored colour value in the corpus is wrong.**

## Why

Corpus entries store `xyz` as canonical. Their `lab_*`, `oklch_*` and `hex` columns are
**materialised derivations**, computed by the engine at build time and never recomputed on
read ([data-model.md §2](../../../docs/architecture/data-model.md)).

That denormalisation is deliberate — it makes catalog queries fast and keeps exactly one
implementation of the maths. The cost is this dependency.

## Why it is easy to miss

There is **no import edge** from `xyz.ts` to `content/colors/*.json`. Static analysis cannot
see this link. The compiler will not complain. Every unit test will pass, because the tests
exercise the function, not the stored data.

The failure surfaces as: colour detail pages show a hex that no longer matches the `xyz`
they claim to derive from, search returns subtly wrong neighbours, and duplicate detection
starts disagreeing with itself. None of it looks like a conversion bug.

## What must happen

1. Update the golden datasets, or explicitly confirm they are unchanged.
2. **Rebuild the corpus** — regenerate every derived value.
3. Publish a **new corpus version**. Do not edit a published one; old reproducibility
   envelopes must still resolve (FR-10).
4. Re-run the `color-golden` gate, which includes the derived-value consistency check.

## The guard, and the half of it that does not exist yet

**As of F-006 this link is half-guarded, and it is worth being precise about which half.**

`srgbToXyz` now exists (`packages/color-spaces/src/rgb.ts`) and `gate:color-golden` is
**active**. The *source* end is covered:

- 71 golden entries, each citing its source, across six datasets;
- a 300 000-value determinism digest that fails on a change of one bit
  (`cross-platform-identity.fixture.json`);
- bitwise agreement with `colorjs.io` on XYZ, Lab-D65, P3 and linear sRGB over 10 000 samples.

Anything that alters this transform now fails the build immediately.

The *destination* end — **that the stored corpus values still agree with the changed engine**
— is what `gate:content` does, and it activates with **F-011**. Until then there is no corpus
to invalidate, so the missing half costs nothing today and would cost everything the first
time a colour is published against an engine that has since moved.

**What that means for F-011:** the derived-value consistency check is not an extra; it is the
half of this link that is currently owed.

## Related

The same reasoning applies to any conversion in the graph, not only this one — but this is
the root, so it is the one that reaches everything.

**A second root appeared in F-006 that this note did not anticipate:** the choice of
chromatic adaptation transform. CAT16 and Bradford disagree by up to 8.6 ΔE76 on saturated
blue — half this corpus — so `DEFAULT_ADAPTATION` reaches every derived value exactly the way
`srgbToXyz` does, and changing it is a corpus rebuild for the same reason.
