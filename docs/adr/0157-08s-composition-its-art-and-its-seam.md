# ADR-0157: 08's composition, its art and its seam

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-27 |
| **Feature** | F-249 |
| **Applies** | R9 §2, §5, C20; [ADR-0113](0113-the-type-scale-is-board-00s-four-steps-and-a-measured-caption-and-off-scale-type-snaps.md), [ADR-0116](0116-text-on-a-sample-and-a-samples-edge-move-the-e3-way-per-sample.md), [ADR-0121](0121-type-drawn-off-the-scale-takes-its-step-within-4-dp-and-a-measured-step-beyond.md); the lessons on ink gaps, rounded dp and text over art |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`08` is full-bleed at 2 px per dp. F-249 re-measured every box, type size, weight, corner and ink
(the readings are in `08.mjs`'s header, each repeatable with the `.ps1` tools). Four of F-220's
records did not survive the measurement:

- **The type is a step smaller than recorded.** The title's capitals ink 20 px (13.7 dp an em: its
  advance agrees), not the 30 px box F-220 read as capitals. The names ink 13.7–14.4 dp: `label`,
  not `body`. Every other text inks 8.9–11.6 dp an em: `caption`, the step every em below 12 dp takes
  (ADR-0113) — both tables, the meta lines, the card titles and every button label.
- **The samples draw no keyline.** Each sample's edge is a 1 px ring a few levels above the sample
  inside and below the card outside: the sharpening halo every edge in `08` carries. A README keyline
  would lighten two pixels by about 20 levels.
- **The seam is the border's ink, not the keyline's**, and it runs the card's whole height.
- **The action bar** starts at its rule, 9 px lower than recorded, and its two buttons are one height.

## Decision

- **D1. Intervals**, from `08.json`, each text's line inset subtracted, snapped by §2:

  | interval | drawn (dp, less inset) | built |
  |---|---|---|
  | app bar (to its rule) | 46.5 | `COMPARE_APP_BAR` 46.5 |
  | bar's back / glyph insets | 17.5 / 18.5 | `md` |
  | rule → pair card (the leaked heading's space kept) | 42 | `xxl` |
  | page insets | 17 | `md` |
  | pair card → sample (top, sides); sample → seam | 11–12 | `sm` (12 is a tie: the smaller) |
  | sample → name | 8.15 | `sm` |
  | **name → meta** | **1.575** | **`xs`, named**: below half the scale's smallest step; built 2.4 dp looser than drawn |
  | meta → *Change* | 10.9 | `sm` |
  | *Change* → card foot | 11.5 | `sm` |
  | pair card → the two cards (the leaked caption's space kept) | 32 | `xl` |
  | card ↔ card | 11.5 | `sm` |
  | card → title (top) | 11.4 | `sm` |
  | card → content (sides) | rules 12, 12.5, 12, 12.5 | `sm`: two each side of the midpoint, so the smaller (§2); a title's ink starts after its side bearing |
  | title → first rule | 7.9 / 5.4 | `xs`: siblings drawn alike take one step, the smaller |
  | last text → card foot | 11.9 / 10.9 | `sm` |
  | cards → bar rule | 12.5 | `md` |
  | bar rule → buttons; buttons → bar foot; bar sides | 17, 17.5, 16.5 | `md` |
  | *PDF* ↔ *Studio* | 8.5 | `sm` |
  | *Change*; the two actions | 27; 30.5 | `CHANGE` 27; `ACTION` 30.5 |

  The table rows keep `08`'s pitch through the ruled form's padding, recomputed for caption lines.
- **D2. Heights.** The samples build 8 dp larger than drawn (159.5 at 384: the 12 dp ties at `sm`),
  so the pair card is about as tall as drawn (the ties take back what the samples add). The cards
  build taller than drawn — a caption line is 15.45 dp where `08` pitches its lines at 12–14, and
  the honest words are longer than the drawn ones (*(Machado 2009)* for *(Safe)*; *towards ‹term›*):
  the metrics card about 15–40 dp, the access card about 20–65. The page scrolls under its pinned
  bar. A test tree has no layout, so the capture shows the heights.
- **D3. Corners, keyline and seam.**
  - Every corner reads 5.1–7.5 dp: the cards, the samples, the *Change* buttons and both actions are
    `sm` (md is 10, the midpoint 8).
  - The samples bind no keyline: each carries the line a sample that binds none carries, only where it
    would otherwise lose its edge (ADR-0116, OQ-46's interim, unchanged). C20 does not apply to `08`.
  - The seam is 1 dp of `border.subtle` (`#373B43` read, the cards' edges `#383D44`), the card's whole
    height, inside the card only. The pair sits in the card's media slot, so the seam meets both
    edges as drawn. Its 18 px below the card is the leader to the leaked caption (§2).
- **D4. Type steps and weights**, read by stem runs and by one glyph's ink coverage against the same
  glyph elsewhere:
  - the title and the back word: `label` 500; the names: `label` 400;
  - the card titles: `caption` 600 (their *e* covers 31 % more than a 400 *e*);
  - the table labels and notations: `caption` 400; the values: `caption` 500, tabular; readings,
    formula, the APCA note and the meta lines: `caption` 400 in the secondary ink;
  - the WCAG value: `caption` 500, its words in the figure's ink as drawn; a separation value: its
    figure at 500 in the primary ink, its words at 400 in the secondary;
  - the *Change* labels and both actions: `caption` 500 (board `00`'s button weight).
- **D5. The art.** Three `plum-branch` fragments in an art layer behind the opaque cards, placed and
  clipped as `01`'s (`HOME_ART`), each sized by the dimension `08` measures and checked against its
  box. `08`'s art inks p90 0.126–0.131 of the foreground over the ground: the backdrop's
  `opacity.art` (0.15). No word sits on a stroke.
- **D6. ΔEok's *ok*** is drawn lowered: its foot 2–3 px under the *E*'s baseline, at about the
  label's own size. Built as a lowered run after the label (`RuledRow.subscript`), dropped 1.25 dp.
- **D7. The action bar** starts at its rule, over the page's own ground; the tab bar stays under it
  (E4).

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| Keep F-220's `label` and `body` for the tables and names | Type a step larger than `08` draws, every card about 60–100 dp taller |
| Draw the README keyline round the samples | A line `08` does not draw (OQ-46 asks whether the product's promise should add one; until it is answered the shipped guarantee stands) |
| The seam in the keyline's ink | A lighter line than the one `08` draws in the border's ink |
| Card insets at `md` | Two of the four rule ends read under the midpoint; `md` would build 3.5–4 dp looser on every side |

## Evidence, and its limits

`08.json` and F-249's readings. A JPEG reading carries about ΔE00 2 of noise and a pixel of edge; the
weights rest on stems two and three pixels wide. The person's comparison of the capture judges the
result.
