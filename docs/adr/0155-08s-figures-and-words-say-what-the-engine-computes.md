# ADR-0155: 08's figures and words say what the engine computes

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-27 |
| **Feature** | F-249 |
| **Applies** | R9 §4 E1/E2, §8; FR-3, FR-5, FR-6, FR-48, FR-61; [ADR-0124](0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md), [ADR-0125](0125-a-delta-e00-is-described-by-one-table-of-three-bands-anchored-on-published-thresholds.md), [ADR-0131](0131-the-cvd-preview-is-machado-at-full-severity-on-every-token-and-sample-and-is-never-stored.md), [ADR-0142](0142-the-atlas-says-what-05-says-made-true.md) D3/D5, [ADR-0151](0151-07s-occasions-slots-and-figures-say-what-the-engine-computes.md) D4 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`08` prints, for a pair:

- ΔE00 with *Perceptible Shift*, ΔEok, ΔL\* with *B is lighter*, ΔC\* with *B is more chromatic*, ΔH
  with *Shift towards teal*;
- a contrast cell, *1.48:1 • Non-Text / Harmonious Pairing*, over *(APCA Lc: 16.2)* (claims-ok: quotes the drawn construction this record resolves);
- three rows, each *92% Separation (Safe)* (claims-ok: quotes the drawn construction this record resolves).

Each name and figure is sample content (E1). The sentence form, the pairing verdict and the safety
suffix are claims the engine does not make (E2).

**F-249's census over the pinned corpus** (120 entries, 14,280 ordered pairs):

- ΔE00: every pair prints in the *perceptible* band (≥ 1.8). No component band ever exceeds the
  total's.
- The floored WCAG ratio: 8,848 pairs under 3:1, 2,114 at 3:1 or more, 1,774 at 4.5:1 or more, 1,544
  at 7:1 or more. Rounding would lift 14 pairs across 3:1 that flooring keeps under it.
- The two APCA directions floor to different Lc in 11,814 pairs.
- The warm–cool relation: 7,530 shared, 4,586 mixed, 2,164 warm against cool.
- Hue terms: 75 of the 120 entries lie in an English hue term, 45 below the lexicon's chroma floor in
  none. **The Japanese lexicon names five hues to the English nine**, so 20 entries (orange, brown and
  teal) have an English term and no Japanese one.
- *towards*: 7,146 pairs append it in English and 5,133 in Japanese, after F-249's review (S2) — first
  7,790 and 5,623, until A was tested against B's term's hue arc rather than its whole region (D2).
- No pair prints a hue difference of 20° or more beside *Very Close in Hue*.
- 16 pairs print ΔL\* as zero where the unrounded difference is not zero.
- Every English name passes the PDF's Latin-1 writer.

## Decision

