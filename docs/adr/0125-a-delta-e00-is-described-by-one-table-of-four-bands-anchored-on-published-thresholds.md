# ADR-0125 — A ΔE00 is described by one table of four bands, anchored on published thresholds

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
Close* at 1.42, *Perceptible Shift* at 3.42, *Slightly Darker*, a hue shift. Nothing in the product
defines them. F-222's criterion 2 asks for one table, used everywhere, with no word that asserts a
match (FR-74).

A band is a claim about a number, so its edges need a source — and the source has to be stated in
ΔE00 units. ΔE\*ab thresholds (Mokrzycki & Tatol's 1 / 2 / 3.5 / 5; Mahy's JND of 2.3) are a
different metric; ADR-0048 already refused that conflation.

## Decision

1. **One table, `DELTA_E00_BANDS`, in `@irodora/color-difference`.** A value belongs to the highest
   band whose lower edge it reaches, so each edge belongs to the band above it.

   | band | ΔE00 | en | ja |
   |---|---|---|---|
   | `veryClose` | [0, 0.8) | Very Close | 非常に近い |
   | `close` | [0.8, 1.8) | Close | 近い |
   | `perceptible` | [1.8, 5) | Perceptible Shift | 知覚できる差 |
   | `clear` | [5, ∞) | Clear Difference | 明らかな差 |

2. **What each edge rests on, exactly:**
   - **0.8 and 1.8 are the 50:50 % perceptibility and acceptability thresholds in ΔE00** reported by
     Paravina RD, Pérez MM, Ghinea R, *Acceptability and perceptibility thresholds in dentistry: a
     comprehensive review of clinical and research applications*, J Esthet Restor Dent
     2019;31(2):103–112 (doi:10.1111/jerd.12465). Its abstract, read for this ADR: *"The CIELAB 50:50%
     PT was ΔEab = 1.2, whereas 50:50% AT was ΔEab = 2.7. Corresponding CIEDE2000 (ΔE00) values were
     0.8 and 1.8, respectively."* They come from Paravina et al.'s multicentre study of dental
     ceramic (J Esthet Restor Dent 2015;27(S1):S1–S9): 175 observers in seven centres, under
     simulated clinical conditions.
   - **5 is the top of the range CIEDE2000 was built for**: *"CIE DE2000 is for the range between 0
     to 5 CIELAB"* (K. Richter, BAM and TU Berlin, on CIE TC 1-63, which was set up *"to investigate
     the application of the CIE DE2000 equation at threshold up to CIELAB colour differences greater
     than 5"*). That is a secondary statement of the formula's reference range, not a threshold of
     perception, and the band past it says only that the difference is outside it.
   - **Not claimed:** an ISO adoption of 0.8 / 1.8. ISO/TR 28642:2016 is cited in that literature
     for a colour-matching competency test, not for these values.
3. **The band is read off the printed value**: `deltaE00Band(printedDeltaE00(d))`, where the
   printed value is `d` to the two decimals every screen prints a ΔE00 at (the display ADR-0061's
   arithmetic reasons about). *ΔE00 0.80* is never described as *Very Close*.
4. **The components use the same table.** Each axis is banded on its weighted CIEDE2000 term
   (ΔL′/k<sub>L</sub>S<sub>L</sub>, ΔC′/k<sub>C</sub>S<sub>C</sub>, ΔH′/k<sub>H</sub>S<sub>H</sub>),
   which is in ΔE00's own unit and is already the delta bars' unit (ADR-0119). Its direction follows
   the sign of the figure printed beside it, and a zero is *level*:

   | band | lightness | chroma | hue |
   |---|---|---|---|
   | `veryClose` | Slightly Lighter / Darker | Slightly More / Less Vivid | Slight Hue Shift |
   | `close` | Lighter / Darker | More / Less Vivid | Hue Shift |
   | `perceptible` | Noticeably Lighter / Darker | Noticeably More / Less Vivid | Noticeable Hue Shift |
   | `clear` | Much Lighter / Darker | Much More / Less Vivid | Large Hue Shift |

   with *No Lightness / Chroma / Hue Shift* at level. Japanese: わずかに · — · はっきり · かなり, then
   明るい · 暗い · 鮮やか · くすんだ. Hue carries no direction: a hue rotation is not actionable
   (F-201).
5. **No band or phrase contains match, identical or same, or 一致, マッチ, 合致 or 同**, and a test
   holds every word in both catalogues to that.

## Consequences

**Good**

- `04`, `08` and every later instrument describe a distance with one cited table, and the words beside
  a component use the same edges as the words beside the total.
- The band can be checked against its sources: the edges are a golden dataset.

**Bad**

- **The thresholds were measured on dental ceramic, by trained and lay observers, under controlled
  viewing.** Garments, screens and a phone's estimate are none of those. So a band describes the
  **printed number**, never what a given person will see, and never the garment's true distance: a
  camera estimate carries its own uncertainty, and a poor capture says so before the figure (F-201).
  Other studies report different thresholds for other materials and observers (one 2024 study of
  ceramic shade tabs reports 2.29 / 2.41 for dentists); the edges are a published convention, not a
  constant of vision.
- `04`'s drawn *Very Close* at 1.42 reads *Close* here: the drawn value is sample content (E1), and
  the table, not the picture, decides.

**Neutral**

- The table changes no ΔE00 and no golden value of the metric; it reads the number the metric already
  produces.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| Mokrzycki & Tatol's bands (1 / 2 / 3.5 / 5) | Widely repeated | Stated for ΔE\*ab, a different metric |
| A JND of 2.3 | Familiar | ΔE\*ab again (Mahy 1994); the conflation ADR-0048 refused |
| Textile CIEDE2000(2:1:1), PT 0.62 | Closer to garments | Different weights from every ΔE00 the product prints |
| Three bands without 0.8 | Keeps `04`'s drawn word at 1.42 | Implies a 1.5 is below perception, which the source says it is not |
| No bands, the figure alone | Claims nothing | Criterion 2 asks for them, and `04` and `08` draw them |

## Revisit when

- A ΔE00 threshold is published for textiles or for displayed colour under the product's viewing
  conditions.
- CIE TC 1-63 or its successor publishes a validated range for CIEDE2000 above 5.
- The precision a ΔE00 is printed at changes: the band reads the printed value.
