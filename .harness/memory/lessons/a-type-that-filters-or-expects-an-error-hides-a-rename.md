---
kind: lesson
title: A type that filters, or a line that expects an error, hides a rename from the type checker
category: engineering
confidence: 0.9
created: 2026-09-28
scope: [packages/ui, packages/design-tokens, apps/mobile]
links: [[reproduce-a-published-number-before-trusting-the-method-it-states]]
---

# A type that filters, or a line that expects an error, hides a rename from the type checker

**What happened.** F-226 replaced the type scale: `display.1` became `display1`; `display.2`, `small`
and `xs` were deleted; and `label` changed from 10 px to 14 px. The rewrite was driven by the type
checker, on the reasoning that a deleted step name is a type error at every caller. It rewrote about 275
sites, and all three packages type-checked. Three sites were still wrong:

- **`Extract<keyof typeof nativeType.latin, 'display.1' | 'display.2' | 'title'>`**. `Extract` keeps
  only the members that exist, so the two removed names vanished from the union without an error, and
  `WordmarkSize` quietly shrank to `'title'`.
- **Two `@ts-expect-error` lines** in a test that expected an error for a different reason (an
  unknown colour token). After the rename, `ColorFor<'small'>` also errored because `'small'` no
  longer existed, and the directive was satisfied for the wrong reason.

The rename of `label` (10 → 14) had a trap of its own: a name that survives with a new meaning is
invisible to the checker. It was done in two passes. First every `label` became `caption` and the
name was deleted, with a typecheck between. Only then did `small` become the new `label`.

**The rule.** When a rename is proved by "it type-checks", also search for the old names textually
inside `Extract`/`Exclude`/conditional types and on every line below an `@ts-expect-error`. Those are
the two places where the type checker is told not to complain. And never let an old name carry a new
meaning in the same pass: delete it, type-check, then reintroduce it.
