# The Irodora Harness

The **harness** is the closed-loop working system that governs how agents build Irodora. It
exists because *most agent failures are harness failures, not model failures*: capable
models still lose continuity across sessions, overreach and under-finish, declare victory
early, and skip verification unless the surrounding system prevents it.

This directory is **tool-agnostic and canonical**. Claude Code binds to it through the thin
[`../.claude/`](../.claude/) adapter; other agents read [`../AGENTS.md`](../AGENTS.md)
directly ([ADR-0029](../docs/adr/0029-harness-agnostic-core-thin-adapter.md)).

## The five subsystems

| Subsystem | Question it answers | Lives in |
|---|---|---|
| **Instructions** | What are the rules here? | [`../AGENTS.md`](../AGENTS.md) · [`instructions/`](instructions/) · [`rules/`](rules/) |
| **State** | What is done, in flight, and next? | [`state/`](state/) · [`memory/`](memory/) |
| **Verification** | How do we know it works? | [`verification/`](verification/) · [`protocols/verification.md`](protocols/verification.md) |
| **Scope** | What am I allowed to work on? | [`state/feature_list.json`](state/feature_list.json) · `wip_limit: 1` |
| **Lifecycle** | How does the next session pick up? | [`protocols/clean-state.md`](protocols/clean-state.md) · [`protocols/session-handoff.md`](protocols/session-handoff.md) |

Plus two of our own:

| | | |
|---|---|---|
| **Effects** | What else must change when this does? | [`state/effects.json`](state/effects.json) + [`memory/effects/`](memory/effects/) |
| **Governance** | What requires a decision, and whose? | [`governance/`](governance/) |

## Layout

```
instructions/   session lifecycle · workflow · onboarding
rules/          common · typescript · api · frontend · mobile · color · content · security
skills/         23 how-to workflows
commands/       next-feature · plan · verify · effects · checkpoint · design-review · color-audit · handoff
protocols/      initialization · verification · definition-of-done · effect-link
                clean-state · session-handoff · observability
governance/     policy-model · adr-policy · commit-policy · secrets-policy
                tool-access · release-checklist · content-licensing · measurement-claims
plans/          one plan per feature
state/          feature_list.json · effects.json · progress.md · schemas/
memory/         decisions · lessons · architecture · glossary · effects · product
verification/   gates.json · checklist.md · evidence/
```

## The three ideas that shape it

**1. State lives outside the context window.** Nothing important exists only in a
conversation. A session that ends takes its context with it; a file does not. This is why
`progress.md`, `feature_list.json` and `effects.json` are committed artefacts rather than
notes.

**2. Every effect link must name its guard.** Recording that A affects B is documentation.
Naming the automated check that catches a violation makes it enforcement. A `critical` link
with `guard: "none"` fails the `state` gate, which turns the effect graph into a standing
backlog of the gates we still owe
([ADR-0030](../docs/adr/0030-effects-graph-is-a-committed-artifact.md)).

**3. The checker is not the implementer.** Planner, generator and evaluator are separate
agents. A model grading its own work is systematically generous, and the separation costs
one subagent invocation.

## Global and scoped

This is the global harness. Each app and the colour engine extend it with a scoped
`AGENTS.md` and local rules. **More specific wins on conflict; no scope may relax a golden
rule** — the `state` gate scans scoped rules for weakening language against the golden-rule
list.

## Provenance

Structure informed by *Learn Harness Engineering* (walkinglabs) — the five-subsystem model,
WIP limits, the clean-state protocol, generator/evaluator separation — and by the ECC
harness patterns (Affaan Mustafa, MIT). Adapted, not copied; see
[`../NOTICE.md`](../NOTICE.md).

Our principal adaptation: **all memory is written to the in-repository system of record**,
never to a personal agent store. The repository is memory.
