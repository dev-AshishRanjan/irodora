# ADR-0138 — Home leads with the day's corpus colour as `01` binds it, and draws no reading

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-20 |
| **Feature** | F-242 |
| **Amends** | F-337's acceptance (in the open, as ADR-0135 and ADR-0136 amended F-237's and F-238's) |
| **Supersedes in part** | F-164's *"a reading leads"* and F-146's reading block on Home |
| **Builds on** | [ADR-0124](0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md); [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) D3; [ADR-0129](0129-a-screen-declares-its-data-conditions-and-the-state-each-shows.md) D1; [ADR-0133](0133-motion-is-the-change-a-drawn-binding-defines-and-a-length-may-move-where-a-colour-may-not.md) D1; [ADR-0135](0135-the-bookmarked-colours-are-read-back-on-the-atlas-through-a-toggle-in-its-search-field.md); [ADR-0136](0136-the-lookbook-is-read-back-on-the-wardrobe-through-a-garments-lookbook-choice-and-a-saved-outfit-is-never-rescored.md); [ADR-0065](0065-the-seed-corpus-is-coined-not-canonical-and-constructed-not-measured.md); [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) |
| **Applies** | R9-MOCKUP-FIDELITY §1, §3 P1 and P2, §4 E1 and E2, §8 row `01`; golden rules 11–14; FR-23, FR-24, FR-42, FR-71, FR-73 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

**What `01` draws.** A hero card with a corpus colour — kanji, kana, *Romaji (English)* and OKLCh
set on the sample, then *What Goes With This →*; a Wardrobe Preview with a count pill and five
tiles; and *"Today's Traditional Color Card"*, whose sample is the hero's colour. The bindings:

- `01.hero.sample*` and `01.colour-card.*` bind `corpus:entry.*`;
- `25` binds the same hero `corpus:today.*`;
- R9 §8 binds the hero's OKLCh to the corpus derivation.

`01` draws no "last reading".

**What Home did.**

- It led with the newest live `saved_color` row, labelled *Last reading* (F-164), else with today's
  colour.
- That row was of any source, so a palette's corpus colour saved after a reading was shown as one
  (F-337, golden rule 11).
- F-236's and F-237's notes to F-242 presumed the block would be rebuilt.

**Where readings live.**

- `saveColor` has no caller in the app (`provenance.test.ts`; nothing under `apps/mobile/src` or
  `app/` calls it).
- The Lens persists a reading only as a garment's colour (`colourFromReading`, source `estimated`,
  with its conditions).
- So "the last reading" was always a garment's measured colour — or, the defect, a palette's or a
  garment's corpus colour — and a garment's colour is what `01`'s Wardrobe Preview already draws.

**What reaches the reading route.** Only Home pushes `/atlas/with/reading/[id]`. `03`'s *Wear It*
draws the other way in (`03.actions.wear`), which F-244 builds.

## Decision

**D1 — The hero is the day's corpus colour, always.**

- `colourOfTheDay(now)`: the sample at full width and 172 dp, with `01`'s 2.5 dp keyline.
- Its kanji, kana and name set on the sample through `Text on`. The name line takes `01`'s form: the
  romaji, capitalised, with the English in brackets.
- The OKLCh line: `coord.oklch` and the entry's derivation at 3, 3 and 1 decimals, separated by `•`.
- *What Goes With This →* opens `/atlas/with/[slug]`. It is absent when nothing is wired (F-202).

**D2 — Home draws no reading block.**

- Home reads no `saved_color` row except a garment's own colour (`HomeStore` is `listGarments()`).
- A measured colour appears as its garment's tile, announced with its stored provenance and
  confidence. The tile opens `/wardrobe/with/[id]`, where `24` prints *"Estimated from a capture"*
  (C16).
- `/atlas/with/reading/[id]` is declared unreachable, with `closedBy: F-244`, until `03`'s *Wear It*
  reaches it.

**D3 — One absence.**

- The wardrobe panel's: `27`'s card where Home is given the Lens, `00`'s caption otherwise, in
  `01.wardrobe`'s place.
- There is no reading panel, so there is no "no readings" condition (ADR-0129 D1).

**D4 — The colour card.**

- Heading: *"Today's Japanese-Inspired Colour"*, ja 「日本に着想を得た今日の色」.
  - It keeps the drawn place and about the drawn length (32 characters against 30), and states the
    real classification (E1, FR-23).
  - "Card" is dropped to hold the length.
  - A test holds the heading true against every published entry.
