# ADR-0152: What 07's controls do, and what it keeps that it does not draw

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-22 |
| **Feature** | F-248 |
| **Applies** | R9 §4 E4; F-195, F-199, F-208 (done criteria, golden rule 6); FR-11, FR-31, FR-33, FR-38, FR-73; [ADR-0136](0136-the-lookbook-is-read-back-on-the-wardrobe-through-a-garments-lookbook-choice-and-a-saved-outfit-is-never-rescored.md) D4; ADR-0128 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`07` draws *Swap* and *Lock* on slot 2 and a compact *Swap* on slots 3 and 4, substitution pills,
and *Save to Outfit Lab* and *Export Palette Tokens*. Today's Wear screen carries capabilities
that are done criteria and that `07` does not draw:
- each candidate's reasons (F-195 c1, FR-11);
- the half missing without a profile (F-195 c3);
- *Shop for this* and *Add to wardrobe* (F-199);
- every slot's alternatives (F-208 c1).

## Decision

- **D1. The slot in hand** rests on slot 2. It draws *Swap* and *Lock* under its name; the other slots
  draw the compact *Swap*. Tapping a tile's words puts that slot in hand.
- **D2. Swap** steps the slot's ranking and wraps. **Lock** toggles: its word reads *Lock* or *Locked*,
  and it is announced as selected. A locked slot keeps its colour across Swap, the pills and an occasion
  change. A locked slot out of hand shows `13`'s *Locked* badge (E4).
- **D3. The pills** are the alternatives of the slot in hand, relative to the colour it shows
  (`alternativesAround`), as many as the engine returns.
- **D4. The slot sheet** (`03`'s floating sheet, E4) holds the rank, the candidate's figures and
  factors (or the pairing figure and the missing half), `wear.what`, and *Open this colour · Shop for
  this · Add to wardrobe*. *Amended after F-248's review, S5:* F-199's first criterion — a colour in a
  combination reaches the shopping check **in one interaction** — becomes two on `07`: the tile, then
  *Shop for this*. `07` draws no control for it, and rule 14 forbids adding one to the tile, so the
  cost is this decision's, recorded here and on F-199; the check itself is unchanged.
- **D5. Save to Outfit Lab** hands the combination to the Lab, once. The Lab drafts the nearest owned
  garment per slot, with the top locked. Without a profile the button is disabled, with its reason on
  a line in the bar (E4): the Lab draws nothing without one.
- **D6.** Export opens `/profile/export?colours=`. Back navigates to `/atlas/[slug]`.
- **D7. These leave the page:** the slot chooser, the lists of six, the alternative cards and *Build a
  profile*. Each capability is kept by D1–D5.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| Lock on slot 2 only | Shoes and outerwear offer no alternatives (F-208 c1) and cannot be locked |
| Every slot's alternatives as pills | Up to twelve pills in a card drawn with two rows |
| Persist a corpus-colour outfit | A store change and an undrawn read-back; ADR-0136 keeps the lookbook to garments |
| Drop F-199's actions | Breaks done criteria |

## Evidence, and its limits

- **It rests on:** `07` and `13`'s shared sample outfit (`07`'s save leads to `13`, with slot 1
  locked); the done criteria quoted; `overlay.tsx`'s `Sheet`.
- **Not tested with people:** the sheet's discoverability, and the Lab draft's nearest mapping.

## Consequences

- R9 §4 E4 lists the sheet, the out-of-hand badge and the disabled save.
- F-257 keeps the Lab's hand-off.

## Revisit when

- The Lab persists a draft, or `13` gains a fourth row.
