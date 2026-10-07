# ADR-0124 — Every printed figure is a defined computation, and none of them is a match

| | |
|---|---|
| **Status** | Accepted — closes OQ-9 |
| **Date** | 2026-10-07 |
| **Feature** | F-222 |
| **Applies** | R9-MOCKUP-FIDELITY §4 E2 and §8; golden rules 11 and 14; FR-7, FR-16, FR-29, FR-32, FR-42, FR-52, FR-74; [ADR-0031](0031-measurement-claims-policy.md), [ADR-0048](0048-similarity-percentage-is-a-stated-scale.md), [ADR-0072](0072-a-guided-profile-is-forced-choices-and-confidence-is-agreement.md) |
| **Decided on** | The person's delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

R9 §8 audits every figure the mockups print against the computation behind it. OQ-9 held four that
have none: the percentage beside each ΔE00 on `03`, the verdict after the outfit score on `13`, the
garment history line on `23`, and *Wardrobe Pairings* on `22`. §8 also marks three figures F-222 must
define without a question: `22`'s *Gaps Addressed*, `04`'s and `08`'s descriptor bands (ADR-0125),
and one display format for a reading's confidence (`03`, `27`).

Golden rule 14 keeps every slot, position and style a mockup draws. Golden rule 11, FR-7 and FR-74
forbid a word that asserts a match or an identity, and the claims lint (F-219) refuses the drawn
constructions (`packages/testing/fixtures/claims/drawn.md`). Where the two meet, §4 E2 is the rule:
the element keeps its shape, and its wording or value comes from a defined computation.

## Decision

1. **`03`, the percentage beside each ΔE00, is the similarity percentage FR-7 already asks for.**
   `similarityPercent(ΔE00) = 100 × 2^(−ΔE00/10)`, the stated scale of ADR-0048, already on every
   ranked candidate. It is printed floored, as an integer, followed by *Similar* (ja: 類似度 before
   the figure) — so 100 appears only at a ΔE00 indistinguishable from zero (below 1.5 × 10⁻¹⁰, inside
   the floor's 10⁻⁹ guard). Only the word that made it a match changes.
2. **`13`, the verdict after the overall score, says whether the outfit counts.**
   `countsAsOutfit(overall, threshold = COVERAGE_THRESHOLD)` is `overall >= threshold`, the very
   predicate `coverage()` counts valid outfits with (FR-42), shared rather than copied. The label is
   *Valid Outfit (≥ 60)* or *Not Counted (under 60)* (ja: 有効なコーデ（60以上） / 対象外（60未満）),
   the figure read from the constant. It states which side of a published threshold the score is on;
   it judges nothing, and takes no status colour.
3. **`23`, the garment history, is a profile concordance.** `profileConcordance(profile, colours,
   rules)` scores each owned garment's colour with FR-29's `scoreColor` and counts it concordant at
   `COMPONENT_SUPPORTS_ABOVE` (66), the score at which the outfit's personal-fit component already
   reads *supports*. The line prints *N garments profiled · X% concordance*, X floored; it is `null`,
   never 0 %, when the wardrobe is empty or the profile carries no evidence. **The title's word
   *Calibration* does not ship**: in this product *calibrated* is a provenance level (FR-16,
   ADR-0031 §1), and nothing about garments calibrates a profile. **Nor does *History***: the figure
   is the wardrobe as it is now, and the product keeps no history of it. The title reads *Garment
   Concordance* (ja: 手持ちの服の適合度), and the Japanese detail 28着のうち94%がプロフィールに適合
   avoids 照合, which can read as verification.
4. **`22`, *Wardrobe Pairings*, counts the owned garments the candidate pairs with.**
   `wardrobePairings(after, candidateId)` lists every owned garment that forms at least one valid
   outfit with the candidate, by outfits shared; the figure is its length, `null` where the shopping
   check has no answer. The drawn detail words stay: in the clothing sense, backed by the valid-outfit
   threshold, they are honest copy the claims lint already holds.
5. **`22`, *Gaps Addressed*, counts regions, not names.** `gapsAddressedBy(candidate, wardrobe,
   lexicon, context)` is the regions `gaps(wardrobe)` reports and `gaps([...wardrobe, candidate])` does
   not, keyed by slot, lightness range and chroma range. The published lexicon names one region under
   several terms, and a garment can open new gaps, so a difference of list lengths is wrong both ways.
   `gaps()` names near-neutral regions only, so a vivid candidate fills none — an answer.
   **Its ceiling, stated:** with today's lexicon a slot has three lightness ranges and ONE
   near-neutral chroma range (*grey* and *neutral* share it), so a candidate fills at most one region
   — two only exactly on a lightness boundary — and the figure is 0 or 1. `22`'s drawn candidate
   (chroma 0.04, just past `NEUTRAL_CHROMA`) and its drawn *mid-tone green* gap are outside what
   `gaps()` names, so the drawn case reads 0; the drawn detail is sample content (E1), and F-258 states
   the zero state. Hue-bearing gaps are F-318.
6. **A reading's confidence has one display format.** `confidencePercent(c) = ⌊100c + 10⁻⁹⌋` (the
   guard term because float64 holds 0.57 × 100 as 56.99999999999999), printed *95% Confidence* (ja:
   信頼度95%), with what it means beside it: a ceiling set by the light, the capture and the colour
   space — not the chance that the colour is right (`provenance.ts`: *"not a probability"*). Every
   rendering of a provenance confidence goes through it, and a test refuses a second format.

