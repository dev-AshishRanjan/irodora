# ADR-0125 — A ΔE00 is described by one table of three bands, anchored on published thresholds

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-07 |
| **Feature** | F-222 |
| **Applies** | FR-48, FR-74; R9 §4 E2 and §8 (`04`, `08`); [ADR-0048](0048-similarity-percentage-is-a-stated-scale.md), [ADR-0061](0061-nfr-3-guarantees-the-observable-value-not-the-double.md), [ADR-0119](0119-the-delta-bars-share-one-unit-and-one-ink-and-print-what-04-prints.md), [ADR-0124](0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md) |
| **Decided on** | The person's delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

`04` and `08` print words beside a ΔE00 and beside its lightness, chroma and hue components: *Very
Close* at 1.42, *Perceptible Shift* at 3.42, *Slightly Darker*, *Slightly Richer*, a hue shift; `08`
phrases its components as sentences (*B is lighter*, *B is more chromatic*, *Shift towards teal*).
Nothing in the product defines any of them. F-222's criterion 2 asks for one table, used everywhere,
with no word that asserts a match (FR-74).

A band is a claim about a number, so its edges need a source — and the source has to be stated in
ΔE00 units. ΔE\*ab thresholds (Mokrzycki & Tatol's 1 / 2 / 3.5 / 5; Mahy's JND of 2.3) are a
different metric; ADR-0048 already refused that conflation.

## Decision

1. **One table, `DELTA_E00_BANDS`, in `@irodora/color-difference`, with three bands.** A value
   belongs to the highest band whose lower edge it reaches, so each edge belongs to the band above it.

   | band | ΔE00 | en | ja | what the source says of it |
   |---|---|---|---|---|
   | `veryClose` | [0, 0.8) | Very Close | 非常に近い | below the 50:50 % perceptibility threshold |
   | `slight` | [0.8, 1.8) | Slight Shift | わずかな差 | past perceptibility, within acceptability |
   | `perceptible` | [1.8, ∞) | Perceptible Shift | 知覚できる差 | past acceptability |

2. **What each edge rests on, exactly.** 0.8 and 1.8 are the 50:50 % perceptibility and
   acceptability thresholds in ΔE00 reported by Paravina RD, Pérez MM, Ghinea R, *Acceptability and
   perceptibility thresholds in dentistry: a comprehensive review of clinical and research
   applications*, J Esthet Restor Dent 2019;31(2):103–112 (doi:10.1111/jerd.12465). Its abstract, read
   for this ADR: *"The CIELAB 50:50% PT was ΔEab = 1.2, whereas 50:50% AT was ΔEab = 2.7.
   Corresponding CIEDE2000 (ΔE00) values were 0.8 and 1.8, respectively."* They come from Paravina et
   al.'s multicentre study of dental ceramic under simulated clinical conditions (J Esthet Restor Dent
   2015;27(S1):S1–S9). **Not claimed:** an ISO adoption of these values — ISO/TR 28642:2016 is cited
   in that literature for a colour-matching competency test, not for them.
3. **No edge above acceptability.** No threshold stated in ΔE00 units bounds a larger difference, so
   past 1.8 a difference is described as perceptible — which is all the source supports. The first
   version of this ADR had a fourth band past 5, citing CIEDE2000's reference range; F-222's review
   showed that range is stated in CIELAB units (K. Richter, BAM and TU Berlin, undated note,
   color.li.tu-berlin.de/A/T03E.PDF: *"CIE DE2000 is for the range between 0 to 5 CIELAB"*), and near
   neutral a ΔE\*ab of 4 is already a ΔE00 of 5.8 — so that edge misdescribed the printed number. A
   test now holds the table to its two published edges, with that pair as the decoy.
4. **The band is read off the printed value**: `deltaE00Band(printedDeltaE00(d))`, where the printed
   value is `d` to the two decimals every screen prints a ΔE00 at (the display ADR-0061's arithmetic
   reasons about). *ΔE00 0.80* is never described as *Very Close*.
