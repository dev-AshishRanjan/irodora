---
kind: effect
title: The cache key decides whether a gate ran at all, and it sits upstream of every other guard
category: contract
confidence: 0.95
created: 2026-08-25
scope: [root, packages, apps/mobile]
links: [[a-cache-key-describes-the-package-not-the-world-the-test-read]], [[a-task-runner-that-walks-packages-cannot-see-a-file-outside-one]], [[a-gate-that-errors-is-failing-open]], [[generating-an-artefact-is-not-checking-it]]
---

# E-025 — the cache key decides whether a gate ran at all

**`turbo.json` → `package.json`'s scripts · `scripts/gate.mjs` · gate 5 · gate 2 · every other
link in this graph**

## Why this one is `critical` when it touches no product code

Look at what the rest of the graph names as its guard: E-001 and E-003 say `gate:color-golden`,
E-007 says `gate:contrast`, E-013 and E-023 say `gate:content` and `gate:test`. **Every one of
those is discharged by a task turbo may decide not to run.**

A cache key that is narrower than what a task reads does not weaken one check. It weakens the
whole graph, silently, and the graph has no way to say so.

## The two ways it was narrower

**Keyed on the package, not on what the test read.** Eight files in
`packages/design-tokens/test/` read `docs/design/design-system.manifest.json`. Planting a change
that fails seven of them — `radius.swatch` from `0` to `4` — produced:

```
@irodora/design-tokens:test: cache hit, replaying logs
 Tasks:    5 successful, 5 total
```

**Keyed on the request, not on the runtime.** `turbo run test --dry=json` shows the global hash
containing `.nvmrc` as a **git blob** and `engines` as a **range**. Neither is the process
executing. A cache made on Node 24 replays on Node 22, where the bitwise identity and golden
fixtures differ by units in the last place — WCAG contrast `4.500078715444717` against a pinned
`…719`.

## The guard, and that both halves were watched failing

`scripts/verify-cache-scope.mjs`:

1. a test may not read past its package unless the target is a declared `globalDependency` — and
   a path it cannot resolve statically counts as **unaccounted**, failing closed;
2. a **cached** task must be started by `scripts/gate.mjs`, which is what puts the exact Node and
   package-manager versions into the key.

Rule 1 was proven with `--prove`: six planted cases, including two controls that must stay
silent, with the baseline asserted green before the plant and after its removal. Rule 2 was
watched going red on a script reverted to a bare `turbo run test`.

**The proof itself needed a second attempt, and that is worth keeping.** The first plant sat one
directory deeper than a normal test, so every planted ascent landed back *inside* the package
and three cases reported "nothing" while looking like a broken scanner. A decoy at the wrong
depth proves nothing [[a-decoy-that-is-not-broken-proves-nothing]].

## What it cannot see

A path assembled at run time, or read through a helper the scan cannot follow. Printed on every
run rather than implied. Rule 1's polarity limits the damage — an unresolvable ascent fails —
but a read with no `..` in it is invisible to source analysis.

## The decision embedded in it

A mismatched toolchain **warns and re-keys**; it does not refuse
([ADR-0068](../../../docs/adr/0068-a-gate-on-an-unsupported-toolchain-warns-and-re-keys-rather-than-refusing.md)).
A false red is unhelpful; a false green is a gate lying about the code. Keying removes the
second completely, and refusing would add nothing to that while leaving a workstation unable to
run any gate at all.
