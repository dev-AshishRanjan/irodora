# Plan: F-068 — Swatch edge treatment against an arbitrary sample

| | |
|---|---|
| **Feature** | F-068 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/design-tokens` · `@irodora/ui` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

A colour sample keeps a perceptible edge against the well beneath it — **whatever colour the
sample is**. The one boundary in this product that cannot be checked by a declared pairing,
because the other side of it is arbitrary.

## The defect, measured before it is fixed

`swatch.hairline` is a single translucent line: `rgba(0,0,0,0.14)` in light,
`rgba(255,255,255,0.16)` in dark. Scanning the gamut with both compositing models and taking
the worse:

```
SINGLE black@0.14   worst 1.00  at sample (0.0, 0.0, 0.0)
SINGLE white@0.16   worst 1.00  at sample (1.0, 1.0, 1.0)
```

**1.00 is not a weak edge. It is no edge at all** — a black sample on a black hairline, a white
sample on a white one. The token's own `uncheckedReason` said this was F-068's problem; it was
right, and nothing measured how bad it was.

Two-tone translucent does not rescue it — the halves composite over the *same* sample, so their
difference compresses to 1.15–1.50 against white. Raising alpha to reach 3:1 needs ~0.6, a line
heavy enough to compete with the sample, which is what the whole design forbids.

## The treatment

**An opaque two-tone keyline** — the thing print and every OS selection ring already does.
Measured over the gamut at 0.05 steps:

```
opaque dark + light   worst-to-sample 4.23   internal 17.9
```

Above the 3:1 non-text floor for **every** colour in the gamut, and the two halves always
differ from each other by ~18:1 regardless of what is behind them. No compositing, so the
linear-versus-encoded ambiguity does not arise either.

## Approach

**New tokens**, both themes: `swatch.hairline` becomes opaque, and `swatch.hairline.inverse`
carries the second tone. Near-achromatic, so the `chromaCeiling` is untouched.

**Reused:** `@irodora/color-difference` for the WCAG ratio — the same function the contrast gate
uses, so this cannot disagree with it.

### Increments

1. **The tokens and the check.** A test that scans the gamut and asserts the worst case,
   *and* asserts that the previous single-line treatment fails it — the decoy is the design
   that shipped.
2. **The component.** `Swatch` draws both tones.
3. **The role text**, which is the third acceptance criterion: it must describe exactly what
   is verified, and it must stop contradicting itself about who owns this.

## Anticipated effects

**E-007** — a manifest change, so four targets regenerate and both gates re-read it. The
`contrast` gate governs declared pairings and cannot express this one; the new test is the
guard, and the token's `uncheckedReason` must now name it rather than naming a future feature.

## Test plan

- **Positive:** the worst case over the gamut clears 3:1, computed rather than asserted.
- **The decoy is the shipped design:** the single translucent hairline must FAIL the same
  check, at ratio 1.00. A check that the new treatment passes proves nothing unless the old one
  demonstrably does not.
- **Both themes**, independently — they are authored independently.
- **Assertions to reject:** checking one convenient sample; asserting the ratio "is a number";
  scanning only greys, which is where a single line looks best.

## Out of scope

`border.strong` (F-070) · the status-adjacency rule (F-069) · any change to `swatch.well`, whose
role is unchanged.
