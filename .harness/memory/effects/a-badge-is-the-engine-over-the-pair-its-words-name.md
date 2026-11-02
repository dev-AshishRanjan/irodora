# E-234 — A badge is the engine over the pair its words name

**Link:** `apps/mobile/src/palette-readout.ts` → `10`’s cards and `16`’s matrix, the export and the Lab hand-off
**Guard:** `palette-readout.test` over every curated palette and stored ones, with decoys; the fidelity tests **Severity:** high **Feature:** F-251

---

## The shapes

- **The contrast badge** is the anchor against the first `light` member by rank, floored to one
  place, beside the threshold the printed ratio reaches. A palette with no light member draws no
  badge, never a figure for another pair.
- **The separation badge** is the floor of the worst pair over three deficiencies at severity 1:
  it prints 100 only when it is 100. `07` rounds (F-357); a corpus pair in [99.5, 100) is the test.
- **A personal palette** is described by its origin, never by *Irodora original* (ADR-0067).

## What it does not guard

- That a badge looks as `10` draws it: the capture (criterion 4).
