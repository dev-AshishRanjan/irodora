# ADR-0146: The colour page says what 06 says, made true, and in Japanese takes 26's words on 06's layout

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Builds on** | ADR-0065, ADR-0060, [ADR-0112](0112-the-serif-ships-as-gelasio-regular-and-the-mincho-as-noto-serif-jp-because-the-drawings-measure-there.md), [ADR-0121](0121-type-drawn-off-the-scale-takes-its-step-within-4-dp-and-a-measured-step-beyond.md), [ADR-0135](0135-the-bookmarked-colours-are-read-back-on-the-atlas-through-a-toggle-in-its-search-field.md), [ADR-0140](0140-every-atlas-card-prints-its-oklch-line-ends-in-its-authored-season-and-prints-no-era.md) (the contrast drawn in D2), [ADR-0142](0142-the-atlas-says-what-05-says-made-true.md) D5 |
| **Applies** | R9 §2, §3 P1/P2, §4 E1/E2, §6 C3/C6/C8/C20, §8; golden rules 11–14; FR-21, FR-23, FR-24, FR-61 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`06` prints a historical provenance (*Edo period dyeworks manuscript (1842)*), *Era: Edo Period*,
*Cultural Heritage*, *Verified*, a P3 triple that is sRGB ÷ 255, and garments no person owns. The
corpus holds 120 Irodora originals: `japanese-inspired`, no era, 96 with no season, every one
self-reviewed. `26` draws the same page in Japanese, in a different composition. C3 gives `06` the
layout and `26` the headings and the Japanese typography, and leaves the Japanese readout's form to
F-247.

## Decision

- **D1 Words.**
  - Back: *Atlas* / 色図鑑 (the Atlas tab's word; `26`'s 伝統色一覧 is classification-false, E1).
  - Headings: *Scientific Colour Space Readout Table* / 測色値と表色系; *Provenance & Review* /
    コーパス典拠と査読; *Wearable Combinations* / 着こなしの配色調和. *Color* is §2's misspelling.
  - Actions: *Wear It (Build Outfit)*, *Hold as Target in Lens*.
- **D2 The pill.**
  - *Family: group romaji (group en) • Era: era | None • Season: seasons | Not assigned*.
  - The segments are labelled, so an absent value is stated, not left blank (FR-21). Era stays visible
    on the surface FR-24 names.
  - ADR-0140's unlabelled Atlas line ends instead; the difference is the label.
  - Its words are drawn at `label` (measured: about 12.2 dp an em, nearer 14 than 10.3).
- **D3 The provenance card.**
  - The bold lead is the classification (FR-23, ADR-0065).
  - The body is source · source type · licence (FR-24).
  - The review line is *Editorial Review / 査読ステータス: independence, verified date*, with the seal
    only where a check is recorded (F-084).
- **D4 The readout.**
  - Hex, OKLCh (3/3/1 decimals, joined by ` • `), CIELAB (1 decimal each), sRGB (the hex's bytes).
  - Display-P3 is the engine's conversion of the record's canonical XYZ, at 3 decimals, computed at
    render through `engine.ts`; the bundle does not carry it.
  - For an entry outside sRGB (1 of 120), the hex row says *nearest sRGB rendering, ΔE00 n.nn* (E2,
    rule 11).
  - A P3 component outside [0, 1] is printed as converted, with the same note form.
- **D5 Japanese.**
  - `06`'s layout.
  - `26`'s three headings.
  - `26`'s Japanese typography where `26` draws the same element: the kanji at `kanjiHeroJa`; the
    provenance lines at `body`, which `26` draws (measured about 16.3 dp an em) where `06` draws `label`.
  - The readout stays `06`'s table, with the catalogue's notation labels: one layout (§6), and the
    sweep holds `06`'s elements in Japanese. `26`'s grid and its cell labels belong to the grid.
  - Not adopted (C3): the title, the hero card with text on the photo, the description, the next-card
    peek, the kasane, the hanko seal, `26`'s two actions.
- **D6 The second layer.** It is drawn in the entry's own colour, at its drawn size, hidden from
  assistive technology. Measured, it is: `#56646F` against the hero's `#576876`, the same colour in
  the JPEG's noise, so no tint is invented beside the colour being judged (rule 12).
- **D7 The kanji, measured from NotoSansJP's outlines** (`serif-weight.mjs --em`, calibrated within
  about 1 % once its subset carried the word):
  - `06.kanji`: 50.5 dp an em (62.4 px). F-220's 53 dp read the box as the em. Its stems read 310–346 on
    the weight axis: lighter than the bundled 400 cut, which is all the app carries. It is set at 400,
    and the lighter drawing is named here, not faked (ADR-0112).
  - `26.hero.kanji`: 39.2 dp an em (50.7 px), stems 382–430: the regular cut, 400. Its recorded
    *title 600* was the step's default, not a reading.
  - Both are measured steps (ADR-0121): `kanjiHero` bound to `06.kanji`, `kanjiHeroJa` to
    `26.hero.kanji`, each at its element's em.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| Keep *Cultural Heritage* / *Historical Provenance* / *Verified* | FR-23 and E1: an original presented as heritage; a self-review presented as verification |
| Omit Era and Season when empty | Era vanishes from the surface FR-24 names; a drawn, labelled segment is lost |
| Print the classification in the Era slot | One label, two meanings |
| P3 as sRGB ÷ 255 (as drawn) | A false conversion |
| A P3 field in the bundle | A content-schema change and a corpus rebuild (E-001), for a value the engine derives exactly |
| The grid in Japanese | Two layouts for one screen; a locale-scoped supersession in the sweep |
| `26`'s hero in Japanese | Two layouts |
| A 300 cut for 06's kanji | A second Japanese face file for one element, against ADR-0112's one cut |

## Evidence, and its limits

- **It rests on:** `06.json` and `26.json`; the 120 records and their `unknowns`; the gamut census
  (1 of 120); `derive.ts`; the golden-tested `xyzToDisplayP3`; R9 C3; `inventory-surfaces.json`; the
  em and weight readings above.
- **The limits:**
  - Japanese copy awaits OQ-5.
  - A JPEG's stems read with a spread of about ±50 on the axis.
  - It was not tested with people.

## Consequences

- `src/detail.ts`, `engine.ts#displayP3Of`, the new keys, two measured steps.
- R9 §4 and §6 C3 rows updated.
- F-265 notes the table.

## Revisit when

- OQ-48 or OQ-5 is answered.
- A cleared source gives an entry an era.
- A person's comparison asks for the grid, or for 06's lighter kanji.
