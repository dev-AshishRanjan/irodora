# ADR-0172: 19's composition

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-04 · **Feature** F-252 |
| **Applies** | R9 §2 (framed, 0.6124 dp/px), §5, C1, C8, C11; ADR-0113, ADR-0116, ADR-0118, ADR-0121, ADR-0133, ADR-0139, ADR-0161 D8; F-233's anchor; F-235's `HARMONY_ROW` |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Decision
- **D1. Intervals.** F-252's plan's table, snapped at 0.6124 dp per px. Three intervals are named because
  the line insets make them tighter than the scale's smallest step:
  - name → OKLCh, `xs`, +6.9 dp over the drawing;
  - OKLCh → slot line, `xs`, +3.7 dp;
  - a row's name → detail, `xs`, +5.1 dp a row.

  (The plan estimated +8.3 and +6.4 with the anchor's lines at body; increment 1 read them at label.)
- **D2. Insets.** The page `sm`; the headings `md` from the screen's edge; the ring `md` inside its card.
  The card → the rows heading is `lg`: 24.5 dp less the label's line inset, 20.65 dp.
- **D2a. The ring's corner** is concentric with the sample's (6 + 3.8 + 2.3 = 12.1 dp, where 19 draws
  about 9.8): the sample's drawn 2.4 dp is under `sm`, the smallest step. The ring's 3.8 dp gap is a
  drawn figure, declared off the spacing scale, not spacing.
- **D3. The anchor card.** The ring at `ANCHOR_RING` (F-233's ring and gap); the sample at
  `ANCHOR_SAMPLE`, no keyline, its corner `sm`; the three lines centred on the ring.
- **D4. The rows.** `RankedRow form="harmony"` at `HARMONY_ROW`. The name wraps. The sample's corner is
  `sm`. The gap between rows is `sm`. One `Arrival` over the rows, each `Appear` indexed in reading order.
- **D5. Type.** Re-measured in increment 1:
  - **body:** the title, back, the anchor's name, the row names and Build;
  - **label:** the two headings, the OKLCh and slot lines, the details and *Wear* (F-220 had body for
    the headings and the anchor's lines).
- **D6. Chrome.**
  - The bar: 48 dp, filled level 1, its divider, no rule.
  - The action bar: filled level 1 and ruled. Build is `tonal` level 3, corner `sm`, with `arrow-right`.
  - 01's tab bar below it (E4, FR-71).
  - No art: 19's leaves lie outside its frame.
- **D7. Heights the scale adds,** estimated (a test tree has no layout):
  - the anchor card about +7 dp, because the ring's insets snap up to `md`;
  - each row about +5 dp;
  - more where words wrap.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Each interval at its drawn dp | Values the scale does not hold (rule 14 reads §2's snap) |
| The anchor's lines at body, as F-220 recorded | Type 2 dp larger than drawn, read from a kanji rather than a capital |

## Evidence, and its limits
Increment 1's readings are in `19.mjs`'s header. A JPEG reading carries about ΔE00 2 in a fill and a pixel
at an edge. The person's comparison judges the result.
