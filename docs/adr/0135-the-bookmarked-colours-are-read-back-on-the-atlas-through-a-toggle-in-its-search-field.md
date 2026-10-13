# ADR-0135 — The bookmarked colours are read back on the Atlas, through a toggle in its search field

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-13 |
| **Feature** | F-237 |
| **Closes** | OQ-39 |
| **Builds on** | [ADR-0118](0118-the-app-bar-and-the-action-bar-are-placed-by-screen-and-the-sheet-by-its-form.md) (the app bar); [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) D3 (the two empty forms); [ADR-0129](0129-a-screen-declares-its-data-conditions-and-the-state-each-shows.md) (declared conditions); [ADR-0105](0105-a-face-stays-out-of-the-plaintext-archive.md) (`ARCHIVE_TABLES` is its own list) |
| **Applies** | R9-MOCKUP-FIDELITY §4 E4; golden rules 12, 13 and 14; FR-56, NFR-13 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

Mockup `06` draws a bookmark in its app bar: `06.bookmark`, order 4 under `06.header`, glyph
`bookmark`, action `toggle:bookmark`, drawn 14.5 × 18 dp. F-237 asks that a bookmark persist, and
that the saved set be *"reachable from where F-220's inventory places it"*.

**No inventory places it.** The inventories bind a bookmark on `06` and nowhere else:

- `05`'s filters are season and family;
- `23`'s profile draws no saved list;
- Home's saved-colour reader (`01`) is the last Lens reading, not a set;
- no route exists for one.

A bookmark nobody can read back is a write with no reader. Until 2026-10-05 an undrawn surface was
a person's to design (golden rule 14). The person then delegated every open question, an undrawn
surface included, provided it is composed from the mockups' own components and vocabulary (R9 §11,
*Widened*).

What was read before deciding:

- **What a bookmark is here.** Only `06`, the page of a colour **in the corpus**, draws the toggle.
  So every bookmarked colour is a corpus entry, and the Atlas already lists every corpus entry
  (FR-20). Reading the set back means showing a subset of a list that already exists.
- **`05`'s drawn structure.** It has a title with an overflow (`05.more`, `open:atlas.menu`; no
  mockup draws the menu's contents), a count pill, three outlined pills (Compare · Finder ·
  Palettes, each a navigation), the search field `05.search` (349 × 26.5 dp, a leading search
  glyph, nothing at its trailing end), the season chips, the family chips, and the grid.
- **Platform conventions:**
  - UIKit's `UISearchBar` has `showsBookmarkButton`, a bookmark at the trailing end of the search
    field, for reaching saved items from where items are searched.
  - Material 3's search bar puts optional trailing icons inside the bar.
- **The store.** `saved_color` cannot hold a bookmark. A bookmark is not a reading:
  - a bookmark row could not be told apart from a palette member's or a garment's colour;
  - `reusableColorId` shares one row between them, so removing a bookmark through `deleteColor`
    would tombstone a colour a palette uses;
  - `upsertColor` never clears `deleted_at`, so a colour bookmarked again would never return;
  - Home's `lastReading` shows the newest live `saved_color` row whatever its source, so a
    bookmarked corpus colour would be shown as the person's *last reading*. That presents a
    published value as a measurement (rule 11).

## Decision

**D1 — The set is read back on the Atlas (`05`), through a bookmark toggle at the trailing end of
its search field.**

- The glyph is `bookmark`, the one `06` draws.
- On, the Atlas lists only bookmarked colours, in corpus order.
- It adds one control inside an element `05` already draws, in space that element leaves empty. It
  adds no route, no section, no row, and no change to `05`'s chips, pills or grid.

**D2 — On is a shape and a stated state, on both controls (rule 13).**

- **The shape:** the glyph is drawn filled; off, it is drawn as an outline. `bookmark` joins the
  fillable glyphs. No mockup draws its filled drawing, so it is listed in §4 E4.
- **The stated state:** the control announces *selected*.
- **The ink does not change.** The glyph keeps `06`'s ink (`foreground`, since `06.bookmark` binds no
  token), so colour is never the channel.
- `IconButton` takes `selected`, which sets the fill and the announced state from one prop. It
  compiles only for a glyph that has a filled drawing.

**D3 — An empty set is `00`'s caption (ADR-0128 D3, `resolvedHere`), never an empty list.**

- With the toggle on and nothing bookmarked, the caption says so, and says how to bookmark one.
- The way out is on the screen: the toggle itself. So, by F-139's rule, there is no second
  control and no `27` card.
