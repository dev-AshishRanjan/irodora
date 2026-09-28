# ADR-0112 — The serif ships as one cut, Gelasio Regular at no tracking, and the mincho as Noto Serif JP at 400, because that is where the drawings measure

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Feature** | F-226 |
| **Builds on** | [ADR-0106](0106-the-serif-is-gelasio-because-the-mockups-type-is-georgia-metric.md) (the face); it settles ADR-0106 d.2 (weight per role) and d.4 (the Japanese serif) |
| **Amends** | [ADR-0057](0057-the-japanese-face-is-a-bundled-noto-sans-jp-subset-generated-from-the-corpus.md) §6: Latin is no longer only the platform's face |
| **Decided by** | the implementing agent, **on the person's delegation** of 2026-09-24 (*"Decide yourself. Think reason research before deciding"*) |

---

## Context

ADR-0106 chose Gelasio and left two questions to F-226.

- **d.2: which weight, per role.** Mask overlap put SemiBold first, and drawn width put Regular
  first. The ADR named both instruments as too crude to pick a weight: a threshold on a bloomed
  JPEG thickens every stroke.
- **d.4: which Japanese serif.** The ADR said `20` and `26` draw a mincho. **Only `20` does.**
  `26.hero.kanji` is gothic 600, and C6 agrees ("kanji are sans on `01 05 06 26`, Mincho on the card
  `20`"). This record corrects it.

React Native needs static faces. It has no dependable variable-axis support on Android, and on both
platforms it picks a bundled face by family name.

## The measurement

**The quantity is one that survives the blur.** A horizontal band through a word crosses a total
width of ink. Integrating coverage across the row, rather than thresholding it, gives that width in
pixels, because a blur spreads a stem but keeps its integral. Divided by the word's ink height (read
at the 50 % crossings, which a symmetric blur leaves in place), the number is independent of the
size the word was drawn at, and it grows with weight.

- `mockups/tools/stem.ps1` reads it off a crop.
- `mockups/tools/serif-weight.mjs` computes it exactly from the font's outlines at every `wght`
  (HarfBuzz shaping, flattened outlines, the same bands, no rasteriser) and solves for the drawn
  weight.
- The bands are at 25, 35, 45 and 55 % of the ink height. Readings are in encoded sRGB and in
  linear light.

**The calibration is the instrument's decoy.** Static cuts at 400, 500, 600 and 700 are set in each
crop's word at the crop's own ink height, saved as JPEG at quality 85, and measured like the mockup.
Recovered weight, encoded sRGB:

| crop (size) | 400 | 500 | 600 | 700 |
|---|---|---|---|---|
| `00` wordmark (52.6 px) | 400 | 496 | 598 | 696 |
| `01` wordmark (48.9 px) | 387 | 492 | 595 | 690 |
| `14` wordmark (34.2 px) | 399 | 490 | 595 | 690 |
| `00` *Display 1* (49.7 px) | 398 | 488 | 599 | 698 |
| `00` *Title* (22.2 px) | 380 | 453 | 588 | 670 |
| `01` tagline, lines 1 · 2 · 3 (24–31 px) | 399 · 399 · 400 | 494 · 489 · 508 | 595 · 591 · 601 | 685 · 678 · 703 |
| `20` kanji, Noto Serif JP (57.0 px) | 337 | 441 | 590 | 689 |

**Encoded sRGB recovers the known weight to within about 12 at display sizes**, about 30–50 at
*Title*'s 22 px, and it reads a known 400 kanji as 337. Linear light reads every known weight 50–150
low (GDI+ blends in encoded space), so **the encoded reading is the one used**. The linear one is
reported in the tool's output as part of the error.

**The drawings, encoded sRGB** (per band; mean; `~` marks a band below the axis, extrapolated):

| crop | role | per band | mean | tracking |
|---|---|---|---|---|
| `01` wordmark | **in-app wordmark (C4)** | ~359 · ~340 · ~374 · ~349 | **356** | +0.006 em |
| `14` wordmark | **splash wordmark (C4)** | 456 · 436 · 444 · 414 | **437** | −0.005 em |
| `00` wordmark | not governing (C4) | 502 · 493 · 493 · 429 | 479 | −0.026 em |
| `25` wordmark | not governing (P2, C4) | 510 · 506 · 428 · 496 | 485 | −0.055 em |
| `00` *Display 1* | **display1** | ~256 · 483 · 490 · 504 | **433** | −0.010 em |
| `00` *Title* | **title** | 509 · ~226 · 537 · 435 | **427** | +0.009 em |
| `01` tagline 1 · 2 · 3 | **body** | ~298–~366 · ~310–~398 · ~223–~337 | **331 · 347 · 275** | +0.000 · +0.006 · −0.021 em |
| `20` kanji | **mincho** | 367 · 335 · 387 · ~85 | **294** | — |

## Decision

1. **One cut of the serif: Gelasio Regular (`wght` 400), at no tracking**, for every role the
   mockups draw it in: the wordmark, `display1`, `title` and the serif `body`.
   - Every governing crop measures at or below Regular. The two wordmarks C4 uses read 356 and 437.
     The tagline lines read 275–347, lighter than the lightest instance the face has.
   - *Display 1* reads 433. Its three bands through the stems read about 490; the band through the
     baseline serifs reads low. *Title*'s interval, at a size where the instrument is loosest, spans
     Regular.
   - The rule the plan set before measuring was: the nearest instance, and the lighter one when the
     interval overlaps both, because Gelasio widens with weight and a lighter cut still fits the box
     §2 measured. It gives Regular for every role, so one file serves all four.
   - Tracking reads within ±0.02 em of zero wherever it can be read. The manifest's −0.04 em on
     `display.1` was set for a sans, and it does not carry over to the serif.
