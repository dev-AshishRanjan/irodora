# ADR-0119 — The delta bars share one unit and one ink, and print what `04` prints

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-05 |
| **Feature** | F-235 |
| **Closes** | OQ-50 (the delta bars' scale and inks), OQ-51 (the delta rows' notation) |
| **Applies** | R9-MOCKUP-FIDELITY §4 E2 and E3; §6 C10; golden rules 11, 13 and 14 |
| **Decided on** | the person's delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

Mockup `04` (Lens, against a target) draws, under the proximity headline, three delta rows:
*Lightness*, *Chroma* and *Hue*. Each row has a label, a horizontal bar from an axis at the card's
centre, and a right-aligned signed figure with its reading in brackets: `−0.8 (Slightly Darker)`,
`+0.3 (Slightly Richer)`, `−0.4° (Identical Hue)`. F-235 builds the component (`DeltaBars`), and
two questions came out of measuring it.

**What the bars are scaled by, and what their inks mean (OQ-50).** Measured at 0.7342 dp/px:

- The lightness and chroma bars come to about 120 dp per unit, the hue bar to about 67.5 dp per
  degree. The room is asymmetric: 124.75 dp between the label column and the axis, about 36 dp
  between the axis and the widest figure. The drawn chroma bar (+0.3) already fills the right side
  to within 17 dp of its figure, so at the drawn rate any positive delta past about +0.3 would run
  into the figures. No mockup defines a scale or a clamp.
- Each bar has its own ink: lightness `#566673` (slate), chroma `#5EC382` (green), hue `#89939D`
  (grey). No mockup says what the difference means. Against the dark palette, the hue bar's ink is
  nearest `foreground.3.card` (ΔE00 4.72), the ink `text.tertiary` takes on a card (R9 §4 E3). The
  slate is 2.72:1 on the drawn card (`#1F2126`) and 2.65:1 on `surface.1`, and lies 9.4 ΔE00 from
  the nearest token (`border.strong`). The green is nearest `status.ok` (7.25) and is the
  proximity verdict's green: R9 §6's C10 census listed the chroma bar with the band, the seal and
  the tolerance sheet, followed on the ground that *"the element also carries text or an icon"* —
  which a bar does not.

**Whether the rows name their notation (OQ-51).** `04` prints a bare signed figure. `08` (the compare
instrument) prints the same quantities with their notation under the label — `ΔL*`, `ΔC*`, `ΔH` —
and FR-61 asks for *"the space each was computed in named beside it"* on the professional surfaces.

## Research

- **WCAG 2.2 SC 1.4.11 (Non-text Contrast)** asks 3:1 for the parts of graphics required to
  understand the content; **SC 1.4.1 (Use of Color)** forbids colour as the only visual means of
  conveying information. Gate 9 enforces WCAG 2.2 AA (NFR-8), and golden rule 13 is stricter: never
  colour as the only channel, anywhere.
- **Cleveland and McGill (1984, *JASA* 79(387)), Graphical Perception**: position and length along a
  *common* scale are the most accurately judged encodings. Bars that share an axis invite comparison
  of length, so they must share a unit, and a diverging bar must use the same unit on both sides of
  its baseline or equal magnitudes look unequal.
- **CIEDE2000 (CIE 142-2001; Sharma, Wu and Dalal 2005, *Color Res. Appl.* 30(1))** defines ΔE00 from
  three weighted terms, ΔL′/k<sub>L</sub>S<sub>L</sub>, ΔC′/k<sub>C</sub>S<sub>C</sub> and
  ΔH′/k<sub>H</sub>S<sub>H</sub>, plus a rotation term between the last two. The weighted terms are
  in one unit, the unit the headline's distance and the tolerance are in. Raw ΔL\*, ΔC\* and Δh are
  not: a degree of hue and a unit of lightness are different sizes, which is why `04`'s drawn rates
  differ.
- **Apple HIG (Charts) and Material 3 (data visualisation)** both ask that a chart's colours carry a
  meaning the chart states, and that a chart be readable without them.

## Decision

### 1. One unit, for every row and both sides (OQ-50)

