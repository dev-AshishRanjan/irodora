# E-235 — A strip says whether it is judged

**Link:** `packages/ui/src/Pair.tsx#Strip` (`judged`) → `10`’s band, and every judging surface
**Guard:** `pair.test` both ways; the states test’s scan of `judged={false}`; Compare’s floor test **Severity:** high **Feature:** F-251

---

## The rule (ADR-0162)

The floor binds a sample a person judges a difference on beside its figure. `judged` defaults to
`true`; `false` must be said, and the source scan holds the one place it is said — `10`’s band —
to its ADR. A new opt-out fails until it is declared.

## What it does not guard

- `04`’s and `23`’s joined samples: OQ-45’s seam half, F-245 and F-260.
