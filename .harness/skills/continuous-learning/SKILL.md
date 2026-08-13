---
name: continuous-learning
description: Capture a reusable, non-obvious lesson into the in-repository memory so it compounds instead of evaporating.
---

# Skill: continuous-learning

> Adapted (MIT) from ECC `continuous-learning` (© Affaan Mustafa) — see
> [`NOTICE.md`](../../../NOTICE.md). **Key adaptation:** lessons are written to the
> **in-repository** system of record ([`../../memory/`](../../memory/)), never to a personal
> agent store. The repository is memory
> ([ADR-0029](../../../docs/adr/0029-harness-agnostic-core-thin-adapter.md)).

**Companion:** [`skill-observer`](../skill-observer/SKILL.md) captures *harness*
improvements; this captures durable *lessons* — what happened, and what it taught.

## When

- After fixing a non-obvious bug — the root cause, not the symptom.
- After a user correction — record the preference so it is not repeated.
- After a framework or library workaround.
- After a debugging path that took an unexpected route.
- On discovering a convention that is not written down anywhere.
- At session end ([clean-state](../../protocols/clean-state.md)).

## What counts

**Reusable and non-obvious.**

**Do not record:** one-off trivia · restatements of an existing rule or ADR · anything
already true and visible in the repository · "remember to run the tests".

> **Signal over noise.** Every lesson costs every future session context budget. A few
> durable ones beat many shallow ones, and a low-value lesson is a small permanent tax on
> everything that follows.

## Steps

1. **Name it as a claim, not a topic.** The filename should state the lesson:
   `averaging-non-linear-srgb-reads-too-dark.md`, not `color-averaging.md`.
2. **Check for an existing entry** — [`memory/index.md`](../../memory/index.md). Update
   rather than duplicate. Supersede if it is now wrong.
3. **Write** `../../memory/lessons/<kebab-slug>.md`, per the format in
   [`memory/README.md`](../../memory/README.md).
4. **Link** related decisions and lessons inline with `[[slug]]`.
5. **Add a line to the index.**
6. If it implies a durable rule change, propose a [rule](../../rules/) edit or an
   [ADR](../write-adr/SKILL.md). **Memory records what happened; rules and ADRs change what
   we do.**

## Shape

```markdown
---
kind: lesson
category: error-resolution | user-correction | workaround | debugging-method | convention
confidence: 0.9
created: YYYY-MM-DD
links: [[related-slug]]
scope: [packages/color-spaces]
---

# Averaging non-linear sRGB reads too dark

**What happened.** Precision-pick results were consistently darker than the fabric. The
sampling loop averaged sRGB values directly.

**Why.** sRGB is gamma-encoded. Averaging encoded values is not the same operation as
averaging light, and the error is always in the same direction.

**How to apply.** Convert to linear light, average, convert back. Any pixel aggregation
anywhere in the pipeline. See [[srgb-transfer-function-has-a-linear-segment]].
```

## The most valuable lessons here

Those about **plausible wrong answers** — where the code produces a result that looks
entirely reasonable and is incorrect. Colour work is full of them, and they are exactly the
ones that will otherwise be rediscovered from scratch.
