# AGENTS.md — the operating manual for work in this repository

> **Mandatory and authoritative.** Any agent — Claude Code, Codex, Cursor, Cline — and any
> human working here must read this in full and follow it. It is tool-agnostic. Claude Code
> additionally loads [`CLAUDE.md`](CLAUDE.md), which imports this file and adds nothing
> binding.

---

## 0. The brief

**Irodora** is a deterministic colour intelligence platform for what you wear — colour
science, a provenanced Japanese colour corpus, a personal colour profile, and a real
wardrobe, combined into one system that answers *what colour is this, what goes with it,
does it suit me, and can everyone tell it apart* — reproducibly, with an explanation, and
offline.

See [`docs/PRD.md`](docs/PRD.md) and
[`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md).

**We are pre-code.** Product definition and this harness exist. Application code starts at
release R0, one feature at a time, through this manual.

---

## 1. Golden rules

Non-negotiable. Nothing in a scoped harness may relax any of them.

1. **The repository is the system of record — not the chat.** Scope in
   [`feature_list.json`](.harness/state/feature_list.json), history in
   [`progress.md`](.harness/state/progress.md), consequences in
   [`effects.json`](.harness/state/effects.json), knowledge in
   [`memory/`](.harness/memory/), decisions in [`docs/adr/`](docs/adr/).
2. **One feature at a time.** `wip_limit: 1`. Work the feature you claimed. Finish it. No
   scope creep, no "while I'm here".
3. **Plan before code.** A plan in [`.harness/plans/`](.harness/plans/) exists before any
   source is edited. The `state` gate checks this.
4. **Verification is the proof, not your assertion.** A feature is done when the gates pass
   **with recorded evidence**. "It compiles", "it should work" and "I think it's fine" are
   not verification. Never declare victory on unrun or failing checks.
5. **Trace your effects.** Before closing, run the
   [effect-link protocol](.harness/protocols/effect-link.md). A known break is fixed now or
   recorded as a feature. **It is never left unrecorded.**
6. **Never break working code.** Additive, reversible changes. The build stays green
   between increments, not only at the end.
7. **Decisions require an ADR.** Any deviation from a documented default →
   [`docs/adr/`](docs/adr/) via [`write-adr`](.harness/skills/write-adr/SKILL.md).
8. **Leave a clean state.** Every session ends per
   [clean-state](.harness/protocols/clean-state.md).
9. **Production-grade only.** No toy code, no proof-of-concept, no "we'll fix it later".
   Typed, tested, secure, observable.
10. **Commit verified increments only. Never push without being asked.**
    See [commit-policy](.harness/governance/commit-policy.md).

### Three that are specific to this product

11. **Never overstate accuracy.** A camera estimate is an estimate. Banned language is
    lint-enforced ([ADR-0031](docs/adr/0031-measurement-claims-policy.md)). This applies to
    your reports as much as to the UI: say which gates you ran, and which you did not.
12. **Never ship a colour value without its provenance.** The type system prevents it
    ([ADR-0005](docs/adr/0005-measurement-provenance-is-a-type.md)); do not work around it.
13. **Never make colour the only channel.** Anywhere. Ever.
    ([`docs/design/ACCESSIBILITY.md`](docs/design/ACCESSIBILITY.md))

---

## 2. The loop

```
initialize → select feature → plan → implement → verify → trace effects → record → clean
```

1. **Initialize** — [initialization](.harness/protocols/initialization.md). Read this file,
   the active feature, recent `progress.md`, and the rules and memory that apply.
2. **Select** — the lowest-id eligible feature for the current release with every
   `blockedBy` done. Set it `in_progress`.
   → [`/next-feature`](.harness/commands/next-feature.md)
3. **Plan** — [`plan-feature`](.harness/skills/plan-feature/SKILL.md), from
   [`TEMPLATE.md`](.harness/plans/TEMPLATE.md). Use the **planner** subagent for
   non-trivial work.
4. **Implement** — [`add-feature`](.harness/skills/add-feature/SKILL.md) and the
   [rules](.harness/rules/). Small, verifiable increments. Tests alongside or first.
5. **Verify** — [`verify-gate`](.harness/skills/verify-gate/SKILL.md). Prefer the
   **evaluator** subagent, so the checker is not the implementer.
   → [`/verify`](.harness/commands/verify.md)
6. **Trace effects** — [`effect-trace`](.harness/skills/effect-trace/SKILL.md).
   → [`/effects`](.harness/commands/effects.md)
7. **Record** — update `progress.md` and `feature_list.json`; capture lessons via
   [`continuous-learning`](.harness/skills/continuous-learning/SKILL.md).
8. **Clean** — [`/checkpoint`](.harness/commands/checkpoint.md).

---

## 3. Where everything lives

| Concern | Location |
|---|---|
| Instructions | this file + [`.harness/instructions/`](.harness/instructions/) |
| Rules / constraints | [`.harness/rules/`](.harness/rules/) |
| Skills (how-to) | [`.harness/skills/`](.harness/skills/) |
| Commands | [`.harness/commands/`](.harness/commands/) |
| Protocols | [`.harness/protocols/`](.harness/protocols/) |
| Governance | [`.harness/governance/`](.harness/governance/) |
| Plans | [`.harness/plans/`](.harness/plans/) |
| State | [`.harness/state/`](.harness/state/) |
| Memory | [`.harness/memory/`](.harness/memory/) |
| Verification | [`.harness/verification/`](.harness/verification/) |
| Product docs | [`docs/`](docs/) |
| Claude Code adapter | [`.claude/`](.claude/) |

---

## 4. Scope and precedence

**Global** (this file) applies everywhere. **Scoped** harnesses extend it:

```
apps/api/AGENTS.md · apps/web/AGENTS.md · apps/mobile/AGENTS.md
apps/worker/AGENTS.md · apps/admin/AGENTS.md
packages/color-core/AGENTS.md      ← strictest zone in the repository
content/AGENTS.md                  ← provenance and licensing rules
```

**More specific wins on conflict. No scope may relax a golden rule** — the `state` gate
scans scoped rules for weakening language.

**Planner, generator and evaluator are separate** ([`.claude/agents/`](.claude/agents/)).
The checker is never the implementer.

---

## 5. Tech cheat-sheet

- **Node 24 LTS** ([`.nvmrc`](.nvmrc)) · **pnpm 11** · **Turborepo**
- API: Fastify 5 + Zod 4 → OpenAPI · Postgres 17 + Drizzle · Valkey
- Web: Next.js 16 + React 19 + Tailwind v4 + Radix · Mobile: Expo 57 + VisionCamera
- Engine: `@irodora/color-*` — **zero runtime dependencies, no platform APIs**
- Local services: `docker compose up -d`
- Harness gate: `node scripts/verify-state.mjs`
- Gates: [`.harness/verification/gates.json`](.harness/verification/gates.json)

---

## 6. Definition of done

Acceptance criteria met exactly — no more, no less · applicable gates green **with
evidence** · tests added · effects traced and recorded · docs and ADRs current · every new
`IRODORA_*` variable in `.env.example` · `progress.md` updated · tree clean.

Full checklist:
[definition-of-done](.harness/protocols/definition-of-done.md).

---

## 7. Before you touch the colour engine

`packages/color-*` and `content/` carry obligations the rest of the repository does not.
Read [`.harness/rules/color/color-science.md`](.harness/rules/color/color-science.md) and
[`packages/color-core/AGENTS.md`](packages/color-core/AGENTS.md) first.

The short version:

- **Golden datasets come from published sources.** Changing a golden value is changing our
  claim about physical reality and requires an ADR.
- **A change to the engine that ships without a golden-dataset check is a defect**, even if
  every test is green — because the tests are then agreeing with the change rather than
  checking it.
- **No runtime dependencies. No `node:*`. No DOM. No `process`.** The engine must produce
  byte-identical results in Node, the browser and React Native. That is NFR-3, and it is
  the one guarantee that cannot bend.
- **Averaging happens in linear light.** Averaging non-linear sRGB is the most common
  colour bug there is, and it always makes the result too dark.

---

> If anything here conflicts with a model's prior assumptions, **this manual wins.**
> When in doubt, read state rather than guessing, and verify rather than feeling confident.
