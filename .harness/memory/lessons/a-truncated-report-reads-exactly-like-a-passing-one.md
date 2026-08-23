---
kind: lesson
title: A truncated failure report reads exactly like a passing one, and produces confident wrong diagnoses
category: process
confidence: 0.95
created: 2026-08-23
scope: [root]
links: [[a-gate-that-errors-is-failing-open]], [[a-failing-gate-is-usually-already-filed]], [[generating-an-artefact-is-not-checking-it]]
---

# A truncated failure report reads exactly like a passing one

Diagnosing F-083 — the cross-platform identity divergence — I split the comparison into
thirty-nine assertions so a failure would name the exact metric, stage or constant. Then I
read the results from the GitHub check-run annotations API.

**GitHub Actions publishes at most ten failure annotations per check run.** The API returns
those ten and says nothing about the rest. Every run came back with exactly ten. I did not
notice, because ten is a plausible number of failures.

Three diagnoses followed, each stated with confidence and each wrong:

| Round | Read from the ten | Actually |
|---|---|---|
| 2 | "only `linearR` diverges; `X`, `Y`, `Z`, Lab, Oklab are clean" | unknown — the other eleven stage results never appeared |
| 3 | "all sixteen exact constants reproduce" | unknown — no constant assertion was in the ten |
| 4 | "both chunk-count tests passed" | unknown — neither was in the ten |

Rounds 3 and 4 were then spent chasing a **contradiction that probably never existed**: a
divergent `linearR` with clean `X`/`Y`/`Z` derived from it, and ΔE columns moving while their
inputs held still. Absence of a failure annotation was read as evidence of a pass. It is not
evidence of anything.

## The tell I missed

**Exactly ten, every time, across four runs with different assertion counts.** A round number
that does not move when the thing being counted moves is a cap, not a measurement. That is
worth checking the moment a count looks stable.

## The rule

**Never split a diagnostic across more assertions than the reporting channel can carry.**
Count the channel's capacity first:

- GitHub Actions check-run annotations: **10 failures per run**, publicly readable.
- The job log is complete — and needs authentication, so it is not available to a reader
  working from the public API.

When the channel is narrow, **one assertion carrying a complete report beats thirty-nine
carrying fragments**. `packages/color-difference/test/golden/identity.test.ts` now compares
everything and fails once with the whole comparison in the message: which metrics, which
stages, which constants with both doubles, and how many chunks out of a hundred. One
annotation, nothing dropped.

## The wider form

This is [[a-gate-that-errors-is-failing-open]] one level up. There, a check that cannot run
reports nothing and reads as a pass. Here, a check that *ran* has its result silently dropped
in transport and reads as a pass. **Both are the same failure: the absence of a report being
read as a report of absence.**

Whenever a result arrives through a channel that can drop entries — an annotation cap, a log
tail, a `head -20`, a paginated API without its `Link` header read, a UI that shows "first N"
— the honest question is not *what does it say* but *what could it not have said*.
