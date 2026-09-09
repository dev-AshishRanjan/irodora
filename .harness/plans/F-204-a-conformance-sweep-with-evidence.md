# Plan: F-204 — A design-system conformance sweep, with evidence

| | |
|---|---|
| **Feature** | F-204 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-25 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Intent

The release built a design system and adopted it across twenty-one routes. This is the feature
that produces **evidence** that it holds — not an assertion in a commit message, an artefact
somebody can read.

## What already exists, and must not be rebuilt

| criterion | already done by | what is left |
|---|---|---|
| every token reached or exempted | `verify-token-reach.mjs` (F-092), both directions, list prints every run | **nothing** — run it and cite it |
| CVD | gate 9, exhaustively over every declared pairing, WCAG + APCA + **eleven severities** | **nothing** — cite it |
| both themes | the conformance registry, every subject | extend to the other conditions |
| both languages | one Japanese `describe` | make it part of the sweep |
| reduced motion | nothing | add it |

**CVD is deliberately not re-simulated per subject.** Gate 9 owns the definition and runs it over
every pairing at eleven severities; a second simulation here would be a second answer to one
question, which is exactly what E-005 exists to prevent. The sweep **cites** it.

## The sweep

Eight conditions — `{light, dark} × {en, ja} × {motion, reduced}` — over every registered
subject, asserting zero findings and **writing the result to
`.harness/verification/conformance-sweep.json`**.

Reduced motion is drivable because `useMotion` reads `AccessibilityInfo` rather than reanimated's
`useReducedMotion`, and F-144's own docblock says why: *"reduced motion is asserted rather than
described, so the mechanism has to be one a test can turn on and off."* That decision is what
makes this criterion checkable at all.

## The evidence is committed, and it is a count as well as a verdict

A file saying *"no findings"* is indistinguishable from a file written by a run over zero
subjects. So the artefact records **how many subjects, under how many conditions**, and the
sweep refuses an empty subject list — the same shape `checkAll` already uses and for the same
reason.

## The skill, which is criterion 3

`.harness/skills/conformance-sweep/SKILL.md` plus its `.claude` shim (ADR-0029), so the next
sweep is run rather than improvised — including the parts that are *cited* rather than repeated,
because the failure mode for the next person is re-implementing CVD simulation badly.

## Files to touch

```
apps/mobile/test/conformance-sweep.test.tsx      — new. The eight conditions.
.harness/verification/conformance-sweep.json     — the evidence, committed
.harness/skills/conformance-sweep/SKILL.md       — new
.claude/skills/conformance-sweep/SKILL.md        — the shim
```

## Test plan

- **The sweep is the test.** Eight conditions, every subject, zero findings.
- **It refuses an empty subject list**, so "no findings" cannot mean "nothing ran".
- **The reduced-motion condition is real:** a decoy asserts the mock actually changes what
  `useMotion` reports, or the fourth axis is a loop that varies nothing.
- **The evidence file is written with the counts**, and its numbers are asserted against the
  registry rather than hard-coded.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · cvd · build`.

## Risks

- **A sweep that renders everything eight times is slow.** The suite already renders every
  subject twice; this is four times that. If it becomes the slowest thing in the build that is a
  measurement to take, not a reason to check less.

## Out of scope

Fixing anything the sweep finds. Criterion 4 says findings are **recorded as features, not as
prose**, and that is what happens to them.
