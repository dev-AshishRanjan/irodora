# ADR-0136 — The lookbook is read back on the Wardrobe through a *Garments · Lookbook* choice, and a saved outfit is never rescored

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-14 |
| **Feature** | F-238 |
| **Closes** | OQ-40 |
| **Builds on** | [ADR-0135](0135-the-bookmarked-colours-are-read-back-on-the-atlas-through-a-toggle-in-its-search-field.md) (saved things are read back on the list of their domain); [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) D3 (the two empty forms); [ADR-0124](0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md) (13's figures are defined computations); [ADR-0005](0005-measurement-provenance-is-a-type.md) (provenance is a type) |
| **Applies** | R9-MOCKUP-FIDELITY §4 E4; golden rules 11, 12, 13 and 14; FR-33, FR-56, FR-10, FR-32, FR-58 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

Mockup `13`, the Outfit Lab, draws *Save Outfit to Lookbook* (`13.actions.save`, action
`submit:lookbook.save`). F-238 asks that a saved outfit keep its slots, locks, scores and the
versions that produced them, so that it re-renders identically later, and that saved outfits be
"listed where F-220's inventory places them".

**No inventory places them.** Nothing reads a saved outfit back:

- 11's grid lists garments;
- 07 saves an outfit *to* the Lab;
- 04's *View Outfits* opens the combinations for one reading.

This is OQ-39's question for a different object. ADR-0135 answered that one, and asked to be
revisited when this one was.

What was read before deciding:

- **What the Lab shows today.** `OutfitBuilder` shows each slot proposal's best score, which is the
  locked pieces plus one candidate. It never shows the score of the outfit as composed. So "its
  scores" needs one engine call over the whole draft, and that is what is shown beside the save.
- **Where a garment's colour lives.** It is a shared `saved_color` row: `reusableColorId` shares one
  row per slug, `upsertColor` overwrites it in place, and deleting a garment tombstones it. A
  pointer to the garment cannot re-render the colour that was scored.
- **How the profile changes.** `saveProfile` updates in place and keeps no history. A score cannot be
  recomputed later against the profile it was computed against.
- **What a new route costs.** `verify-mockups` refuses a route with no governing mockup unless an
  open question names it, and closing OQ-40 removes that escape. The fidelity capture fails a route
  that a cleared app cannot reach (R9 §12).
- **The Lab's reach.** The Lab route renders nothing without a profile. A lookbook reachable only
  from the Lab would vanish, and could not be cleared, once the profile was deleted.
- **What the mockups already draw.** `10` switches *Curated Systems · My Custom Palettes* with one
  segmented choice directly over its list (`10.source`):
  - a pill `ChoiceGroup`, 345 × 33 dp, edged in `border.subtle`;
  - the chosen segment filled (`level2`), with a 9 dp leading dot.

  That is the mockups' own answer to "what you made, beside what is published".
- **Platform convention.**
  - Material's segmented buttons "help people select options, switch views, or sort elements".
  - Apple's segmented control switches between closely related views. That guidance is stated from
    general knowledge; the page was not readable here.

## Decision

**D1 — The lookbook is read back on the Wardrobe (`11`), through a *Garments · Lookbook* choice
directly above its grid, in `10.source`'s form.**

- It switches only the region below it: the garment grid, or the lookbook list. Title, actions,
  coverage and gap stay where `11` draws them. The one line that says how the gallery is grouped
  is drawn with the gallery, so it is not shown under *Lookbook*.
- Today's filter card, which `11` does not draw (F-255 removes it), filters garments only. It stays
  where it is in both views; it narrows nothing in the lookbook.
- It is screen state, defaulting to *Garments*, and is not stored (ADR-0135 D4's reason).
- There is no new route.

**The rule this shares with ADR-0135:** what a person saves is read back on the list screen of its
domain, by a control directly over that list. Never on Home, never in the profile, never on a route
of its own.

- Colours are a *subset* of a list that exists (the Atlas), so ADR-0135 narrows it with a toggle.
- Outfits are a *kind of their own* beside garments, so they need a view switch, and the mockups
  draw a view switch as a segment (`10`).

**D2 — An entry is composed from 13's vocabulary, and is read-only.**

- **Its slots**, in stored order, each in 13's own order: the sample, then the hex above the
  garment's label, then 13's *Locked* badge at the trailing edge on a slot that was locked. There
  are no swap or lock controls. The slot's word is not printed, because 13 prints none; each row's
  accessible name carries it, with the garment, the colour and *Locked*.
- **Its score:** the stored overall and all six components (FR-32), then *Scored when it was saved,
  against your profile as it was then. Not recomputed.*
- **The versions that scored it**, and *Remove from lookbook*, on its own line.

**D3 — An empty lookbook is `00`'s caption** (ADR-0128 D3, `resolvedHere`). The way to fill it, the
Outfit Lab button (`11.actions.lab`), is on the same screen. The choice is drawn whenever there is at
least one garment or one saved outfit, so the lookbook stays reachable with an empty wardrobe.

**D4 — *Save Outfit to Lookbook* is enabled only when it means something.**

- Enabled when every slot holds a garment (an outfit is one garment per slot, FR-42) and that
  composition is not already in the lookbook.
- Otherwise it is disabled, with the reason on a line beneath it, as *I wore this* is today.
- The draft's own score is shown beside it, under a heading, *The whole outfit*, so it is not
  read as one of the proposals' scores above. What is stored is what the person saw.
- Saving is announced (WCAG 4.1.3), because the button disables and the line changes without
  moving focus, and the reason line is a polite live region.

**D5 — A saved outfit is a snapshot, rendered from storage only, and never rescored.**

- It holds its slots: a pointer to each garment, plus a copy of the colour that was scored with its
  provenance (rule 12), and the label shown.
- It holds its locks, and its score: the overall and, per component, the score, direction, weight
  and contribution.
- It holds the coverage threshold, and the envelope (engine, scorer, corpus, rules, occasion, and
  the profile's identity and revision).
- A score recomputed later would be a different claim under the same name (rule 11), and the
  profile it was computed against may no longer exist. So it is shown as stored, with the words that
  say so.

**D6 — Storage is three tables, `outfit`, `outfit_item` and `outfit_component`, in both the sync and
archive lists.**

- Removal tombstones all three, and an entry is never revived: each save is its own record, with
  its own scores and versions.
- Saving a composition already in the lookbook writes nothing.
- Slot and component names are opaque text, so the store holds no copy of the engine's vocabulary,
  and a fourth slot or a seventh component needs no migration.

**D7 — Placement on today's screens.**

- The save, its reason line and the draft's score go in the Lab's existing controls.
- The choice goes in today's Wardrobe, directly above the garment list.
- F-257 moves the save into 13's action bar as `13.actions.save`, and composes 13's score card over
  the same draft score. F-255 builds the choice into 11. **Both keep them.**

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **ADR-0135's toggle, in 11's app bar** | A toggle that swaps one kind for another is not a filter. It would sit where 06's bookmark means "save this", never say *Lookbook*, and be the least discoverable choice |
| **A section after 11's grid** | Nothing drawn moves, but it sits below every garment: about 840 dp of scrolling at 14 garments. Not reachable in practice |
| **A section in the Lab (13), below the capsule card** | 13's composition ends at the capsule card, and the Lab renders nothing without a profile, so a person who deleted theirs could no longer see or remove their outfits |
| **A new route, `/wardrobe/lookbook`** | A whole undrawn surface plus an entry point. It needs a governing mockup and a reach in the fidelity capture. It changes 11's drawn row of three, and 13's trailing slot already holds *Capsule Solver* |
| **A section on Home (01), or an entry in the profile (17/23)** | Rejected for ADR-0135's reasons. Home is the most-seen, fully drawn screen, and a list in the profile implies something about fit that nothing computed says (rule 11) |

## Evidence, and its limits

- **It rests on:** the inventories (`10.source*`, `11.*`, `13.actions.save`, `13.slots.*`,
  `13.score*`), Material's segmented-button guidance, and the general pattern in wardrobe apps of
  keeping saved outfits inside the wardrobe. Those apps' exact layouts were not inspected.
- **It was not tested with people.**
- **Measured from 11's inventory:** 24.5 dp separate the gap card from the grid. The choice adds
  33 dp and a gap, so the grid moves down about 57 dp, and the choice stays on the first screen at
  384 dp.
- **Not measured:** whether the two labels fit at 200 % text (A7). `ChoiceGroup`'s segmented form
  is checked for it.
- **Replay has a limit.** FR-10 replay of a saved score is possible only while that profile revision
  is current, because the profile keeps no history. It is stated, not hidden.
- **Encryption.** The lookbook lives in the same database file as everything else, and that file is
  very likely not encrypted today (F-336). Nothing here claims otherwise.

## Consequences

- **F-238's second criterion is amended in the open, as F-237's was:** *"Saved outfits are listed on
  the Wardrobe (11), under the Lookbook choice of the segmented control ADR-0136 places directly
  above its grid (OQ-40), can be removed, and are covered by backup and restore."*
- **Records:**
  - R9 §4 E4 lists the departure;
  - R9 §11 and PRD §10 close OQ-40;
  - ADR-0135 records that its revisit happened and that it was kept;
  - F-255 is blocked by F-238;
  - F-255, F-257, F-248, F-242 and F-263 carry notes.
- **Left to others:**
  - 13's score card, its row notes and the verdict glyph are F-257's;
  - OQ-30, OQ-32 and OQ-23 are untouched;
  - nothing seasonal is stored or shown;
  - 07's *Save Outfit to Lab* is F-248's, since 07's slots are corpus colours, not garments.
- **Revisit:**
  - when F-255 or F-257 rebuild these screens;
  - when the profile keeps a history (then replay can extend past the current revision);
  - if a person reports they cannot find their outfits.
