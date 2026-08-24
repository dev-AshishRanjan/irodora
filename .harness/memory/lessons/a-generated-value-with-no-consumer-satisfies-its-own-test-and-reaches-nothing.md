---
kind: lesson
title: A generated value with no consumer satisfies its own test and reaches nothing
category: convention
confidence: 0.95
created: 2026-08-24
scope: [packages/design-tokens, packages/ui, apps/mobile]
links: [[a-tested-module-nobody-wired-up-passes-every-test-it-has]], [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]], [[an-effect-rationale-is-prose-in-a-state-file-and-nothing-executes-it]], [[a-token-change-is-a-contrast-change-in-both-themes]]
---

# A generated value with no consumer satisfies its own test and reaches nothing

`typography.numeric.fontFeature` has been `"tabular-nums"` in the design manifest since F-003,
with a note calling it **mandatory on every colour value, coordinate, score and delta**. It was
emitted to `nativeNumericFeature`. Its emitter had a test. That test asserted the constant
equals the manifest, and passed.

**No component read it.** For two releases, C9 — *"numbers are tabular; proportional figures
make a ΔE table unreadable"* — was true of a constant and false of every pixel.

## Why this is not the same as dead code

Dead code is unreferenced and looks it. This looked **complete**:

- the manifest declared it, with a rationale;
- the emitter emitted it;
- a test asserted the emitted value matched the manifest;
- the effect graph carried a link from the manifest to the token package.

Every one of those was true, and the chain still stopped one step short of a screen. The link
in the graph was accurate about *every other token* and wrong about this one — which is worse
than a missing link, because the graph looked complete.

## The check that catches it

Not "is the constant correct" — that one existed and passed. **"Does the value reach a rendered
node?"**

```
assert the variant is present on the node when the caller asks for it
assert it is ABSENT when the caller does not          ← the decoy
```

The decoy is what makes the first assertion mean something: a component that applied the
feature unconditionally would satisfy it, and the prop would be decoration
[[a-negative-test-needs-a-decoy-not-an-empty-fixture]].

## Where else to look

Any generated artefact whose test compares it against its own source. The question to ask of
each is not *"is it right"* but ***"what would break if it were deleted"***:

| Generated | If it were deleted, what fails? |
|---|---|
| a token that a component reads | a render assertion, immediately |
| a token that only its emitter's test reads | **its own test, and nothing else** |

The second row is the failure. `a11y-scope.mjs` already computes this closure for *components*
— every component is either consumed by a screen or registered, and anything outside the
closure fails. **No equivalent exists for token values**, and this is the case that shows why
one would be worth having.

## The habit until there is a check

When adding a value to the manifest, name the component that will read it in the same change.
If the honest answer is "none yet", that is a feature to file, not a value to emit.
