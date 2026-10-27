# ADR-0156: What 08's controls do, and what leaves Compare

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-27 |
| **Feature** | F-249 |
| **Supersedes in part** | F-019's first criterion's on-screen form; F-156's severity control on Compare; F-151's second criterion (with [ADR-0154](0154-08s-compare-samples-are-drawn-apart-as-08-draws-them.md)) |
| **Applies** | R9 §4 E4; [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) §6, D3; [ADR-0147](0147-what-leaves-the-colour-page-and-where-each-drawn-action-goes.md) (06's form); [ADR-0152](0152-what-07s-controls-do-and-what-it-keeps-that-it-does-not-draw.md) D6 (07's export); FR-47, FR-49, FR-51, FR-65 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`08` draws *Change A* and *Change B*, a download glyph in its app bar, *Export Precision Delta PDF*
and *Add Pair to Palette Studio*. It draws none of what each opens. The screen it replaces carried a
severity control, both colour spaces' axes, both APCA directions, the separation decomposition, a
*same entry* line and two pickers at its foot — none of which `08` draws.

## Decision

- **D1. The pair.** A is the route's `?a` when the corpus holds it, else the first entry. B is the
  last entry, or the first when A is the last. **A and B are always two different colours.** An `?a`
  this corpus does not hold shows the app bar's back above `00`'s caption (R9 §4 E4; ADR-0128 §6).
- **D2. *Change A* / *Change B*** each open `03`'s floating sheet (E4):
  - `05`'s search field, read through the Finder's own `find()` (a name, a phrase or a hex); every
    entry while the field is empty;
  - the other slot's colour left out, so a choice can never make the two one colour; the slot's own
    colour marked chosen and announced as selected;
  - a query that finds nothing shows `00`'s caption;
  - choosing changes that slot only, and closes the sheet.
- **D3. The download glyph** opens `/profile/export?pair=A,B`: the pair as an export subject (both
  colours, with their ΔE00 row, FR-65), in every format — as 06's glyph opens a colour's.
- **D4. *Export Precision Delta PDF*** opens the same, with `format=pdf` chosen. F-263 composes the
  document; this feature hands it the pair.
- **D5. *Add Pair to Palette Studio*** opens `/atlas/palettes?colours=A,B`: a draft with A as the
  anchor and B as a neutral (the Studio's own roles for a first and a second colour). Nothing is
  stored until the person names it and saves (FR-49's validation stays the Studio's).
- **D6. Back** opens `/atlas` (F-247 S1's form).
- **D7. What leaves the page:**
  - the severity control: `08`'s *-anopia* rows are severity 1 (`COMPARED_SEVERITY`); `compare()`
    keeps its parameter;
  - the a\*/b\* and OKLCh axis rows;
  - the second APCA direction and its note (the one printed is the smaller, ADR-0155 D3);
  - the separation decomposition (`compare()` still returns it);
  - the *same entry* line, which D1 makes unreachable;
  - the two pickers at the foot, which D2 replaces.

  F-019's first criterion — each figure with its units and computation space — moves into each row's
  notation and accessible name (ADR-0119 §3's form for `04`).

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| Open the Finder to choose | Changes F-250's surface and its result action, and leaves Compare |
| Write the PDF from Compare | An outcome line `08` does not draw; Export already says saved, cancelled or refused |
| The glyph also the PDF | Two controls for one action |
| Save the pair as a palette at once | Needs a name; FR-49's validation belongs to the Studio |
| Keep the severity control | A control `08` does not draw; F-156's slider is recorded on F-346 |

## Consequences

- `/profile/export` reads `pair` and `format`, and `/atlas/palettes` reads `colours` (E-227). F-263
  keeps `pair` and `format`; F-251 keeps `colours`; F-250 keeps `find()`'s contract (E-229).
- `Slider` loses its only screen consumer (F-346's note).
