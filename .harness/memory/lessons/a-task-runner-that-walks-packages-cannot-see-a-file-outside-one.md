---
kind: lesson
title: A task runner that walks packages cannot see a file outside a package
category: convention
confidence: 1.0
created: 2026-08-20
scope: [root]
links: [[a-tested-module-nobody-wired-up-passes-every-test-it-has]], [[a-gate-that-errors-is-failing-open]], [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]], [[generating-an-artefact-is-not-checking-it]]
---

# A task runner that walks packages cannot see a file outside a package

`pnpm lint` was `turbo run lint`. Turborepo runs each **package's** `lint` script, and each of
those is `eslint .` rooted in that package. `scripts/` is in no package and has no
`package.json`, so **no invocation of eslint ever had it in scope** — not a misconfigured rule,
not an ignore entry, simply a directory that nothing walked.

That was 23 files, including `verify-state`, `verify-guards`, `verify-engine-purity`,
`verify-claims`, `verify-content`, `verify-motion` and `verify-font-coverage`: **the code that
decides whether everything else is allowed to ship.**

## Why it stayed invisible for so long

Because the output looked like coverage. `turbo run lint` prints `31 successful, 31 total` and a
green summary, and 31 is a large enough number to read as "everything". Nothing in that report
names what was *not* visited, and a task runner has no way to know that a directory it was never
pointed at exists.

The proof of the gap is the cleanest form there is. With two errors planted in `verify-state.mjs`
— an unused binding and a reference to `window` — the run said:

```
Tasks:    31 successful, 31 total
Cached:   31 cached, 31 total
  Time:   184ms >>> FULL TURBO
```

Fully green, fully cached, on a gate script that did not parse under any rule at all.

## How it was noticed

Not by auditing the lint setup. It surfaced sideways: `packages/ui`'s own `jest.config.mjs`
failed to parse with *"project was set to `true` but couldn't find any tsconfig.json"*, and the
same command against `scripts/verify-state.mjs` failed identically. **The error was reachable
only by aiming eslint at the file by hand**, which nobody does for a directory they assume is
covered.

## The shape of the fix

Two lines, and neither is the interesting part:

- a flat-config block for `scripts/**/*.mjs` using `tseslint.configs.disableTypeChecked` — type
  awareness needs a tsconfig covering `scripts/`, which is a larger decision than this defect
  warrants — with `globals.node` for the environment;
- `eslint scripts` appended to the root `lint` script, which CI already invokes as
  `pnpm lint`, so the fix reached CI without touching a workflow.

The interesting part is that **the config existing proves nothing.** A rule nobody has watched
fail is configuration that parses. Plant, watch it go red, remove — and then leave something
behind that repeats it, because a one-time experiment guards nothing after the session ends.
Boundary 18 in `verify-guards.mjs` re-plants the violation on every run, and a second assertion
checks that `eslint scripts` is still in the root `lint` script: the ci-mirror check compares
gate COMMANDS and never reads what `pnpm lint` contains, so the segment could be deleted with
every gate still green.

**The first draft of that zone hand-listed eight globals and was already wrong twice** — it
carried two names nothing under `scripts/` uses, and it would have produced a spurious
`no-undef` for the next script to call `setTimeout`, whose tempting fix is a disable comment in
the directory the zone exists to protect. A remembered copy of a list that already exists is the
same defect as a remembered copy of the manifest.

## The general form

**Ask what a check's traversal root is, not what its rules are.** Every tool that discovers work
by walking a structure — a workspace, a glob, a package graph, a test-file pattern — has a
boundary, and files outside it are not failing, they are absent. Absence produces no output, and
a report that counts successes counts only what it visited.

The corollary that made this one expensive: the excluded directory held the verification
apparatus. **A blind spot is worst exactly where the checkers live**, because everything else's
green depends on code that nothing was checking.

## What it turned up

Nine findings, fixed rather than suppressed: two `no-undef`, four unused bindings, two useless
assignments and one unattached `cause`. One was a live defect rather than tidiness:
`verify-claims.mjs` incremented `bareMarkers` for every inline marker rejected for having no
reason, and then printed only `markerUses` — so a run could report "3 inline marker(s)" while
describing a different set than the one it had counted.
