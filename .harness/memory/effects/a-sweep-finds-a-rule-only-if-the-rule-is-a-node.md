# E-228 — A sweep finds a rule only if the rule is a node

**Link:** `packages/ui/src/ReadoutTable.tsx` (the ruled form's part ids, rule nodes, lowered run and
reading ink) → `Compare.tsx` and the sweep's `08` locators
**Guard:** `readout.test` (every part by its id under the caller's, none without one — decoy; each rule a
1 dp node and no row a border; caption type at 400/500; the lowered run and the row's whole name; the
words in the figure's ink when asked, the secondary otherwise); the conformance subject
`ReadoutTable (ruled, ids, lowered run, figure ink, 08)`; the `08.screen` sweep **Severity:** medium
**Feature:** F-249

---

## Why B changes when A does

`08.json` records the metric table's rules (`08.metrics.rule-1…5`) and each row's label, value,
reading and formula as elements, and the sweep finds each by its id. F-235 drew the rules as each row's
`borderTop` and gave the parts no ids, so the sweep could not find them. F-249 made each rule its own
node and named every part under the table's id. A refactor that folds a rule back into a border, or
drops an id, makes the sweep stop finding `08`'s elements — and fails only where `08` is enrolled.

F-249 also measured `08`'s rows at `caption` (ADR-0157), so the form's padding is what a caption line
leaves of `08`'s 26 dp single-line pitch.

## What it does not guard

- **Layout.** A test tree has no layout; the rows' pitch on a device is the capture's to show.
