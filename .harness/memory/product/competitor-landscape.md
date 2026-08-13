---
kind: product
title: The category is crowded per-feature and empty at the combination
confidence: 0.8
created: 2026-08-13
scope: [root]
links: [[wada-public-domain-is-not-the-same-as-free-to-ingest]]
---

# The category is crowded per-feature and empty at the combination

Every individual feature Irodora ships exists somewhere already. **Claiming any one of them
is novel would be wrong**, and would be the kind of overstatement
[ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md) exists to prevent.

## What exists

| Category | Examples | What they prove |
|---|---|---|
| Personal colour | Dressika, My Best Colors | Demand for palettes and seasonal analysis |
| Wardrobe management | Stylebook, Whering, ACloset | Demand at very large scale; cost-per-wear is an established feature |
| Camera colour identification | Color Grab | Established consumer use case, including explicitly for colour-blind users |
| Japanese colour reference | Various web and app references | Interest in the traditional colour corpus |
| Wada-derived combination apps | Several | Camera matching and wardrobe features already combined with the Wada dataset |

## What none of them has

**A trustworthy colour value with provenance, shared across all of those questions.**

Each category answers its own question and discards the information the others need:

- A wardrobe app knows you own the shirt, not what colour it is to within ΔE.
- A colour picker knows the hex, not that you own six near-identical ones.
- A personal-colour app knows your season, but cannot look at the garment in your hand.

## Where the defensibility actually is

Not in any feature. In three things that are expensive to do honestly and cheap to fake —
**and where the difference is visible**:

1. **A provenanced corpus.** Competitors' colour data is, as far as we can tell, copied.
   Ours states its source, its derivation, and who verified it. A professional user can
   check.
2. **Measured accuracy claims.** The category norm is "99% accurate" with no method behind
   it. Publishing a device × mode × illuminant table with mean and p95 ΔE00 is
   differentiating precisely because nobody does it.
3. **CVD as scoring rather than rendering.** Others ship a simulation filter. Scoring
   separation inside the recommendation engine is a different product for the user it names.

## The strategic risk to watch

**A large wardrobe app adds a colour engine.** Whering and ACloset have the users; the
colour work is buildable.

What they cannot buy quickly is the corpus with verified provenance and the discipline of
not overstating accuracy — both of which are slow by construction. That is the moat, and it
only exists while we keep paying for it.

## Update this file

When a competitor ships something material, or when a claim here turns out to be wrong.
Confidence is 0.8 because this is a 2026-08 snapshot of a moving market.
