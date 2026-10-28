# ADR-0159: 09's figures and words say what the corpus and the lexicon hold

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-27 |
| **Feature** | F-250 |
| **Applies** | R9 §2, §4 E1/E2, §8; [ADR-0125](0125-a-delta-e00-is-described-by-one-table-of-three-bands-anchored-on-published-thresholds.md), [ADR-0142](0142-the-atlas-says-what-05-says-made-true.md) D3/D5, [ADR-0155](0155-08s-figures-and-words-say-what-the-engine-computes.md) D2 (terms in the locale's language); the lessons *a word beside a figure is the printed figure's word* and *test a word on the quantity its figure measures* |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`09` prints three slider values with a word after each — *48% (Medium Deep)*, *0.045 (Muted /
Soft)*, *142° (Moss Green)* — four result cards (a name, an English name, `hex • ΔE00`, and an OKLCh
line on the first), three chips — *[Natural Phrase] [Japanese Kanji] # Hex Code* — and a title
*Colour Finder • 検索*. R9 §8 leaves the slider readings to this feature: *"the lexicon terms holding
the value"*.

The published lexicon (`content/rules/phrase-lexicon.2026.08.1.json`) names lightness (*dark*,
*medium*, *light*; *pale* also needs C ≤ 0.06), chroma (*grey* and *neutral* to 0.039, *muted* and
*soft* 0.02–0.07, *vivid* from 0.10) and nine hues, each with a chroma floor of 0.039 (*brown* also
needs L ≤ 0.55). Japanese has ten terms: no *medium*, *grey*, *neutral* or *soft*, and five hues of
nine. *Medium Deep* and *Moss Green* are no term; *Muted / Soft* is exactly the two synonyms that hold
0.045, joined — the drawing's own evidence for the rule.

## Decision

- **D1. The sliders** take CSS Color 4's OKLCh reference ranges (*"for L: 0% = 0.0, 100% = 1.0"*;
  *"for C: 0% = 0.0 100% = 0.4"*):
  - L 0–100 %, step 1 %, printed `Math.round(L × 100)` %;
  - C 0–0.400, step 0.001, printed to 3 dp;
  - h 0–359°, step 1°, printed `Math.round(h) mod 360` (359.6 prints 0°).

  The labels are as drawn: *Lightness (L) · Chroma (C) · Hue (H)*. Each slider's accessible name says
  it is the OKLCh axis of the search point (ADR-0158 D6).
- **D2. The readings.** After each figure, in the script's parentheses, the locale's terms whose
  **naming axis** is this slider's and whose whole region holds the **printed** point (all three
  printed figures):
  - a term's naming axis is hue if it constrains hue, else lightness if it constrains lightness, else
    chroma — so *pale* and 淡い are read on lightness and *brown* on hue, and the hue terms' chroma
    floor and *brown*'s lightness cap are conditions, never readings of their own;
  - in the lexicon's file order, each capitalised in Latin (`09`'s *Muted / Soft*), joined ` / ` in
    Latin and `・` in Japanese;
  - where none holds: *No term* / 該当語なし — never a blank, which would read as a failure (F-236).

  The word describes the printed figure, so at a boundary it agrees with what the person reads.
- **D3. The result cards** print one form (ADR-0161 D2):
  - the name: `nameLine` (`08`'s kanji and capitalised romaji), one paragraph that wraps;
  - the English name in parentheses — corpus content, in both locales (ADR-0142 D5);
  - `‹hex› • ΔE00 ‹printedDeltaE00›` (2 dp, ADR-0125), one paragraph;
  - on the nearest card only, as drawn, the record's OKLCh at 3 / 3 / 1 (`oklchLine`), the precision
    `05` and `06` print. `09`'s two- and three-digit figures are sample content (E1).
- **D4. The chips:** *Natural Phrase · Colour Name · # Hex Code* (ja ことば · 色名 · # 16進コード).
  - *Japanese Kanji* is an **E2** row: the name search reads kanji, kana, romaji, English and slug,
    so the drawn word would say a romaji or English query was read as kanji.
  - The brackets are notation (§2's bracket bullet widens from outlined to filled pills, as
    ADR-0142 D3 reads `05`'s).
  - The `#` stays: it is the hex's own notation.
- **D5. The title:** the ja `finder.title` is 検索, the word `09` draws, so the English title reads
  *Colour Finder • 検索* through `japaneseRun('finder.title')`; in Japanese the run would repeat the
  title and is not drawn (ADR-0142 D5's OQ-48 interim, applied, not decided). The ja `atlas.finder`
  follows, so `05`'s chip and the page it opens share one name.
- **D6. The headings** are kept as drawn. Neither is a claim: *Instantaneous* is true, because the
  results are recomputed in the render that makes the change (ADR-0158 D4).

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| A term read on every axis it constrains | *Medium / Brown* on lightness; *Pale* on chroma |
| A reading of the exact, unprinted value | A word that contradicts the figure beside it at a boundary |
| English terms where Japanese has none | Mixes languages on one line; F-249 reads the locale's own |
| Blank where no term holds | A bare absence (F-236), indistinguishable from a failure |
| *Japanese Name* | Still false for an English-name match |
| Keep 色さがし in Japanese | The page and `09`'s run would name it two ways |
| OKLCh on every card | A line `09` draws on one card only |

## Evidence, and its limits

The census (F-250, increment 1), at every printed value of each axis:

| | lightness (101) | chroma (401) | hue (360, at C ≥ 0.039) |
|---|---|---|---|
| no English term | 0 | 29 (0.071–0.099) | 0 |
| no Japanese term | 33 (40–72 %) | 49 (to 0.019, and 0.071–0.099) | 132 |

The longest English reading is *Grey / Neutral / Muted / Soft* (C 0.020–0.039); the longest
Japanese, 明るい・淡い. The corpus medoid — the start point — reads *Medium*, *Grey / Neutral* and no
hue term in English, and no term on any axis in Japanese.

The Japanese terms have not been reviewed by a competent speaker (ADR-0060). The Japanese gaps are
the lexicon's: the hues are F-353's, and lightness and chroma are filed as F-356.