- If bookmarks exist but none matches the query and filters, the Atlas's existing caption shows,
  since the query and filters are what to change.

**D4 — The toggle combines with everything else (AND), and *Clear* clears it.**

- It narrows together with the query and every filter.
- The count line (*Showing n / N*) counts with it.
- *Clear* turns it off with the rest.
- It is screen state, not stored. A filter that silently narrows the Atlas at the next launch would
  hide the corpus behind a state nobody remembers setting.

**D5 — On `06`, the toggle sits in the app bar's trailing slot as it stands today.**

- `atlas/[slug]` is still on the platform header (F-234's ratchet, `PLATFORM_HEADER` in
  `chrome.test.ts`), so its `headerRight` is the current trailing slot.
- Moving the header to `AppBar`, and the toggle with it, is F-247's job (ADR-0118). F-247 keeps the
  toggle. F-246 keeps the field's toggle.

**D6 — A bookmark is a pointer, in its own table.**

- `color_bookmark` holds one row per corpus slug:
  - the sync columns, with the id a UUIDv7 (data-model §2);
  - `corpus_slug TEXT NOT NULL UNIQUE`;
  - a tombstone on removal;
  - a change-log entry for every write.
- Bookmarking a removed colour again revives the same row.
- It stores no colour value. The colour and its provenance are read from the pinned corpus by
  slug, so rule 12 holds by construction, as `profile_dimension_color` already does.
- It is in `SYNC_TABLES` and in `ARCHIVE_TABLES`. A bookmark is something the person made, so it is
  in their backup (migration 8's line), and erasure reaches it with every other table.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **A section on Home (`01`)** | `01` is fully drawn and governs the tab bar (C1). A section there is a departure on the most-seen screen, and Home's colour reader is a reading, which a bookmark is not |
| **An entry in the profile (`17`/`23`)** | The profile describes the person's colouring. A saved list there implies the set has something to do with what suits them, which nothing computed says (rule 11) |
| **A new route, *Bookmarks*** | A whole undrawn surface, which still needs an entry point drawn somewhere. It would design the most to answer the least |
| **A chip in `05`'s season row, or a third chip row** | It changes a drawn row, and it puts the person's own set among the corpus's taxonomy (season, family), where *All* would then mean two things |
| **A fourth pill beside Compare · Finder · Palettes** | Those three open other routes. A filter among them reads as a navigation that goes nowhere, and it changes the drawn row of three |
| **The `05.more` overflow menu** | The menu's contents are undrawn and are F-246's. A filter hidden in a menu narrows the list with no sign on screen, which then needs a second departure to show it |

## Evidence, and its limits

- **It rests on:**
  - `05` and `06`'s inventories;
  - the platform conventions above;
  - the fact that only corpus colours can be bookmarked.
- **It was not tested with people.** Whether a person finds a 24 dp glyph inside the search field
  is not measured. The device run (F-237's attestation) shows the control works, not that it is
  found.
- **`05` draws the field 26.5 dp tall.** When F-246 builds it to that height, the toggle's hit
  area must still reach the tap target. Android does not deliver a touch outside the parent's
  bounds, so the field's touch container must reach it. This is recorded on F-246.
- **The database is very likely not encrypted today** (F-336): SQLCipher is not linked into the
  build. The bookmark lives in the same file as everything else, and is protected exactly when
  F-336 lands. This decision does not change that, and claims nothing about it.

## Consequences

- F-237's second criterion is amended in the open, as F-221's was for OQ-53. It now reads: *"reachable
  from the Atlas (05), through the bookmark toggle in its search field that ADR-0135 places there
  (OQ-39)"*.
- F-246 is blocked by F-237, and both F-246 and F-247 carry notes to keep their toggle.
- R9 §4 E4 lists the departure. R9 §11 and PRD §10 close OQ-39.
- **Revisit:**
  - when F-246 decides `05.more`'s contents;
  - when OQ-40 (the lookbook, the same question for outfits) is answered, so that saved things are
    found in one consistent way. **Revisited 2026-10-14 by [ADR-0136](0136-the-lookbook-is-read-back-on-the-wardrobe-through-a-garments-lookbook-choice-and-a-saved-outfit-is-never-rescored.md): kept.**
    Colours are a subset of the Atlas, so a toggle narrows it; outfits are a list of their own, so a
    choice switches the Wardrobe's view. Both are read back on the list screen of their domain;
  - if a person reports they cannot find their bookmarks.
