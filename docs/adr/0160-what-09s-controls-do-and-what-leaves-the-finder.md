# ADR-0160: What 09's controls do, and what leaves the Finder

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-27 |
| **Feature** | F-250 |
| **Supersedes in part** | F-021's screen-level region card and vocabulary line; F-151's *answered* line; F-151's criterion 3 (*without a layout jump*) where a slider reading wraps — the cards move down a line, the thumb does not (ADR-0161 D5; review S4); the screens.test decoy *a Finder result is still a thumbnail* |
| **Applies** | R9 §4 E3/E4; [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md); [ADR-0141](0141-the-chosen-season-pill-on-05-carries-its-leading-dot.md); [ADR-0114](0114-a-control-is-drawn-at-its-mockups-size-and-reaches-the-tap-target-through-its-hit-area.md); FR-47 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`09` draws six kinds of control and binds an action to each (F-220): back, *✕ Clear* in the bar, a
circled × in the field, three chips (`select:finder.mode.*`), three sliders and four result cards.
It draws none of the three chips chosen. The old Finder said which question it answered in a sentence
(F-151), showed the phrase's region and the lexicon's version in a card (F-021), and counted its
rows.

## Decision

- **D1. The chips** are one radio group, named *Read the search as*. The chosen chip is:
  - the person's choice, if they made one;
  - else, while the field holds text, the kind `find()` read it as;
  - else none — so the start state draws the three alike, as `09` does.

  Choosing a chip reads the field's text that way (`findAs`, ADR-0158 D1): `beaded` and `ffffff`
  become hexes under *# Hex Code*, which closes `finder.ts`'s stated cost. The choice persists until
  *Clear*. The chosen chip carries ADR-0141's leading dot, so the choice is never colour alone.
- **D2. The field's ⊗** empties the text; the point and the choice stay. It is shown only while the
  field holds text — Apple's search-field convention (the cancel button is hidden when the field is
  empty).
- **D2a. The same answer keeps the point (review M8).** Words that read the same once trimmed, or the
  chip already in effect, are no new answer (ADR-0158 D4): a point a slider moved survives them.
- **D3. ✕ Clear** resets the text, the choice and the point to the start. It is always enabled, as
  drawn; at the start it changes nothing, because it is idempotent.
- **D4. The sliders** each move one axis of the point (ADR-0158 D4).
- **D5. A result card** opens `/atlas/[slug]`. It is one stop for a screen reader: its name, its
  English name, `hex • ΔE00` from the search point (and the OKLCh line on the first), then its
  provenance (`swatchAccessibleName`; F-248's tile form, the words hidden beneath it).
- **D6. Back** navigates to `/atlas`.
- **D7. What leaves the page:**
  - the *answered as* sentence — the chosen chip says it;
  - the region card and the lexicon version — the readings name the terms, and `find()` still
    returns both;
  - *Showing n / N* and `LIST_LIMIT` — a named set is shown whole;
  - the hint line;
  - the platform header (F-234's chrome).
- **D8. What no mockup draws (E4):**
  - the empty field — the corpus medoid's point and its nearest eight, the ⊗ hidden;
  - `00`'s caption, with the kind's hint, when a set is empty;
  - a reading forced on text it cannot read: *That is not a hex* and *Not every word is in the
    vocabulary*.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| Chips that only force, nothing marked when detected | The question answered is said nowhere (F-151; the `beaded` lesson) |
| Chips as badges, not controls | `09` binds a `select` action to each; criterion 5 asks that every drawn action work |
| One clear doing both | Two drawn controls with one action |
| *Clear* disabled at the start | Dims a control `09` draws in the screen's first state |
| The ⊗ always shown | A control with nothing to clear |

## Consequences

- The F-151 describe asserts the results heading's position across every state, in place of the
  answered line's.
- The thumbnail decoy moves to Compare's chooser rows, which are still thumbnails.
- `find()`'s `region` and `lexiconVersion` keep their readers in the tests and the contract (E-229).
