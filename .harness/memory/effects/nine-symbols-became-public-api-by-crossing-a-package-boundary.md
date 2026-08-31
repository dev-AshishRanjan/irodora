---
kind: effect
id: E-045
title: Nine symbols became public API by crossing a package boundary, without a line of their own source changing
severity: medium
created: 2026-08-31
scope: [packages/recommendation, packages/optimization]
links: [[a-green-gate-says-the-code-works-not-that-it-is-where-the-record-says]], [[the-phrase-lexicon-has-two-readers-now-and-they-fail-differently]]
---

# E-045 — nine symbols became public API by crossing a package boundary

F-110 moved `coverage.ts` into `@irodora/optimization`, the package F-048 was scoped to all
along. Inside `recommendation` it reached these as **relative imports** — internal, and freely
refactorable by anyone working in that package:

```
NEUTRAL_CHROMA                              ./score.js
OUTFIT_SLOTS, OutfitSlot                    ./slots.js
scoreOutfit, OutfitComponent, OutfitPiece   ./outfit-score.js
Candidate                                   ./outfit.js
PersonalProfile                             ./profile.js
RuleSet                                     ./rules.js
```

Across a package boundary they are **public API**. Nine symbols changed status without a line
of their own source changing, which is the kind of change no diff shows you.

## The compile error is loud; the wrong fix is silent

Remove `NEUTRAL_CHROMA` from `recommendation`'s index while tidying what looks like an internal
constant, and typecheck fails immediately, naming `coverage.ts`. Nobody ships that by accident.

**The hazard is the repair.** The cheapest-looking fix is to declare `0.039` locally in
`optimization` and move on. That is [E-013](../../state/effects.json)'s shape — one rule in two
places — and it is worse here than usual, because `NEUTRAL_CHROMA` is **not a preference**.
F-101 *measured* it: the chroma below which a hue angle is a rounding artefact. `gaps` refuses
to name a hue above it for exactly that reason. A second copy would drift from the measurement,
and **nothing would go red**.

So the guard catches the removal and cannot catch the redeclaration. This note exists to make
the dependency discoverable *before* somebody reaches for the second one.

## The direction is the part to hold

```
optimization  →  recommendation      a solver optimises over a score
recommendation → optimization        NEVER
```

[`ARCHITECTURE.md`](../../../docs/architecture/ARCHITECTURE.md) now names this edge instead of
leaving it to be inferred from the order of a list, because **an unstated rule is the one
somebody reverses**. A cycle fails `lint`, so the reverse edge cannot ship — but it can be
attempted, and the doc is what says why not to.

## Guard

`gate:typecheck` and `gate:build` — an immediate compile error naming the file.
`gate:lint` — fails on a cycle.

**Neither reaches the redeclaration.** That is the limit, and it is the reason this is written
down rather than left to the type system.

## Why medium and not high

Every path here fails a gate loudly and immediately. Nothing degrades quietly, nothing ships
broken. The link is for discoverability, not for catching a live hazard.
