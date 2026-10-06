# ADR-0123 — A lockup is one figure: its intervals are ratios of the name's em, outside the spacing snap

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-06 |
| **Feature** | F-230 |
| **Supersedes** | F-226's lockup (the mark one em wide, an eighth of an em from the name) |
| **Applies** | R9-MOCKUP-FIDELITY §2 (the snap) and §6 C4 (the lockups); A7 (text to 200 %); [ADR-0121](0121-type-drawn-off-the-scale-takes-its-step-within-4-dp-and-a-measured-step-beyond.md) (the name's measured steps); [ADR-0122](0122-the-mark-is-14s-blossom-in-one-ink-everywhere-its-cuts-drawn-as-holes.md) (the mark) |
| **Decided on** | C4 and the person's instruction of 2026-09-10 (*"no deviation from the mockups — we strictly need to materialise the mockup in our code"*); where the drawings leave something open, the delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

C4 takes the in-app lockup from `01` and the splash lockup from `14`. F-230 measured both on the ink
(increment 1; `mark-fit.mjs` and `serif-weight.mjs --em`, calibrated to 0.3 px):

| | `01` (0.5 dp/px) | `14` (1.3521 dp/px) |
|---|---|---|
| the name's em | 31.6 dp (`wordmark`) | 59.7 dp (`wordmarkSplash`) |
| the mark's ink width | 38.1 dp | 149.7 dp |
| mark to name, ink to ink | 10.0 dp, beside it | 32.5 dp, above it |
| name to tagline, ink to ink | — | 15.9 dp |
| alignment | ink centres 0.16 dp apart | all three on one axis, within half a pixel |

R9 §2 snaps a measured value to the nearest step of the R9 scale, and the spacing scale is 4, 8, 16,
24, 32 and 48. Snapped, `01`'s interval would be `sm` (8): a fifth tighter, 4 px at `01`'s scale, 13
times the instrument's error. `14`'s land within half a dp of `xl` and `md`.

So which are a lockup's intervals: **spacing**, which snaps, or **the figure's own proportions**,
which do not?

A spacing token is also a fixed number of dp. When a person enlarges text, the name grows (A7) and a
token does not, so a lockup built from tokens changes shape at every text size but the default.

## Decision

1. **A lockup is one figure**: the mark, the name and, on the splash, the tagline. The mark's size
   and every interval are its drawing's, each recorded as a ratio of the name's em —
   `LOCKUP_APP` (mark 1.206 em, interval 0.317 em) and `LOCKUP_SPLASH` (mark 2.508 em, intervals
   0.545 and 0.266 em). `brand.test` recomputes every ratio from the inventories within the
   instrument's error, and refuses F-226's lockup and the snapped intervals where the instrument
   can tell them apart.
2. **R9 §2's spacing snap governs the space between components; it does not reach inside a
   figure**, any more than it reaches the mark's cuts or a glyph's side bearings. The snap is still
   what places the lockup on a screen.
3. **The figure scales as one.** The platform sets the name larger when a person enlarges text,
   along iOS's Large Title ramp or Android's font scale, and the name's laid-out line says by how
   much. The mark and the intervals follow it. The first frame is the drawing's, exact at the
   default size.
4. **The figure's box is its ink.** A Text's line box is not its ink: centring Gelasio's line box
   would set the name's ink 2.5 dp high in `01`'s row. Each member's margins take its box to its
   ink, computed from the faces' own metrics and placed as React Native 0.86 places each
   platform's line: Android's half-leading (`CustomLineHeightSpan`), and iOS's, which matches it
   only where the line is at least its face's own and otherwise sets the glyphs on the line's foot
   (`RCTApplyBaselineOffsetForRange`). The name is set at the serif's own line, where the two agree
   and nothing is clipped (ADR-0121, amended by F-230's review); the tagline keeps `title`'s
   leading, and its two placements are each computed.
   Those metrics are `GELASIO` (units per em, `hhea`'s ascender and descender, the name's advance
   and ink) and `GOTHIC` (the same, plus `BASE`'s ideographic character face), and
   `apps/mobile/test/fonts.test.tsx` reads them again from the bundled TTFs. In the row the inks
   centre on one line; in the stack they sit on one axis. A caller places the lockup by its ink, as
   every inventory records it.
5. **The tagline's ink is the gothic's ideographic character face** (`icft` 827, `icfb` −67). Its
   copy is the caller's (ADR-0056), so its own ink is not known to the lockup. A line of kanji and
   kana fills the character face, and `14`'s drawn tagline reads within five units of it.
6. **It fits the width it is given** (A7, *without loss of content*). The name is one line, which
   the platform shrinks rather than breaks or clips. In the stack the name is the widest member, so
   the figure fits its column. In the row, the name's box is held to its share of the width the row
   is given, so the mark and the interval fit beside it. The multiplier stays 2, so the name still
   reaches 200 % wherever it fits.

## Consequences

**Good**

- At the default text size, both lockups are their drawings. Enlarged, they keep their shape.
- One rule covers both lockups and any later one: measure the figure, record ratios, recompute them
  in a test.

**Bad**

- **`14`'s two intervals land within half a dp of `xl` and `md`**, where snapping would have
  agreed. Recording ratios there looks like precision for its own sake. That is accepted, because
  the figure has one rule. The test says where the instrument cannot tell the ratio from the step
  (the tagline's interval) and claims no decoy there.
- **Where a platform puts a line box's baseline is read from React Native's source, not
  measured.** jest has no layout, so a device attests it. So are the name's fit
  (`adjustsFontSizeToFit`) and the scale read from its laid-out line. The first version of this
  ADR said both platforms follow the half-leading model; iOS does not below a face's own line,
  which F-230's review found in the source before any device could.
- **The row measures the width its column gives it.** Both drawn placements are columns. In a row
  parent it would measure only itself and scale no further than its content.

**Neutral**

- `display1` is now drawn by no screen. It is declared unreached, since board 00 declares it and
  F-226's criterion 3 names it.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| Snap each interval to the scale (8, 32, 16 dp) | One spacing rule everywhere | `01`'s interval becomes a fifth tighter, which the instrument resolves 13 times over, and fixed tokens do not scale with the name |
| Spacing tokens multiplied by the name's scale | Scales, and stays on the scale at 1× | Still 8 against `01`'s drawn 10, a departure no rule in §6 permits |
| Centre the members' boxes (`alignItems: 'center'`) | No font metrics in the component | Sets the name's ink 2.5 dp above the mark's centre, against `01`'s 0.16 dp |
| Cap the splash name's `maxFontSizeMultiplier` below 2 so the stack fits | Simple | The a11y gate refuses a cap under 2×, and one static cap is wrong on every other width |
| Ship the lockup as an image | Exact to the drawing | Not text: no Dynamic Type (A7), and no name for a screen reader |

## Revisit when

- A mockup draws a lockup at other proportions, or a third lockup.
- A drawn wordmark replaces the set name (the ratios stay; the metrics change).
- A device run shows a platform placing the baseline other than its source does, or React Native
  changes `RCTApplyBaselineOffsetForRange` or `CustomLineHeightSpan`.
