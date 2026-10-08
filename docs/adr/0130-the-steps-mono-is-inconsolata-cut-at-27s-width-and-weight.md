# ADR-0130 — The steps' mono is Inconsolata, cut at 27's width and weight

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-08 |
| **Feature** | F-236 |
| **Builds on** | [ADR-0057](0057-the-japanese-face-is-a-bundled-noto-sans-jp-subset-generated-from-the-corpus.md) (a bundled face is generated and checked), [ADR-0112](0112-the-serif-ships-as-gelasio-regular-and-the-mincho-as-noto-serif-jp-because-the-drawings-measure-there.md) (a face is cut static from a pinned source, at the weight its drawing measures), [ADR-0121](0121-type-drawn-off-the-scale-takes-its-step-within-4-dp-and-a-measured-step-beyond.md) (type snaps to its step), [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) (27's scale) |
| **Applies** | R9-MOCKUP-FIDELITY §2 and §5; golden rule 14; C6 |
| **Decided on** | the readings of `27.lens-working.step-1` and `.step-2` (F-236 increment 3); the delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

`27`'s working state draws its pipeline's two steps in a monospace. No other mockup draws one. The
plan assumed the platform's: Menlo on iOS, `monospace` on Android.

The drawing says otherwise. Its advance is 6.77 px against a cap of 9.79 px, **0.69 of the cap**:

- **The advance** is the comb that best fits each line's character cells: 6.810 and 6.735.
- **The cap** is the median of ten capitals and figures, 9.30–9.97.

The common monospaces advance 0.84–0.86 of their caps: SF Mono, Menlo, Roboto Mono, JetBrains Mono,
Source Code Pro, IBM Plex Mono. The difference is not cosmetic. At those proportions, the second
step's real text would not fit its card: *Converting to OKLCh: D65 (6504K)*, 32 characters, at the
16 dp the drawn em snaps to.

## Decision

**The steps are set in Inconsolata, cut static at width 83 and weight 600, Latin only, at `body`.**

Inconsolata is Raph Levien's open-licence monospace (OFL 1.1, no reserved name).

### 1. The face is chosen by what can be measured

**Shape cannot name the face at this size.** 34 open-licence monospaces from `google/fonts` were
scored against the first step by mask overlap (`serif-match.ps1`, 161 instances). The top twelve
fall within 0.04 of each other, at 0.50–0.54. F-275 found the same floor for the serif at small
sizes, and a 10 px cap is smaller than any of those.

**Proportion can.** Two ratios set how a line of monospace reads and whether it fits:

- the advance over the cap;
- the x-height over the cap.

The drawing reads **0.69 and 0.71**. Among the candidates:

| face | advance / cap | x-height / cap | why it was not chosen |
|---|---|---|---|
| Xanh Mono | 0.68 | 0.73 | the nearest advance; a calligraphic serif, which the drawing is not |
| Ubuntu Mono | 0.72 | 0.75 | close, but under the Ubuntu Font Licence, not the OFL |
| Share Tech Mono | 0.77 | 0.71 | fixed width, 11 % wide |
| Reddit Mono | 0.78 | 0.72 | the best shape score, but fixed width, 13 % wide |
| Inconsolata | 0.80 at its default width | 0.73 | **a width axis (50–200) that reaches the drawn advance** |

Inconsolata is the one open-licence sans monospace whose own design reaches the drawn proportion:

- Its width axis puts the advance at **0.432 em, against a cap of 0.623: 0.693**.
- It ranks among the top shape scores at every condensed width.
- It is mature, hinted and widely used.

### 2. Its weight is the drawing's

Instances at width 83 were rendered at the drawn em through a JPEG at quality 85 (`stem.ps1
-render`). Their stem integrals were set against the drawing's:

- the first step reads 554 in encoded light and 608 in linear;
- the second reads above 600 in both.

The cut is **600**, as F-226 read the serif's weight off its stems.

### 3. It is cut, checked and loaded like the serif

- `scripts/font-sources.json` pins the variable source by `google/fonts` commit and sha256: the same
  commit as Gelasio, and the same file as today's.
- `generate-font-subset.mjs` cuts it with `wdth 83, wght 600` pinned, Latin ranges only, and
  rebuilds its name table. It is named `Inconsolata-SemiBold`, and name record 3 says what was
  pinned.
- `verify-font-coverage.mjs` holds the cut to the Latin requirement and to weight 600.
- The manifest names it as the face `mono`, at its own line, 1.05. `fonts.ts` loads it before the
  first frame.

### 4. Where it applies

`Text` takes `face="mono"` at `body` only, the step its 15.3 dp em snaps to:

- another step, another weight and `numeric` are type errors, because its figures are equal-width
  already;
- Japanese in a mono element is set in the gothic (C6).

The `Chip` badge takes `mono`, which fixes its step.

## Consequences

**Good.**

- 27's steps are drawn at 27's proportions, and the real copy fits its card.
- The face is reproducible from a pinned source, and checked on every content run.

**Bad.**

- **A fourth bundled face:** 35 KB, and a licence to carry (NOTICE.md).
- **The face is chosen by proportion, not by recognising the drawing.** At this size nothing could
  recognise it. If a larger drawing of the steps appears, it may name another face.
- **The steps are body, not label.** They are larger than the board's other badges.
- **Width 83 is not a named instance.** A designer reaching for "Inconsolata Condensed" gets 75, and
  this file is not that.

**Neutral.** The platform monospaces stay unused.

## Alternatives considered

- **The platform monospace (Menlo, `monospace`), as planned.** Nothing to bundle, and familiar. But
  it is 23–25 % wider than the drawing, and the second step overflows its card at the step its em
  snaps to. Shrinking it to fit would break the type scale.
- **Reddit Mono, the best shape score.** The closest letterforms by overlap. But the margin was a
  few hundredths at a 10 px cap, it is 13 % wider than drawn, and it has no width axis to close the
  gap.
- **Xanh Mono, the nearest advance.** It fits to 1 %. But its calligraphic serifs are not in the
  drawing, and it scored below 0.34 on shape.
- **Shorten the copy to fit a wider face.** Copy is bound by D5 and E2, and the drawing's own line
  is 35 characters.

## Revisit when

- A mockup draws monospace text large enough to tell faces apart: a cap of 20 px or more.
- `27`'s steps are redrawn.
- A second surface needs a monospace at another step. The face then needs that cut, not a new face.
