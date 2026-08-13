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

## The guard

`gate:color-golden` verifies that every corpus entry's derived values are consistent with
its `xyz` under the **current** engine. It fails if the corpus was not rebuilt.

## Related

The same reasoning applies to any conversion in the graph, not only this one — but this is
the root, so it is the one that reaches everything.
