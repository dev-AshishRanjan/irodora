# ADR-0145: 06's screen is its upper panel, and what it draws wider is fitted to it

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Closes** | OQ-19 |
| **Applies** | R9-MOCKUP-FIDELITY §2 (measurement, snap, intervals tighter than the scale), §3 P1, §6 C19; golden rule 14; [ADR-0139](0139-each-screens-page-inset-is-its-own-mockups-snapped-and-homes-is-xl.md) |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`06` is a spec card. The app bar, sample, names, pill and readout sit in a framed panel 474 px wide
(x 53–527). Callouts occupy the column to its right. The provenance card, the combinations card and
the action bar are drawn 667 px wide (x 51–718), into that column. The inventory recorded them as
overhangs waiting on OQ-19, and `mockup-inventory.mjs` refuses an overhang whose question is closed.
`26`, the same page in Japanese, draws every section inside one 496 px screen.

## Decision

- **D1.** The screen is `06.screen`: 474 px at 0.8101 dp/px, 384 dp.
- **D2.** Every element keeps its drawn scale: type, heights, vertical intervals and insets. The lower
  regions take the screen's width, edge to edge as the readout card. The drawn 0.8 dp edge interval
  is under half of `xs`, so it takes `xs`, which adds 3.2 dp a side (R9 §2).
- **D3.** The provenance art keeps its drawn size (231 px, 187 dp) and its place from the card's top
  (6 px) and trailing edge (12 px). It is the card's backdrop, behind the text, clipped by the card.
- **D4.** The action bar's two actions share the screen's width at their drawn heights, corners, side
  insets (17 and 18 px) and gap (10 px).
- **D5.** *Wearable Combinations* spans the row (C19). Its items keep their size and pitch from the
  leading edge.
- **D6.** The inventory follows. It has no overhangs, and the regions are recorded at their fitted
  boxes, with the drawn boxes in comments.
- **D7. Corners, measured (`corner.ps1`):**
  - The provenance and combinations cards fit 10–10.5 px (8.3 dp): `md`.
  - The readout card is drawn as the frame's lower section — square under the rule, the bezel's
    corner below, which is not design — so it takes its siblings' corner, `md` (§2: siblings drawn
    alike take one step).
  - The two buttons fit 8–9.25 px (6.5–7.5 dp): `sm`.
  - The hero fits 8 px (6.5 dp) and the stacked layer's free corners 7.5 px: `sm`.
- **D8. Intervals the drawing sets tighter than the scale** are named, take `xs`, and their cost is
  recorded. Each is computed by `colour-detail-fidelity.test` from `06.json`, less each text's own
  line inset:

  | interval | drawn ink gap | less the insets | built |
  |---|---|---|---|
  | kana → name | 7.5 dp | ja body 6.8 + body 5.2 | −4.5, so `xs` |
  | kanji → pill | 9.5 dp | the kanji step's own inset | negative, so `xs` (the test computes it from the step) |
  | provenance title → body | 7.5 dp | title 2.2 + label 3.85 | 1.45, so `xs` |
  | body → review | 6.5 dp | label 3.85 + label 3.85 | −1.2, so `xs` |
  | the cards' edges | 0.8 dp | — | `xs` |

  The line boxes the scale sets add further height: the provenance lines pitch 13.4 dp where `label`'s
  box is 21.7, and the captions 12.2 dp where `caption`'s is 15.45. The test computes the page's total.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| The screen is the lower width (667 px, 0.5757 dp/px) | The upper panel becomes 273 dp in a 384 dp screen, every upper element shrinks by 29 %, and the app bar no longer spans the screen |
| Each region at its own scale | Two type scales on one screen: a 19.2 dp heading above, a 13.6 dp one below |
| Clip the lower regions at the screen's edge | Content is lost (E3) |
| The art beside a narrowed text column | A 157 dp text column, or the art shrunk below its drawn size |

## Evidence, and its limits

- **It rests on:** `06.json`'s boxes; the bezel (not design) and the callouts' column; `26`'s
  single-width composition of the same sections; §2's snap; the corner fits.
- **The limits:**
  - The art now overlaps the right of the body text.
  - The page is taller than drawn.
  - Corner fits on a JPEG carry about half a pixel of error.
  - It was not tested with people.

## Consequences

- `06.mjs` loses its overhangs; `06.json` records the fitted boxes.
- R9 §11 and PRD §10 close OQ-19.
- `colour-detail-fidelity.test` holds every interval and its cost.

## Revisit when

- `06` is regenerated at one width.
- The person's comparison finds the overlap or the height wrong.

## Amendment (F-247's review, S2): the art sits beside the words, at its drawn height

D3 put the art behind the provenance text's end. The review measured it: text crossing a stroke reads
**2.65:1 on Sumi, 3.02:1 on Washi, 2.64:1 on Slate and 2.82:1 on Obsidian** (`foreground.2` label over
the art at `opacity.artCard`), against 7.16, 5.98, 6.31 and 7.68 on the card. That fails NFR-8's 4.5:1
wherever a word meets a stroke. No ink the opacity allows fixes it: even the backdrop's 0.15 gives
4.40:1 on Washi and 4.08:1 on Slate.

The same reading found a second problem. The plum branch's own grid is 60 × 52, squarer than `06`'s
crop (231 × 134 px). At 187 dp wide it draws 162 dp tall, which is taller than the card.

- **D3, as amended.**
  - The art keeps its drawn **height** (108.5 dp) and its place: `xs` from the card's top and `sm`
    from its trailing edge.
  - Its width follows the drawing: 125 dp.
  - The words end `xs` short of it. `06` draws them beside the art, 2 px apart, which is under half
    the scale's step.
  - The words' block is at least as tall as the art and its drawn `xs` below, so the card holds it.
  - This is `06`'s own relation between the two, art beside words, which fitting the region had
    undone.
- **The cost.** The text column is 219 dp where `06` draws 324 dp, and the card is taller than drawn.
  `colour-detail-fidelity.test` holds the padding and the height.
- **Rejected:**
  - A lower opacity: it does not reach 4.5:1 in every palette.
  - The art at 187 dp beside a 157 dp column: art kept at the cost of prose.
  - The art below the words: `06` places it at the card's top.