5. **The components use the same table.** Each axis is banded on its weighted CIEDE2000 term
   (ΔL′/k<sub>L</sub>S<sub>L</sub>, ΔC′/k<sub>C</sub>S<sub>C</sub>, ΔH′/k<sub>H</sub>S<sub>H</sub>),
   which is in ΔE00's own unit and already the delta bars' unit (ADR-0119). Its direction follows the
   sign of the figure printed beside it:

   | band | lightness | chroma | hue |
   |---|---|---|---|
   | `veryClose` | Slightly Lighter / Darker | Slightly Richer / Softer | Very Close in Hue |
   | `slight` | Lighter / Darker | Richer / Softer | Slight Hue Shift |
   | `perceptible` | Noticeably Lighter / Darker | Noticeably Richer / Softer | Perceptible Hue Shift |

   **The words are `04`'s own where `04` draws one**: *Slightly Darker*, and *Slightly Richer* for a
   chroma increase. *Softer* is the decrease no mockup draws. A printed zero reads *Very Close in
   Lightness / Chroma* (and the lowest hue phrase): a camera estimate whose figure rounds to nothing is
   very close, never "no shift" (FR-74, golden rule 11). Hue carries no direction: a rotation is not
   actionable (F-201). Japanese: わずかに · — · はっきり, then 明るい · 暗い · 鮮やか · くすんだ;
   …は非常に近い at a printed zero.
6. **No word claims a match, an identity or no difference** — match, identical, same, *no … shift*;
   一致, マッチ, 合致, 同, 差なし — and a test holds every word in both catalogues to that.

## Consequences

**Good**

- `04`, `08` and every later instrument describe a distance with one cited table, and the words beside
  a component use the same edges as the words beside the total.
- Every edge can be checked against its source: the edges are a golden dataset, and there is no edge
  without one.

**Bad**

- **The thresholds were measured on dental ceramic, by trained and lay observers, under controlled
  viewing.** Garments, screens and a phone's estimate are none of those. So a band describes the
  **printed number**, never what a given person will see, and never the garment's true distance: a
  camera estimate carries its own uncertainty, and a poor capture says so before the figure (F-201).
  Other studies report different thresholds for other materials and observers — Schussler et al.,
  *Perceptibility and acceptability thresholds for color differences in ceramic shade tabs*, J Clin
  Exp Dent 2024 (PMC11733899), report 2.29 / 2.41 for dentists — so the edges are a published
  convention, not a constant of vision.
- **A large difference reads only *Perceptible Shift*.** With no published edge above 1.8, ΔE00 30 and
  ΔE00 2 take the same word; the figure beside it carries the magnitude.
- **A component's band can exceed the total's.** In the blue region the rotation term R<sub>T</sub>
  subtracts, so a hue term can sit a band above the total it belongs to (a = [50, 6.54, −74.71],
  b = [50, 8.15, −77.57]: total 0.41 *Very Close*, hue term 0.81 *Slight Hue Shift*). Both words are
  true of their own numbers; F-245 and F-249 must not "correct" one by the other.
- **Departures from the drawings** (R9 §4 E2): `04`'s *Very Close* at 1.42 reads *Slight Shift*
  (the drawn value is sample content, E1, and the table decides); `08`'s sentence form becomes the
  band phrases (criterion 2 makes `04` and `08` one table, and `04`'s form carries the degree the
  table needs).

**Neutral**

- The table changes no ΔE00 and no golden value of the metric; it reads the number the metric already
  produces.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| A fourth band past 5 (this ADR's first version) | Distinguishes large differences | 5 is a CIELAB range, not a ΔE00 edge; near neutral it fires at ΔE\*ab 4 (F-222's review) |
| Mokrzycki & Tatol's bands (1 / 2 / 3.5 / 5) | Widely repeated | Stated for ΔE\*ab, a different metric |
| A JND of 2.3 | Familiar | ΔE\*ab again (Mahy 1994); the conflation ADR-0048 refused |
| Textile CIEDE2000(2:1:1), PT 0.62 | Closer to garments | Different weights from every ΔE00 the product prints |
| Two bands at 1.8 only | Keeps `04`'s drawn word at 1.42 | Would describe a 1.5 as *Very Close*, below perception, which the source says it is not |
| *More / Less Vivid* for chroma | One register for both directions | `04` draws *Richer*; nothing forces a third word |
| No bands, the figure alone | Claims nothing | Criterion 2 asks for them, and `04` and `08` draw them |

## Revisit when

- A ΔE00 threshold is published for textiles, for displayed colour under the product's viewing
  conditions, or for a large difference — which would earn a band above acceptability.
- The precision a ΔE00 is printed at changes: the band reads the printed value.

## Implemented in

- [`DELTA_E00_BANDS`, `deltaE00Band`, `axisReading`](../../packages/color-difference/src/bands.ts), the [edges' golden set](../../packages/color-difference/golden/deltae00-bands.golden.json) and [`deltaE00Terms`](../../packages/color-difference/src/ciede2000.ts)
- [the words, in both languages](../../apps/mobile/src/delta-readings.ts) and their [tests](../../apps/mobile/test/delta-readings.test.ts)
