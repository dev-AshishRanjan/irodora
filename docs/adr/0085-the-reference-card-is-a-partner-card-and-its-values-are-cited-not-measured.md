# ADR-0085 — The reference card is a partner card, and its values are cited rather than measured

## Status

**Accepted** — closes **OQ-3**.

## Date

2026-09-03

## Context

**FR-16** is calibrated scan: correcting a camera against a physical reference card so a capture
can be called `calibrated` rather than `estimated`. **NFR-2** is the accuracy claim that
correction is supposed to substantiate. Both run through **F-053**, which has been `blocked` since
it was filed, and **F-063** behind it.

The question — *manufacture or partner?* — is not an implementation detail. It decides **whose
published values the correction solves against**, and therefore:

- **the golden dataset.** A correction is a fit against reference values. Ours or theirs.
- **the provenance.** [ADR-0005](0005-measurement-provenance-is-a-type.md) puts provenance in the
  type; `content/AGENTS.md` requires a source, a licence and a rights holder for every published
  value. A card we manufacture makes **us** the source.
- **the patch layout and count**, which the scan's own geometry depends on.

Code written against a guess at either would be deleted.

There is a second constraint the repository has been consistent about. Golden rule 11: *never
overstate accuracy*. A reference value is a measurement of a physical artefact under a stated
illuminant, and this product has no spectrophotometer, no measurement protocol and no controlled
lighting. **Manufacturing means becoming the authority on a physical standard**, which is a
larger claim than anything else in the corpus.

## Decision

**A partner card.** The reference is a commercially published colour target — the
**ColorChecker Classic 24-patch** family is the intended class — used with **its own vendor's
published reference values**.

Three obligations follow, and F-053 owes all three:

1. **The values are cited, never measured by us.** They enter `content/` as a published dataset
   with a source, a publisher, a stated illuminant and observer, and a licence — the same
   provenance every corpus entry carries. `source` is `reference`.
2. **The exact card, its published values and their licence must be confirmed from the vendor's
   own documentation before any value is committed.** This ADR does **not** record what those
   values or terms are. Stating them from memory would be exactly the fabricated-provenance
   failure the product exists to avoid, in the one place it would be least forgivable.
3. **If the licence does not permit redistributing the values**, they are not vendored. The
   correction then reads them from a file the user supplies for their own card, and that
   limitation is recorded rather than worked around.

## Consequences

**Good** — the golden dataset is somebody else's published measurement, so the accuracy claim
rests on a citable source rather than on our own equipment. It is the same argument the corpus
already makes, applied to a physical standard. The patch layout is documented and stable, so
F-053 can be written against a known geometry. And a person who already owns one of these cards —
the common case for anybody who cares about colour accuracy — can use it.

**Bad** — **a dependency on a third party** for the values a headline accuracy claim rests on: if
they change the published data or its terms, our claim moves with it. **A cost to the user**, who
must buy a card, which makes calibrated scan a feature most people will never use. And **the
licence may forbid redistribution**, in which case obligation 3 fires and the feature ships
weaker than the ideal — carrying values the user supplies rather than values we vendor.

**Neutral** — this settles nothing about the measurement session. NFR-2's *"mean ΔE00 improves by
50 % or more against uncalibrated on the device matrix"* is already `attested` and outstanding on
F-053, and F-063 is the session that discharges it. **Closing OQ-3 unblocks the code, not the
claim.**

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Manufacture our own card** | Full control of patch layout and count, no third-party licence, and no cost to the user beyond what we charge. It makes us the authority on a physical colour standard: the values become ours to measure, publish and defend, and we have no spectrophotometer, no controlled illumination and no measurement protocol. Golden rule 11 makes that a claim we cannot currently support, and building the capability to support it is a different project from a colour app. |
| **Support both** | The eventual right answer if a manufactured card ever ships, and it costs nothing to leave the door open — the correction takes reference values, not a brand. Deciding it now would mean designing for a card that does not exist, and the layout question OQ-3 asks would still be unanswered for one of the two. |
| **Screen-displayed reference instead of a card** | No purchase, no licence, available to everybody. A screen is an emissive source of unknown calibration showing colours through an unknown transfer function — it is the thing being corrected, not a reference for correcting it. |
| **Leave OQ-3 open and close R5 without F-053** | Honest, and it was a real option: the two features would stay `blocked` and NFR-2 would stay explicitly unsubstantiated. Rejected because the question had been open across the whole of R5 and a decision deferred indefinitely is a decision to drop the feature without saying so. |

## Revisit when

**When the vendor's licence is actually read** (obligation 2). If it forbids redistributing the
reference values, obligation 3 changes what F-053 ships and this ADR gets a successor recording
what was found rather than what was expected.

**If a manufactured card is ever produced** — for a kit, or because a partner's terms become
unworkable. The correction is written against reference values rather than a brand, so the
successor would be about provenance and layout, not about the maths.
