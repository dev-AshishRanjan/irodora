# Evidence needs a count, or it is just a word

**Effect:** [E-110](../../state/effects.json) · **Feature:** F-204 · **Date:** 2026-09-09

The criterion was *"the result is recorded"*. The obvious artefact is a file that says
`"findings": 0`.

**That file is indistinguishable from one written by a run over zero subjects.** Same word, same
green, completely different fact — and the second is the one that actually happens, because a
registry import breaks, a filter matches nothing, or a glob stops resolving.

So the record carries what it *checked*:

```json
{ "subjects": 72, "conditions": 8, "findings": 0 }
```

And the counts are **asserted against the registry**, not typed. A hand-written number goes stale
the first time a subject is added, and the file then describes a smaller sweep than the one that
ran — which is worse than no record, because it looks like one.

## Say what it cannot see, in the artefact

The sweep measures structure, naming, tap targets, token resolution and selection treatment. It
cannot see a layout that is cramped or unbalanced.

That sentence went **into the JSON**, not only into the skill — because the person who reads the
evidence in six months is deciding how much to trust it, and *"0 findings"* with no stated scope
invites more trust than it has earned. Every "unprofessional" report in this project has been
about something that was green here at the time.

## And cite rather than repeat

Two conditions belong to other gates: CVD to gate 9, token reach to `verify-token-reach`. The
sweep records the citation and does not re-run them.

Re-simulating CVD per subject would feel more thorough and would be strictly worse: **two
definitions of separation, which will disagree eventually.** The skill says so in capitals,
because "be more thorough" is exactly the instinct that produces it.

## The lesson

**A check reports two things — its verdict and its subject — and only the first one is usually
written down.** When you record evidence, record what was examined. A green result over an empty
set is the most common lie a build tells, and it never tells it out loud.

[[a-check-must-report-its-scope-not-only-its-verdict]]
