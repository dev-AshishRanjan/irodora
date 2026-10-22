# ADR-0147: What leaves the colour page, and where each drawn action goes

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Supersedes in part** | F-018 criterion 4's on-screen reading, F-148's and F-156's sections, F-181's *Compare with*, F-194's link from this page |
| **Applies** | Golden rule 14; R9 §4 E4; FR-21, FR-23, FR-24, FR-56, FR-61; [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) §6, [ADR-0135](0135-the-bookmarked-colours-are-read-back-on-the-atlas-through-a-toggle-in-its-search-field.md) |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

The page drew everything the record carries, behind an accordion and tabs. `06` draws a sample, the
names, a pill, a readout, a provenance card, combinations and two actions. Rule 14 builds what `06`
draws. E4 keeps a capability no mockup draws only where a requirement forces it.

## Decision

- **D1.** These leave the page:
  - the description, the contemporary note and the fashion use;
  - XYZ, CIELCh and the gamut line (except ADR-0146 D4's note);
  - the bands;
  - the register id, rights holder, publisher, year, URL, derivation, author and reviewer ids, and
    the editorial notes;
  - the palettes, the relations, the colour-vision block and *Compare with*.

  Where each still lives:

  | material | where |
  |---|---|
  | colour vision | F-240's preview, on every route |
  | the nearest entries | `21` |
  | palettes | `10` |
  | the bands | the Atlas's *More filters* |
  | Compare | the Atlas's pill |
  | the whole record | the corpus and the export |
- **D2.** Kept, in `06`'s slots:
  - FR-23: the provenance lead.
  - FR-24: the body, the pill and the review line.
  - FR-61: every value with its space named. LCh is the polar form of the CIELAB row, and OKLCh carries
    a polar readout.
  - F-084: the review words.
  - FR-56: the bookmark.
- **D3.** The drawn actions:

  | control | goes to |
  |---|---|
  | back | back, or `/atlas` |
  | bookmark | toggles |
  | share | `/atlas/card/[slug]` (`26`'s binding; the card's own share is F-253's) |
  | export | `/profile/export?slug=` (`colourSubject`); bare, that route exports the latest palette |
  | *Wear It* | `/atlas/wear/[slug]`: `07`, which §7 maps there; the inventory's `/atlas/with` was the route string `07` prints (§2) |
  | *Hold* | arm the target, then `/lens`, which shows `04` while one is armed (F-200); no `/lens/against` route exists |
  | a combination | `/wardrobe/with/[id]`, as Home's tiles open a garment |
- **D4.** A colour this corpus does not hold keeps the app bar's back and `00`'s caption.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| Keep the old sections below `06`'s | Elements no mockup draws, on a governed screen (rule 14) |
| A "More about this colour" disclosure | An undrawn control and section |
| Export the latest palette from the export glyph | The drawn action does something else |
| Share without the card | A rasterisation path F-253 owns |

## Evidence, and its limits

- **It rests on:** the PRD's requirement texts; `06.json`; the route tree; `verify-reachability`
  (every route stays reachable).
- **The limit:** a person may want something back. It returns through a mockup, or as an E4 a
  requirement forces.

## Consequences

- `screens.test`'s F-018 describe is rewritten for what `06` binds.
- E-024's palettes note is answered.
- F-326's colour-page half lapses.
- E-215.

## Amendment (F-247's review, S1, S6)

- **D3: back goes to the Atlas.** The control is drawn *Atlas* and named *Back to Atlas*, and `06.json`
  records `navigate:/atlas`. But the page is opened from the Finder, Nearby, Wear, the combinations,
  a garment and the Lens as well, and `router.back()` returned to those. It now navigates to
  `/atlas`: it returns there where the Atlas is already in the stack, and opens it where it is not.
  `colour-detail-states.test` holds each control's own target in the route's source, and a back that
  only pops fails it.
- **D1: "the whole record | the corpus and the export" was not true.** `colourSubject` exports a
  colour's coordinates, name and source. Since F-247, no surface shows the description, the
  contemporary note, the fashion use, the derivation or the editorial notes; the bundle carries them
  (FR-21 is the record's, and is met). A surface for them waits on a mockup that draws one, and
  **F-347** records it.
- **Dead code removed with the page.** `palettesContaining` and `resolveSlugs` (`src/corpus`) had no
  caller but their tests, and are gone; the relation-integrity test now uses `entryBySlug`.
  `@irodora/ui`'s `Accordion` and `Tabs` have no surface either. They are a package's components,
  with their registry subjects, so their fate is **F-346**'s.