## Consequences

**Good**

- Every figure the mockups print in these slots has a formula, a test and a decoy, and none of them
  is a new scale: each reuses a definition the product already ships (ADR-0048, FR-29, FR-42) or a
  computation on existing functions.
- The screens' features (F-236, F-244, F-245, F-249, F-257, F-258, F-260) read one definition each,
  instead of deciding the same figure apart.

**Bad**

- **Three words a person will see differ from the drawings**: *Similar* for 03's drawn word,
  `13`'s label, and `23`'s title (*Garment Concordance* for the drawn *Garment Calibration
  History*). Each is forced (rule 11, FR-7, the claims gate, FR-16, and a history the product does not
  keep) and listed in R9 §4 E2. `23`'s drawn history icon stays, as the element's shape does.
- **`22`'s pairings detail keeps *Matches owned garments*** though this ADR's title says no figure is
  a match: the words are the clothing sense of *goes with*, backed by the valid-outfit threshold, and
  the claims lint holds them as honest copy (`near-misses.md`). The figure beside them is a count.
- *Valid Outfit* can still be read as praise, and *concordance* as validation of the profile. The
  threshold is printed beside the first, and the second states what it counts; F-037 (validating the
  profile against people) is not done, and nothing here claims it.
- *100% Confidence* appears for a clean daylight capture in sRGB. It is honest by definition — the
  value is a ceiling — and the meaning line says so; whether a camera estimate's ceiling should ever
  reach 1 is F-063's question.

**Neutral**

- `09`'s three slider readings were bound to F-222 and are not in §8: they are F-250's, and their
  bindings say so.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| `03`: the ΔE00 band word in the slot | No percentage at all | Turns a drawn figure into a word and repeats the ΔE00 beside it |
| `03`: the reading's confidence | A percentage the reading has | A property of the reading, so three rows would print one number |
| `13`: a banding of the score into quality words | Reads like the drawing | The verdict class F-219 bans, and it lets the overall stand in for the components (FR-32) |
| `13`: the harmony relationship's name | A real engine output | `scoreOutfit` classifies no relationship; the lint refuses a relationship name after a score |
| `23`: the guided run's agreement (ADR-0072) | An existing figure | Repeats the confidence notes drawn above it, is not about garments, and is not stored |
| `23`: a calibration accuracy | What *Calibration* suggests | An accuracy figure with no device-lab row behind it (ADR-0031 §3) |
| `22`: the outfits count for *Pairings* | Defined | Already printed in the tile beside it |
| Leave a slot out | Nothing to define | A defined figure fits each slot, so rule 14 keeps it |

## Revisit when

- A mockup draws one of these figures differently, or a new figure §8 cannot bind.
- F-037 validates the profile against people, which would let *concordance* say more.
- FR-42's threshold or ADR-0048's half-life changes: both figures move with it, by construction.

## Implemented in

- [`countsAsOutfit`, `gapsAddressedBy`, `wardrobePairings`](../../packages/optimization/src/coverage.ts) and their [tests](../../packages/optimization/test/shopping-figures.test.ts)
- [`profileConcordance`](../../packages/recommendation/src/concordance.ts) and its [tests](../../packages/recommendation/test/concordance.test.ts)
- [`confidenceText`](../../packages/ui/src/percent.ts), its [tests](../../packages/ui/test/percent.test.tsx) and the app's [guard](../../apps/mobile/test/confidence-format.test.ts)
