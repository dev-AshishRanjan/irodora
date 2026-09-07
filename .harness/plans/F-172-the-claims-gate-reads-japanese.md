# Plan: F-172 — The claims gate reads Japanese too

| | |
|---|---|
| **Feature** | F-172 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-21 |
| **Service / package** | `scripts` · `.harness/verification` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-06 |

---

## Intent

E-089: the gate walks every file in the repository, `ja.ts` included, and **all eleven of its
banned patterns are ASCII**. Half the product's user-facing copy has never been checked against
the rule the product cares about most — and it was not theoretical, because the Japanese Home
screen called a camera estimate a *measurement*.

## What this feature can and cannot discharge

The feature's own first criterion says *every pattern reviewed by somebody who reads Japanese*,
and I do not. Overriding that because it is inconvenient is the failure this harness exists to
prevent, so the work splits:

| | |
|---|---|
| **Dischargeable now** | the gate stating what it cannot check; the patterns whose English counterpart is a fixed collocation; a proof case per pattern; a regression fixture built from the product's own real copy |
| **Attested, not done** | the review itself, and one specific pattern — see below |

## Approach

### 1. A monolingual gate becomes a failure, not a silence

The gate reports `0 violation(s)` over a file it structurally cannot check. That is the exact
shape recorded four times this week: **a green run that means less than it says.**

So it counts two things and fails if they disagree: files that carry **CJK text**, and patterns
that can **match** it. A CJK-bearing file with no CJK-capable pattern is a reported gap. That
check needs no Japanese at all, and it is the half that makes the gate honest about itself
forever rather than until the next language arrives.

### 2. The patterns, each mirroring an English one that already exists

Only fixed collocations, and each gets a real sentence in the proof — **a pattern I cannot write
a sentence for is a pattern I do not understand well enough to ship.** The proof already generates
one case per entry in `banned`, so every addition is proven by construction.

### 3. 測定 is deliberately NOT patterned, and that is the interesting part

It is the word the actual defect used, and **six of its eight uses in the catalogue are correct**:
the `measure` screen is about values from a person's own instrument, which is exactly the
provenance the word is reserved for.

Distinguishing them is grammar — the defect is a noun describing an estimate, the legitimate uses
attach to 器 (device) and 値 (value) — and writing that rule from a dictionary produces a lint that
either passes everything or blocks correct copy, **with neither failure visible to whoever wrote
it**. It is recorded as the worked example the review must settle.

### 4. A fixture from the product's own copy

The strongest evidence available without a reader: the two historical defects and the six
legitimate `measure.*` strings, asserted in both directions. That is not my judgement of Japanese
— it is the product's real text, with the verdicts already established by E-089.

**Reused:** `verify-claims.mjs`, its `banned` config, `verify-claims-proof.mjs` (which derives a
case per pattern), and the inline suppression marker.

**Increments:**

1. The coverage check + its failure mode. Watched failing on the current config first.
2. The patterns, with sample phrases.
3. The grounded fixture, both directions.

## Files to touch

```
scripts/verify-claims.mjs             — the coverage check
.harness/verification/claims.json     — the Japanese patterns
scripts/verify-claims-proof.mjs       — a sample phrase per new pattern
packages/testing/fixtures/claims/     — the real-copy fixture
```

## Anticipated effects

- **New banned patterns run over every file** ⇒ every document in the repository, including the
  ones that discuss the ban. Guard: the inline suppression marker, and the lint caught F-164's own
  records three times — so this is a known and handled interaction rather than a surprise.
- **The coverage check can fail the build** ⇒ any future locale added without patterns. That is
  the point, and it is worth stating: adding a third language will fail this gate until somebody
  writes its policy, which is the correct order.

## Test plan

- **A case per pattern**, generated from the config, each with a real sentence rather than a
  string built from the regex — a pattern that stops matching prose is caught rather than
  silently still matching itself.
- **The grounded fixture, both directions:** the two known defects are flagged; the six known-good
  `measure.*` strings are not. The second is the decoy, and it is the one that matters — a
  pattern set that flagged the vocabulary would pass every red case and break the product's only
  honest use of the word.
- **The coverage check, both directions:** it fails with the patterns removed and passes with them
  present.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-claims.mjs && node scripts/verify-claims-proof.mjs
pnpm verify:ci
```

## Risks and open questions

- **The patterns are mine and unreviewed.** Each mirrors an English entry that was reviewed, and
  each is a fixed marketing collocation rather than a grammatical judgement — but *mirrors* and
  *is correct* are different claims, and only a reader can close the gap.
- **False negatives are invisible.** A pattern that never fires looks identical to a product with
  clean copy. The coverage check narrows this to "some pattern can match" rather than "the right
  patterns exist", and the difference is exactly what the review is for.

## Out of scope

- Any other locale. There are two, and the second one is what this is about.
- The `measure` screen's copy, which is correct and stays as it is.
