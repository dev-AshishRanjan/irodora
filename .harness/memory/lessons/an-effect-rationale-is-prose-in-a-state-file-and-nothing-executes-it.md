---
kind: lesson
title: An effect rationale is prose in a state file, and nothing executes it — so it rots exactly like a comment
category: convention
confidence: 0.95
created: 2026-08-24
scope: [root, .harness]
links: [[a-corpus-publish-can-outrun-the-font-that-renders-it]], [[a-failing-gate-is-usually-already-filed]], [[a-decoy-written-against-old-values-quietly-stops-discriminating]], [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]]
---

# An effect rationale is prose in a state file, and nothing executes it

**E-017 said its guard was "built and proven but NOT YET BLOCKING" and that
`verify-font-coverage.mjs` "exits 1 today because no font asset exists."**

F-076 shipped the asset and wired the script into `pnpm test:content`. The rationale — and its
paired memory note — kept saying the opposite through F-076, F-087 and F-088, and was still
saying it when F-012 opened.

It was caught by **running the guard**, not by reading about it. The corpus went in, every other
gate stayed green, and the script reported 183 missing codepoints. A session that had trusted
the note would have concluded the check could not run yet and skipped it.

## Why this class of rot is worse than a stale code comment

A stale comment misleads whoever is reading that function. A stale effect rationale misleads
whoever is deciding **whether a check can be trusted at all** — which is the decision the graph
exists to inform. The failure mode is not confusion, it is a skipped verification.

And the rationale is where the honest admissions live. `guard: none`, *"not yet blocking"*,
*"detected against intent rather than enforced"* — these are the sentences that make the graph
worth having, and they are exactly the sentences that become false when someone does the work.
**A promise kept turns its own record into a lie.**

## What gate 0 does and does not check

Gate 0 already validates that every link's paths resolve, that every critical link names a
guard, and that every link has a paired memory note. **All three passed the whole time**, because
a rationale describing a world that no longer exists is still a well-formed string attached to a
valid path.

This is the same defect class F-074 fixed for `feature_list.json` acceptance criteria and the
PRD metrics table — prose in a state file that rots silently while every structural check stays
green. That guard was not extended to `effects.json` rationales, and this is the first case of
it firing there. Recorded as a backlog feature rather than left as an observation.

## The habit, until there is a check

**When a feature discharges an obligation, the record of that obligation is part of the change.**
Grep for the link id before closing:

```bash
grep -rn "E-0NN" .harness/state/effects.json .harness/memory/
```

And when reading a rationale to decide whether to run something: **re-read the note against the
gate, not the gate against the note.** Running the script costs seconds and answers the question
the prose was only reporting on.