2. **It is cut from the pinned variable source** (`scripts/font-sources.json`: google/fonts
   `1ac2012c…`, sha256 `4daecea4…`) by pinning `wght` to 400. The cut carries no `fvar` table, its
   PostScript name is `Gelasio-Regular` (unique among the bundled faces), and its `OS/2` weight class
   is 400. `tnum` and `lnum` survive. The generator refuses a source whose sha256 differs.
3. **The mincho is Noto Serif JP, at 400**, cut the same way.
   - It is first of the seven open-licence minchos on `20`'s kanji (`mincho-candidates.json`).
     Mask overlap puts Noto Serif JP SemiBold at 0.648, Regular at 0.591, and the next family
     (Sawarabi Mincho) at 0.584. The family's lead (0.064) clears §5's 0.03 threshold, so the choice
     is the score's, not a tie rule's.
   - It is Source Han Serif, the same design system and vertical metrics as the bundled Noto Sans JP.
   - **The weight is Regular, not SemiBold.** Mask overlap favours the heavier cut, for the bloom
     reason ADR-0106 gives. The stem instrument reads the drawing at 335–387 over the three bands
     through vertical strokes, against a known 400 read at 337 at that size. That is the inventory's
     recorded 400.
   - **It is subset to exactly the codepoints of every published entry's `name.kanji`.** That is the
     only field any mincho element binds (`20.card.kanji → corpus:entry.kanji`). "The way ADR-0057
     subsets" is read as ADR-0057's method: generated from the content, checked by the coverage gate.
     It is not ADR-0057's union, which carries the catalogue and the lexicon, text no mincho draws.
     The coverage gate derives the requirement from the inventories' mincho bindings, and a mincho
     element whose binding it cannot read fails.
4. **ADR-0057 §6 is amended.** Latin text is no longer set only in the platform face: where a mockup
   draws a serif, it is Gelasio, bundled. The sans stays the platform's. Latin has no tofu failure
   mode, so §6's reasoning still holds for it, and no mockup's sans has been matched (F-226's plan
   records that as a question for a person, not a decision taken here).
5. **Figures are never set in the serif.** No mockup draws a serif figure, and Gelasio's default
   figures are oldstyle and proportional. `Text` refuses `numeric` with the serif face.

## Consequences

**Good.**
- One Latin file (about 100 KB) and one small Japanese subset. Every role the mockups draw in a
  serif is served, with nothing variable on a device.
- The weight is a measurement with a stated error, reproduced by two committed tools and a
  calibration anyone can re-run. It is not a reading of mask scores the previous record already
  distrusted.
- The Japanese serif matches the drawn card and shares its metrics with the bundled sans, so kana
  and kanji beside each other sit on one baseline.

**Bad.**
- **`00`'s own wordmark and `25`'s read heavier (479, 485), and so do *Display 1*'s stem bands
  (about 490).** A person comparing `00`'s board with the app may find its display type a shade
  light. Neither `00`'s wordmark nor `25`'s governs (C4, P2), and *Display 1*'s interval overlaps
  Regular. F-267's comparison is where this is looked at.
- The tagline reads lighter than any Gelasio instance. The face has nothing lighter than Regular, so
  the drawn lightness is approached, not met.
- The instrument is loose at 22 px (*Title*) and on kanji, where horizontal strokes cross the bands.
  Its numbers are reported with that stated, and the decision does not rest on either alone.
- The cut is instanced by HarfBuzz. Byte-identity across operating systems is confirmed only when
  CI's `--check` runs.

**Neutral.** The sources stay uncommitted under `.cache/fonts/`, as Noto Sans JP's does; the cut
faces and their `OFL.txt` are committed and recorded in NOTICE.md.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| **SemiBold**, mask overlap's leader | The best mask score over the set (ADR-0106) | Mask overlap thickens every stroke. The instrument built not to reads every governing crop at or below Regular |
| **Medium for `display1`** | *Display 1*'s three stem bands (about 490) | The fourth band and the whole-word mean (433) overlap Regular. A second file for one board sample is two faces where one serves |
| **Ship the variable file** | Any weight, one file | No dependable axis support in React Native on Android; a face is picked by family name |
| **Noto Serif JP SemiBold**, the mincho's mask leader | Mask overlap 0.648 | The same bloom bias. The stem instrument reads the drawn kanji at the known-400 reading |
| **Sawarabi Mincho** | Second family on the score, smaller file | 0.064 behind, and a different design system from the bundled sans |
| **Subset the mincho to ADR-0057's full union** | One rule for both Japanese faces | It carries the catalogue and the lexicon, which no mincho element draws. The bundle grows for glyphs nothing renders |

## Revisit when

- A mockup draws serif figures, a serif caption or a serif label; or
- F-267's comparison finds the display type or the card's kanji visibly lighter than drawn; or
- React Native gains dependable variable-font axes on Android, and one variable file becomes cheaper
  than cut instances.

Reproduce: fetch the sources `scripts/font-sources.json` and `mockups/tools/mincho-candidates.json`
pin, then `node mockups/tools/serif-weight.mjs` and `node mockups/tools/serif-weight.mjs --calibrate`
(`mockups/tools/README.md`).
