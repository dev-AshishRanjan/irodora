# ADR-0169: FR-73's relationship, family, generated-or-curated mark and gamut cost on 19

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-04 · **Feature** F-252 |
| **Answers** | OQ-27 (C18's remainder) |
| **Supersedes in part, on `/atlas/with/[slug]` only** | F-194 c2 (each colour's cost shown), F-194 c3 (the *Generated* label) |
| **Applies** | FR-73, FR-8; `HarmonyFamily` (`kinds.ts`); ADR-0146 D4; golden rule 11 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
FR-73 requires every proposed colour to carry its gamut cost, and each combination its family and
whether it is generated or curated. 19 draws none of the three (C18).

## Decision
- **D1. Relationship:** each row's detail line, as drawn.
- **D2. Family and generated-or-curated are one axis here.** `HarmonyFamily` is `geometric` (generated)
  or `editorial` (curated), so FR-73's two words name it twice.
  - A geometric row names an FR-6 relationship, which the product only ever generates.
  - A curated row reads *Curated ‹intent›* (選定・‹intent›), from the existing `combos.curated` and
    `combos.intent.*`.
- **D3. Gamut cost.** Every proposed colour is a corpus record shown at its own sRGB hex, so its cost is
  the record's own `renderDeltaE00`: 0 for every record in sRGB.
  - The one record outside sRGB carries 06's note — *nearest sRGB rendering, ΔE00 x.xx* — wherever 19
    draws its sample: after the anchor's OKLCh line, or after a row's ΔE00.
  - The note comes from the helper 06 uses, extracted from `detail.ts` (`renderNote`). Rule 11 forces it.
  - A zero cost is not printed: 19 draws no slot for it.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| *Generated* before each geometric relationship | Every drawn line longer; ⇄ the person's |
| A zero cost on every row | An element on every row 19 does not draw |
| The three only in accessible names | FR-73's "states" reaches nobody who looks |
| On 07 after *Wear* | 07 shows an outfit, not the combination's family |

## Evidence, and its limits
- The census (corpus 2026.09.3): one record lies outside sRGB, *fuka-mizu*, with `renderDeltaE00` 0.309
  (printed 0.31 by 06's helper, at two places, as 06 prints it).
- It is a row for 12 anchors (*ame-doro*, *do-ma*, *doro-soko*, *en-yo*, *furu-kawa*, *fuyu-yo*, …), and
  the anchor on its own page.
- The old screen's line *"Every colour here is one this screen can show exactly"* was a card element 19
  does not draw.
