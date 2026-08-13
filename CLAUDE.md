# CLAUDE.md

This file is the Claude Code entry point. The **authoritative, tool-agnostic operating
manual is [`AGENTS.md`](AGENTS.md)** — read it in full and follow it.

@AGENTS.md

## Claude Code specifics

- **Adapter:** Claude-specific configuration lives in [`.claude/`](.claude/):
  - [`.claude/settings.json`](.claude/settings.json) — permissions and environment.
  - [`.claude/commands/`](.claude/commands/) — slash commands mirroring
    [`.harness/commands/`](.harness/commands/): `/next-feature`, `/plan`, `/verify`,
    `/effects`, `/checkpoint`, `/design-review`, `/color-audit`, `/handoff`.
  - [`.claude/agents/`](.claude/agents/) — **planner · generator · evaluator ·
    color-scientist · designer · security-reviewer**. The evaluator is never the
    implementer; that separation is the highest-value guardrail in this harness.
  - [`.claude/skills/`](.claude/skills/) — thin shims pointing at the canonical skills in
    [`.harness/skills/`](.harness/skills/).

- **Source of truth:** the agnostic [`.harness/`](.harness/) is canonical. The adapter must
  never contradict it. If it drifts, fix the adapter — not the manual
  ([ADR-0029](docs/adr/0029-harness-agnostic-core-thin-adapter.md)).

- **Memory:** [`.harness/memory/`](.harness/memory/) is the committed system of record.
  Claude's personal cross-session memory only *points at* it. Never treat personal memory
  as authoritative over the repository, and never write a lesson only to personal memory.

- **Effects:** when you change a shared contract, update **both**
  [`effects.json`](.harness/state/effects.json) and its paired note in
  [`memory/effects/`](.harness/memory/effects/). Every critical link must name its guard —
  the `state` gate enforces it.

> Do not skip [`AGENTS.md`](AGENTS.md). Everything in it — golden rules, the loop,
> verification, effect-links, clean-state — is binding.
