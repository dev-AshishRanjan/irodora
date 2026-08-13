# ADR-0000 — Template

> Copy this file to `NNNN-kebab-case-title.md`. The title should state the **decision**,
> not the topic: "Postgres is the single system of record", not "Database choice".
> Then add a row to [`README.md`](README.md) — the `state` gate checks the index.

## Status

Proposed | **Accepted** | Superseded by `ADR-NNNN` (link it) | Deprecated

## Date

YYYY-MM-DD

## Context

What forced this decision. The constraint, the pressure, the thing that made the default
insufficient. Include the numbers or the failure that prompted it — a context that could
have been written before encountering the problem is not a context.

Reference the requirements at stake (FR-*/NFR-*).

## Decision

What we are doing, stated so that someone could implement it without reading the rest.

## Consequences

**Good** — what this buys us.

**Bad** — what it costs. *Every real decision has this section.* An ADR with no downsides
is describing a preference, not a decision.

**Neutral** — what changes without being better or worse.

## Alternatives considered

| Alternative | Why not |
|---|---|
| … | … |

An alternative dismissed in one line was not seriously considered. Say what it would have
been good at, then why that was not enough.

## Revisit when

The observable condition that would make us reopen this. "When X exceeds Y", not "if
circumstances change".
