# A journal opened before an early exit claims plants that never happened

**Date:** 2026-09-14 · **Found in:** F-218

`verify-mockups --prove` opened its plant journal, then checked the baseline. Gate 0 was red for
an unrelated reason, so the baseline check called `process.exit(1)` — which skips `finally`.
Nothing had been planted, but the journal now listed five files as holding planted defects, and
the next run refused to start:

```
A mutation proof did not finish.
  5 file(s) are still holding a planted defect, left by: verify-mockups --prove.
```

**The tree was intact; the journal was lying.** It had recorded intent for mutations that never
happened. The journal is designed to be believed — it refuses rather than repairs — so a false
entry costs a human the job of proving it false before anything can run again.

**The rule.** Assert the baseline, and do every other check that can exit, **before**
`guardPlants()`. Open the journal immediately before the first plant. A journal's value is that
it only ever records a real mutation.

**Recovery, done without trusting either side.** The entry format is `original` (the file's text)
or `deleted: true` (the path did not exist). Every entry was compared with the file on disk
before `plant.mjs --recover` ran — recovery restores bytes, and restoring bytes over a file
someone has since edited destroys their work. A first comparison that guessed the format wrong
flagged every entry as different; it stopped, which was the right failure.

Links: [[a-memory-note-without-its-link-turns-gate-0-red-and-strands-a-plant]]
