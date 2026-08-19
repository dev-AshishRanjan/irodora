# Plan: F-067 — Cross-theme salience hierarchy, and the APCA floor for dark error

| | |
|---|---|
| **Feature** | F-067 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `content` — the design manifest, `@irodora/design-tokens`, gate 9 |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-19 |

---

## Intent

Two defects, one cause, found by the F-003 reviews and pre-existing.

**1. The salience hierarchy inverts between themes.** Measured as |APCA Lc| against each
theme's own background (background passed FIRST — APCA is directional):

```
light:  bad 89.3  >  warn 73.4  >  ok 72.7      error is loudest
dark:   warn 60.8 >  ok   56.8  >  bad 38.6     error is QUIETEST
```

A person toggling the theme gets an inverted status hierarchy. The cause is that the approved
system holds the rank of OKLCh **L** constant across two grounds of *opposite polarity*, and L
rank does not survive that flip. **The invariant that makes the two themes one system is the
rank of contrast against own ground**, not the rank of L.

**2. `dark.status.bad` fails the APCA floor.** Lc −38.6 / −38.3 / −37.5 against its three
declared surfaces, below the Lc 45 **large-text** floor — while WCAG reads 4.92–5.58 and passes.
[ADR-0044](../../docs/adr/0044-status-tokens-corrected-and-status-colour-is-text.md) classifies
`status.*` as `usage: "text"` precisely because the product tints the label, so this is **body
copy below even the large-text floor, in the default theme**.

## The decision, and why there was no third option

Approved by the user on 2026-08-19 after the numbers below were re-measured independently.

**Against a dark ground, APCA contrast rises with lightness.** A deep red error simply cannot
reach Lc 45 on a dark background — that is geometry, not preference. So either error gets
lighter in the dark theme, or it stays below the floor. There is no arrangement that keeps a
conventional deep red *and* clears the contrast requirement.

The F-003 computation is adopted, re-verified here against the shipped engine:

| | current | proposed |
|---|---|---|
| `dark.status.ok` | L0.73 C0.09 H158 `#75B992` | **L0.67 C0.12 H158 `#49AB79`** |
| `dark.status.warn` | L0.77 C0.13 H70 `#E9A44E` | **L0.70 C0.14 H70 `#D58D25`** |
| `dark.status.bad` | L0.64 C0.14 H26 `#D4665E` | **L0.82 C0.10 H18 `#FEAAAC`** |
| worst |APCA Lc| | 37.5 ✗ | **46.5** ✓ |
| worst CVD separation | 65.2 | **63.1** ✓ |
| salience | warn > ok > bad | **bad > warn > ok** |

The dark salience order now matches light. **The cost is real and is accepted**: error reads as
a pale pink rather than a red in the dark theme. NFR-9 limits the damage — status is never
colour-only, so every error already carries an icon and a text label.

## Approach

**Reused:** everything. `@irodora/design-tokens` already owns `checkContrast`,
`checkChromaCeiling` and `checkStructure`; gate 9 already reads the manifest and composites in
both models; `@irodora/cvd-engine` already scores separation across eleven severities and two
models. No colour maths is written here.

**New:** a `salience` block in the manifest recording the **chosen rank and its reason**, and a
check in `@irodora/design-tokens` asserting it — acceptance criteria 3 and 4. The rank must be
*recorded*, not inferred: inferring it from the values makes the check tautological, and the
whole defect was that nobody had stated which order was intended.

### Increments

1. **ADR first.** A token-value change to an approved manifest is a decision, and ADR-0044 set
   the precedent that these get recorded with their measurements.
2. Manifest: the three `dark.status.*` OKLCh values. `srgb` is **engine-derived** — a
   hand-edited hex fails gate 9 by ADR-0043, so it is regenerated, not typed.
3. `salience` block + `checkSalience` in `@irodora/design-tokens`, called by gate 9.
4. Regenerate the four token outputs; they are byte-compared by their own tests.
5. Update `valuesChangedSinceApproval` — re-approval is owed and the manifest must keep saying
   so.

## Files to touch

```
docs/adr/0053-…                                  NEW — the decision and its measurements
docs/design/design-system.manifest.json          3 oklch values, 3 derived srgb, salience block,
                                                 valuesChangedSinceApproval
packages/design-tokens/src/check.ts              checkSalience
packages/design-tokens/src/index.ts              export it
packages/design-tokens/test/check.test.ts        its tests, incl. a rank that must FAIL
scripts/verify-contrast.mjs                      call it; drop the F-067 red band
scripts/verify-contrast-proof.mjs                a salience mutation case
packages/design-tokens/src/generated/*           regenerated, byte-compared
docs/design/DESIGN-SYSTEM.md                     the palette table and the rationale
```

## Anticipated effects

**E-007** — a token change is a contrast change in both themes. Guard: gate 9, which already
covers it and is blocking.

Also: three token values feed the generated CSS/TS/RN outputs, which are byte-compared by
`@irodora/design-tokens` tests. Guard: gate 4 — those tests fail if the outputs are not
regenerated, which is the mechanism ADR-0043 exists to provide.

**Not affected:** the colour engine, the corpus, every golden dataset. No claim about physical
reality moves; this is a product palette decision measured against published metrics.

## Test plan

- **Gate 9 (contrast)** must go from *red band printed* to green, with the three pairings now
  clearing Lc 45 and every `pairsWith` combination still meeting WCAG AA in both themes.
- **Gate 10 (cvd)** — worst separation must stay ≥ 60 across eleven Machado severities and both
  Viénot and Machado models. Predicted 63.1; asserted, not assumed.
- **New unit tests** for `checkSalience`: a manifest whose recorded rank matches the measured
  order passes; one whose recorded rank does NOT match fails and names both orders.
- **Mutation proof** gains a case: swap two entries in the recorded `salience` rank and watch
  gate 9 go red. Without it the block is documentation rather than a check.
- **Byte-compare** of the four generated outputs, which already exists.

## Gates

`state` · `contrast` · `cvd` · `test`
