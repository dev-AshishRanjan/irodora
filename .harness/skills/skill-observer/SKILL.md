---
name: skill-observer
description: Notice when the harness itself is wrong or missing something, and improve it — the loop that makes the working system get better.
---

# Skill: skill-observer

> Adapted from ECC (MIT, © Affaan Mustafa) — see [`NOTICE.md`](../../../NOTICE.md).

[`continuous-learning`](../continuous-learning/SKILL.md) captures *what happened*. This
captures *what the harness should have done differently*.

## The signals

Watch for these while working. Each is evidence the harness has a gap:

| Signal | Likely gap |
|---|---|
| You needed a rule that does not exist | A missing rule |
| A skill's steps did not match reality | A stale skill |
| A gate passed while something was broken | **A blind gate** — the most important signal there is |
| A gate failed for something it should not catch | A false-positive rule; a liability |
| You had to ask something the repository should answer | Missing documentation |
| A decision took twenty minutes to reconstruct | A missing ADR |
| A change broke something unexpected | A missing effect link |
| A protocol was skipped because it was unclear | An unclear protocol |
| Onboarding took longer than the stated target | A gap in the reading path |

## Steps

1. **Record it when you notice it** — not later. The specific moment of friction is the
   evidence, and it is gone in ten minutes.
2. **Classify:**
   - a **skill** needs updating,
   - a **rule** is missing, wrong, or unenforced,
   - a **gate** is blind or over-eager,
   - a **protocol** is unclear,
   - documentation is missing.
3. **Fix it if it is small.** A stale step in a skill takes two minutes.
4. **Otherwise record it** — as a `backlog` feature, or in
   [`memory/observations.md`](../../memory/observations.md).
5. **A gate change needs an ADR** ([`policy-model.md`](../../governance/policy-model.md)).

## The signal worth acting on immediately

> **A gate that passed while something was broken.**

That is the most valuable and most dangerous observation available. It means the gate is
theatre — declared, believed in, and not doing its job. Everything downstream of it is
unverified while appearing verified.

When you find one:

1. Confirm it: **construct the broken input and watch the gate go green.**
2. Fix the gate.
3. **Replay the original miss through the fixed gate** and confirm it now goes red. A gate
   added after an incident that would not have caught that incident makes us feel better
   without making us safer.
4. Record it as a lesson.

## Two failure modes of rules worth watching for

**A rule that only produces false positives is a liability.** People learn to ignore the
class of warning it belongs to, which costs more than the rule was worth.

**A gate can teach you to write around it.** If the easiest way to pass a check is to
restructure code so the check does not apply, the check is shaping the code in a direction
nobody chose.

## Guard against noise

Not every friction is a harness gap. Sometimes the task was genuinely hard.

Record when: it would recur · it cost real time · it is fixable · the fix is durable.
