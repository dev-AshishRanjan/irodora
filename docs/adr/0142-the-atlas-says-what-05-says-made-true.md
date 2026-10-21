# ADR-0142: The Atlas says what 05 says, made true

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Builds on** | [ADR-0138](0138-home-leads-with-the-days-corpus-colour-as-01-binds-it-and-draws-no-reading.md) D4 (日本に着想を得た), [ADR-0139](0139-each-screens-page-inset-is-its-own-mockups-snapped-and-homes-is-xl.md), [ADR-0117](0117-the-tab-bar-is-01s-drawn-by-our-own-component-and-its-words-return.md) and F-234 (OQ-48's interim), [ADR-0056](0056-the-message-catalogue-is-enumerated-typescript-not-a-runtime-i18n-framework.md) |
| **Applies** | R9-MOCKUP-FIDELITY §2 (not design), §4 E1, E3; golden rules 11, 12 and 14; FR-23, FR-25 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`05`'s words include four the product cannot ship as drawn:

- the title *Colour Atlas • 日本の伝統色* ("traditional colour"; R9 §4 E1 names it);
- the count *120 Sourced Colours* (a provenance claim);
- the pills *[Compare] [Finder] [Palettes]* (square brackets inside outlined pills);
- *Color Family* beside the screen's own *Colour*.

No open question covers 05's brackets: OQ-23 asks about 13, 16, 17 and 18. The Japanese locale's form of an "English • 日本語" title is OQ-48's. It is still open, with an interim: each title shows the catalogue's words for the locale (F-234).

## Decision

**D1: The title.**
- en: *Colour Atlas • 日本に着想を得た色*; ja: *色図鑑 • 日本に着想を得た色*.
- The run 日本に着想を得た色 replaces 日本の伝統色: the real classification, in Home's words (ADR-0138).
- It is one heading, leading, and it wraps (E3). It is set at `body` 600: re-measured by the
  line-box rule, its Latin inks 26 px (about 17.8 dp an em) and its six kanji 172 px wide (about
  14.3 dp each). F-220's 26 dp read the line box as the em, which the drawn width cannot hold.
- A test holds every published entry `japanese-inspired`, with a planted `traditional` entry as its decoy.
- **The heading *Atlas* was re-measured by the same rule** (recorded here at F-246's review, M4). Its
  ink is 21 px tall (A, t and l, about 0.73 em), so about 14.4 dp an em: `label` 600, not the `body`
  F-220 read from its line box. `05.json` records it with `raw.emDp` 14.4, and the type census
  holds it.

**D2: The count.**
- *120 Original Colours*; ja 「120のオリジナル色」.
- "Original" is the catalogue's word for both classifications the corpus holds (*Irodora original*).
- The figure is the pinned bundle's entry count.
- A test holds every entry's classification within those two (decoy: a planted `traditional` entry).
- The accessible name adds the corpus version (FR-25).

**D3: The three pills read *Compare*, *Finder* and *Palettes*.**
- The brackets are notation, not copy. The outline already says "button", and a bracket inside it is a second delimiter: the wireframe convention for a label placeholder, as 06's bracketed names already are.
- This decides `05` only. OQ-23 stays open for headings and roles on 13, 16, 17 and 18.

**D4: *Colour Family*.** The en catalogue is en-GB, and `05` spells *Colour* twice. *Color* is §2's misspelling bullet.

**D5: The Japanese runs (OQ-48's interim, applied, not decided).**
- A Japanese run drawn beside English is read from the Japanese catalogue (`japaneseRun`), so it is written once.
- In Japanese, a run that would repeat the word in the same script is not drawn: season pills read 「春」.
- Corpus content (the family chips' romaji and kanji) prints as authored in both locales.

**D6: The page inset** is 05's 17.5 dp, which snaps to `md` (ADR-0139 applied).

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Keep 日本の伝統色 / *Sourced*** | FR-23 and E1: presents an inspired corpus as traditional and sourced |
| ***120 Japanese-Inspired Colours*** | Classification-true, but 28 characters against 19 drawn, repeating the title |
| ***120 Curated Colours*** | True of today's provenance (*editorial curation*), but not a classification word |
| **Keep the brackets as copy** | No platform convention brackets a button label; it doubles the outline's job |
| **Keep *Color*** | Two spellings on one screen in an en-GB catalogue |
| **Decide OQ-48 here** | It blocks F-265 and covers nine mockups; F-246 needs only the interim |

## Evidence, and its limits

- **It rests on:** `05.json`; the catalogue's classification words; all 120 records' `classification`; 06's not-design record; DEFAULT_LANGUAGE_TAG `en-GB`.
- **The limits:** the Japanese copy awaits OQ-5's competent-speaker review; it was not tested with people.

## Consequences

- New and changed keys, in both catalogues; a font-subset re-cut if coverage asks.
- 05's inventory records the brackets and *Color* as not design.
- OQ-23's four features get a note. F-265 inherits D5.

## Revisit when

- OQ-48 or OQ-23 is answered.
- The corpus gains a classification other than the two.
- A reviewer of the Japanese objects.
