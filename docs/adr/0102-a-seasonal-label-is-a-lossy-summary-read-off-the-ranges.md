# ADR-0102 — A seasonal label is a lossy summary read off the ranges

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-15 |
| **Feature** | F-223 |
| **Amends** | [ADR-0010](0010-personal-colour-is-a-profile-not-a-skin-rgb.md) and [ADR-0072](0072-a-guided-profile-is-forced-choices-and-confidence-is-agreement.md) — both say, under *Neutral*, that no seasonal label is produced |

---

## Context

Mockup `23` — the finished personal-colour profile — draws a pill at the top of the dimensions
card: a season and a modifier (*"Autumn Muted"*), then a second half (*"/ Kasane Harmony"*). The
product has no such label. ADR-0010 built the profile as ranges with per-dimension confidence
precisely so that it would not be a quiz that produces a season first, and ADR-0072 says how the
guided path fills those ranges. Both leave one door open: ADR-0010's *Neutral* clause — the product
*"can map to seasonal vocabulary for users who want it, but the underlying model is continuous
ranges."*

The person decided the conflict in R9-MOCKUP-FIDELITY §6 **C12**: *followed — F-223 derives the
label from the four ranges with an ADR*. This is that ADR. What it has to settle is not whether
there is a label, but what the label is allowed to be, so that it cannot become the thing ADR-0010
refused.

The failure mode is the one ADR-0072 names: not a wrong answer but a plausible one. A label reads as
a verdict about a person. It is shorter than four rows, so it is the thing that gets remembered,
repeated and acted on — and it would be a verdict built from twelve taps.

## Decision

**The seasonal label is a summary computed from the profile's ranges each time it is read, by a
versioned rule that is content. It is never stored, never scored, never shown instead of the ranges,
and withheld rather than guessed.**

1. **Input: the four scalar dimensions** ADR-0072 establishes — lightness (a range), temperature (a
   bias), chroma (a range), contrast (a preference) — which is `PersonalProfile` in
   `@irodora/recommendation`. The neutrals, accents and avoid lists are not read.

2. **The rule is content.** `content/rules/seasonal-summary.<version>.json`, in the same ledger as the
   weights and the phrase lexicon (ADR-0046, ADR-0069): each read axis is split into three declared
   classes by one statistic and two boundaries, and a table maps every tuple of classes to a season
   and a modifier, or to *no summary*, each row with its rationale. The loader refuses a table that is
   not total and unique and classes that do not partition their axis, so determinism is a property of
   the content, checked when it loads. Changing the words or a boundary is a publish, not a code
   change (FR-67's test shape: one engine, two rule sets, two answers).

3. **What it summarises: temperature, lightness and chroma. What it discards: contrast and the
   lists.** The twelve-season convention the mockup draws has no contrast axis; the photo path
   abstains on contrast (ADR-0072 §5), so a label that read it could never exist for a photo-assisted
   profile; and contrast is the dimension established with the least direct evidence. Reading it is a
   content change — a fourth axis in the table — should a person want it.

4. **It is lossy, and says so.** Three classes per axis cannot carry a range's width, its confidence
   or its exact position. The label carries the class of every range it summarises (its *basis*), so
   a surface can show — and a test can prove — that the pill agrees with each row beside it. It is
   monotone within an axis and discontinuous at a boundary: a small edit can change it.

5. **Withheld rather than guessed.** If any axis it reads has confidence 0 — never answered, or the
   photo path abstained — there is no label, and the reason is *not established*. This lives in code,
   not in a tunable (golden rule 11).

6. **Never stored, never scored, no inverse.** No profile field holds a label, so it cannot outlive a
   corrected range or stand in for one. `scoreColor` (FR-29) never sees it. Nothing maps a label back
   to ranges — that is the quiz ADR-0010 rejected.

7. **The words are a closed vocabulary with no body in it.** Seasons `spring summer autumn winter`;
   modifiers `light deep bright muted warm cool`. No word names skin, undertone, complexion, ethnicity,
   age or body (NFR-22); the check is structural (a rule cannot name an axis outside the profile's
   dimensions) and lexical (every word, in both catalogues, against the prohibited lists — including
   the Japanese trade terms イエベ and ブルベ, which name a skin undertone). The label describes the
   ranges, not the person: copy never says *"You are an Autumn"*.

8. **Boundaries sit in the gaps.** No boundary may sit on a value the guided derivation can produce
   (ADR-0069 §3): the derivation's own temperature threshold, `1/3`, is exactly such a value and
   treats a leans-warm split and a leans-cool split differently in floating point (F-276). The label's
   temperature boundary is between reachable values instead.

9. **Editorial ownership as the repository already practises it.** The rule is drafted in a session
   under `ed-001` with `reviewIndependence: "self"` (ADR-0060), every boundary cites a boundary the
   product already states or the draft stops and asks, and the person's reading — with a competent
   Japanese reader's — is an outstanding attested criterion on F-223 that blocks the release.

## Consequences

**Good.** The mockup's pill has something honest to show. The label cannot contradict the ranges it
sits on, cannot survive their correction, and cannot be reached without them. Its rule is reviewable
as data, printed whole by the content gate, and changed by a publish.

**Bad.** A label compresses a person's answers into two words, and people will read it as the answer
— which is why it is withheld when a range is unestablished and never drawn without the ranges. It
jumps at boundaries. The twelve-season convention is a convention, not an instrument: nothing here
shows that it, or the derivation beneath it, performs evenly across skin tones (NFR-23, F-037), and
nothing may say it does. The rule is self-reviewed until a second editor exists.

**Neutral.** "Autumn" in a profile's label is unrelated to a colour's `taxonomy.season`; they have
separate catalogue keys and the summary never reads the corpus. The pill's second half,
*"Kasane Harmony"*, is not defined here — it is OQ-31.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A quiz that produces a season, and ranges from it | ADR-0010's rejected model: the label first, the evidence second |
| Store the label beside the ranges | It would outlive a corrected range and invite scoring by it |
| Read contrast as a fourth axis | No contrast axis in the convention drawn; impossible for photo-assisted profiles; weakest evidence |
| Always produce a label, choosing the nearest cell when an axis is unanswered | A guess presented as a summary — golden rule 11 |
| The rule as code | Criterion 1 of F-223, and FR-67: rule content changes by publishing, not by a release |
