# ADR-0121 — Type drawn off the scale takes its step within 4 dp, and a measured step beyond

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-06 |
| **Feature** | F-230 |
| **Closes** | OQ-13 (type a screen draws off the scale: the screen's size, or §5's step?) |
| **Amends** | R9-MOCKUP-FIDELITY §2 (the snap, for type more than 4 dp from every step) and §5; [ADR-0113](0113-the-type-scale-is-board-00s-four-steps-and-a-measured-caption-and-off-scale-type-snaps.md), whose first version closed OQ-13 and withdrew the closure |
| **Decided on** | the person's delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* It covers a rule weighed against a drawing, which the 2026-09-24 delegation did not (ADR-0113's withdrawal) |

---

## Context

Board `00` prints four type steps — Display 1 72, Title 22, Body 16, Label 14 — and ADR-0113 added a
measured `caption` at 10.3 for everything drawn below 12 dp. R9 §2 snaps every measured size to the
nearest step. That sentence was written by an agent on 2026-09-14; the person's standing instruction
is *"no deviation from the mockups — we strictly need to materialise the mockup in our code"*
(2026-09-10), and P3 lets a screen beat the board for how a component looks on that screen.

F-230 cannot set the wordmark without an answer: `01` draws it at 31.6 dp and `14` at 59.7 dp, read
from Gelasio's own outlines (`serif-weight.mjs --em`, calibrated within half a pixel). Snapping takes
the first to `title` 22 (−30 %) and the second to `display1` 72 (+21 %).

**The census.** Of the 85 governing readings at or above 12 dp (`25` and `00` set nothing, P2/P3),
76 sit within 4 dp of a board step and 9 do not:

| element | drawn | nearest step | off by |
|---|---|---|---|
| `01.header.wordmark` | 31.6 | title 22 | 9.6 |
| `20.card.kanji` | 32.2 | title 22 | 10.2 |
| `14.splash.wordmark` | 59.7 | display1 72 | 12.3 |
| `26.hero.kanji` | 40.4 | title 22 | 18.4 |
| `06.kanji` | 53 | display1 72 | 19.0 |
| `22.stats.*.figure` (×4) | 45.3–47.4 | title 22 | 23.3–24.6 |

The nearest in-band readings are 4.0 off (`05.title`, `07.title`, 26 against 22).

## Research

- **Apple HIG, Dynamic Type**: Large Title 34 pt, Title 1 28, Title 2 22. **Material 3 type scale**:
  display 57 / 45 / 36, headline 32 / 28 / 24. Both systems keep several sizes between 22 and 72,
  where board `00` jumps straight from one to the other — and the screens fill that gap again and
  again: a wordmark, a hero kanji, a stat.
- **WCAG 2.2** sets no minimum or maximum size. 1.4.4 (resize text) asks that type scale with the
  person's setting, which a measured step does as any step does.
- **The instrument**: a box's height read off a JPEG is not an em (01's wordmark read 34 by box and
  31.6 from the face's outlines). Body-size readings carry about ±1.5 dp; that is what the band has
  to absorb, and why a reading inside it is a step, not a size.

## Decision

1. **Below 12 dp, type is `caption`** (ADR-0113, unchanged).
2. **Within 4 dp of a board step, type takes that step** — §2's snap and its tie rule, unchanged
   inside the band, siblings drawn alike sharing one step.
3. **More than 4 dp from every board step, type is set at its drawn size, as a measured step:**
   - declared in `typography.scale` with the inventory elements it is bound to (`elements`);
   - its size the median of their `raw.emDp`, to a tenth, read from the face's outlines where the
     face is bundled; siblings drawn alike share one step;
   - its leading the nearest board step's ratio — a single-line element draws no leading to
     measure — **or its face's own line where that is taller** (amended below), and its tracking
     and weight its face's (ADR-0112);
   - read only by the component that draws those elements (a source scan holds it).
4. **`25` and `00` set nothing** (P2, P3).
5. **A census holds the rule.** `type-scale.test.ts` lists every governing element drawn more than
   4 dp from every step. Each is bound to a measured step, or owed by a named feature that is not
   `done` — and the row fails once its owner is done while it is still owed.

