---
kind: lesson
title: A later ESLint flat-config object replaces a rule's options; it does not merge them
category: error-resolution
confidence: 1.0
created: 2026-08-14
scope: [root, packages]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[a-gate-that-errors-is-failing-open]]
---

# A later flat-config object replaces a rule; it does not merge

**Found during F-001, before the rule had ever been executed.**

`eslint.config.mjs` set `no-restricted-imports` workspace-wide with the package-boundary
patterns, then set it again in a narrower block scoped to the colour engine with only the
`node:*` patterns:

```js
// workspace-wide
'no-restricted-imports': ['error', { patterns: [ deepImports, threeLevelsUp ] }],

// later, files: ['packages/color-*/**/*.ts']
'no-restricted-imports': ['error', { patterns: [ nodeApis ] }],   // ← replaces, not merges
```

**The second declaration replaces the first entirely** for the matched files. Deep-import
protection silently became legal in `packages/color-*` and `packages/cvd-engine` — exactly
the packages where boundaries matter most.

## Why it survives review

Everything about it looks right. Both blocks are correct in isolation. The config parses.
ESLint runs clean. The narrower block *reads* as "and also forbid these", because that is how
`files`-scoped overrides feel — and it is how several other tools behave.

Nothing fails. The rule is simply weaker than the file claims, in the zone with the strictest
written rules.

## The fix

Repeat the inherited patterns in the override, with a comment saying why:

```js
// NOTE: a later config object REPLACES no-restricted-imports rather than merging,
// so the workspace-wide patterns are repeated here. Omitting them silently disables
// deep-import protection in exactly the packages that need it most.
```

## The general form

> **A rule that has never been watched fail is not enforcement. It is configuration that
> parses.**

This is why `scripts/verify-guards.mjs` exists, and guard #3 exists specifically for this
defect. Each guard writes a deliberately violating file at the exact path the rule targets,
lints it, asserts the rule fires, and deletes it — the
[[a-negative-test-needs-a-decoy-not-an-empty-fixture]] discipline applied to lint.

**It found this before the rule ever ran in anger.**

## A second lesson from the same script

The first version shelled out to `npx eslint`. Under Node 20+ on Windows, `execFileSync` on a
`.cmd` throws `EINVAL` (a post-CVE-2024-27980 change). Every guard reported *"NOT enforced"* —
correct in that it failed closed, wrong in what it said.

Two corrections, both kept:

- **Use the ESLint Node API** (`new ESLint().lintFiles()`) rather than spawning. No shell, no
  platform quirk, faster.
- **Distinguish "could not run" from "did not fire".** Conflating them sends the next person
  to fix the ESLint config when the actual fault is in the runner —
  [[a-gate-that-errors-is-failing-open]] applies to the *reporting* as much as to the exit
  code.
