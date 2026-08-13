# Apps

**Three deployable units** — `api`, `worker`, `web` — plus `mobile`, which ships through the
app stores, and `admin`, which is internal.

Not twelve. There is no scaling profile, deploy cadence or team boundary today that
justifies a network hop inside a single user request
([ADR-0001](../docs/adr/0001-monorepo-modular-monolith-with-extraction-triggers.md)).

| App | Is | Scoped rules |
|---|---|---|
| [`api`](api/AGENTS.md) | Fastify modular monolith. Auth, tenancy, catalog, corpus, profile, wardrobe, recommendation, content, billing | [AGENTS.md](api/AGENTS.md) |
| [`worker`](worker/AGENTS.md) | Background jobs. **The only process that decodes images** | [AGENTS.md](worker/AGENTS.md) |
| [`web`](web/AGENTS.md) | Next.js. The Atlas, Lens, Compare, Palette Studio, Outfit Lab | [AGENTS.md](web/AGENTS.md) |
| [`mobile`](mobile/AGENTS.md) | Expo + VisionCamera. Precision Lens, wardrobe, offline | [AGENTS.md](mobile/AGENTS.md) |
| [`admin`](admin/AGENTS.md) | Internal content management. **A trust boundary** | [AGENTS.md](admin/AGENTS.md) |

## What every app has in common

**The colour engine is imported, never reimplemented.** The same `@irodora/color-core`, at
the same version, on every surface. That identity is the point, and it is what NFR-3 and the
cross-platform identity test protect.

**No app is trusted by another.** The API validates everything at its boundary regardless of
which of our own clients sent it.

**Each app's `AGENTS.md` is stricter than the root, never looser.** No scope may relax a
golden rule — the `state` gate scans for it.

## Extraction

A module inside `api` becomes its own service when at least two extraction triggers hold —
scaling profile, deploy cadence, team ownership, failure isolation, runtime needs. The
triggers are written down so the decision is made against a condition rather than a mood.

The likely first candidates are `recommendation` (CPU-bound, burst-shaped) and `corpus`
(read-only, globally cacheable). Both already sit behind an interface and hold no other
module's state.
