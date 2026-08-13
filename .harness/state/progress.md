# Progress

Append-only history. Newest at the top. This is what a fresh session reads to find out what
happened, what was verified, and what to do next.

Every entry records **which gates ran and which did not**. The second half is the part a
reader cannot reconstruct.

---

## 2026-08-13 — Phase 1: product definition and harness

**Scope:** convert the four brainstorm documents into a production-grade documentation set
and build the working system that will govern every subsequent change. No application code.

### Done

**Brand.** Irodora, from 彩り (*irodori*), "the arrangement of colours". Namespace verified
free before locking: `.com .io .app .co .net .org .design`, npm `@irodora`, GitHub
`irodora`. Kasane was the stronger concept and lost on the exact-match `.com`.

**Decisions settled with the user:** monorepo + modular monolith with named extraction
triggers · web first, mobile close behind · container-portable deployment with Coolify and
Dokploy as a first-class VPS target and AWS as the managed one.

**Documentation** — `docs/`:

- `PRD.md` — 68 FR and 24 NFR, each testable, each owned by a release; personas, six
  journeys, monetisation, metrics with targets, non-goals with reasons.
- `REQUIREMENTS-COVERAGE.md` — requirement → feature → gate, machine-checked.
- `roadmap.md`, `glossary.md`.
- `architecture/` — ARCHITECTURE, color-engine, data-model, api-contract, sync-protocol,
  security/threat-model, security/privacy-design.
- `adr/` — 31 records plus template and index.
- `design/` — BRAND, DESIGN-BRIEF (the input to the design phase), DESIGN-SYSTEM,
  ACCESSIBILITY, and the token manifest.
- `content/` — corpus spec and the licensing position.
- `compliance/data-governance.md`; `operations/` including per-platform deployment runbooks.

**Harness** — `.harness/`: AGENTS.md, 3 instruction docs, 13 rule files across 8 areas,
7 protocols, 8 governance documents, 23 skills, 8 commands, the plan template.

**Adapter** — `.claude/`: settings, 6 subagents (planner · generator · evaluator ·
color-scientist · designer · security-reviewer), and content-free shims for every command
and skill.

**Verification** — 16 gates defined in `gates.json` with activation triggers;
`scripts/verify-state.mjs` written and green; `.github/workflows/ci.yml` mirroring the
gates, with the mirror itself checked.

**State** — 66 features across R0–R5, R0–R2 fully specified with acceptance criteria;
10 seed effect links, each with its narrative note and named guard; memory seeded with
2 decisions, 9 lessons, 10 effect notes, 1 glossary entry, 1 product note.

### Deliberate departures from the brainstorm

1. **"Non-AI" became a four-tier capability policy** (ADR-0002). The blanket ban was
   unenforceable and would have outlawed the classical CV the Lens needs. The guarantee is
   now testable: disable tiers 1–3 and the product still answers.
2. **Measurement provenance is a type, not a disclaimer** (ADR-0005). A disclaimer is
   optional at every call site; a required field is not.
3. **Web is a first-class surface**, not a companion — the Atlas is the public proof of the
   engine.
4. **en/ja from day one** (ADR-0028). Retrofitting Japanese typography means redesigning.
5. **A real licensing position on colour data** (ADR-0007) — clean-room corpus, per-entry
   provenance, Wada as inspiration only.
6. **Ethical guardrails** (NFR-22, NFR-23) — no dermatological, ethnic or attractiveness
   inference, plus ITA-stratified bias validation as a release blocker.
7. **Monetisation defined** (ADR-0027), with accessibility permanently outside every paywall.
8. **Honest crypto language** — envelope encryption is described as what it is, and never as
   end-to-end.

### Gates

```
Ran:      state ✓  (node scripts/verify-state.mjs)
NOT run:  typecheck, lint, format, test, color-golden, build, e2e, a11y, contrast,
          cvd, content, perf, web-perf, e2e-full, security
Why:      no application code exists yet. Those gates activate with the features
          recorded in gates.json (`activatesWith`), starting at F-001.
```

Gate 0 is not a placeholder: it validates both state files against their committed schemas,
the effect graph and its memory pairing, path existence, guard coverage on critical links,
requirement traceability in both directions, the ADR index, the CI mirror, the env contract,
the golden-rule scan across scoped harnesses, and every relative link in every governed
document.

### Known and recorded

- `E-009` (rule weights) carries `guard: "none"` with `feature: F-029`. The graph is
  honestly reporting a check we owe rather than hiding it behind a lowered severity.
- Four open questions block the features that depend on them: OQ-1 (OIDC provider, R2),
  OQ-2 (billing, R4), OQ-3 (reference card, R4), OQ-4 and OQ-5 (corpus seed size and
  Japanese editorial reviewer, R1).
- Four gate blind spots recorded in `memory/observations.md`, including that
  `verify-state.mjs` implements a JSON Schema **subset** and reports its unsupported
  keywords rather than silently passing them.
- **The workstation runs Node 22.16.0.** `.nvmrc` pins 24.19.0. Gate 0 runs on 22; `pnpm
  install` will fail the engine check. Upgrade before F-001.

### Next

1. **UI design phase** — `docs/design/DESIGN-BRIEF.md` is the input. On approval, the token
   values land in `design-system.manifest.json` and its status moves from `placeholder` to
   `approved`, which makes the contrast gate blocking.
2. **Then F-001** (monorepo toolchain scaffold) via `/next-feature` → `/plan`.

Nothing is `in_progress`. The next session starts with `/next-feature`.
