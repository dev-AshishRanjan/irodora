# Plan: F-069 — Status colour may not sit beside a colour sample

| | |
|---|---|
| **Feature** | F-069 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, FR-18 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` · `docs/design` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

A saturated status colour next to a garment sample **changes how the sample reads**. That is
simultaneous contrast, and it is the same physics `swatch.well` exists for — a red "poor
quality" chip beside a green fabric makes the fabric look different from the same fabric beside
a grey chip, and the person is looking at the fabric to make a decision about it.

This is the one place where a component can be individually correct and the *composition*
wrong, which is why it needs a check over the rendered tree rather than a token rule.

## The rule, stated precisely enough to check

**A node painted with a `status.*` token may not be a sibling of a node painted with a sample
colour, unless their shared parent is painted `swatch.well`.**

Siblings, deliberately — not "anywhere in the tree". A status chip in a header and a sample
three screens down are not adjacent in any sense a person perceives, and a rule that flagged
them would be switched off within a week. The shared-parent test is the narrowest thing that
catches the real case: a row containing both.

`swatch.well` is the escape, because it is exactly the mandated neutral ground: if the sample
already sits in its well, the status colour is no longer touching it.

## Approach

**Reused:** the conformance suite's tree walk and `resolveColor`, so "is this a status token"
and "is this a sample" are answered by the same machinery the other checks use — and the
sample values come from the registry's declared `sampleValues`, which already exist.

### Increments

1. **The check**, in `@irodora/ui/testing`, with a compliant fixture and two decoys: a status
   chip beside a bare sample (must fail), and the same pair inside a `swatch.well` (must pass).
2. **The rule in `DESIGN-SYSTEM.md`**, beside the existing `swatch.well` rule — the second
   acceptance criterion, and the reason the first one is enforceable rather than folklore.

## Anticipated effects

None new. It extends the rendered half of gate 9's charter, which F-017 landed; the guard is
the conformance suite that already runs over `packages/ui` and `apps/mobile`.

## Test plan

- **Positive:** the existing components produce no finding — asserted first, so the negatives
  below mean something.
- **Negative, both required:** status beside a bare sample fails; the *same* status beside the
  *same* sample inside a `swatch.well` passes. Without the second, the rule could be "flag any
  status colour" and would pass every negative test while being useless.
- **Assertions to reject:** flagging on a marker prop the component supplies (self-fulfilling);
  scanning for the string `status.` in source rather than resolving what was painted.

## Out of scope

`border.strong` (F-070) · any change to the status tokens themselves, which ADR-0044 settled.
