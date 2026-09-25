---
kind: effect
title: A derived theme stores the moves its rule computed, and the generator re-derives them every build
category: contract
confidence: 0.9
created: 2026-09-25
scope: [packages/design-tokens, scripts]
links: [[the-mockups-readme-is-the-palette-now]], [[the-guarantee-written-for-correctness-paid-for-the-dynamic-theme]], [[a-token-that-passes-can-be-what-holds-the-others-out]]
---

# E-148 — the settle rule → the manifest's stored moves

**`packages/design-tokens/src/settle.ts` (with `derive-theme.ts`) → `themeDerivations.*.moves` ·
`generate-design-tokens.mjs` · `seed.ts` · gates 9 and 10**

## What happened

ADR-0107 derives Slate Graphite and Obsidian Noir by re-anchoring Sumi's drawn steps at each
theme's drawn ground. Obsidian then passes everything. Slate fails eight pairings, and §4 E3 says
each failing token moves by the smallest lightness step that passes, hue and chroma held.

Seven of Slate's failures settled that way. The eighth did not. Lifting `status.ok` and
`status.warn` to clear 4.5:1 on Slate's lighter levels brought them close to `status.bad`, and
the triple stopped separating under CVD simulation. **No lightness-only move exists**: of the 256 lightness-only combinations that pass contrast (39,114 in gamut, on a 0.01 grid), none is clean
(`mockups/tools/slate-status-search.mjs`). So the rule took one more
step: a failing CVD pair moves whichever member passes by the smallest ΔE00, **with its hue held**,
lightness and chroma free. Slate's `status.bad` went to L 0.884, C 0.060.

## Why the moves are stored AND computed

Stored, so the manifest a person reads is what ships, and the parser applies moves rather than
searching. Computed, because a stored number that nobody re-derives is a typed value (ADR-0043).
`--check` does both. It empties the moves, re-runs `settleFloors` and `settleSeparation`, and fails
on any difference. That makes a change to the rule, to the re-anchor list or to any value either
reads a manifest change or a red gate 9, never a silent drift.

The device colour (`seed.ts`) uses the same `settleFloors` at runtime, because the README's values
sit at zero margin and a tint can push one under its floor. It reports each move as a `floor`
correction. It never needs `settleSeparation`, because a seed leaves the status triple untinted.

## How to apply

Change either settle function and run `node scripts/generate-design-tokens.mjs` (write mode), then
read the diff to `themeDerivations`. Every changed move is a changed colour in a shipped theme, and
it belongs in §4 E3's table. Only the text or non-text side of a pairing ever moves: moving a
surface moves every pairing on it at once.
