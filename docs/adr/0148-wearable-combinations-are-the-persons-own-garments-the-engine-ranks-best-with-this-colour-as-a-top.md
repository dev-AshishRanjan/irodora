# ADR-0148: Wearable Combinations are the person's own garments the engine ranks best with this colour as a top

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Builds on** | FR-31, FR-32; [ADR-0124](0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md) (no figure is a match); E-101 (the no-evidence profile); [ADR-0103](0103-the-scales-are-the-mockups-and-a-shadow-exists-only-where-one-is-drawn.md) and C7 (no round sample); [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) D3 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`06` binds three round photographs to `engine:combinations.n`, numbers them 1–3, captions them from
`store:garments.n.name` with a hex, and opens a garment. Nothing defines the ranking.
`wardrobePairings` (ADR-0124) needs a stored profile and asserts a ≥ 60 threshold. `regenerate` ranks
owned garments by `scoreOutfit` against locked pieces.

## Decision

- **D1.** This colour is placed as a top (Wear's `DEFAULT_SLOT`). Each owned garment that fills another
  slot is scored by `scoreOutfit` through the builder's one ranking, `rankForSlot`. The order is
  highest overall first, ties by garment id. The first three are numbered.
- **D2.** The profile is the stored one, or the no-evidence profile. Only the order is shown: no score,
  no factor, no word of fit.
- **D3.** Each item is its photograph cropped to the drawn circle, or, without one, the garment's colour
  as a rounded `Swatch` (E4). The caption is the name (or the type) over the hex, at `caption` (measured:
  about 11.1 dp an em). A tap opens `/wardrobe/with/[id]`.
- **D4.** Empty states: no garments → `27`'s wardrobe card (Home's); none rankable → `27`'s card with
  *Add a garment*.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| `wardrobePairings` | Nothing without a profile, and a threshold claim on a card that prints none |
| Corpus colours | Not the store binding `06` records; a second *What goes with this* |
| One per slot (`recommendOutfit`) | Two items where `06` draws three |
| A round sample | ADR-0103's ceiling, C7 |

## Evidence, and its limits

- **It rests on:** `06.json`; `builder.ts`; `wear.ts`; E-101.
- **The limit:** without a profile the order is not personal, and nothing on the card claims it is.

## Consequences

- `rankForSlot` is extracted from `regenerate`, with no change to the builder's behaviour (E-214).
- `rankingContext` joins E-208's module.
- R9 §4 E4 lists the empty states and the garment without a photograph.

## Amendment (F-247's review, S4, M3, M4)

- **D3: a garment's name carries its colour's provenance.** The sample inside the control is hidden,
  so its source and confidence are heard only in the control's name. `combinationName` is the number
  and the name, then `swatchAccessibleName`, as the Wardrobe names a garment.
- **D3: the pitch is the photograph's.** The item is as wide as its photograph. A caption may run half
  a gap past each side, as `06`'s widest does, and wraps beyond that. A long name no longer widens the
  pitch.
- **D3: the photograph's ring.** `06` draws a hairline ring between the card and the photograph
  (`#383B42` between `#20232A` and `#1E2126`). It is the `border` token's line, and `06.json` records it.
