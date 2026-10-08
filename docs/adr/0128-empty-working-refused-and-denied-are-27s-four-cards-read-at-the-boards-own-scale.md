# ADR-0128 — Empty, working, refused and denied are 27's four cards, read at the board's own scale

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-08 |
| **Feature** | F-236 |
| **Builds on** | [ADR-0056](0056-the-message-catalogue-is-enumerated-typescript-not-a-runtime-i18n-framework.md) (copy comes from the catalogue, through the caller), [ADR-0113](0113-the-type-scale-is-board-00s-four-steps-and-a-measured-caption-and-off-scale-type-snaps.md) (the type scale), [ADR-0122](0122-the-mark-is-14s-blossom-in-one-ink-everywhere-its-cuts-drawn-as-holes.md) (the mark), [ADR-0110](0110-the-multicoloured-icons-are-followed-as-drawn-over-a-silhouette-that-reads-in-one-ink.md) (drawn chroma), [ADR-0129](0129-a-screen-declares-its-data-conditions-and-the-state-each-shows.md) (where each state is shown) |
| **Applies** | R9-MOCKUP-FIDELITY §2, §3 P2 and P3, §4 E1, E2 and E4, §5, §6 C4 and C10, §8 row 27; golden rules 11, 12, 13 and 14; NFR-8, NFR-9, FR-15, FR-17, FR-18 |
| **Decided on** | the readings of `27.*` (F-236 increment 1, recorded in [`27.mjs`](../../mockups/tools/inventory-data/27.mjs)); where the drawing leaves something open, the delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

`27` draws four cards on one board: an empty wardrobe, the Lens working, the Lens refusing a
capture, and the Lens without the camera. Before F-236 the product drew none of them. An empty
screen showed an R7 drawing over a grey sentence. A capture in flight showed a skeleton. A poor
capture showed its reading at a capped confidence. A denied camera showed a sentence with no way
to the settings.

A board has no screen scale (`dpPerPx: null`), so a feature that builds it has to find one. It also
has to settle what the board leaves open:

- which capture is refused;
- what the two step lines say;
- what the ring's value is;
- what a permission not yet asked for shows;
- what the mark is drawn as.

Increment 1 re-read the board and found five things F-220's record did not hold:

- the bodies are white;
- the steps sit on `level3` and are set in a narrow monospace;
- the ring's track is `level3`;
- the refusal's plate has the `lg` corner;
- the mark sits in a radial glow.

## Decisions

### 1. The board's scale is 0.973 dp per pixel

`k` is the median of the 13 text elements' ems against their roles' steps. Each em is a line's
ascender height over 0.73, the platform sans' ascender share of its em. By role:

| role | readings | step |
|---|---|---|
| titles | 0.845–0.918 | 22 |
| bodies | 0.973–1.062 | 16 |
| button labels | 0.973 | 16 |
| steps | 1.022 | 14 |

The card corners agree: 9.2–10.2 dp against `md` 10.

Type takes its role's step (P3). The titles' larger drawn em is kept as `raw.emDp`, not built. Every
other drawn dimension is `px × k`. A size snaps to half a dp, an interval to the R9 scale (§2).
`packages/ui/src/stateBoard.ts` holds them, and a test recomputes each from
the inventory.

### 2. A state card's composition

| interval | drawn | dp | built |
|---|---|---|---|
| edge to action (`padPx`) | 18.3–18.7 px | 17.8–18.2 | padding `md` 16 |
| top edge to picture (`topPx`) | 69 px | 67.1 | padding `md` 16 plus `xxl` 48 |
| picture to title | 37 px of ink | 36.0, less the title's own 5.3 | `xl` 32 |
| ring to first step | 39 px | 37.9 | `xl` 32 |
| step to step | 7 px | 6.8 | `sm` 8 |
| last step to title | 42 px | 40.9 − 5.3 | `xl` 32 |
| title to body | 26 px baseline to ink | 25.3, less 5.5 and 7.3 | `md` 16 |
| body to action | 77–107 px | — | a spacer of at least `xxl` 48 |

How each interval is built:

- **The card's padding** is one value on every side. It is `md` 16, read from the action's inset.
- **The picture's margin** is the rest of the top inset. That makes 64 dp in place of 67.1: the
  snap's cost.