**The threshold is not a taste.** Every threshold from 4.0 up to 9.6 dp gives every one of the 85
readings the same outcome: 4 is ADR-0113's own listing threshold and sits at the bottom of that
interval, past the instrument's error at body sizes.

## Applied in F-230

| element | drawn (em, outlines) | step |
|---|---|---|
| `01.header.wordmark` | 31.6 dp (31.9 by width) | **`wordmark`** 31.6, leading the serif's own line, 1.27 (title's 1.2 is under it) |
| `14.splash.wordmark` | 59.7 dp (59.9 by width) | **`wordmarkSplash`** 59.7, leading the serif's own line, 1.27 (display1's 0.98 is under it) |
| `14.splash.tagline` | 22.0 dp | `title` (in band), re-recorded from `body` |

**Owed, each by the feature that builds it:** `06.kanji` and `26.hero.kanji` (F-247), `20.card.kanji`
(F-253), `22.stats.*.figure` (F-258 — `MetricTile`'s figure takes one measured step, as E-170
anticipated). `01.header.tagline` (18.5) is in band: `body` (F-242).

## Consequences

**Good**

- The screens are drawn at their sizes where the board's steps would visibly change them; type
  read within instrument error keeps one step, so the scale stays a scale.
- One rule answers five features (F-230, F-242, F-247, F-253, F-258); each still measures and builds
  its own elements.

**Bad**

- **The scale grows**, by up to six measured steps across R9, each bound to a few elements. A
  measured step is not a step a screen may pick; the source scan and the census are what stop it
  becoming one.
- **`display1` is drawn by no screen.** Board `00` declares it and F-226's criterion names it, so it
  stays, declared unreached with its reason.
- The readings come off JPEG renders; a remeasure moves a measured step, and the test says so.

**Neutral**

- §2's snap stays the rule inside the band; only its reach changes.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| Snap everything (§2 as written) | One fixed scale | The wordmark −30 %, the splash wordmark +21 %, 06's kanji +36 %, 20's −32 %, 22's figures −53 %: visible departures no §4 category forces, against P3 and *"no deviation"* |
| The drawn size everywhere | Exact to the reading | Instrument noise becomes product (about ±1.5 dp at body sizes); elements drawn alike on different screens get different sizes; OQ-12 reopens (92 readings, 92 sizes) |
| Measured steps shared across roles, by clustering | Fewer steps | Couples unrelated roles: remeasuring a wordmark would move a card's kanji |
| The wordmark only, sized as a logo | Narrow | Leaves four features to decide the same rule apart, and the inventories record the wordmark as type |

## Revisit when

- A screen draws type within 4 dp of 72 (then `display1` is read), or a remeasure moves a reading
  across the band.
- A measured step is read by a component that does not draw its elements.

## Amendment — a measured step never leads under its face's own line (F-230's review, 2026-10-07)

F-230's one review read React Native 0.86's text layout and found that **iOS does not centre a line
set under its face's own height.** `RCTApplyBaselineOffsetForRange` (`RCTAttributedTextUtils.mm`)
raises the glyphs by half the spare height only when the line height is at least the font's own line;
below it, no offset is applied, TextKit sets the glyphs on the line's foot, and a drawn Text clips
whatever rises out of its frame. Android's `CustomLineHeightSpan` splits negative leading evenly, so
the two platforms place such a line differently.

`wordmarkSplash` had taken display1's 0.98: on iOS the name's ink would have risen 7.3 dp out of its
frame and been clipped. So decision 3's leading is **the nearest board step's, or the face's own line
where that is taller**. The face's own line is recorded per bundled face as `ownLine` — hhea's
ascender less its descender, plus its line gap, over its em, rounded up to two places: Gelasio 1.27,
Noto Sans JP 1.45, Noto Serif JP 1.44. `apps/mobile/test/fonts.test.tsx` reads it back from each TTF,
and `type-scale.test.ts` holds every measured step to it, with display1's 0.98 as the decoy. Both
wordmark steps now lead at 1.27. A single line shows no leading, so nothing a mockup draws moves.

**Not changed: board steps.** `title`'s Japanese leading (1.345) is under the gothic's own (1.45), so
iOS bottom-aligns a Japanese title: about a dp from Android, with no clip. A Japanese or serif
`display1` would clip on iOS, and no screen draws one (it is declared unreached). The first screen
that does must take the face's own line, as a measured step does here.
