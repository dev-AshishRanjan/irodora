# Memory

The committed system of record for what we know. **Not a personal agent store** — memory
written outside the repository is invisible to every other agent, to every human, and to
review, and it is lost when the machine changes
([ADR-0029](../../docs/adr/0029-harness-agnostic-core-thin-adapter.md)).

| Directory | Holds |
|---|---|
| [`decisions/`](decisions/) | Durable decisions too small for an ADR |
| [`lessons/`](lessons/) | What we learned — root causes, corrections, workarounds, conventions |
| [`architecture/`](architecture/) | How a subsystem actually works, once it does |
| [`glossary/`](glossary/) | Domain terms whose precise meaning matters |
| [`effects/`](effects/) | The narrative behind each `E-###` in `effects.json` |
| [`product/`](product/) | Market, competitor and user knowledge |
| [`index.md`](index.md) | **The index.** Machine-checked for coverage |
| [`observations.md`](observations.md) | Harness gaps noticed but not yet fixed |

## Format

```markdown
---
kind: lesson | decision | architecture | glossary | effect | product
title: <a claim, not a topic>
category: error-resolution | user-correction | workaround | debugging-method | convention
confidence: 0.0-1.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
supersedes: <slug>
links: <wikilink to another memory slug>
scope: [packages/color-spaces]
---

# <The claim, stated>

**What happened / what is true.**

**Why.**

**How to apply it.**
```

Effect notes additionally carry `id: E-###`, `severity` and `guard`, and their filename must
match the `memory` field in `effects.json`.

## Naming

**The filename states the claim.**

```
✓ averaging-non-linear-srgb-reads-too-dark.md
✗ color-averaging.md
```

A reader scanning the index should learn the lesson from the title alone. A topic name
requires opening the file to find out whether it is relevant, and most of the time nobody
does.

## Signal over noise

Every memory costs every future session context budget. A low-value entry is a small
permanent tax on everything that follows.

**Record:** reusable, non-obvious, and specific — especially anything that produces a
*plausible wrong answer*, which is the failure class this domain is full of.

**Do not record:** one-off trivia · restatements of an existing rule or ADR · anything
already true and visible in the repository · "remember to run the tests".

## Rules

1. **Update rather than duplicate.** Check the index first.
2. **Supersede when wrong.** Set `supersedes` and say what changed. Do not silently edit
   away a claim someone may have acted on.
3. **Link liberally** with double-bracket wikilinks to another note's slug. A link to a note
   that does not exist yet is fine — the `state` gate reports it as a warning, which marks
   something worth writing rather than something broken.
4. **Add a line to the index.** The `state` gate fails if a memory file is unindexed, because
   an unindexed memory is an unread memory.
5. **Memory records what happened. Rules and ADRs change what we do.** If a lesson implies a
   durable change, propose the rule edit or the ADR too.
