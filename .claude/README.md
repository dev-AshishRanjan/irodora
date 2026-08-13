# `.claude/` — the Claude Code adapter

**This directory is a thin adapter, not a source of truth.**

The canonical, tool-agnostic harness is [`../.harness/`](../.harness/), and the operating
manual is [`../AGENTS.md`](../AGENTS.md)
([ADR-0029](../docs/adr/0029-harness-agnostic-core-thin-adapter.md)).

| Here | Canonical |
|---|---|
| [`commands/`](commands/) | [`../.harness/commands/`](../.harness/commands/) |
| [`skills/`](skills/) | [`../.harness/skills/`](../.harness/skills/) |
| [`agents/`](agents/) | *(adapter-only — the subagent separation is a Claude Code mechanism)* |
| [`settings.json`](settings.json) | [`../.harness/governance/tool-access.md`](../.harness/governance/tool-access.md) |

**The shims hold no content of their own, deliberately.** A restatement is a copy, and a
copy diverges. If the adapter drifts from the canon, fix the adapter — not the manual.

## Subagents

Planner, generator and evaluator are **separate**, and the evaluator cannot edit source.
That is the highest-value guardrail in this harness: a model grading its own work is
systematically generous, because it knows what it intended and reads the code as the
intention rather than as the behaviour.

| Agent | Role |
|---|---|
| [planner](agents/planner.md) | Designs the approach. Read-only |
| [generator](agents/generator.md) | Implements the plan |
| [evaluator](agents/evaluator.md) | Verifies independently. **Cannot edit source** |
| [color-scientist](agents/color-scientist.md) | Reviews colour maths and corpus work |
| [designer](agents/designer.md) | Reviews design and implemented surfaces |
| [security-reviewer](agents/security-reviewer.md) | Reviews against the threat model |

## Memory

[`../.harness/memory/`](../.harness/memory/) is the committed system of record. Claude's
personal cross-session memory only **points at** it.

**Never write a lesson only to personal memory.** It would be invisible to every other
agent, to every human, and to review — and lost on a machine change. The repository is
memory.

## `settings.local.json`

Machine-specific overrides. **Gitignored**, never edited on someone else's behalf.
