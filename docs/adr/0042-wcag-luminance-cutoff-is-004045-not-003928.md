# ADR-0042 — The WCAG luminance cutoff is 0.04045; 0.03928 was superseded in 2021

## Status

Accepted

## Date

2026-08-15

## Context

F-007 implemented WCAG 2.x relative luminance with the transfer cutoff `0.03928`, on the
reasoning — written into `luminance.ts`, into a golden entry at tolerance 0, and into
[ADR-0041](0041-three-luminance-definitions-coexist-deliberately.md)'s comparison table — that
*"the specification publishes 0.03928 where IEC 61966-2-1 publishes 0.04045"*.

**That stopped being true in May 2021.** W3C corrected the relative-luminance definition, and
WCAG 2.1 and WCAG 2.2 as published both specify `0.04045`. `0.03928` is the original WCAG 2.0
text, superseded by errata.

[ADR-0021](0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md) makes **WCAG 2.2** the
enforced gate. So the version being implemented and the version being gated against were
different documents, and the code comment stated a pre-2021 position as current.

The error was found by an independent colour-science review, not by any gate here. Nothing in
this repository could have caught it: every check compared the constant against *itself*.

### What it was worth

Measured, so this is triaged rather than argued.

| | |
|---|---|
| 8-bit input | **exactly 0** — no integer code lies between `0.03928` and `0.04045` |
| float input, worst case | **7.555e-7** in luminance at `v = 0.039302` |
| the same, as a contrast ratio against white | **6.6e-5** |
| design tokens affected today | **0 of 44** — the nearest channel is 0.0034 from the band |

The 8-bit result is why every WCAG worked example in the golden set is unchanged by this
correction, and why no published contrast figure moves.

**It is not negligible in principle.** 6.6e-5 in a contrast ratio is the same order as the
1.7e-4 that ADR-0041 rests its entire case on, and the Lens (F-022) produces float sRGB
directly from camera samples rather than 8-bit codes.

## Decision

**`WCAG_TRANSFER_CUTOFF` is `0.04045`, cited to the post-2021 WCAG 2.1/2.2 text.**

1. The golden entry `wcag-transfer-constants` changes from `0.03928` to `0.04045`. **This is a
   golden value change and that is why this ADR exists** — `packages/color-core/AGENTS.md`
   requires one, and the requirement applies whether the change makes the value more correct
   or less.
2. `luminance.ts` and ADR-0041's table are corrected. WCAG's cutoff is now the *same* as
   IEC 61966-2-1's, so the "WCAG's own cutoff" framing goes away. **WCAG's coefficients are
   still rounded and still differ from ours** — ADR-0041's substance is untouched, and its
   111-flip measurement is separately corrected to 984.
3. The golden entry recording that the two cutoffs are indistinguishable for 8-bit input is
   **kept**, reframed as the evidence that this correction moved no published figure.

## Consequences

### Good

- **We implement the document we claim to.** ADR-0021 gates on WCAG 2.2; the code is now
  WCAG 2.2.
- **One fewer divergence to explain.** WCAG and IEC now agree on the cutoff, so the only
  remaining WCAG-versus-engine difference is the coefficient rounding — which is the one that
  actually changes answers.

### Bad

- **The `@irodora/color-difference` identity digest changes.** 222 of the 30 000 sampled
  components fall inside the band, so the determinism fixture is regenerated. That is the
  legitimate case its own docstring permits — an intended change — but it is worth naming that
  a fixture regeneration accompanied a correction, because "regenerate to make it green" is
  the failure mode it exists to prevent.
- **Anyone comparing our contrast against an implementation still using `0.03928`** — and
  there are many, since the original text circulated for a decade — will see a 6.6e-5
  disagreement on float input. That is now the other party's error, but it still needs
  explaining.

### Neutral

- No published contrast number changes, because every one in the golden set is 8-bit.

## Alternatives considered

**Keep `0.03928` and cite WCAG 2.0.** Rejected: ADR-0021 gates on WCAG 2.2, so the
implementation would deliberately not match the standard being enforced.

**Support both, selected by a `wcagVersion` parameter.** Rejected as scope with no consumer.
Nothing in the product needs WCAG 2.0 conformance, and an unused branch is untested surface —
the more so when the branch is numerically invisible for every 8-bit input.

## What this says about the checks

The constant was pinned digit-for-digit at tolerance 0, in a golden entry, with a citation.
Every one of those is the right practice and **none of them could catch this**, because they
all compared the constant against a transcription of the same wrong source.

A digit-for-digit entry proves a transcription is faithful. It cannot prove the source is
current. The only thing that catches this class of error is someone going back to the
published document — which is what the colour-science review did, and which is the argument
for that review being a step rather than an option.