- **D1. Figures** — each the engine's, at the precision named:
  - ΔE00: `printedDeltaE00`, 2 dp (ADR-0125).
  - ΔEok: `deltaEok` of the two OKLab triples, 3 dp.
  - ΔL\* and ΔC\*: the record's CIELAB LCh, B less A, signed, 1 dp. A printed zero is unsigned
    (`signed()` takes its sign from the printed value).
  - ΔH: the hue-angle difference, `hueDelta(h_ab A, h_ab B)`, signed, 1 dp, with `°`, under the drawn
    label. The degree sign says which quantity it is; the row's accessible name says *hue angle,
    CIELAB (D65)*.
  - WCAG: floored to 2 dp, as drawn (ADR-0151 D4's floor). The Lc: the **smaller** |Lc| of the two
    directions, floored to 1 dp, so it never overstates.
  - Separations: `floor(score)` %, at severity 1.
  - The meta line: `‹hex› • OKLCh ‹L› • ‹h›°`, the record's L to 3 dp and h to 1 — two figures, as
    drawn. C is not printed.
- **D2. Readings.**
  - ADR-0125's band phrases replace the sentence form: the total's band; ΔL\* and ΔC\* through
    `axisReading(printed figure, weighted term)` (*Slightly Lighter*, *Noticeably Richer*, *Very
    Close in Lightness*); ΔH's hue band phrase.
  - ΔH's phrase is followed by *towards ‹B's hue term›*, from the published phrase lexicon in the
    locale's own language, only when all three hold: the hue band is *slight* or *perceptible*; B
    lies in a hue term of that language; A's hue angle lies outside that term's hue arc.
  - *Amended by F-249's review (S2).* The first rule asked only that A lie outside B's term, so a light
    orange A at 48° read *towards brown* beside a brown B (63 pairs: brown constrains lightness, and A
    was outside it only by lightness), and a near-grey A at 245° read *towards blue* (581 English and
    490 Japanese pairs). The words sit beside a hue-angle figure, so they speak of the angle: A at the
    term's angle already has not moved towards it, whatever its lightness or chroma. A grey's hue angle
    is still an angle the figure beside it measures from.
  - **An accepted limit, recorded (review, S3).** A chroma word is the band of the weighted term
    ΔC′/S_C (ADR-0125), where a′ is scaled by up to 1.5 near neutral, and the figure beside it is ΔC\*ab.
    So the word can be stronger than the figure: 244 pairs read *Noticeably Richer/Softer* beside
    |ΔC\*| under 1.8 (126 under 1.0, e.g. *+0.9 Noticeably Richer*), and 114 read *Richer/Softer* beside
    under 0.8. Both are true of their own numbers; banding the printed ΔC\*ab instead would be a second
    table over another unit, which ADR-0125 refused. `compare-readout.test` pins the counts.
  - B's term is chosen deterministically: the most axes constrained (so a dark orange is *brown*),
    then the narrowest hue arc, then the file's order.
- **D3. The contrast cell** reads `‹ratio›:1 • ‹threshold› / ‹relation›`, in the figure's ink and
  weight as drawn:
  - The threshold is the highest WCAG 2.2 threshold the floored ratio reaches: *Text AAA* (≥ 7,
    SC 1.4.6), *Text AA* (≥ 4.5, SC 1.4.3), *Non-Text* (≥ 3, SC 1.4.11, and AA for large text —
    `08`'s own word), else *Under 3:1*.
  - The relation is the pair's warm–cool relation, `warmCoolRelation` (the outfit harmony
    component's own measure, newly exported): *Shared Temperature*, *Mixed Temperature* or *Warm
    Against Cool*, 07's words (ADR-0151 D4), until F-349 names a geometric relation.
  - The note is *(APCA Lc: ‹n›)*; its accessible name says it is the smaller of the two directions.
- **D4. Separations.** The labels are *Protanopia · Deuteranopia · Tritanopia*: at severity 1 each
  simulation is the dichromat's, which is what *-anopia* names. The value is *‹n›% Separation
  (Machado 2009)*; Tritanopia's reads *(Machado 2009, approximate)* (ADR-0131: the tritan simulation
  is not validated with tritanopes). No floor-bound verdict: `HARD_TO_SEPARATE` is a convention and
  the score is uncalibrated, so *Safe* bound to it would be a claim about people the engine cannot
  make.
- **D5. Copy.**
  - *Card* at the end of the access title is component text (§2), as 07's was; *Table* stays, as 06's
    *Readout Table* did (ADR-0146).
  - *[Change A]*'s brackets are notation (ADR-0142 D3's reasoning).
  - The title is *Colour Compare • 比較* (ADR-0142 D5's OQ-48 interim, applied, not decided); in
    Japanese the run repeats 比較 and is not drawn.
  - *Export Precision Delta PDF* keeps its words. It names a document of the pair's published values
    and their ΔE00 to the engine's precision: no measurement is involved, so it is not an accuracy
    claim. It is added to `near-misses.md`.

- **D6. Notation and the two hues (review, M12, M13).** The notation the readout prints — ΔE00,
  CIEDE2000, ΔEok, ΔL\*, ΔC\*, ΔH, WCAG 2.2, OKLab, Machado 2009 in the figures' names — is notation,
  identical in both languages, printed as `08` draws it rather than read from the catalogue (the rule
  `NOTATION_KEYS` states for the catalogue's own notation). And the page prints two hue angles in two
  spaces without naming either on screen, as `08` draws them: each meta line's OKLCh h, and ΔH, the
  CIELAB angle (aka-tsuchi → ao-ta: 48.0° → 130.0° in OKLCh, +73.5° in CIELAB). Each row's accessible
  name says its space.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| ΔH\*ab, the metric hue difference | An engine function with its own golden data, and it drops the drawn `°` |
| Relabel the row Δh | A departure the unit already makes unnecessary |
| Round the ratio | 14 corpus pairs would read 3.00:1 and claim *Non-Text* (ADR-0151, F-248's S2) |
| Both Lc directions | `08` draws one; the smaller never overstates |
| *Safe* bound to `HARD_TO_SEPARATE` | A claim about people from an uncalibrated score |
| *(Machado)* alone | Shorter, but drops the model's year; revisit after the capture |
| *towards* always | *towards blue* when A is already blue says A was not (752–920 pairs) |
| The three OKLCh figures in the meta line | A figure `08` does not draw |

## Evidence, and its limits

WCAG 2.2 SC 1.4.3, 1.4.6 and 1.4.11; CIE 15:2004's notation; `phrase-lexicon.2026.08.1.json`;
`separation.ts`; ADR-0131. The census is computed over the pinned corpus and is recomputed by
`compare-readout.test`. The Japanese reading can name fewer hues than the English one until the
Japanese lexicon names the hues the English one does (filed as a backlog feature).
