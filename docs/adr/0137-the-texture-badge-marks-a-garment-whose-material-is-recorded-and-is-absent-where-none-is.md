# ADR-0137 — The texture badge marks a garment whose material is recorded, and is absent where none is

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-20 |
| **Feature** | F-242 |
| **Closes** | OQ-11 |
| **Builds on** | [ADR-0116](0116-text-on-a-sample-and-a-samples-edge-move-the-e3-way-per-sample.md) (the ink on a sample); [ADR-0005](0005-measurement-provenance-is-a-type.md) (provenance is a type) |
| **Applies** | R9-MOCKUP-FIDELITY §3 P1 and P2, §4 E1 and E2, §6 C2 and C8; golden rules 11, 13 and 14; NFR-9; WCAG 2.2 SC 1.4.11 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

`01` draws a small mark in the bottom-right corner of each of its five wardrobe tiles
(`01.wardrobe.tile-N.badge`, 13.5–15 × 12.5–16 dp, `new:TextureBadge`, bound `oq:OQ-11`):

- a fine checkered weave, read off the image at about 2 px a cell — 1 dp at 2 px per dp — and
  about twelve cells a side;
- one ink over the sample: light cells on the dark tiles, dark cells on the cream one, the other
  cells the tile's own colour;
- the same mark on every tile.

`25` draws the same element as a 30 dp circle of cloth beside a garment photograph. Its callout
calls it a *"Woven texture badge"*, and the README describes `01` as having *"fabric weave
indicators"*. PRD §10 asked: fabric texture, a material, a sample photograph, or a capture-quality
mark?

What the product holds about a garment's fabric:

- **`material`**: free text, set in the Wardrobe editor (hint *Wool, cotton, linen*). `12` draws it
  as five chips (*Linen · Cotton · Wool · Silk · Denim*), which F-256 builds.
- **`pattern`**: free text (*Plain, striped, checked*).
- **A photograph** (`garment_image`).
- **Its colour's provenance.**

Nothing measures a weave. R9 §4 E1 already refuses to draw a weave *inside* a sample
(`FabricSwatch` draws the colour).

## Decision

**D1 — The badge says that the garment's material is recorded.**

- It is drawn when `material`, trimmed, is not empty, and not otherwise.
- There is no placeholder and no "unknown" mark: an absent badge is an absent fact.

**D2 — It is drawn as `01` draws it, one mark for every material.**

- `TextureBadge` (`@irodora/ui`), 14 dp: the median of the five drawn boxes.
- At the tile's bottom-right, inset `xs` (the drawn 5–5.5 dp, snapped).
- A checker of twelve cells a side, as read off `01` and recorded in its inventory.
- One ink: the one text on that sample takes (`sampleInk`, ADR-0116). It clears 4.5:1 against the
  sample, above the 3:1 SC 1.4.11 asks of a graphic. The other cells are the sample itself.
- `25`'s circle is not adopted (C2: `25` governs the palette).

**D3 — Its meaning is in words.**

- The badge is hidden from assistive technology.
- The tile's accessible name carries *Material \<value\>* (`browse.material`).
- It is a shape, never a colour, so golden rule 13 holds.

**D4 — The inventories bind it.** `01`'s and `25`'s badges bind `store:garments.N.material`. The
`oq:` binding is retired with the question.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Leave it out** | `01` draws it on every tile, and F-242's first criterion asks for every element. No §4 category forces its removal: E2 keeps a drawn element and gives it a defined value |
| **A weave per material** (plain for linen, twill for denim, …) | Five drawings no mockup makes (rule 14). A material does not fix a weave: wool is knitted or woven, and the product records no construction, so the mark would claim a fact it does not hold (rule 11) |
| **A photograph mark** (a crop of the garment's photograph, or "has a photo") | `01`'s mark is one uniform monochrome weave and reads as cloth, not as a picture. A crop of the cloth on a tile of the same colour would all but vanish, and a texture over a sample is what E1 refuses. Home would also read image metadata for every tile |
| **A provenance mark** (shown where the colour was read by the Lens) | Provenance is already in every tile's accessible name. A cloth mark meaning "camera estimate" would be read by sighted people as "fabric", and could suggest a camera colour is the authentic one (rule 11) |
| **A pattern mark** | `pattern` is free text, and a checker read as *checked* would mislabel every plain garment that has one recorded |

## Evidence, and its limits

- **It rests on:** the README row for `01`, `25`'s callout, PRD §10's own candidate list,
  `StoredGarment`'s fields, `12`'s material chips, and WCAG 2.2 SC 1.4.11.
- **The mark's cells are read off a JPEG**, at about 28 px per badge. Twelve is a count of a blurred
  pattern, not a measurement of a drawing.
- **A sighted person learns that a material is recorded, not which.** `01` prints no word, and none
  is added.
- **Today most garments have no material**, so most tiles show none until F-256's chips make it a
  one-tap choice.
- **It was not tested with people.**

## Consequences

- `TextureBadge` joins `@irodora/ui`, with conformance subjects and its own test.
- `01.json` and `25.json` rebind their badges.
- R9 §11 and PRD §10 close OQ-11.
- F-256 carries a note: Home reads `material`, and a chip that stores a code must be mapped back to
  its words (E-207).

## Revisit when

- A mockup draws the badge with a word, or a different mark per material.
- F-256's chips make `material` a closed list.
- A person reports reading the mark as something else.
