# A package's gate is not the repository's gate

**Date:** 2026-09-15 · **Found in:** F-223, by its single review

F-223's increments 3 to 6 were committed with **`pnpm lint` and the app test suite red**, and each
commit's guard line was green. Both were true at once, because the guard ran the wrong things:

- **Lint** was the changed packages' `eslint`. The root `pnpm lint` is eslint *followed by 28
  repository checks*, and the one that failed — `verify-empty-assertions`, which refuses
  `toEqual([])` (F-133) — exists only in that chain.
- **Tests** were the new test files. The app suite has tests that watch a directory rather than a
  module: `profile.test.ts` holds the roster of `src/profile/` so that a new file there is scanned
  for camera imports or excluded on purpose. Adding `season.ts` failed a test the feature never
  opened.
- **Timing** only appears under load. The package's grid test passed alone and timed out under
  turbo's parallel run — one `expect` per profile, about 50,000 of them.

Each subset was a faithful check of the code I had just written. None was the gate, and golden rule
10 is about the gate.

## What to do instead

Iterate on subsets; **commit on the root commands** the feature's `verification` list names —
`corepack pnpm lint`, `corepack pnpm test`, and the rest — each status captured in its own variable
[[a-pipe-hides-the-exit-code-that-decides-the-commit]]. The *Verify:* line in a plan names gates,
and a gate is the root command, not the part of it nearest the change.

## Why it is worth a note

The failure shape is a transcript full of green lines about the wrong scope. It will recur whenever
a feature spans packages, because a package subset is fast and looks complete from inside the change.
The review caught it at the end; nothing built on the red commits, but four "verified increments"
were not.