The length one `scale` draws is **the smaller of the two sides' room**: from the label column to the
axis, and from the axis to `DELTA_GAP` (17 dp, `04`'s chroma row) short of the widest figure. Every
row uses it. A bar's length is `min(|magnitude| / scale, 1) × unit`, on the side of its sign. So
equal magnitudes draw equal lengths on either side and in every row, no bar is clamped below `scale`,
and no bar runs into the figures. A magnitude past `scale` draws a full unit; the figure beside it
always carries the exact value, so a full bar never understates what is printed (rule 11).

`magnitude` and `scale` are the caller's, in one unit across the rows. **F-245 passes each axis's
weighted CIEDE2000 term as the magnitude and the tolerance its sheet shows as the scale**, so the
three bars are commensurable with each other and with the headline's ΔE00. The printed figure stays
the drawn quantity (ΔL\*, ΔC\*, Δh). The engine computes the terms; the component computes no
colour.

Until the rows and every figure are measured, no bar is drawn: a unit from a partial measure would
change under the reader.

### 2. One ink, for every bar (OQ-50)

Every bar takes **the hue bar's drawn ink: `text.tertiary` on a card (`foreground.3.card`)**. It
clears 3:1 on `surface.1` in every palette (dark 5.97, light 5.80, slate 6.34, obsidian 6.41), and
`delta.test` holds that in all four.

- **The lightness bar** (`E3`): its slate fails 3:1 as drawn and lies 9.4 ΔE00 from any token. The
  E3 move would mint a second neutral one bar uses, and two neutrals on identical marks invite a
  reading nothing states. It takes its sibling's ink.
- **The chroma bar** (`E2`, golden rule 13): its green is the verdict colour on a mark with no words.
  It would say *this axis passes*, a per-axis verdict the engine does not compute and no figure or
  word on the row states — a drawn claim the product cannot demonstrate, carried by colour alone. It
  leaves the C10 census, and the manifest's green exception keeps the band, the seal and the
  tolerance sheet, which carry words or an icon.
- **The hue bar** is followed: its drawn ink is the token.

The sign is the side, the size is the length, and the words carry the reading. The axis is
`text.secondary` (`foreground.2`), as recorded.

### 3. The rows print what `04` prints (OQ-51)

Each row prints its label, its figure and its reading — no notation line. Each row is one accessible
element whose name carries the figure's quantity and space: *Lightness: ΔL\* −0.8, CIELAB, Slightly
Darker*.

FR-61 governs the **professional surfaces** — Lab/LCh readouts, ΔE00 tables, reference libraries,
batch compare — and there `08` prints the notation, and the readout table carries it (F-235
increment 3). `04` is the Lens verdict: its headline names the metric (`ΔE00: 1.42`), and its rows
are a summary of that distance. Adding `08`'s line would make each row a second line tall (43.4 dp
against `04`'s 26), a departure no golden rule, gate or precedence forces (rule 14).

### 4. The headline

`ProximityHeadline` draws `04`'s line — the distance with its quantity, the band in brackets, the
seal — over the caller's samples and a caption. The line is as tall as the seal whether or not the
seal is drawn, so the samples sit where `04` draws them for every band. The band's and the seal's
ink is the caller's, typed to tokens that exist; the green is F-245's to mint under C10, and the
band's words carry the verdict. The seal is hidden from assistive technology: the band says what it
says.

## Consequences

**Good**

- Equal magnitudes draw equal lengths in every row and on both sides, so the bars can be compared
  the way a reader compares them, and no bar contradicts its figure below the tolerance.
- No colour on the rows means anything the words do not say; every bar clears 3:1 in every palette.
- The rows are commensurable with the headline: the unit is ΔE00's own.

**Bad**

- **The bars are shorter than drawn.** On `04`'s widths the unit is the right side's 36 dp, so at a
  scale of 1 `04`'s −0.8 lightness bar draws about 29 dp, not its 95.5. The left side's room goes
  largely unused. Bar lengths are sample content (E1), but a person comparing the screen with the
  mockup will see the difference.
- **A row whose figure is wide shortens every bar.** At 200 % text, or a long reading, the right
  room can reach zero; the bars then disappear and the figures and words carry the rows alone.
- **`04`'s green chroma bar and its slate are gone.** Two departures (E2, E3) where the drawing is
  followed everywhere else on the card.
- F-245 must compute the weighted CIEDE2000 terms for the bars, beside the raw deltas it prints.

**Neutral**

- `04`'s inventory records each bar `text.tertiary` with its drawn ink in `measured`; the C10
  conflict and the manifest's green exception no longer list the chroma bar.
- `DeltaBars` has no `ink` or `notation` prop, because nothing varies them.

**Evidence and its limits.** The inks were read off a JPEG (ΔE00 ≈ 2 of noise) and the geometry off
a framed image (±1 dp). No part of the decision rests on one reading: the slate fails 3:1 by 0.28,
well past the noise, and the unit is computed from the laid-out widths, not the drawn ones.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| Scale each side by its own room | Uses all the drawn room; reproduces `04`'s long lightness bar | Equal deltas draw unequal lengths: a +0.5 would look a third the size of a −0.5 (Cleveland and McGill) |
| Scale by the left room, clamp the right | Reproduces `04`'s drawn lengths | Every positive delta past about 0.3 × scale draws the same length, so the side the drawing gives least room stops meaning anything |
| Move the axis to the centre of the bar region | Symmetric room, long bars | Moves an element `04` draws at the card's centre (rule 14) |
| Keep the three inks | Followed as drawn | The slate fails gate 9's 3:1; the green asserts a per-axis pass by colour alone (rule 13, E2) |
| Lift the slate the E3 way, keep three inks | The smallest move E3 describes | Mints a token one bar uses, and leaves two neutrals and a green whose difference nothing states |
| Add `08`'s notation to `04`'s rows | The space visible on the row | Each row a line taller than drawn (43.4 dp against 26); nothing forces it (rule 14), and FR-61 governs the professional surfaces, where `08` prints it |
| Raw ΔL\*, ΔC\*, Δh as magnitudes | No computation beyond the figures | A degree and a unit are not the same size; the bars would compare unlike quantities (CIEDE2000) |

## Revisit when

- A mockup draws the delta rows with a stated scale, or gives the bar inks a meaning.
- F-245's rows show the unit reaching zero on a 360 dp phone at 1× text: the right room is then too
  small for the bars to be read, and how the room is split is reopened.
- The engine computes a per-axis verdict, which would give a coloured bar something to say (and
  words to say it with).
