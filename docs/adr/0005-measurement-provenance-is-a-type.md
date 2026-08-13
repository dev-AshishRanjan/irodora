# ADR-0005 — Measurement provenance is part of the colour value, not metadata beside it

## Status

Accepted

## Date

2026-08-13

## Context

A hex value carries no information about how it came to exist. `#263B3C` might be:

- a published standard reference value;
- a camera capture corrected against a physical reference card;
- an ordinary phone capture under a warm bulb at 60 % confidence;
- a number somebody typed.

These are wildly different epistemic objects, and the product's honesty commitment
(PRD §1.2) depends entirely on never confusing them.

The conventional approach is a disclaimer: display the hex, show a confidence badge, put
"estimated" in the caption. This fails in the ordinary way that all convention-based
guarantees fail — a new surface gets built, the developer has a hex and needs to render a
swatch, the provenance is one object away and not required, and it quietly does not get
shown. Nobody decided to mislead the user. The type system simply permitted it.

Six months later the product displays measured-looking colour values with no indication
that they are estimates, and the commitment in §1.2 is false in a way no test detects.

## Decision

**Provenance is a required field of the colour value itself. An unclassified colour is
not representable.**

```ts
interface Color {
  readonly xyz: readonly [number, number, number];
  readonly provenance: Provenance;   // required — no default, no optional
}

interface Provenance {
  readonly source: 'reference' | 'calibrated' | 'estimated' | 'declared';
  readonly confidence: number;        // [0,1]
  readonly conditions?: CaptureConditions;   // required when source is estimated|calibrated
  readonly originSpace: ColorSpace;
  readonly capturedAt?: string;
}
```

Consequences that fall out of this, which are the reason for the design:

1. A component that accepts a `Color` **necessarily has** its provenance. There is no code
   path that renders a swatch while dropping how it was obtained, because such a path
   cannot be written.
2. `source` determines what may be claimed. The claims copy lint (NFR-21) binds
   permissible language to it: only `reference` and `calibrated` may appear near the word
   "measured".
3. Construction from an untracked origin goes through `Color.unsafeFromHex()`, which sets
   `source: 'declared'`, `confidence: 0.5`, and whose every call site is reviewed. The
   name is deliberately unpleasant.
4. Provenance crosses the wire. API responses carry it (see
   [`api-contract.md`](../architecture/api-contract.md)); a client cannot receive a colour
   without it.
5. Provenance persists. `garment_color` stores `provenance_source` and
   `provenance_confidence` as columns.

## Consequences

**Good.** The product's honesty commitment becomes structural instead of cultural. New
surfaces inherit it automatically — a developer who has never read this document still
cannot build the failure. Confidence and lighting conditions become available everywhere
they are relevant, which enables genuinely better UI ("your lighting is mixed; move to a
window") rather than a badge.

**Bad.** Every colour construction site must supply provenance, including tests and
fixtures — mitigated by builders in `@irodora/testing`. Payloads are larger. Developers
coming from `color: string` find it verbose at first. `unsafeFromHex` is an escape hatch,
and escape hatches get used; the mitigation is that it is greppable, named to discourage,
and reviewed.

**Neutral.** Design-token colours are `source: 'reference'` with `confidence: 1` — they
are definitionally what we say they are.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Provenance as sibling metadata** | Conventional and less verbose. But it is *optional at every call site*, which means it is absent at some of them, and the absence is invisible. This is the failure mode the decision exists to prevent |
| **A confidence number only** | Cheaper. But confidence conflates two different things: a `declared` hex has perfect precision and unknown truth, while a `calibrated` capture has bounded error and known method. One number cannot express both |
| **Branded types per source** (`EstimatedColor`, `CalibratedColor`) | Strongest possible compile-time separation. But every function that accepts any colour needs a union or a generic, which spreads through the entire codebase for a distinction that is a runtime property in most call sites |
| **Enforce it in the UI layer only** | Smaller change. But the engine also needs it — the recommendation engine should weight a low-confidence input differently, and it cannot if provenance stops at the view |

## Revisit when

Never, realistically. This is a foundational type. A change here would touch every colour
in the system — see effect link [E-002](../../.harness/state/effects.json).
