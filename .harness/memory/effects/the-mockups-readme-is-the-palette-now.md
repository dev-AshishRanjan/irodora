---
kind: effect
title: The mockups' README is the palette now, and a test reads it
category: contract
confidence: 0.9
created: 2026-09-25
scope: [mockups, packages/design-tokens]
links: [[a-derived-theme-stores-the-moves-its-rule-computed]], [[a-rule-that-already-existed-was-the-answer-to-a-question-nobody-had-asked-it]]
---

# E-147 — `mockups/README.md` → the manifest

**`mockups/README.md` §3 → `design-system.manifest.json` · `mockup-palette.test.ts` · gate 9**

## What changed

Precedence P4 makes the README's token table the source of token values. F-225 adopted it exactly
(ADR-0111). A value moves off it only where a blocking gate forces the move, and every such move is
listed in R9-MOCKUP-FIDELITY §4 E3. Before F-225 the README and the manifest were two statements of
the palette, and nothing compared them.

## Why the test reads the README rather than a copy

A copy of the numbers in a test agrees with whoever last edited the test. `mockup-palette.test.ts`
parses the `export const NAME = { … }` blocks out of the README itself. So an edit to either file
alone fails, and so does a README edit that adds chroma, because the ceiling is recomputed from the
chrome the README draws. It also reproduces C11's consequence: C ≤ 0.0206, ΔE00 2.94 to 6.50 from
a neutral well. That number has to stay true for as long as ADR-0111 says it.

## How to apply

Editing the README's table **is** editing the product's palette. Regenerate
(`pnpm --filter @irodora/design-tokens generate`) and run gate 9. Gate 9 may then move a value by
the E3 rule; when it does, record the move in §4 E3. `mockups/README.md` is in turbo's
`globalDependencies`, so no cached result survives the edit. Whether the values *look* right is
F-267's person-led comparison, and no gate replaces it.
