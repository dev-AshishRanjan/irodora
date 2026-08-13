# Rules

Constraints on *how* code is written here. Skills say how to do a task; rules say what any
solution must satisfy.

**Read the rules for what you are touching — not all of them, every session.** That is what
the split is for.

| Area | Read when |
|---|---|
| [`common/engineering.md`](common/engineering.md) | Always |
| [`common/testing.md`](common/testing.md) | Writing any test |
| [`common/documentation.md`](common/documentation.md) | Writing any doc or comment |
| [`common/git.md`](common/git.md) | Committing |
| [`common/agent-first.md`](common/agent-first.md) | Always — how to work here as an agent |
| [`typescript/typescript.md`](typescript/typescript.md) | Any TypeScript |
| [`api/api.md`](api/api.md) | `apps/api`, `apps/worker`, contracts |
| [`frontend/frontend.md`](frontend/frontend.md) | `apps/web`, `apps/admin`, `packages/ui` |
| [`frontend/contrast.md`](frontend/contrast.md) | Anything visual |
| [`frontend/motion.md`](frontend/motion.md) | Any animation |
| [`mobile/mobile.md`](mobile/mobile.md) | `apps/mobile` |
| [`color/color-science.md`](color/color-science.md) | **`packages/color-*`, `packages/cvd-engine` — mandatory** |
| [`content/content-provenance.md`](content/content-provenance.md) | **`content/` — mandatory** |
| [`security/security.md`](security/security.md) | Auth, input, storage, secrets |
| [`security/privacy.md`](security/privacy.md) | Anything touching user data or imagery |

## Precedence

Global rules apply everywhere. A scoped `AGENTS.md` may **add** rules. **More specific wins
on conflict — but nothing may relax a golden rule** ([`../../AGENTS.md` §1](../../AGENTS.md)).
The `state` gate scans scoped rules for weakening language.

## Changing a rule

A rule is changed deliberately, with an ADR, and the change is recorded. A rule that is
routinely ignored is either wrong or unenforced — decide which, and fix that, rather than
letting it decay into decoration.

**Prefer a rule that a machine can check.** A rule enforced by a lint rule or a gate is a
property of the codebase. A rule enforced by memory is a suggestion with formatting.
