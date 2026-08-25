---
kind: effect
title: A token with no reader is a decision nobody applied, and comments are not readers
category: contract
confidence: 0.85
created: 2026-08-25
scope: [packages/design-tokens, packages/ui, apps/mobile]
links: [[generating-an-artefact-is-not-checking-it]], [[a-decoy-that-is-not-broken-proves-nothing]], [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]]
---

# E-029 — a token with no reader is a decision nobody applied

**`docs/design/design-system.manifest.json` → the two generated modules · `packages/ui/src` ·
`apps/mobile/src` · `.harness/verification/unreached-tokens.json` · gate 8**

## The gap two checks left between them

Every value in `packages/design-tokens/src/generated/` is byte-compared against the manifest by
`emit.test.ts` and again by `generate-design-tokens.mjs --check`. So each one is **correct**.

**Nothing asked whether it was used.** F-019 found `nativeNumericFeature` that way by hand —
emitted, exported, reaching no component — and the only reason anyone noticed is that someone
read the file. F-094 found the same shape at artefact level with `global.css`.

ADR-0054 had already settled the identical question for *components*. This is the same closure
over *values*, in gate 8 beside `a11y-scope.mjs`.

## Three rules decide whether it is worth anything

**`packages/ui/src/testing/` is not a reader.** A token read only by the conformance checker
exists so a **check** can enforce it; that is a real purpose and not a painted pixel. Without
the exclusion, four findings would have been absorbed silently and the acceptance criterion
*"a token whose only reader is its own emitter test is reported by name"* would have been
unsatisfiable by construction.

**Reach propagates through object values, never through keys or array elements.**

| | why |
|---|---|
| object values **propagate** | `Surface` resolves `surface.1` through `nativeElevation`; that name appears nowhere as a literal |
| keys **do not** | `theme.tsx` reads `nativeColors`, whose keys are all 33 colour tokens — one import would mark the palette reached |
| array elements **do not** | `Text` asks `nativeLargeTextSizes` *is this large text?* — a membership test is a question nobody answers with the token |

**An object is looked up; a list is looked in.**

## Comments are not code, and the proof is what found it

`border.strong` was removed from all five components that use it and the check still called it
reached — because `Button.tsx` mentions `` `border.strong` `` in a comment explaining why it
does *not* pair. Backticks are one of the quote characters a literal read matches, so **every
JSDoc example in a repository that comments this heavily was counting as a consumer.**

Stripping comments turned three more tokens honest, including **`foreground.3`** — the token
whose entire purpose is to be restricted — whose every mention in the reader zone is prose about
why it is dangerous.

I would not have found this by reading the check. The plant found it, which is the argument for
planting one that removes a **real** consumer rather than adding a synthetic file
[[a-decoy-that-is-not-broken-proves-nothing]].

## The escape hatch runs both ways, and one entry is a defect

`.harness/verification/unreached-tokens.json` declares 34 names, each with a `why` and a
citation. The whole list **prints on every run**, not only on a failure. A declaration for a
token that **is** read fails — the same both-directions rule as E-021 and E-028.

**`nativeSpacing` is the entry that is a finding rather than an exemption.** The scale is
emitted, exported and imported by nothing, while 69 hand-written padding/margin/gap declarations
use eight values of which **five are not on the scale** and three are not multiples of the
declared `base: 4`. Filed as **F-095**, and the declaration cites that id.

An escape hatch whose reason is a pointer to work is working. One whose reason is a soothing
sentence is how a defect becomes permanent.

## What this link does not cover

A reader is found by **string literal**, which is a heuristic and not a type — a component that
built a token name by concatenation would read a token this cannot see and be reported as
unreached, which is the false positive that gets a check deleted. None exists today.

Leaf level reaches named tokens only: `nativeSpacing` is an array with no names and
`nativeMotion.forbidden` is prose, so `nativeMotion.durations.micro` is not individually
checked. Said in the header rather than implied, because a check that claims more coverage than
it has is the problem it was built to solve.
