# ADR-0164: 10's and 16's figures and words say what the corpus, the store and the engine hold

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-02 · **Feature** F-251 |
| **Applies** | FR-3, FR-5, FR-6, FR-22, FR-23; R9 §4 E1/E2, §8; ADR-0067, ADR-0124, ADR-0131, ADR-0138 D4, ADR-0142 D5,
ADR-0146, ADR-0151 D4, ADR-0155 D3/D4 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Decision
- **D1. Form and order.** A kasane is form 2; every other category is form 1. Curated palettes are ordered by
  category, then slug. Personal palettes are newest first.
- **D2. Form 1's words.**
  - Title: *en • ja*.
  - Description: *‹category› palette. ‹classification label›.* (FR-23's displayed field); `studio.origin` for a
    personal palette.
  - Provenance: *Provenance: ‹source type›, ‹reviewLine›*.
  - The band at the record's weights; four columns a row.
- **D3. The badges.**
  - *WCAG ‹threshold› ‹floored ratio›:1* over the anchor and the first light member by rank (none without a light).
  - *CVD ‹n›% Separation (Machado 2009[, approximate])*, n = floor of the worst pair over three deficiencies at
    severity 1 (`worstSeparation`, E-005). It prints 100 only when it is 100.
- **D4. Form 2.**
  - *Curated Palette* / *Your Palette*.
  - The record's name; *Kasane no Irome:* dropped (FR-23, C14).
  - *Kasane-inspired Layering*.
  - The classification label, or *Made by you, on this device* (ADR-0067).
- **D5. Role words.** Three maps, each surface's own: 10's columns, 16's headings, 16's roles. They are role names,
  not measurements.
- **D6. 16's matrix.**
  - *Contrast Ratio (Slot 1 vs 2)*: `contrastLine`.
  - *Colour Harmony*: 07's warm–cool words.
  - *CVD Distinction*: `separationLine`.
  - *Choose two colours* under two.
- **D7. Type chips.** *Wardrobe Capsule* → contemporary; *Seasonal Kasane* → kasane; *Editorial* → **Seasonal**
  (seasonal), an E2 row: *Editorial* would present a person's palette as editorial work. Traditional is never offered.
- **D8. Titles.** ja `studio.title` = 配色工房 (10's run); en *Palette Studio • 配色工房*; in Japanese the run is not
  drawn (the OQ-48 interim). 16: *Create Custom Palette*, or *Edit Custom Palette* when editing.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| A schema `description` field | A content and schema change for one slot; every palette re-authored |
| The highest-contrast pair for the badge | Disagrees with 16's "Slot 1 vs 2"; two definitions for one figure |
| Round the separation, as 07 does | Can print 100 when it is not (rule 11) |
| FR-22's prose order | Content order written in code |
| Map *Editorial* to *traditional* | Presents a person's palette as traditional (FR-23) |

## Evidence, and its limits
Census (corpus 2026.08.1, the 13 palettes): the contrast badge reads 16.66:1 (*Quiet Neutrals*), 12.04,
11.90, 11.49 and 9.01 — every system *Text AAA* — and on the kasanes 4.54 (*Text AA*), 3.15 (*Non-Text*),
1.81, 1.73 and 1.22 (*Under 3:1*); three kasanes hold no light member (*kinshu*, *mebuki*, *shimo-sugi*)
and so no badge. The separation badge floors to 9 (*Seasonal*), 18, 18, 27 and 41 on the systems and 20
to 100 on the kasanes; 16 colour pairs in the corpus have a worst separation between 99.5 and 100, which
07's rounding prints as 100 (F-357 filed). Every palette's rank 1 is its anchor. The ja words are unreviewed by a competent speaker (ADR-0060); F-265 carries them.
