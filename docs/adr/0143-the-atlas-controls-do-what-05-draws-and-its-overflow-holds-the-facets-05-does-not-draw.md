# ADR-0143: The Atlas's controls do what 05 draws, and its overflow holds the facets 05 does not draw

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Amends** | [ADR-0135](0135-the-bookmarked-colours-are-read-back-on-the-atlas-through-a-toggle-in-its-search-field.md) D4 (where the count line and *Clear* sit) |
| **Builds on** | ADR-0108 (nine chips), ADR-0114 (the hit area), ADR-0128 D3 (00's caption), ADR-0118 (sheet forms) |
| **Applies** | R9-MOCKUP-FIDELITY §4 E1, E4; golden rules 12–14; FR-20, FR-47, FR-56; NFR-8 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

- `05` draws a search field promising *kanji, romaji, family or #hex*, season pills, family chips with a colour dot, an overflow "…" (`05.more`; ADR-0135 left its contents to F-246), three navigations, and cards.
- FR-20 filters by *family, season, temperature, lightness, chroma and era*. `05` draws two of those.
- FR-47: *"a hex query returns its nearest entries; a phrase query maps to a lightness/chroma/hue region deterministically."*
- The lexicon carries lightness and chroma words, and no temperature word.
- A family group has no colour in `content/taxonomy.json`, yet `05` draws a dot per chip.

## Decision

**D1: Search answers what 05's placeholder says: names, family words and a hex.** One field, read
in order:
1. A hex (the Finder's `looksLikeHex`) ranks the whole corpus by ΔE00 through the Finder's own index
   (`nearestByLab`). The filters and the bookmark toggle then apply, and the first eight are shown,
   nearest first. FR-47's hex half.
2. Otherwise, a case-folded substring of the names, the slug, the hex, the family's words, or its
   chip's words.

No second nearest-match implementation exists. **A natural phrase is the Finder's** (FR-47's phrase
half, mockup 09, one drawn tap away): 05's field promises *kanji, romaji, family or #hex*, and the
lightness and chroma a phrase would reach are D5's facets, so a phrase branch here would be a second,
undrawn way to the same filters (decided by the implementing session over the planner's design).

**D2: Season** is a single choice with *All* (ADR-0141).

**D3: Family chips** are filter chips: any number on, OR within the row, AND with everything else. They follow ADR-0108's order, in a row that scrolls off the right edge.

**D4: The dot is the group's medoid**, a real corpus colour shown with its provenance (rule 12):
- the member entry whose summed CIEDE2000 to the others, over each entry's published `derived.lab`, is least, ties broken by slug;
- drawn in that entry's own hex with `reference` provenance;
- decorative to a screen reader (the chip's name is its words).

**D5: The overflow opens *More filters***: 03's floating sheet holding FR-20's remaining facets (Temperature, Lightness, Chroma), each a single choice in D2's form.
- No era facet while no entry holds an era.
- E4: a required capability no mockup draws, composed from 05's own parts.

**D6: *Showing n / N* and *Clear* sit at the trailing end of the *Atlas* heading row, only while anything narrows the list.**
- *Clear* resets the query, season, families, facets and the bookmark toggle.
- This amends where ADR-0135 D4's line sits, not what it does. The row is empty space in 05's drawn state.

**D7: The four drawn navigations** go to `/atlas/compare`, `/atlas/find` (the inventory's `/atlas/finder` corrected), `/atlas/palettes` and `/atlas/[slug]`.

**D8: A card is one control.**
- Its name carries everything it prints: kanji, romaji, English, hex, provenance, the OKLCh line and the season.
- The sample inside takes the same action, so a tap on it is not swallowed by its own pressable, and it is hidden from assistive technology so the card announces once.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Drop temperature, lightness and chroma** | Removes a PRD capability (FR-20); a PRD change, not a layout one |
| **Draw three more chip rows** | Changes 05's drawn structure on its default state |
| **Put the facets under the search as a disclosure** | An undrawn row in the drawn state |
| **The overflow as a menu of actions** (Clear, About the corpus) | Holds no capability the person lacks elsewhere; *Clear* already appears where narrowing shows |
| **Single-choice family chips** | Toggle buttons pretending to be radios; M3 filter chips are multi-select |
| **The dot as the group's first entry, or an authored hex** | Arbitrary, or a content-schema change with no source; the medoid is a stated rule over published values |
| **Hex by exact match only** | FR-47 asks for nearest entries |
| **A phrase branch as well** (the Finder's lexicon regions) | Not drawn: 05's placeholder names kanji, romaji, family and hex. A second way to D5's lightness and chroma, and 赤黄緑青紫 are lexicon words, so typing 青 would answer a hue region where the 青 chip's word is meant |
| **The sample alone as the card's target** | 05 binds the action to the card |

## Evidence, and its limits

- **It rests on:** FR-20 and FR-47; the lexicon's terms (read); `finder.ts`; Material 3 filter-chip guidance (secondary sources: multi-select, a leading mark when chosen, "don't use in place of buttons"); `Pressable`'s responder behaviour (finding 10, to be confirmed on a device).
- **The limits:**
  - A natural phrase typed here is read as words: *dark green* finds names and families containing
    it, not a region. The Finder answers phrases.
  - The 紫 dot is greyish, since its group is violet-greys (taxonomy.json's own cost).
  - It was not tested with people.

## Consequences

- `src/atlas.ts`.
- `finder.ts` exports `looksLikeHex` and `hexNearest`, and the Finder's own hex branch goes through
  `hexNearest` too, so the two screens share one route from a hex to a ranking (F-246's review, M1).
  F-250, which rebuilds the Finder to 09, keeps that route.
- E-210 and E-212.
- `bookmarks.test` adapts with its decoys kept.
- R9 §4 E4 lists the facets sheet and the count line's place.

## Revisit when

- A mockup draws the overflow's contents or a chosen family chip.
- The lexicon gains temperature words.
- The corpus gains an era.
- F-299 re-examines the violet-greys.
