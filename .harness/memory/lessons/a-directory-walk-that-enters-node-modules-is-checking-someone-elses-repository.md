---
kind: lesson
title: A directory walk that enters node_modules is checking someone else's repository
severity: medium
created: 2026-08-14
scope: [scripts, .harness]
links: [[a-gate-that-errors-is-failing-open]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# A directory walk that enters node_modules is checking someone else's repository

**Gate 0's scoped-harness scan reported 13 harnesses when 7 exist. The extras were our own
`AGENTS.md` files reached through pnpm's workspace symlinks, and the scan was also reading
third-party packages.**

## How it surfaced

Removing one unused workspace dependency in F-006 moved the count from 14 to 13. A count that
changes when a `package.json` changes is not counting what it claims to count.

`walk()` used `statSync(full).isDirectory()`, which **follows symlinks**, and had no
`node_modules` exclusion. pnpm links workspace packages into each other's `node_modules`, so
`packages/testing/node_modules/@irodora/color-core/AGENTS.md` was the same file as
`packages/color-core/AGENTS.md`, counted twice, and reachable by as many routes as there were
dependency edges.

## Why the wrong number was the small half

The scan looks for language that **weakens a golden rule**. Reading files we do not own means:

- a dependency that happens to ship an `AGENTS.md` containing "may skip the gates" would fail
  our build, on a file nobody here can edit;
- a check that reports "7 scoped harnesses, none weakening a golden rule" was reporting on a
  set that included other people's documents — so the reassurance was about the wrong thing;
- a symlink cycle would hang the gate, and
  [[a-gate-that-errors-is-failing-open]] applies to a gate that never returns as much as to
  one that throws.

## The fix, and its proof

`readdirSync(dir, { withFileTypes: true })` plus an explicit skip list. `Dirent.isDirectory()`
does **not** follow symlinks, which closes the cycle risk in the same change.

Proven in both directions, because only one direction is a proof:

```
weakening AGENTS.md inside node_modules  → gate 0 exit 0   (correctly ignored)
weakening AGENTS.md in a real scope      → gate 0 exit 1   (correctly caught)
baseline after both removed              → gate 0 exit 0
```

## How to apply

- **Any recursive walk in `scripts/` excludes `node_modules`, `dist`, `.turbo`, `.next`,
  `.expo`, `coverage`** — and the one in `verify-state.mjs` now does it in one place, so
  future checks inherit it.
- **Use `Dirent` rather than `statSync` for directory tests.** Following symlinks is almost
  never what a repository scan wants.
- **A count in a gate's output is a check.** If it moves for a reason unrelated to what it
  measures, that is a defect report, not noise.

## Related

Found while tracing effects for F-006 rather than by a failing test — which is the argument
for the effect-link protocol running before a feature closes rather than after.