- **Ink gaps lose the text box's own inset.** A text box carries its leading and its ascender above
  its first ink: 5.3 dp for title, 7.3 for body, SF Pro's and Roboto's mean (F-231's method).
- **The action sits at the card's foot.** The space above it is slack, 77–107 px across the board.
  So it is a flexible spacer whose least is the tightest drawn gap, 71 dp, snapped to `xxl` 48. A
  card given its host's height puts the action at the foot. A card sized by its content is 23 dp
  shorter than the board's tightest.

### 3. The pictures are fixed per state, and drawn at their size

Each state draws one picture, as criterion 1 names it: empty the hanger, working the ring and the
mark, refused the glare tile, denied the camera. Every picture is decorative and hidden from
assistive technology; the words carry the state (rule 3, golden rule 13). The pictures and their
lines are 27's own. Each line is wider than `size.iconStroke` (1.65 dp) or `size.artStroke`
(0.5 dp), so `Illustration` and `Glyph` each take a `stroke` a surface binds from its record:

- **The hanger:** `Illustration hanger`, 168.5 dp wide, as a figure:
  - body in `state.hanger`;
  - hook and sprigs in `foreground`, at 2 dp.

  `Illustration`'s `color` widens to `foreground` for a figure: 27 draws the lines white, and a
  figure is the content (F-229's own distinction).
- **The ring:** `ProgressRing`, 132.5 dp, its stroke 7 dp, round caps, clockwise from 12 o'clock:
  - fill `foreground` over a `surface.3` track;
  - the value is `done / steps.length` over the capture pipeline's two steps (D4).

  27's 61 % is sample content (E1). The ring is never given an invented percentage.
- **The mark:** 14's filled blossom (C4) at 27's reach, `size` 51 dp, in `state.mark`, the one
  tinted mark (C10).
  - 27 draws the mark as an outline of petal rings and rays: its fifth drawing of the mark, and C4
    takes 14's.
  - **D11: the glow is drawn and radial.** `glow-fit.mjs --radial` reads a petal-against-notch
    modulation of 0.037; 14's blurred mark reads 0.90. The best fit is a disc of radius 29.7 dp at
    0.296 of the ink, blurred by σ 7.9 dp.
  - It is built as an SVG radial gradient in `state.mark`, its stops computed from those three
    numbers.
  - So it needs no image asset and no generator. E-192 is not needed.
  - Under the ink the profile is an extrapolation (0.26 against the outline's 0.29–0.33 at 18–20
    px). The filled blossom hides all of it but its cuts.
- **The refusal:** a 95 dp plate:
  - corner `lg` (14.0–14.5 px; F-220's `md` was a guess);
  - fill `state.refused.plate`;
  - a 3 dp edge in `state.refused.edge`;
  - `Glyph glare` at 69 dp, its sun and rays in `state.refused.glyph`, its slash in the edge's
    amber, at 2.5 dp.
- **The camera:** `Glyph camera-locked`, redrawn from 27's geometry:
  - a 93.8 × 61.3 px body with a 12 px hump;
  - a lens of radius 23.6 px;
  - a flash dot;
  - a padlock with its keyhole cut through, and the body's line stopping short of it;
  - at 121.5 dp with a 3.5 dp line, in `foreground`, the padlock in `state.lock`.

  F-228's drawing was squarer, with a smaller lens and no dot or keyhole.

### 4. The tints are one token group, the same in every palette (D8)

Six tokens are minted as a C10 **token group**, retiring the element exception:

| token | measured | OKLCh chroma |
|---|---|---|
| `state.hanger` | `#C09D7A` | 0.064 |
| `state.mark` | `#E0AAE6` | 0.101 |
| `state.refused.plate` | `#51412C` | 0.040 |
| `state.refused.edge` | `#EEAF5E` | 0.123 |
| `state.refused.glyph` | `#A2917A` | 0.039 |
| `state.lock` | `#BAA07C` | 0.058 |

Each is the core of its drawing: the interior median, or the most luminous quarter of a line. The
glow takes `state.mark`.

- They are decoration, with an `uncheckedReason`. Every one carries a text beside it.
- They hold the same value in all four palettes, as F-232's glyph group does. 27 draws only Sumi.
- The padlock and the hanger are ΔE00 3.50 apart, so they are two tokens. The slash is 2.51 from
  the edge, so it is the edge's.

### 5. The text

- **Titles:** `title`, weight 600, in the sans, `foreground`.
- **Bodies:** `body` in `foreground`. 27 draws them white (luma 245–247 at the 95th percentile, out
  of `foreground.2`'s reach), so F-220's `text.secondary` was the helper's default.
- **Steps:** `Chip` badges, 28 dp tall, `sm`, on `surface.3`, in `foreground`, set in a narrow
  monospace.
  - 27's advance is 0.69 of its cap. The platform monos' is 0.84–0.86, at which the second step
    would overflow its card.
  - **Which face ships was read off the drawing in increment 3**, as the serif was
    ([ADR-0112](0112-the-serif-ships-as-gelasio-regular-and-the-mincho-as-noto-serif-jp-because-the-drawings-measure-there.md)).
    It is Inconsolata, cut at width 83 and weight 600, at `body`: the step its em snaps to, where
    this record first assumed `label`
    ([ADR-0130](0130-the-steps-mono-is-inconsolata-cut-at-27s-width-and-weight.md)).
- **Spelling (D9):** the catalogue's: *Analysing Fabric Colour…*. 27 contradicts itself in one card
  (*Colour Lens*, *Fabric Color*).

### 6. What each state binds to

- **D1, refused:** a held capture (a still or a photo) whose quality class is `poor`. FR-18 says:
  *"Poor quality blocks a confident claim and returns a specific, actionable instruction."* The
  engine's own class decides, so no new threshold is invented.
  - The title is *Reading Refused* and the failed check's name. It is never *measurement* (E2).
  - The body is the check's quantity, comparator and threshold, read from `QUALITY_THRESHOLDS`,
    then its instruction.
  - The check is the engine's first failure, in its own fix-first order (`QUALITY_CHECKS`).
  - **D10:** no confidence is printed, as 27 prints none.
- **D4 and D5, working:**
  - The first step is the one under way: *Waiting for a camera frame…* or *Decoding the photo…*.
  - The second is the one that follows: *Converting to OKLCh: D65 (6504K)*, in 27's form, step,
    illuminant, then temperature.
  - D65 is `CANONICAL_WHITE`. 6504 K is its published correlated colour temperature; McCamy's
    formula gives 6505 from the engine's own chromaticity.
  - 27's *extracting reflectance spectra* and *5500K* are claims the product cannot make (E2). (claims-ok: quotes the drawn construction this decision refuses)
- **D6, a camera permission not yet asked for:** 27's denied card with *Allow Camera Access* in
  place of *Open Device Settings*. The platform requires the request in context, before any camera
  use, so this is a capability no mockup draws (§4 E4).
- **D3, empty:** `EmptyState` takes one of two drawn forms by its union:
  - `action`: 27's card, with its picture, title, body and action;
  - `resolvedHere`: 00's caption with its small `no-results` art, where the fix is already on the
    screen. F-139's rule stands: no second control for an on-screen fix.

### 7. Accessibility

Each state is announced once, when it mounts, and never again on a re-render.

- The ring is a `progressbar` with a label, a value and `busy`.
- The titles are headings.
- The pictures are hidden.
- Retry and the settings action carry hints.
- Every action keeps its platform hit area ([ADR-0114](0114-a-control-is-drawn-at-its-mockups-size-and-reaches-the-tap-target-through-its-hit-area.md)).

## Consequences

**Good.**

- Every place with nothing to show draws one of four designed cards.
- Each state binds a real thing: the engine's class and threshold, the pipeline's step, the
  platform's permission.
- The scale is recorded with its readings, so F-267's comparison has numbers to hold.
- The halo needs no asset.

**Bad.**

- **A poor capture is no longer shown at a capped confidence.** FR-18's poor band leaves the
  readout, and a poor reading cannot be handed off (R1). A person may have preferred the old
  behaviour; F-267 is asked.
- **The snap moves 27's composition visibly in two places:**
  - the picture sits 3 dp higher;
  - the slack above the action has a floor of 48 where the board's tightest is 71.
- **Fixed pictures can mislead.** A glare tile heads a blur refusal. Hangers appear on screens whose
  absence is not a wardrobe (R2).
- **The ring renders at zero in practice:** the steps are short (R4).
- **The six tints do not move with the palette.** A lilac mark on Washi's white card is faint (R6).
- **Three platform behaviours are owed to a device:** the settings deep link, the announcements, and
  the pixels beside 27.

**Neutral.**

- R7's three empty drawings are retired.
- Two components gain a `stroke`, and `Illustration` gains a `tint`.

## Alternatives considered

- **Refuse only an unreadable capture (`!worthOffering`).** Good at keeping every possible reading.
  But it leaves FR-18's poor band showing a claim the PRD says it blocks, and 27's refused state
  would almost never be reached.
- **Keep the old, assumed scale, about 1 px per dp, uncomputed.** Simpler. But it is 2.7 % off the
  reading on every dimension, and nothing would show it.
- **Snap the top inset as one interval (67 → `xxl` 48).** Literal. But it loses 19 dp the drawing
  plainly has. The card's padding is one value on every side, so the inset is two intervals.
- **Draw the glow as 14's: the mark blurred, a generated mask.** One mechanism for both glows. But
  the reading says radial (modulation 0.04 against 0.90), and a radial gradient is what react-native-svg
  draws natively.
- **Art keyed by the reason or the absence.** More specific. But the variants would be undrawn
  pictures chosen by an agent, which rule 14 forbids.
- **Bodies in `foreground.2`, as F-220 recorded them.** Quieter, and the helper's default. But 27
  draws them white, and nothing forces a move.

## Revisit when

- F-267's comparison judges the snapped composition, the fixed pictures or the refusal of poor
  captures wrong by eye.
- A mockup draws one of these states at a screen's own scale. That screen then wins (P3).
- The engine's quality classes change, which moves D1.
