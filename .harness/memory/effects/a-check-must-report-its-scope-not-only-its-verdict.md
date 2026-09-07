# A check must report its scope, not only its verdict

**Effect:** [E-090](../../state/effects.json) · `.harness/verification/claims.json` →
`scripts/verify-claims.mjs`, `scripts/verify-claims-proof.mjs`, `apps/mobile/src/i18n/` ·
**medium**

## What happened

F-172 widened the claims gate to Japanese, which [E-089](the-claims-lint-only-speaks-english.md)
had shown it could not read. Seven patterns, each mirroring an English entry that already existed,
each a fixed marketing collocation rather than a grammatical judgement.

That part was straightforward. **The part that mattered was the admission that it might not be
enough**, and it is now three lines of the gate's own output:

```
!  7 of 18 pattern(s) can match Japanese, over 2 file(s) of it. A pattern that never
   fires looks exactly like clean copy, so this number is the SCOPE of the check rather
   than evidence about the copy — F-172 owes the review that closes the difference.
```

## The part worth keeping

**A false negative and a clean subject produce identical output.** Zero findings means either
*there is nothing wrong* or *I cannot see what is wrong*, and a gate that prints only its verdict
has thrown away the distinction before anyone reads it.

E-089 was that failure at its most extreme — every pattern ASCII, every byte of a Japanese file
scanned, `0 violation(s)` reported four times over a screen that broke golden rule 11. The
patterns fix the specific hole. **Only the scope line fixes the shape**, because the next locale,
the next file type, the next surface the patterns were not written for will look exactly the same
from outside.

So the gate now counts two things and fails when they disagree: files carrying CJK, and patterns
that can match it. A CJK-bearing file with no CJK-capable pattern is a **reported gap rather than
a silence** — and that half needs no Japanese at all, which is why it is the half that survives
this feature. Adding a third language will turn the build red until somebody writes its policy,
which is the correct order and not an inconvenience to route around.

## Proving a coverage check without breaking the tree

A coverage check is worth nothing until something has watched it fail, and the only way to make
it fail is to take the patterns away — which live in `claims.json`, **a tracked file**. Planting
into tracked files has left this working tree broken four times this month, by three different
mechanisms: a timeout, a Windows `EPERM` on `rmSync`, a Windows `UNKNOWN` on `writeFileSync`. A
`finally` is not a guarantee; it is a hope about how the process ends.

So the mutation is an environment variable, and the reason it is not a bypass is worth stating
precisely: **it only ever removes patterns, which makes the gate find less, at which point the
coverage check fires and the build goes red.** There is no setting of it that lets anything
through. That is the test for whether a switch inside a gate is acceptable — not *who would use
it*, but *what is the worst thing it can cause*.

## What is deliberately not patterned

測定 — the word the actual defect used. Six of its eight uses in the catalogue are correct, on the
`measure` screen, where a person enters values from their own instrument and the provenance really
is `calibrated`. Telling the two groups apart is grammar, not vocabulary.

A rule written from a dictionary would either pass everything or block the product's only honest
use of the word, **and neither failure would be visible to whoever wrote it**. It is recorded as
the worked example the native-speaker review must settle, and the fixture
(`packages/testing/fixtures/claims/japanese.md`) is built from the product's own real strings so
that the review has something concrete to rule on rather than a regex.

**The green case is the one that matters.** A pattern set that banned the vocabulary would pass
every red case in the proof and break the `measure` screen.

## What this feature could not discharge

The first acceptance criterion says *every pattern reviewed by somebody who reads Japanese*, and I
do not. Each pattern mirrors a reviewed English one — but *mirrors* and *is correct* are different
claims, and only a reader closes that gap. Left **outstanding** rather than argued away.

Related: [[the-claims-lint-only-speaks-english]] ·
[[two-thorough-checks-and-neither-looked-at-a-pair]] ·
[[a-proof-that-plants-must-survive-being-killed]]
