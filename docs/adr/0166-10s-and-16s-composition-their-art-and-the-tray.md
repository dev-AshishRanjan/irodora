# ADR-0166: 10's and 16's composition, their art and the tray

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-02 · **Feature** F-251 |
| **Applies** | R9 §2, §5, C1, C8, C11; ADR-0110, ADR-0113, ADR-0116, ADR-0118, ADR-0121, ADR-0139, ADR-0153 (glyph.lock); the lessons on ink gaps, card edges, rounded dp, sizes from the tree, text over art and targets inside parents |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Decision
- **D1. Intervals.** The plan's tables, snapped. The eight named intervals and their costs.
- **D2. Insets.** 10 is `md`; 16 is `xl`.
- **D3. Sizes from the tree.** 10's layer cells are a quarter of the row each; 16's slots are half the content width;
  both are read from the tree at 320, 360 and 384.
- **D4. 10's bar.** One `tonal`/`strong` action. In Washi `border.strong` is the ink colour (P4); its ink is a declared
  gate-9 pairing.
- **D5. 16's bottom chrome.** `scroll={false} bleed`; the tray fixed above the action bar; the action bar with no rule.
- **D6. The tray.** Peek | divider | ‹ | seven | › | divider | peek. Tiles are `Swatch`es with `Tategaki` kanji in the
  sample's ink; the chosen tile takes `SelectionFrame`; the chevrons' targets lie inside the tray.
- **D7. Art.** 10: `leaves` at `opacity.art`, behind the cards. 16: `kimono` left and `sashiko` twice on the
  right. 16's lower right drawing is a basket weave clipped to a circle; the product's `sashiko` stands for
  it, a difference the person's comparison lists (a new drawing is F-229's kind of work, not this
  feature's). No word sits on a stroke.
- **D8.** 16's next card is not design. 01's tab bar sits under both screens (E4).
- **D9. What increment 1 read** (`10.mjs` and `16.mjs`'s headers):
  - every corner on both screens is `sm` — the cards (7.1–8.1 dp on 10, 4.5–5.25 on 16), 10's band,
    layers and buttons, 16's matrix, samples and buttons; F-220 recorded `md` for 10's cards, band and
    layers and 16's matrix. The badges and tags are pills;
  - the small type on both is `caption` (10.3–11.6 dp an em); the titles and card titles `body` (10)
    and `label` (16); 10's export button `label`;
  - the chosen segment and every badge and tag fill level 3;
  - **the tray's tiles are drawn whole**: 16 darkens each tile's lower half about 15 % to hold the kanji,
    and a darkened part of a sample is not the colour (rule 12; as 12's woven texture, §4 E1). Their
    widths vary 60–81 px with their sample names: siblings, one width;
  - three of 10's container boxes read 1–6 px tighter at their edges than F-220's (the segmented
    control, Create, the band) — a method's difference, not a shadow; they are kept as F-220 read them,
    because the segmented control and the action bar feed shared medians read one way across every
    screen (ADR-0161 D8's rule; F-282). `BAND_HEIGHT` is 60.

## Evidence, and its limits
Increment 1's readings; a JPEG reading carries ΔE00 ≈ 2. The person's comparison judges the result.
