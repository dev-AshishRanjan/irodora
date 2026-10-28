# ADR-0161: 09's composition, its art and its result cards

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-27 |
| **Feature** | F-250 |
| **Applies** | R9 §2, §5, C1, C8; [ADR-0113](0113-the-type-scale-is-board-00s-four-steps-and-a-measured-caption-and-off-scale-type-snaps.md), [ADR-0116](0116-text-on-a-sample-and-a-samples-edge-move-the-e3-way-per-sample.md), [ADR-0121](0121-type-drawn-off-the-scale-takes-its-step-within-4-dp-and-a-measured-step-beyond.md), [ADR-0139](0139-each-screens-page-inset-is-its-own-mockups-snapped-and-homes-is-xl.md), [ADR-0157](0157-08s-composition-its-art-and-its-seam.md) (the art layer); the lessons on ink gaps, rounded dp and text over art |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`09` is full-bleed at 2 px per dp. F-250 re-measured every box, type size, corner, fill and ink (the
readings are in `09.mjs`'s header, each repeatable with the `.ps1` tools). F-220's record did not
survive the measurement in six places:

- **The title is `body`, not `title`.** Its capitals ink 25 px (17.1 dp an em); F-220 read the
  kanji's 31 px as capitals. Back's and Clear's words are `body` too, and so is each card's English
  line (three of four ink 15.1 dp an em).
- **Both cards' corners are `sm`.** Eight corner fits give a median of 16.0 px — 8.0 dp, the sm/md
  midpoint, so the smaller — and a mean of 15.6 px. The result cards are `md` (8.6–9.6 dp).
- **The chips are rounded rectangles in level 3, unedged.** Their edge fits r ≈ 20 px with a straight
  run between the arcs, so `md`, not a pill; their fill is #323840 (level 3 is #323742). None is
  drawn chosen.
- **The field is bare:** neither filled nor outlined, its words on the card.
- **The bar draws no rule.** It is 116 px, symmetric about its controls.
- **The art runs to 518 px**, down the right margin past the sliders' title, and sits on the ground
  only: inside both cards the fill is flat to ±1 luma.

## Decision

- **D1. Intervals,** from `09.json`, each text's line inset subtracted, snapped by §2
  (`finder-fidelity.test` recomputes every row from the pixels):

  | interval | drawn dp | less | built | step |
  |---|---|---|---|---|
  | the bar | 58 | — | — | `FINDER_APP_BAR` 58 |
  | bar foot → query card (the leaked heading's space kept, F-246's rule) | 25 | — | 25 | `lg` |
  | page inset (both cards, the grid) | 14.5 / 14 | — | — | `md` |
  | query card → the field's words, top | 16 | 5.2 | 10.8 | `sm` |
  | card → field and chips, leading · ⊗ → card, trailing | 17.5 | — | — | `md` |
  | the field's words → chips | 11.5 | 5.2 | 6.3 | `sm` |
  | chip ↔ chip | 6.5 | — | — | `sm` |
  | chips → card foot (the card to its edge, review S1) | 17 | — | — | `md` |
  | query card → sliders title (review S1) | 26.5 | 5.2 | 21.3 | `lg` |
  | **sliders title → sliders card** | 5 | 5.2 | **−0.2** | **named: `xs`, 4.2 dp over the drawing** |
  | sliders card → first row | 31.5 | 3.85 | 27.65 | `lg` |
  | row → row | 20 / 21 | 7.7 | 12.3 / 13.3 | `md` |
  | last row → card foot | 17 | 3.85 | 13.15 | `md` |
  | card → label, leading | 12 | — | — | `sm` (the tie) |
  | label → track · track → value · value → card | 7.5 · 8 · 10.5 | — | — | `sm` |
  | sliders card → results heading | 23.5 | 5.2 | 18.3 | `md` |
  | heading → cards | 8 | 5.2 | 2.8 | `xs` |
  | column gap · row gap | 12 · 11.5 | — | — | `sm` |
  | card → name, top | 15 | 5.2 | 9.8 | `sm` |
  | card → words, leading | 15 | — | — | `md` |
  | **name → English** | 7 | 10.4 | **−3.4** | **named: `xs`, 7.4 dp over the drawing** |
  | English → distance | 12 | 9.05 | 2.95 | `xs` |
  | **distance → OKLCh** | 8.5 | 7.7 | **0.8** | **named: `xs`, 3.2 dp over the drawing** |
  | last line → card foot | 15 / 14.5 | 3.85 | 11.15 / 10.65 | `sm` |

- **D2. The result cells.**
  - Each is half the row, read from the tree: 172 dp at 384.
  - Each is at least `RESULT_HEIGHT`, 108 dp (`09` draws 108 and 110.5, two each; the tie takes the
    smaller), and grows with its words; a row shares its taller card's height.
  - One form is drawn: `09` breaks card 3's and card 4's names after the kanji (card 3's would fit)
    and card 2's distance after the bullet (card 1's line of the same length does not break) — where
    its sample names broke, not a second design. The name and the distance are each one paragraph
    that wraps where it must.
  - **The cost, estimated** (a test tree has no layout; the capture shows it): with the scale's line
    heights and the named intervals, the nearest card builds about 124 dp in English and 136 in
    Japanese, against 108 drawn; a card without the OKLCh line about 99, so 108; a card whose name or
    English wraps one line taller.
- **D3. Corners, fills, edges and type,** as measured: both cards level 1, `sm`, edged
  `border.subtle`; the result cards `md`, no keyline (the shipped guarantee for an element that binds
  none stands, OQ-46's interim); the chips level 3, `md`, unedged, `label`; the field bare, `body`;
  the title `body` 600; back and Clear `body`; the sliders' labels and values `label`, the values
  secondary; the headings `body` 500; on each card the name `body` 500, the English `body`, the
  distance and the OKLCh `label`, every line in the card's one ink (C8, ADR-0116).
- **D4. The glyphs,** by `06`'s rule (size = (ink − `size.iconStroke`) × 24 ÷ the path's extent):
  the back arrow inks 15 × 12.5 dp over a 15.5 × 12 unit path — 20.7 and 21.7, so 21; Clear's ×
  inks 12 dp over 11 units — 22.5; the field's disc, a solid of 20 units, inks 16 dp at half luma — 19
  (review M4: the 35 px box held the sharpening ring). The chips are 23.5 dp tall (`MODE_CHIP`). Each
  line glyph's ink is recorded in `09.json` (`raw.glyphWPx`, `glyphHPx`), and the test reads it.
- **D5. The slider row:** label · track (flexes, with a minimum width) · value (wraps in its column).
  The row is top-aligned and its track sits in a box one label line tall (review S4), so a value that
  wraps grows the row downward and the thumb under a finger never moves. **The cost:** a reading that
  wraps — *Grey / Neutral / Muted / Soft* at chroma 0.020–0.039 in English, more at larger text —
  lengthens the sliders card by a line, and the results heading and the cards move down with it as the
  point crosses into or out of that reading (ADR-0160 records F-151 criterion 3 superseded in part).
  Reserving the worst case would draw every row a line taller than `09` does in every state.
- **D5a. The query card's targets (review S2):** Android delivers no touch outside a view's parent. The
  card's body reaches into the card's own inset above and at its trailing side (negative margins given
  back as padding; nothing drawn moves), the field takes only that room — `sm` — above its words and
  the rest of its target below them, and the clear's target ends inside the body. A 48 dp target on a
  26.4 dp line set `sm` from its card's edge cannot be centred on the line and stay inside the card;
  the part below overlaps the chips' row by under 6 dp, where the chips, drawn after, take the touch.
- **D6. The art:** one `leaves` fragment at `opacity.art` (the strokes ink p90 0.101–0.106 of the
  foreground over the ground), in the list's art layer, first and behind everything, under the
  opaque cards and clipped there (`08`'s form, ADR-0157). The drawing is scaled to the strokes'
  height (211 dp, 52.75 wide) and set flush with the screen's right edge, where `09`'s strokes run
  off it. **The cost:** the strokes above the bar's foot (48.5–58 dp, the leaves' tips) are clipped,
  and the product's drawing is a single stem 52.75 dp wide where `09`'s spray fans about 110 dp
  (F-229's vocabulary) — both in the person's comparison list (criterion 4). No word sits on a stroke:
  the two headings are the only text on the ground (`finder-fidelity.test` holds every other text in
  an opaque box), and they pass 4.5:1 over a stroke in every palette (the same test).
- **D7. Chrome:** no rule under the bar; `01`'s tab bar (C1); no action bar.
- **D8. One box kept as F-220 read it:** `09.back`'s left edge stays at 31 px. Read at threshold 150
  its first pixel is 32, past a sharpening ring, but `APP_BAR_INSET` is the median of every bar's left
  edge as F-220 read it, ring and all, and this bar was that median. Moving one bar by method alone
  would move every bar's inset by 0.5 dp; reading all seventeen afresh is F-282's.

## Evidence, and its limits

`09.json` and increment 1's readings. A JPEG reading carries about ΔE00 2 in a fill and a pixel in an
edge; three intervals sit within a pixel of a snap's midpoint (field → chips, card → first row, the
label's leading), and the rule decides each. The person's comparison judges the result.
