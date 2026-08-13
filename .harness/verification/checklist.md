# Harness Self-Audit

A periodic check that the harness is doing its job. Run at each release, and whenever
something slipped through that should not have.

The harness is not judged by how complete it looks. It is judged by whether a fresh session
can work here from files alone, and whether the gates catch what they claim to.

---

## The five subsystems

### Instructions

- [ ] `AGENTS.md` is under ~200 lines and current
- [ ] Rules are split by area, so a session reads only what applies
- [ ] Scoped `AGENTS.md` files exist for every app, the colour engine, and `content/`
- [ ] **No scoped rule relaxes a golden rule** (checked by the `state` gate)
- [ ] The `.claude/` adapter contains no content of its own

### State

- [ ] `feature_list.json` validates, and reflects reality
- [ ] `progress.md` has an entry for the most recent session
- [ ] `effects.json` validates; every link has a memory note; **no critical link without a
      guard**
- [ ] No `to` reference points at a path that no longer exists
- [ ] Memory index covers every memory file

### Verification

- [ ] Every active gate has a command that runs
- [ ] `gates.json` mirrors `.github/workflows/ci.yml`, and the mirror is checked
- [ ] **Every gate can fail.** Break something deliberately and confirm it goes red
- [ ] No gate has been disabled, quarantined without a tracked feature, or silently removed
- [ ] Gate activation matches the features that made each meaningful

### Scope

- [ ] `wip_limit: 1` is respected
- [ ] Every `in_progress` feature has a plan
- [ ] Blocked features have their blockers recorded and unfinished
- [ ] Every PRD requirement is claimed by a feature, and every feature's requirements exist

### Lifecycle

- [ ] The last session left a clean state, or an honestly-described mess
- [ ] A handoff exists where work continued elsewhere
- [ ] The documented start path works from a clean clone

---

## The cold-start test

> **A fresh agent, reading only the repository, can state the current feature, the next
> action, and how to verify it — with no conversation history.**

This is the acceptance criterion for the harness. Run it literally: open a new session, ask
those three questions, and see whether the answer comes from files.

**Target rebuild cost: under 3 minutes.** If it takes longer, find the gap and fix it before
the next feature.

---

## Signals the harness has a gap

| Signal | Gap |
|---|---|
| **A gate passed while something was broken** | **A blind gate — act immediately** |
| A session re-decided something already decided | A missing ADR, or an unread one |
| A change broke something unexpected | A missing effect link |
| Onboarding took longer than the stated target | A gap in the reading path |
| A rule is routinely ignored | It is wrong, or it is unenforced. Decide which |
| A skill's steps did not match reality | A stale skill — worse than a missing one, because it is followed |
| The same question is asked twice | It belongs in a file |

## The blind gate

The most valuable and most dangerous finding. It means the gate is theatre — declared,
believed in, and not doing its job. Everything downstream is unverified while appearing
verified.

1. **Confirm it:** construct the broken input and watch the gate go green.
2. Fix the gate.
3. **Replay the original miss through the fixed gate** and confirm it now goes red. A gate
   added after an incident that would not have caught that incident makes us feel better
   without making us safer.
4. Record it as a lesson.

## Two failure modes of rules

**A rule that only produces false positives is a liability.** People learn to ignore its
whole class of warning, which costs more than the rule was worth.

**A gate can teach you to write around it.** If the easiest way to pass is to restructure
code so the check does not apply, the check is shaping the code in a direction nobody chose.
