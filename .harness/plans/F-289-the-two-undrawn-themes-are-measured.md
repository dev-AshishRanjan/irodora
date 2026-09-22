# Plan: F-289 — The two undrawn themes are measured, so OQ-36 is answered from numbers

| | |
|---|---|
| **Feature** | F-289 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-70, NFR-9, NFR-10 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/design-tokens` |
| **Author** | implementing session |
| **Date** | 2026-09-22 |

---

## Intent

`OQ-36` blocks `F-225`, which blocks `F-233` and `F-240` and, through them, most of the mockup
rebuild. It asks for something a person must answer — **but it asks blind.** Mockup `15` draws
Slate Graphite and Obsidian Noir as one swatch each, and the question *"derive them by a stated
rule, supply the values, or ship the two as a ground change only?"* cannot be answered sensibly
without knowing whether the obvious rule produces a palette that passes gates 9 and 10.

This measures it. Afterwards the person chooses between **options with numbers on them**, which is
what `F-275` did for `OQ-29` and is the only reason that question is now answerable in one line.

**It adopts nothing.** No manifest value changes. `F-225` is where an answer lands.

## Approach

**Reused.** `checkContrast` and `checkSeparation` from `packages/design-tokens/src/check.ts` — the
real gate 9 and gate 10 code, which take a palette map as an argument, so a candidate palette can
be measured with exactly the checker the build uses. `@irodora/color-*` for the OKLCh arithmetic.
The Sumi and Washi ramps already recorded in `R9-MOCKUP-FIDELITY` §5.

**New.** A measurement script under `mockups/tools/` beside the other authoring helpers — it is not
a gate, and saying so is the point — plus the recorded result.

### The derivation being measured, stated before it is run

`OQ-36`'s own row proposes it: **Sumi Charcoal's lightness steps above its ground, re-anchored at
each theme's ground, with the text roles held.** From §5's dark ramp:

| | Sumi | ΔL above ground |
|---|---|---|
| ground | `#15171B` | — |
| level 1 | `#20232A` | +0.052 |
| level 2 | `#282C35` | +0.089 |
| level 3 | `#323742` | +0.133 |

Chroma and hue are carried from Sumi's corresponding step, because the two new grounds differ from
Sumi's mostly in lightness and a theme that also moved hue would be a different design rather than
a derivation. Text roles, both borders and the keyline are held at Sumi's values — that is what
*"with the text roles held"* means, and holding them is what makes the result checkable rather than
a second free choice.

**This cannot go through `themeRecipes`.** That mechanism is a tint that *never moves lightness*
(ADR-0096), and these two themes are ground changes — which is exactly why they are an open
question and not a config entry. `F-225`'s fourth criterion already supersedes ADR-0096, so what is
measured here is the world `F-225` would create.

### What is measured, and what is reported

For each of the two themes, every **declared pairing** — the `pairsWith` lists the manifest already
carries — through `checkContrast` (gate 9) and `checkSeparation` (gate 10). The report is per
pairing, with its ratio and its requirement, because *"it passes"* is the summary that hides the one
that does not.

Where a pairing fails, the **nearest passing value** is computed: the smallest lightness move on the
text side that clears the requirement, reported as a hex and a ΔL. That turns *"the rule does not
work"* into *"the rule works if this token moves by this much"*, which is a different question for a
person and a much easier one.

### Increments

1. **Record**: the claim, this plan.
2. **The measurement**: the derivation, the run over both themes, the per-pairing table.
3. **The result**: `OQ-36` and `R9-MOCKUP-FIDELITY` updated so the choice is between measured
   options; the script kept beside the other authoring tools with its own README line.

## Mockup fidelity

- **Governing mockup:** `15` — `15.themes.slate.*` and `15.themes.obsidian.*`, one swatch each.
- **Inventory:** the two theme tiles. Their swatches are the only drawn evidence, and `F-220` read
  Slate at `#2C323A` from the render (a colour read from a render carries ΔE00 ≈ 2) and Obsidian at
  `#101114` printed on its tile.
- **Departures:** none. **This feature builds no surface at all** — it measures candidate values and
  records them. The decision it serves is `OQ-36`, and rule 14 keeps that with a person.

## Files to touch

```
mockups/tools/derive-theme.mjs (new)   the derivation and the two gate runs, as a report
mockups/tools/README.md                what it reads, and that no gate runs it
docs/PRD.md                            OQ-36 gains the measured result
docs/design/R9-MOCKUP-FIDELITY.md      §5 gains the two derived ramps beside Sumi's
.harness/state/*                       the record
```

## Anticipated effects

1. **Nothing in the build changes.** No manifest value, no token, no emitted file. The guard is that
   `pnpm test` and `pnpm build` are unchanged by this feature, which is worth stating because a
   measurement that quietly adopted its own result would be the failure mode here.
2. **`OQ-36`'s text changes** → `F-225`, and whoever answers it. Guard: the numbers are reproducible
   by re-running one command, which is what makes them checkable rather than assertions.
3. **The derivation may turn out not to pass** → `F-225`'s fifth criterion, which requires gates 9
   and 10 without a lowered threshold. Guard: reporting the nearest passing value rather than
   stopping at the failure.

## Test plan

- **The checkers are the real ones.** The script imports `checkContrast` and `checkSeparation` from
  the built package rather than reimplementing a ratio — a second implementation would agree with
  itself [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].
- **The reading is reproducible**: the script takes the two grounds as arguments and prints the same
  table every run, so a second person repeats it rather than trusting it.
- **A control**: Sumi's own ramp through the same derivation must reproduce Sumi's own recorded
  values, because a derivation that cannot re-derive the palette it was read from is measuring
  something else.
- **Both directions of the failure report**: a pairing that passes reports its margin; one that
  fails reports the nearest value that passes, and that value is re-checked rather than asserted.
- **Gates**: state, typecheck, lint, format, test — and the last two are the interesting ones, since
  nothing in the build should move.

## Verification

```
node scripts/verify-state.mjs
node mockups/tools/derive-theme.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```

## Risks and open questions

- **This feature must not answer `OQ-36`.** The line is: it may say *"this rule passes"* or *"this
  rule fails here and this nearby value passes"*; it may not change a manifest value or mark the
  question closed. Rule 14 keeps the choice with a person, and the whole value of the measurement is
  that it is neutral about which option they take.
- **A colour read from a render carries error.** Slate's `#2C323A` came off a JPEG at ΔE00 ≈ 2, so
  the report states the sensitivity: whether the pass/fail verdict would change if the ground were
  2 ΔE00 away, which is the difference between a robust answer and a lucky one.
- **The derivation is one candidate, not the space of them.** If it fails badly, the honest output
  is *"the obvious rule does not work, and here is why"* — which is still a better question than the
  one being asked today.

## Out of scope

Adopting any value (`F-225`). The light theme, which `25` draws and §5 already records. The four
themes' names, tiles or picker, which `F-262` rebuilds. Any change to ADR-0096, which `F-225`'s own
criterion supersedes.
