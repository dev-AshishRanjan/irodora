# A rename is only as complete as the shapes you enumerated

**Date:** 2026-09-16 · **Found in:** F-227

Renaming the spacing and radius steps was the F-103 hazard at full size: the new names COLLIDE with
the old ones — spacing `md` was 12 and is 16, `lg` was 16 and is 24 — so every one of 365 references
kept compiling and meant a different number. The migration was therefore table-driven and audited per
reference, which was right, and it still missed two shapes.

**The shapes I enumerated:** member access (`nativeSpacing.md`) and step-named props (`gap="md"`,
`padding: 'lg'`, `radius = 'md'`).

**The shapes I missed:**

1. **A step name as data.** `layout.test.tsx` holds `['md', nativeSpacing.sm]` in an `it.each` table —
   the name is a bare string in an array, not a prop. The migration rewrote the value beside it and
   left the name, so the test asked for one step and expected another. The test caught it; nothing
   else would have.
2. **A step name inside a check.** `verify-token-reach.mjs` counted a spacing step as read only when
   it appeared as `nativeSpacing.<step>`, citing an F-111 note that step-named props "would match
   nothing". That was true when it was written and false since the layout primitives landed, so a
   step with four screen readers was reported unreached — and the easy fix, a declaration in
   `unreached-tokens.json`, would have been a false statement that passed.

## What to do instead

Before a rename, enumerate where the name can APPEAR, not only where the value is READ: source,
props, defaults, test tables, fixtures, proof plants, and the checks' own assumptions about which
shapes count. Then let the first full run be the audit — the gates found all four of these, each in a
different file, and each would have been silent in the product.

## The second half, which is the more general one

**A check's model of how a value is used expires.** Two gates and a proof carried assumptions from
the release that wrote them: token reach's "spacing is never a prop", and two spacing-proof cases
planting values (`nativeSpacing.xl2`, `gap: 28`) that the new scale no longer contains — both of
which were named "must stay GREEN" and would have asserted the opposite. When a scale moves, the
checks that read it are part of the change, and a proof that plants a value is pinned to the scale as
surely as a screen is.

[[a-package-gate-is-not-the-repository-gate]] · [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]]