- Note: the entry's own `provenance.source`, verbatim, set in Latin in both locales. It is a
  citation, printed raw as the colour page prints it.
- Sample: 52 × 40 dp.
- No action: `01` records none.

**D5 — The tiles.**

- The five newest live garments, each in its own colour with its provenance.
- Each named for the garment, its colour and, where recorded, its material.
- Each opens `/wardrobe/with/[id]`, the only route keyed by a garment id, and the one the Wardrobe's
  own garments open. The inventory's `/wardrobe/[id]` names no route, and `01`'s and `25`'s records
  are corrected.
- 52 dp at 384 dp; shrinking, to keep `01`'s single row of five, on narrower phones.

**D6 — The count pill.**

- *N Garments • M Valid Outfits*, where M is `coverage().valid`, the count FR-42 defines at the
  threshold it carries.
- The threshold is in its accessible name.
- English singular forms have their own keys; Japanese joins a figure to its counter with no space.
- It is coverage, not the lookbook (ADR-0136).
- With no stored profile, `coverage()` has nothing to count against, so the pill prints the garment
  count alone and invents no figure: a new §4 E2 row.
- The coverage context is assembled once, for Home and the Wardrobe (`coverageContext`,
  `placeableGarments`).

**D7 — The header's words are `01`'s.**

- *What colour is this. / What goes with it. / Does it suit me.*: one heading, in the serif at
  `body`, and in the gothic in Japanese (C6).
- *"100% On-Device Engine • Offline"*, as drawn. It is true by ADR-0051, and it is the claim the
  splash already ships (*"100% On-Device & Offline"*).

**D8 — No motion.** Home's per-section entrance stagger is not rebuilt: `01` implies none
(ADR-0133 D1).

**D9 — F-337 is amended, in the open:**

1. *"Home presents no stored colour as a reading: it reads no saved_color row but a garment's own
   colour, drawn on that garment's tile with its stored provenance — shown by a test with a
   Lens-read garment and a palette saved after it (the decoys: the palette's colour is the newest row
   and appears nowhere on Home, and the measured colour appears only on its tile, announced as
   estimated with its confidence)."*
2. *"With no garment at all, Home draws 27's empty-wardrobe card (00's caption without the Lens) and
   no colour but the day's corpus colour, whatever palettes exist."*

F-337 waits on F-242, writes no code, and closes on its gates and these tests.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **The hero leads with the newest Lens reading** (today's behaviour, sources fixed) | The hero's values would no longer be bound as §8 states (F-242 criterion 2). A reading has no kanji, kana or name, so three of four drawn texts would be empty or invented, and no §4 category covers the departure (§1). A reading set where a corpus name stands risks being read as a corpus colour (rule 11) |
| **A "Last reading" card added to `01`'s column** | An undrawn block (criterion 3, rule 14). ADR-0135 and ADR-0136 rejected sections on Home as "the most-seen, fully drawn screen" |
| **The colour card shows the reading** | Its heading and every binding are today's corpus entry; rebinding it is a departure nothing forces |
| **The hero shows the reading, with "Last reading" in the kanji slot** | The same as the first, with copy `01` does not draw, in a script it does not draw there |

## Evidence, and its limits

- **It rests on:** `01.json`'s and `25.json`'s bindings, R9 §8, the `01.mjs` record ("a corpus
  colour"), `provenance.test.ts`, `wardrobe.ts`, `createRepository.ts`'s writers, and
  `verify-reachability`.
- **The cost is a real loss, and stated.** Home stops showing "what was read" (F-146 criterion 2,
  F-164's order), and the reading route has no way in until F-244.
- **No information is lost.** The measured colour stays one tap from its combinations, through its
  tile.
- **It was not tested with people.**

## Consequences

- `lastReading` and `homeLead` are deleted.
- The `home.noReadings*`, `home.lastReading`, `home.today*` and `home.takeReading` keys go.
- `unreachable-routes.json` carries one entry.
- R9 §4 E2 gains the count row, and R9 §2 lists `01`'s scroll cut as not design.
- `data-model.md`'s sentence is corrected.
- F-146, F-164 and F-202 carry "SUPERSEDED IN PART BY F-242" notes.
- F-337 is amended and waits on F-242. F-244, F-255, F-256 and F-259 carry notes.

## Revisit when

- A mockup draws a reading on Home.
- F-244 reaches the reading route.
- F-267's comparison, or a person, reports missing the last reading.
