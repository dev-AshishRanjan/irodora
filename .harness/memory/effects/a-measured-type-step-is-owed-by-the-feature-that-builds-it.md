# E-171 — A measured type step is owed by the feature that builds it

**Link:** ADR-0121 → `type-census.json`, `MetricTile.tsx`, F-242, F-247, F-253, F-258, F-260
**Guard:** the census in `type-scale.test.ts`; `verify-token-reach.mjs` **Severity:** medium
**Feature:** F-230

---

## Why B changes when A does

ADR-0121 answered OQ-13 with a rule, not a step: type a screen draws within 4 dp of a board step takes
the step, and type beyond is set at a **measured step** bound to its elements. A rule reaches every
feature that sets type off the scale. F-230 bound the two wordmarks. 06's and 26's kanji (F-247), 20's
card kanji (F-253) and 22's figures (F-258, through `MetricTile`) each owe one. 01's tagline (F-242)
and 17's slider labels (F-260) are within 4 dp and take board steps.

## How it is guarded

The census in `type-scale.test.ts` holds every governing element drawn more than 4 dp from every step
to a measured step or to an owed row, both ways, with a planted decoy. The owed rows live in
`.harness/verification/type-census.json`, which the **uncached** reach script reads beside the
feature list: once a row's owner is `done` while the row is still owed, the gate fails. That is
`closedBy`'s rule, and it is why the rows are a declaration file rather than the feature list read
by a cached test, which would key every test on every claim.
