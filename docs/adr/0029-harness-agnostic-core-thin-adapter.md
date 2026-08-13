# ADR-0029 — The harness is tool-agnostic in `.harness/`; `.claude/` is a thin adapter

## Status

Accepted

## Date

2026-08-13

## Context

This product is built primarily by AI agents. That makes the working system around them —
the harness — a first-class part of the repository rather than tooling that lives in
someone's editor configuration.

Two failure modes to design against:

**Tool lock-in.** Writing the operating manual as `CLAUDE.md`, the workflows as
`.claude/skills/`, and the state as Claude-specific formats means the repository only works
with one agent. Agents and their conventions change faster than the product will.

**Memory outside the repository.** The default for most agent tooling is a personal store —
`~/.claude/memory`, a local database, a vendor account. Knowledge captured there is
invisible to every other agent, to every human, and to code review. It is also lost when
the machine changes. For a repository that intends to be the system of record, that is the
wrong direction by default.

## Decision

**`.harness/` is canonical and tool-agnostic. `.claude/` translates it. All memory is
in-repository.**

```
AGENTS.md          authoritative, tool-agnostic operating manual
CLAUDE.md          thin Claude Code entry point — imports AGENTS.md, adds nothing binding
.harness/          CANONICAL: rules · skills · protocols · governance · state · memory · gates
.claude/           ADAPTER: settings · subagents · command shims · skill shims
```

1. **`AGENTS.md` is the manual.** Any agent — Claude Code, Codex, Cursor, Cline — reads it
   and can work here. `CLAUDE.md` imports it and adds only Claude-specific mechanics.
2. **The adapter may never contradict the canon.** If `.claude/` drifts, the adapter is
   fixed, not the manual. Skill shims point at `.harness/skills/`; they do not restate
   them, because a restatement is a copy that will diverge.
3. **All memory is committed** to `.harness/memory/`. Personal agent memory may *point at*
   the repository; it is never authoritative over it. This is our principal adaptation of
   the ECC pattern, and it is the difference between knowledge that compounds and knowledge
   that evaporates.
4. **Scoped harnesses extend, never relax.** `apps/*/AGENTS.md` and
   `packages/color-core/AGENTS.md` add service-specific rules. More specific wins on
   conflict, but no scope may weaken a golden rule — checked by the `state` gate, which
   scans scoped rules for weakening language against the golden-rule list.
5. **Planner, generator and evaluator are separate agents.** The checker is never the
   implementer. This is the single highest-value guardrail in the methodology, and it is
   why the adapter defines subagents at all.
6. **State lives in files, not conversations.** Scope in `feature_list.json`, history in
   `progress.md`, consequences in `effects.json`, knowledge in `memory/`, decisions in
   `docs/adr/`.

## Consequences

**Good.** The repository works with any agent, and outlives any particular one. Knowledge
compounds in a place that is reviewable, diffable and shared. A new session — or a new
person — reaches working context from files alone. Scoped harnesses let the colour engine
carry stricter rules than the marketing pages without duplicating the manual.

**Bad.** Two layers to keep in sync, and adapter drift is a real failure mode — mitigated
by the shims containing no content of their own. `AGENTS.md` must stay disciplined; the
whole structure exists because one giant instruction file fails, and the entry point is
where that pressure lands hardest. Committed memory means memory quality is a review
concern: a low-signal lesson costs everyone context budget.

**Neutral.** Some Claude Code capability is expressible only in the adapter. That is
correct — it is the adapter's job.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **`CLAUDE.md` as the single manual** | Simplest, no duplication, works today. Locks the repository to one agent, and the manual would accumulate Claude-specific mechanics that another agent must learn to ignore |
| **One large instruction file** | Everything in one place, nothing to look up. Consumes context budget before any work starts, buries critical constraints mid-file where they are demonstrably least attended to, and grows without ever shrinking |
| **Personal agent memory (`~/.claude`)** | Zero repository footprint, no review overhead. Invisible to collaborators and to review, lost on machine change, and structurally incapable of being the system of record |
| **A harness as an external tool or service** | Reusable across projects, centrally improvable. Adds a dependency to the working loop, and the harness must be readable and editable by the agent working in the repository — which means it belongs in the repository |

## Revisit when

- A second agent is used regularly and reveals a Claude-shaped assumption in `.harness/` —
  which would be a bug in the canon, and the point of finding it.
- `AGENTS.md` exceeds roughly 200 lines, at which point content belongs in a linked
  document rather than the entry point.
