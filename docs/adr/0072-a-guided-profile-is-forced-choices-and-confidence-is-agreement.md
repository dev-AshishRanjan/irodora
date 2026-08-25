# ADR-0072 — A guided profile is forced choices, and confidence is agreement

## Status

Accepted

## Date

2026-08-25

## Context

[ADR-0010](0010-personal-colour-is-a-profile-not-a-skin-rgb.md) settled *what a profile is*: a
set of ranges with per-dimension confidence, no skin colour field, guided setup as the primary
path. It deliberately did not settle *how the guided path produces those numbers*, because that
is an implementation question and it was nine months early.

F-026 is where it stops being early. FR-26 asks for seven dimensions, each with a confidence,
from swatch comparisons and no camera, in a flow that fits inside 90 seconds. Three things in
that sentence need deciding:

1. **What question a person is asked.** "How much chroma do you tolerate?" is a question about
   vocabulary. It gets an answer, and the answer is about how confident the person is in their
   understanding of the word.
2. **Where the confidence number comes from.** FR-26 requires one per dimension and says nothing
   about how to compute it. A number invented per-dimension by feel is worse than no number,
   because [F-028](../../.harness/state/feature_list.json) will weight recommendations by it.
3. **How editing interacts with re-running the flow.** ADR-0010 §6 says the user's correction
   always wins. That is a sentence until something implements it.

The failure mode that governs all three is not a wrong answer. It is a **plausible** one — a
profile that reads as authoritative, is built from twelve taps, and carries a confidence that
sounds like a measurement.

## Decision

### 1. Forced choice between two swatches, twelve of them, three per axis

The person is shown two colours and asked which they would rather wear. No scales, no
vocabulary, no self-report about temperature or chroma.

Three trials per axis is the smallest number that distinguishes *unanimous* from *split*: with
two, every disagreement is a tie. Four axes × three trials is twelve, which is what the design
budget fits inside.

Contrast is the exception in form: it asks about a **pairing**, because the question is how much
separation the person wants between two garments and that cannot be asked with one swatch.

### 2. Each trial is a declared pair of corpus slugs, checked against the published bundle

A trial names two slugs and an axis. The claim that a temperature trial is *about* temperature —
matched in OKLCh L and C, opposed in hue class — lives in the **published values**, not in the
declaration.

`apps/mobile/test/profile.test.ts` checks every trial against the bundle's own `derived.oklch`,
one test per trial. Recorded as [E-030](../../.harness/state/effects.json), because a corpus
publish that moved one entry would turn a temperature question into a lightness question with
every gate green.

### 3. Confidence is agreement, and its ceiling is 0.75

```
unanimous (3 of 3)  → 0.75
split     (2 of 1)  → 0.50
unanswered          → 0
```

**Never 1.** A confidence of 1 would say twelve taps settled the question. F-028 weights by this
number, so overstating it is not cosmetic — it is a recommendation given authority it did not
earn ([ADR-0031](0031-measurement-claims-policy.md), golden rule 11).

A **list** dimension takes the **minimum** of the confidences it was derived from. A neutrals
list filtered by an uncertain temperature reading is that uncertain; a mean would launder the
weak half into the strong one.

The same fact produces the range: split answers span further apart, so the range comes out
**wider** at the same time as the confidence comes out lower. The two numbers agree because they
have one source, rather than being two independent guesses that happen to point the same way.

### 4. `origin` is a per-dimension column, and re-derivation reads it

Every dimension carries `origin: 'derived' | 'user'`. `applyDerivation` copies a fresh
derivation into a dimension **only where the origin is `derived`**. Editing any dimension latches
it to `user` — including when the value did not change, because "I looked at this and it is
right" is a correction.

A column rather than a timestamp comparison: a heuristic that is usually right is not what
ADR-0010 §6 promised.

### 5. The prohibition is a check, in the migration path

`packages/store/src/prohibited.ts` refuses a migration ladder that would add `skin_*`,
`complexion`, `ethnic*`, `rac(e|ial)*`, `attractive*`/`beauty*`, `body_*` or `bmi` — **and**
refuses a database whose `sqlite_master` already carries one. NFR-22 stops being a policy note.

## Consequences

**Good.** The questions are answerable without vocabulary, and answerable by somebody who cannot
separate the two colours, because the names are on screen. Confidence has one definition, in one
function, with a stated ceiling. A correction is durable across re-runs by construction rather
than by care. A corpus publish that invalidates a question fails a test that names the question.

**Bad.** Twelve forced choices are **not a validated instrument**, and this ADR does not claim
they are. Three trials per axis gives a coarse confidence with exactly two non-zero values;
"0.75" is a declared ceiling, not a calibration. The lightness and chroma ranges are derived from
the swatches the person chose plus a declared pad, and the pad is a judgement. The band chips the
editor offers cannot express every range the derivation can produce, so a correction is a
snap-to-band rather than a free adjustment.

**Neutral.** No seasonal label is produced, per ADR-0010. Whether the derivation performs evenly
across skin tones is **not** addressed here and must not be assumed — that is NFR-23 and F-037,
which is blocked on F-027 and F-028.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Sliders for each dimension** | One screen, no derivation, fully editable. Asks a person to self-report in a vocabulary the product exists to supply, and produces a profile that is only ever as good as their confidence in the words |
| **A seasonal quiz** (12-season) | Familiar, and users ask for it. Produces a label rather than ranges, which ADR-0010 already rejected as the underlying model — and mapping back from a label to ranges invents the precision the label discarded |
| **Confidence from response time** | Free to collect, and intuitively meaningful. It measures whether somebody was interrupted, and it would put a behavioural signal into a profile the person cannot see or correct |
| **More trials for higher confidence** | Twenty-four taps would support finer confidence steps. It does not fit the 90-second budget, and finer steps on an uncalibrated instrument is more precision, not more accuracy |
| **Deriving the pairs from the corpus at runtime** | No constants to go stale. The questions would then change with every publish, and a profile built against one set of questions would not be comparable with one built against another |

## Revisit when

- **F-037** measures per-band behaviour and finds a dimension performing unevenly. The
  derivation of that dimension changes; its representation does not (ADR-0010's own clause).
- **F-027** lands photo-assisted setup, which populates the same seven dimensions from an
  estimate. `origin` already distinguishes the paths; what will need deciding is whether
  `photo-assisted` deserves a different confidence ceiling from `guided`.
- Anyone measures the flow with real people. The 90-second criterion is **attested** on F-026 and
  blocks the release; a measurement would replace a budget with a number, and might well replace
  twelve trials with a different count.
