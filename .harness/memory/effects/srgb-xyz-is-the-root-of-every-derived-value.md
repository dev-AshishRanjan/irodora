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

## The guard — both ends, as of F-011

**The *source* end, since F-006.** `srgbToXyz` (`packages/color-spaces/src/rgb.ts`) is covered
by `gate:color-golden`:

- 71 golden entries, each citing its source, across six datasets;
- a 300 000-value determinism digest that fails on a change of one bit
  (`cross-platform-identity.fixture.json`);
- bitwise agreement with `colorjs.io` on XYZ, Lab-D65, P3 and linear sRGB over 10 000 samples.

Anything that alters this transform fails the build immediately.

**The *destination* end, since F-011.** `gate:content` recomputes every derived value in the
**latest** published bundle from its own `xyz` under the **current** engine and fails naming
the entry. `scripts/verify-content-proof.mjs` proves it: one case perturbs
`XYZ_TO_LMS_OKLAB[0]` by 0.01, rebuilds `color-spaces` and `corpus`, and asserts gate 11 goes
red — then restores and rebuilds.

> That proof case did not exist when this link was first marked guarded. The rationale in
> `effects.json` claimed it did, an evaluation ran exactly that experiment, watched the gate
> stay **green**, and reported the claim as false. It is a real case now. The general lesson —
> a guard is only guarded once someone has watched it fail — is
> [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]].

**Older versions are deliberately NOT re-checked** against the current engine; they were
derived by an engine we no longer have, and asserting that today's engine reproduces
yesterday's answer is precisely the claim FR-10 forbids. Gate 11 prints which versions it
skipped, on every run.

**The honest limit today:** `content/colors/` is empty until F-012, so the destination check
currently runs against a *fixture* corpus carrying a published bundle. That is what makes the
rules executable at all; it is not evidence that any real colour has passed them, and the gate
says so every run.

## Related

The same reasoning applies to any conversion in the graph, not only this one — but this is
the root, so it is the one that reaches everything.

**A second root appeared in F-006 that this note did not anticipate:** the choice of
chromatic adaptation transform. CAT16 and Bradford disagree by up to 8.6 ΔE76 on saturated
blue — half this corpus — so `DEFAULT_ADAPTATION` reaches every derived value exactly the way
`srgbToXyz` does, and changing it is a corpus rebuild for the same reason.
