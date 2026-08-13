---
name: strategic-compact
description: Write state to files before context pressure forces a rushed finish — deliberately, not reactively.
---

# Skill: strategic-compact

## The failure this prevents

**The failure mode of a full context window is not an error. It is a rushed finish.**

As context fills, behaviour degrades in a specific and consistent way: verification gets
skipped, the easier fix is chosen over the correct one, the half-finished thing is declared
done. And by the time the pressure is noticeable, the degradation has already started.

Compaction makes it worse in a second way: it keeps the code and destroys the reasoning. A
new session sees *what* was built and has no idea *why*, so it re-derives — differently —
and now there are two conventions.

## When

Do it **before** you need to:

- an increment is complete and green;
- a non-obvious decision was just made;
- something surprising was discovered;
- context is roughly two-thirds used;
- a natural boundary in the work.

**Not** when the window is nearly full. By then you are already writing under the pressure
you are trying to escape.

## Steps

### 1. Write progress

[`progress.md`](../../state/progress.md):

```
## YYYY-MM-DD — F-0NN <title>

Done:       <complete, with evidence>
In flight:  <half-finished, and exactly how far>
Gates:      <ran: … / NOT run: …>
Decisions:  <what, and WHY>
Next:       <the single next concrete action>
```

### 2. Update the feature list

Status current. If the acceptance criteria turned out to be wrong, say so — do not silently
work to a different definition.

### 3. Record decisions and surprises

**This is the part compaction destroys and nobody reconstructs.**

> "Used the trimmed mean rather than the median for the primary value because the median
> discarded too much data on smooth fabrics; both are still returned, and their
> disagreement is a texture signal."

Six months later that paragraph is the only thing standing between someone and re-deriving
it wrongly.

### 4. Update the plan if the approach changed

A plan silently rewritten to match what was built is not a plan. Say what changed and why.

### 5. Capture lessons now

[`continuous-learning`](../continuous-learning/SKILL.md). A lesson not written is lost —
you will not remember the specifics after the window resets.

### 6. Then compact, or hand off

[`session-handoff`](../../protocols/session-handoff.md).

## The principle

> **A fresh session with good files beats a full session with a saturated window.**

Intent survives in a file. It does not survive compaction. That asymmetry is the whole
argument for writing state early.
