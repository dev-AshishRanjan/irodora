---
kind: lesson
title: A coloured tool output hides the word a grep looks for
category: workaround
confidence: 0.9
created: 2026-10-06
scope: [root, packages/ui]
links: [a-pipe-hides-the-exit-code-that-decides-the-commit]
---

# A coloured tool output hides the word a grep looks for

**Encountered in F-235** (2026-10-06, this workstation).

A quick check ran `npx tsc --noEmit -p . | grep -A4 "error TS"` after each component, and printed
nothing, so the package looked clean. It was not: `tsc` colours its diagnostics, and the line reads
`error` then an escape code then ` TS2322`, so the literal `error TS` never matches. The full
`pnpm typecheck` gate caught it later (`glyphAt="end"` on a `Button`, which takes `leading` or
`trailing`), after three more files had been written against the wrong belief.

The `echo $?` after the pipe printed 0 as well — the exit code of `grep`, not of `tsc` (the linked
lesson).

## What to do

- **Decide on the gate's own exit code**, run alone: `pnpm -s typecheck; echo $?`.
- **When a filtered view is wanted, strip the colour first**:
  `... 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep "error TS"`.
- A filter that prints nothing has proved nothing about the tool it filtered. Before trusting an
  empty result, make the filter find something once — a planted error, or a known warning.
