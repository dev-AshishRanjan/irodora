---
kind: lesson
title: A green gate says the code works, not that it is where the record says it belongs — read the feature's own row before the first line, not after the last
category: process
confidence: 1.0
created: 2026-08-31
scope: [root, .harness/state, .harness/plans, packages]
links: [[prose-in-a-state-file-rots-and-no-schema-can-see-it]], [[saying-not-run-here-is-necessary-and-it-is-not-sufficient]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# A green gate says the code works, not that it is where the record says it belongs

Every gate in this repository checks a property **of the code as written**: does it compile,
does it pass its tests, does it lint, does the build emit. Not one of them asks the question
the feature list answers — *is this the package this feature was scoped to?*

So a feature can be built in the wrong package and go green end to end. Typecheck passes
because the imports resolve. Tests pass because they are colocated with the code. Build passes
because the package is valid. **Nothing is broken. Everything is misfiled.** There is no
failure to notice, which is what makes it different from an ordinary mistake — the feedback
loop that catches everything else here is structurally silent about it.

## Where it came from

F-049 (duplicate detection) was built in `@irodora/recommendation`. Its row in
[`feature_list.json`](../../state/feature_list.json) said `@irodora/optimization`, and had said
so since the feature was written. [`ARCHITECTURE.md`](../../../docs/architecture/ARCHITECTURE.md)
draws the line in two lines:

```
recommendation/     rules, weights, scoring, explanation objects
optimization/       capsule and coverage solvers
```

`packages/optimization/src/index.ts` even carried a placeholder reading *"Capsule and coverage
solvers. Implemented in F-048 onward."*

The cause was not carelessness about the record — it was **momentum**. The plan header was
copied forward from F-046, whose package genuinely was `recommendation`, and the field was
never re-derived. F-048 had made the identical error one feature earlier and shipped with it.

It was found by reading the feature's row while waiting for a slow gate to finish. Not by any
check. Had that idle minute gone elsewhere, F-050 would have inherited the mess from two
features at once.

## What to do about it

**Re-derive the package from the feature's own row when you write the plan header.** It is a
field in the row you are already reading to get the acceptance criteria. Copying the previous
feature's header is how it goes wrong, and the previous feature is the most likely thing to be
open in front of you.

**Treat the plan header as a claim to check, not a label to fill in.** Everything else in a
plan gets argued for. The package field gets typed.

## The general shape

This is the same failure as
[[saying-not-run-here-is-necessary-and-it-is-not-sufficient]]: a gate's silence is evidence
about what the gate examines, never about what it does not. The set of properties nobody
checks is invisible precisely because nothing reports on it — so it has to be enumerated
deliberately, from the record, rather than waited for.

Worth knowing about this repository specifically: **gate 0 validates the shape of
`feature_list.json` thoroughly and the truth of it not at all.** It will confirm that
`package` is a string. It has no way to know whether that string describes where the files
went.
