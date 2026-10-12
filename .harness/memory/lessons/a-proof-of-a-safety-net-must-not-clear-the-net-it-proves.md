# A proof of a safety net must not clear the net it proves

**Date:** 2026-10-12 · **Found in:** F-291, fixed in F-296

## What happened

`plant-proof` proves the plant journal by planting into a scratch file with children it kills. To
start each case clean it deleted the journal, and it deleted it again in its `finally`. It runs in
`pnpm lint` and in `ci.yml`, after other proofs.

- **In F-291** it erased the record of two real plants. One was a CI step deleted from `ci.yml`. The
  journal that would have said so was gone, and `git diff` found them.
- **From F-232 on** it hid a leak: the a11y proof left a journal entry on every run, and plant-proof,
  the next step, wiped it every time.
- **Its baseline**, "no plant is outstanding", ran after the deletion, so it could not fail. It
  printed OK over a real leftover the first time anyone tried.

## The rule

1. **A check that shares state with real work refuses over state it did not create**, names it, and
   stops. It does not clear the state to make room, because that state may be the only record of
   something still broken.
2. **It clears only what it can show it wrote**: by owner, not by deleting the file.
3. **A baseline taken after your own reset tests the reset.** Assert the precondition before you
   touch anything, or do not call it a baseline.
4. **When the clearing stops, look for what it was hiding.** Here, the a11y proof's leak would have
   turned CI red from the next step on, so it had to be fixed in the same change.

## How to apply

Before a proof or test writes into shared state, a journal, a lockfile, a cache or a fixture
directory, ask whose state it is. If it is not only yours, refuse, or work in a private copy.

Links: [[a-decoy-that-is-not-broken-proves-nothing]] ·
[[a-journal-opened-before-an-early-exit-claims-plants-that-never-happened]]
