# ADR-0116 — Text on a sample, and a sample's edge, move the E3 way per sample

| | |
|---|---|
| **Status** | Accepted; two consequences are put to a person as OQ-46 (F-233's review) |
| **Date** | 2026-09-29 |
| **Feature** | F-233 |
| **Applies** | R9-MOCKUP-FIDELITY §4 E3, per sample rather than per theme; [ADR-0111](0111-the-palette-is-the-mockups-and-a-sample-is-judged-against-the-surface-it-sits-on.md) §5's fallback |
| **Supersedes** | the two-tone ring around a `Swatch` (F-068; E-079), once F-233 rebuilds the sample family |

---

## Context

The mockups draw two things against a colour sample, and neither can be checked the usual way.

**The text set on a sample** (`01 07 09 13`, §6 C8). Its elements bind `tokens: {}`, and C8 says
the text takes, per sample, whichever of the two inks passes 4.5:1. Measured over the shipped corpus
(`mockups/tools/sample-census.mjs`, corpus 2026.09.3), **neither ink passes on some mid-tones**:

| palette | entries where neither ink clears 4.5:1 | the best of the two, at worst |
|---|---|---|
| Sumi | 7 of 120 | 4.21 (`yoru-kawa`) |
| Washi | 9 | 4.04 (`yoru-kawa`) |
| Slate | 19 | 3.51 (`fuyu-umi`) |
| Obsidian | 6 | 4.23 (`sabi-do`) |

**The line around a sample.** The README draws one keyline, `swatch.keyline` (`#FFFFFF22` on Sumi,
`#1A1B1E18` on Washi). Since F-068 the product has guaranteed that **a sample of any colour keeps a
perceptible edge**: 3:1, WCAG 1.4.11, asserted over the sRGB gamut by `swatch-edge.test` (the test gate).
The shipped two-tone ring holds it. Board `00` draws that ring, a light outer line and a dark inner
one, in its swatch-wells panel; the screens, which govern how a component looks on their own
surfaces (P3), draw one line (F-233's review corrected an earlier claim that no mockup draws the
ring). The README keyline alone cannot hold it: no single line survives a sample of its own colour (1:1). Over `swatch.well` it clears 3:1
against only 62, 56, 45 and 65 of the 120 corpus colours (Sumi, Washi, Slate, Obsidian).

Both are gate-9 floors that the drawn values fail. E3 already says what happens then: **the token
moves the smallest lightness step that passes on the surface it is drawn on, hue and chroma held.**
The manifest applies that per theme, because a theme's surfaces are known when it is built. A sample
is not known until it is drawn: it is a corpus entry, a garment or a reading.

## Decision

1. **E3 is applied per sample, by one pure function, `onSample`** (`@irodora/design-tokens`). It
   takes the drawn candidates, the sample and the floor:
   - **The best candidate is drawn unmoved if it passes.** For text the candidates are the two inks,
     `foreground` and `inverse.foreground`, which is C8 exactly. For the edge the candidate is the
     keyline as it shows over the well (`paintedOver(swatch.keyline, swatch.well)`, encoded-sRGB
     compositing, the way the platforms blend). Where an element draws no keyline, the candidate is
     the well itself, so a line appears only where the sample would otherwise lose its edge.
   - **Otherwise the smallest move that passes**, by the manifest's own search
     (`smallestLightnessMove`, OKLab, 0.001 steps), over every candidate and both directions. Fewest
     steps wins. An exact tie goes to the smaller ΔE00 from where the move started, then to the
     candidate that contrasted better unmoved, then to lighter. The tie is not hypothetical: Slate's
     keyline against `#506074` takes 298 steps either way, to `#ADB2B8` (ΔE00 32.85) or `#0B0E13`
     (23.58), and loop order alone would have drawn the farther one.
   - **If no lightness move reaches, ADR-0111 §5's freedom, taken E3's way.** Hue held, the
     candidate gives up chroma on §5's grid (fiftieths of its own, down to 0.2), and at the least it
     must give up, the smallest lightness move. More chroma is never tried: it narrows the gamut at
     both ends of the lightness axis, so it only shrinks what a move can reach. This is not §5 as the
     generator runs it (`settleSeparation` ranks a whole grid by ΔE00): that costs 0.6 s per sample
     interpreted, which a render cannot spend, and E3's order — lightness first, the least else — is
     the one a per-sample move owes. It throws rather than return a colour that fails.
   - **Whether a lightness move always exists is a question of reach.** A move holds chroma, so it
     never gets to pure white or black. Every sample luminance is covered exactly when
     √((Y_max + 0.05) / (Y_min + 0.05)) clears the floor over the colours the moves can reach. In the
     four palettes it does (text 4.54–4.56, edge 4.43–4.58), so their samples never need the step
     above. A device palette's inks carry up to C 0.017, and on 222 of its 720 seeds they reach only
     4.46–4.49 for text, so the step is live there. `on-sample.test` computes the reach, and answers
     the sample in every one of the 222 gaps.
2. **The floors are 4.5:1 for text (WCAG 2.2 SC 1.4.3) and 3:1 for the edge**, as
   `ON_SAMPLE_FLOOR`. The edge floor is the product's own guarantee (F-068, ACCESSIBILITY.md §5) at
   SC 1.4.11's ratio, not a WCAG requirement: 1.4.11 exempts a presentation that is essential to the
   information, and a sample's colour is. Both are compared unrounded, as WCAG's Understanding
   documents require.
3. **The keyline replaces the two-tone ring on the sample family** (Decision 3, R, in F-233's plan).
   Among constructions that keep the gamut guarantee, this one draws the README's single line
   everywhere it passes, and moves it only where the floor forces it. A second line beside it (J),
   or keeping the ring, would draw what board `00` draws and no screen does; the screens govern
   their own surfaces (P3).
   - **Its width is each screen's** (P1): about 1 dp on `03`, `20` and `24`, 2.5 dp on `01`'s hero,
     6.9 dp on `06`'s, recorded as `raw.keylinePx` and drawn with `keylineWidth`. **Its value is the
     README's** (P4): the screens draw it light grey, and R9 §6 C20 records the conflict.
   - `swatch.hairline` and `swatch.hairline.inverse` stay for the Lens reticle (E-072) and the export
     card, where the other side of the line is an image or a document nobody re-renders.
4. **A plate or scrim behind the text is rejected.** It is an element no mockup draws, so it is not
   an E3 move; it would be a person's decision.
5. **The moved values go to `F-267`** for a person to confirm, as F-225's decisions A and B did.

## What the rule does to the corpus

Over the 120 corpus colours (`sample-census.mjs`), in steps of 0.001 OKLab L and in ΔE00 from what
is drawn:

| palette | text moves | largest text move | edge moves | largest edge move | none found |
|---|---|---|---|---|---|
| Sumi | 7 | 86 steps, ΔE00 4.15 | 58 | 352 steps, ΔE00 40.28 | 0 |
| Washi | 9 | 104 steps, ΔE00 5.22 | 64 | 527 steps, ΔE00 52.42 | 0 |
| Slate | 19 | 195 steps, ΔE00 12.07 | 75 | 294 steps, ΔE00 32.40 | 0 |
| Obsidian | 6 | 59 steps, ΔE00 2.50 | 55 | 372 steps, ΔE00 41.83 | 0 |

**Where an element draws no keyline** (19, 21, 09, 17, 23, 15 and three of five strips), the line
starts as the well and shows only where it must. It shows on **44 · 57 · 58 · 42** of the 120 corpus
colours (Sumi · Washi · Slate · Obsidian), at most ΔE00 48.42 · 55.86 · 40.54 · 49.99 from the well:
Sumi's `aki-yu` (#722518) gets #858991, Washi's `aka-tsuchi` (#CD9478) #525252. **That is a line
where the mockup draws none.**

**The direction follows the step count, not the drawing.** On the mockups' own hero colour
(#5B6B78 on `01` and `06`), the keyline over the card (#3E4046) fails 3:1 and moves dark, to
#1D1E24 in 135 steps, where `01` and `06` draw a light line; a light line reaching 3:1 is many
more steps away. E3 says the smallest step, and a light line is not the smallest.

The text moves are small. **The edge moves are not**, and that is the honest cost. The README line is
a faint neutral; against a sample near the card's own lightness it has to become a clearly visible
grey to reach 3:1. That is what the floor asks of any single line, and it is the least any single
line can do.

## Consequences

**Good.**
- Text on every sample clears 4.5:1, and every sample keeps a 3:1 edge, in every palette, for any
  colour: `on-sample.test` scans the sRGB gamut on a 0.05 grid and proves the reach for every
  luminance, `swatch-edge.test` measures the edge with its own arithmetic, and gate 9's corpus test
  (F-233) counts the moves over every corpus colour.
- **The line is drawn opaque, as its composite.** How a translucent border blends depends on the
  platform and on where the border is drawn (over the sample on iOS's layer border, mostly over the
  ground on Android's). Drawing the composite takes that difference away. The composite is over the
  well because the line sits around the sample, outside it.
- What the mockup draws is drawn unmoved wherever it passes: the ink C8 names, and the README line.
- One function, one search, and the same checker as the gate. Nothing is typed.

**Bad.**
- **The edge is a visible line on about half the corpus**, where the mockups draw a faint one. It is
  forced by the floor, and it is the smallest line that meets it, but a person may prefer the ring,
  a second line, or a lower floor for the sample's edge. `F-267` carries it.
- **The edge is composited over `swatch.well`.** A sample on a level-2 or level-3 ground is judged
  slightly off. C11 puts every sample on level 1, and the sample family's tests hold that.
- **A move is minimal, so it lands just above the floor.** A colour between two 8-bit codes can fall
  back under it. Every sample this product draws is an 8-bit colour, and the scans quantise to match.
- **The search runs at render.** Interpreted, a lightness move costs about 8 ms and the chroma step
  about 12 ms. The app memoises by (sample, palette). It now computes a colour on Hermes that the
  gate computes on Node, so gate 9's corpus test pins its outputs, and a drift shows there.
- **The line is not held against the card.** Only its contrast with the sample is. A moved line can
  be faint against the well, so it is not a ring and is not described as one.
- **OQ-46, a person's (F-233's review).** The ink half is E3 within the delegation: C8 already names
  it, WCAG 1.4.3 applies and gate 9 enforces it. The edge half rests on the product's own promise
  (ACCESSIBILITY.md §5, "a defined border, so its edges are perceptible against any surface"), which
  WCAG does not require, and it draws **a line where the mockups draw none** (the counts above) and
  **a dark line where `01` and `06` draw a light one**. Keeping a line the drawing lacks is choosing a
  rule over the drawing, which is not the agent's to choose. Until a person answers, the product's
  existing guarantee stands, because it is what shipped and removing it is the change that needs a
  decision.
