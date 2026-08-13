# Session Lifecycle

A session is bounded by a context window. The repository is not. Everything that must
survive the boundary is written to a file **before** the boundary arrives.

```
clock in ──→ work ──→ (context pressure? → compact) ──→ clock out
```

---

## Clock in

[`protocols/initialization.md`](../protocols/initialization.md).

1. Read [`../../AGENTS.md`](../../AGENTS.md).
2. Read the last ~3 entries of [`state/progress.md`](../state/progress.md).
3. Read the `in_progress` feature in
   [`state/feature_list.json`](../state/feature_list.json) — and its plan.
4. Read the rules that apply to what you are about to touch, plus the scoped `AGENTS.md`.
5. Run `node scripts/verify-state.mjs`. **Start from a known-good state**, or you will
   spend the session confused about whether you caused something.
6. Check `git status`. An unexpectedly dirty tree means the previous session did not clock
   out properly — resolve that first, before adding to it.

**Target: working context in under 3 minutes, from files alone.** If it takes longer, the
harness has a gap and that gap is worth fixing before the feature.

---

## During

**Write state as you go, not at the end.** A session that ends abruptly — context
exhaustion, an interruption, a crash — should lose at most the last increment.

Signals to write state *now*:

- an increment is complete and green;
- a non-obvious decision was made;
- a surprising discovery (that is a lesson);
- context is filling.

## Context pressure

**Compact before you are forced to.** The failure mode of a full context window is not an
error — it is a *rushed finish*: verification skipped, the easier fix chosen, the
half-thing declared done.

[`skills/strategic-compact`](../skills/strategic-compact/SKILL.md):

1. Write current state to `progress.md` — what is done, what is in flight, what is next.
2. Update `feature_list.json`.
3. Record any lesson before it is lost.
4. Update the plan file if the approach changed.
5. Then compact, or hand off.

**A fresh session with good files beats a full session with a saturated window.** Intent
survives in the file; it does not survive compaction.

---

## Clock out

[`protocols/clean-state.md`](../protocols/clean-state.md). Every one of these:

- [ ] Build green, tests passing — **including the ones that were passing before you
      started**
- [ ] `progress.md` updated with what changed, gates run, and evidence
- [ ] `feature_list.json` status current
- [ ] Effects traced if a shared contract moved
- [ ] Lessons captured
- [ ] No debug code, no stray `TODO` without a tracked follow-up, no commented-out blocks
- [ ] `git status` clean, or intentionally staged with the intent recorded
- [ ] The standard start path still works

**A session that leaves entropy costs the next session more than it saved this one.**
Deferred cleanup compounds: the next session cannot distinguish deliberate code from
scaffolding, so it leaves both and adds its own.

---

## Handoff

When work continues in another session or with another agent, write a handoff
([`protocols/session-handoff.md`](../protocols/session-handoff.md)) into `progress.md`:

```
## Handoff — YYYY-MM-DD

Feature:      F-0NN — <title>
State:        <what is genuinely done, with evidence>
In flight:    <what is half-finished, and how far>
Next action:  <the single next concrete step>
Gates:        <which ran, results; which did NOT run>
Blocked on:   <question, decision, or dependency — or "nothing">
Watch out:    <anything surprising or non-obvious discovered>
```

**"Which gates did NOT run" is the most valuable line.** It is the one a fresh session
cannot reconstruct, and the one most likely to be assumed away.

---

## The test that matters

> A fresh agent, reading only the repository, can state the current feature, the next
> action, and how to verify it — with no conversation history.

That is the acceptance criterion for this harness. If it fails, the harness is broken
regardless of how complete it looks.
