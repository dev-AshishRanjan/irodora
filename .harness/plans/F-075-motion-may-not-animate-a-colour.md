# Plan: F-075 — Motion may not animate a colour, and a gate can see it

| | |
|---|---|
| **Feature** | F-075 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `scripts/` · `@irodora/design-tokens` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

**Intermediate frames of a colour transition are plausible colours that never existed.** A
user reads a value the engine never produced — and for a colour product that is a correctness
defect, not a polish one. The manifest has said so since F-003; nothing enforced it.

## Two findings that shaped this before a line was written

**1. The rendered tree cannot see it.** Probed rather than assumed: an `Animated.View` with an
interpolated `backgroundColor` renders to

```json
{ "type": "View", "props": { "style": { "backgroundColor": "rgba(0, 0, 0, 1)", "opacity": 0 } } }
```

A **concrete resolved value**, indistinguishable from a static colour. So the conformance suite
— which sees everything else in this product — is structurally blind here, and this has to be
source analysis.

**2. `motion.forbidden` cannot be the source of the list.** Its entries are prose:
`"background-color on a swatch"`, `"cross-fade between samples"`. Nothing mechanical can be
derived from them.

But `motion.animatable` **is** a property list — `['opacity', 'transform']` — and it is the
same rule stated positively: *only these may be animated.* So the allowlist is derived from the
manifest after all, which is what the acceptance criterion was reaching for. The criterion is
rewritten to say `animatable` rather than `forbidden`, because that is the one that can be true.

## Approach

`scripts/verify-motion.mjs`, in the shape this repository already uses for
`verify-guards`/`verify-contrast-proof`/`verify-font-coverage`: a checker plus a `--prove` mode
that plants a violation and watches it fail.

**Its limits are printed on every run.** It is source analysis, so a style assembled at runtime
or spread from a variable is invisible to it. Saying so is the difference between a check and a
claim.

### Increments

1. The checker, reading `nativeMotion.animatable` from the generated tokens.
2. `--prove`: plant an animated `backgroundColor`, watch it fail, restore.
3. Wire into `lint`, and record.

## Test plan

- **Positive:** the repository passes today — asserted before the negatives mean anything.
- **Negative:** an animated `backgroundColor`, and an animated `width` (which the manifest also
  forbids, and which is a *layout* property, so it catches a different mistake).
- **The decoy that keeps it usable:** an animated `opacity` and `transform` must NOT fail. A
  check that flagged all animation would be switched off in a week.

## Out of scope

`prefers-reduced-motion` handling · animation durations, which the manifest already carries and
nothing yet reads.
