# ADR-0140: Every Atlas card prints its OKLCh line, ends in the season it was authored with, and prints no era

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Closes** | OQ-17, OQ-18 |
| **Builds on** | [ADR-0065](0065-the-seed-corpus-is-coined-not-canonical-and-constructed-not-measured.md); [ADR-0005](0005-measurement-provenance-is-a-type.md); [ADR-0138](0138-home-leads-with-the-days-corpus-colour-as-01-binds-it-and-draws-no-reading.md) D1 (the OKLCh precision) |
| **Applies** | R9-MOCKUP-FIDELITY §2 (siblings), §4 E1, §8; golden rules 11, 12 and 14; FR-20, FR-23, FR-24; ACCESSIBILITY A3 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`05` draws four cards. Each has a sample, then the kanji with the hex at its right, the romaji, an OKLCh line, and a last line in `text.tertiary`.

- **The last line** reads *Heian Era*, *Spring*, *Heian* (cut) and *Edo Era*. The drawing uses one slot for an era **or** a season (`05.card-N.era`, bound `oq:OQ-17`).
- **Card 4 has no OKLCh line.** Its last line sits where the OKLCh would be.

**What the corpus holds** (all 120 entries, read):

| field | entries holding it | why the others do not, in each entry's own `unknowns` |
|---|---|---|
| `taxonomy.era` | 0 | *"an Irodora construction of 2026 belongs to no historical period, and claiming one would be the dishonesty ADR-0065 exists to prevent"* |
| `taxonomy.season` | 24 (six per season, one each) | *"assigned only in the Seasonal group, where the season is the editorial premise of the colour"* |
| `derived.oklch` | 120 | — |

## Decision

**D1: Every card prints the OKLCh line (OQ-18).**
- Form: `OKLCh: L • C • h°`, from the entry's frozen `derived.oklch`, at 3, 3 and 1 decimals (the precision the corpus is authored at, as on Home).
- Card 4's omission is sample content (E1). The fourth position is filled by whatever the query and filters leave, so "the fourth card has none" cannot be a rule. No entry lacks the value.

**D2: The last line is the entry's authored season (OQ-17).**
- The words are the catalogue's (`season.*`: *Autumn*, 秋). Several seasons are joined by ` · ` in Latin and `・` in Japanese.
- **Where no season is authored, the line is not drawn**, as `05` draws card 4 ending a line early. Cards in a row keep one height by stretching.

**D3: No era is printed.**
- No entry holds one, and none is authored: rule 12 and `content/AGENTS.md` rule 3 forbid an era with no source, and each entry's recorded unknown says why.
- A test holds `taxonomy.era` null for every published entry, with a planted era as its decoy. A corpus that gains a sourced era fails it until its display is decided.

**D4: The inventory rebinds** `05.card-N.era` to `corpus:entry.taxonomy.season`, and records the E1 departures (`05.card-4`; `05.card-1/3/4.era`).

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Authored eras** | A historical claim with no source, on colours the corpus says belong to no period (rule 12, ADR-0065, FR-23) |
| **A line on every card** (*No season*, *—*, *Year-round*) | A negative or invented fact on 96 of 120 cards. *Year-round* (通年) claims a usage the corpus never authored |
| **The classification in the slot when there is no season** | One slot with two meanings: a reader would infer that *Spring* entries are not *Japanese-inspired* |
| **OKLCh on some cards only** | Needs a rule nothing defines; it removes a drawn element from three cards in four. A3 asks every swatch for its numeric value |

## Evidence, and its limits

- **It rests on:** `05.json`; the 120 `content/colors` records (season and era census, `unknowns`); 05's own card 2 (a season in the slot) and card 4 (a line missing, the next moving up).
- **The limits:**
  - 96 cards end one line shorter than drawn; the person's comparison (F-246 criterion 4) judges it.
  - It was not tested with people.

## Consequences

- `src/atlas.ts` gains `seasonLine` and `atlasOklch`.
- `atlas.test` holds era null and the season line present if and only if a season is authored, each with a decoy.
- R9 §4 E1 and §8 gain the `05` lines. PRD §10 and R9 §11 close OQ-17 and OQ-18.

## Revisit when

- A cleared source gives an entry an era (the test fails first).
- A mockup draws the slot empty or filled differently.
- The person's comparison finds the short cards wrong.
