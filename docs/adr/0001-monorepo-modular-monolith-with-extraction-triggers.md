# ADR-0001 — One repository, a modular monolith, and named extraction triggers

## Status

Accepted, **amended by [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)**. One repository still holds
the engine, the content and the app. The *extraction triggers* are void: there are no
services to extract to.

## Date

2026-08-13

## Context

The brainstorm treated "monorepo versus microservices" as one question. It is two, and
conflating them is how teams end up with the costs of both:

- **Repository layout** — how source is organised and versioned.
- **Deployment topology** — how many independently deployable units run in production.

They are orthogonal. A monorepo can deploy fifty services; a polyrepo can deploy one.

The constraint that actually decides the repository question is NFR-3: the colour engine
must produce **byte-identical results on every surface**. Web, mobile, API and worker must
run the same engine at the same version. In a polyrepo that becomes a release-coordination
problem — publish, bump, verify, four times, every change. In one repository it is a
compile-time fact.

The topology question has a different answer, and it is about pressure that does not
exist yet. Today there is one team, one product, one scaling profile. The engine is
CPU-bound and identical everywhere. There is no context whose deploy cadence must
decouple, and no failure that must be isolated. Splitting into services now would buy
independent deployment we do not need and cost distributed transactions, network hops
inside a single user request, six pipelines, six dashboards and six on-call paths.

The real risk of a monolith is not performance. It is that internal boundaries erode until
extraction becomes a rewrite.

## Decision

**One repository. Three deployable units. Boundaries enforced by the compiler and the
linter, not by discipline.**

1. A pnpm + Turborepo monorepo containing `apps/*`, `packages/*`, `content/`, `infra/`,
   `tests/*`.
2. `apps/api` is a **modular monolith** with explicit module boundaries
   (`auth`, `tenancy`, `catalog`, `corpus`, `profile`, `wardrobe`, `recommendation`,
   `content`, `billing`, `platform`). Modules communicate only through declared
   interfaces.
3. Three deployables: `api`, `worker`, `web`. Mobile ships through the app stores.
4. **Boundaries are machine-enforced.** Cross-module internal imports and cross-package
   deep imports fail `lint` (NFR-24). The colour packages additionally cannot import any
   platform API.
5. **A module becomes a service when at least two of these hold** — and not before:
   1. its scaling profile diverges materially from the rest of the API;
   2. its deploy cadence must decouple for regulatory, risk or velocity reasons;
   3. a distinct team owns it end to end;
   4. its failure must be isolated from the rest of the platform;
   5. its runtime needs differ (different language, GPU, long-running process).

The likely first candidates are `recommendation` (CPU-bound, burst-shaped) and `corpus`
(read-only, globally cacheable). Both already sit behind an interface and hold no other
module's state.

## Consequences

**Good.** The engine is one artefact at one version everywhere — NFR-3 becomes a compile
error rather than a release process. One `pnpm install`, one CI pipeline, atomic
cross-cutting changes. A contract change and every consumer's update land in the same
commit, so the effect graph has something to point at. Operating three units is
tractable for a small team, and it fits a €5 VPS ([ADR-0016](0016-deployment-profiles-local-vps-cloud.md)).

**Bad.** All modules scale together — a hot recommendation path scales the auth module
with it. One repository grows large, and CI must stay incremental or it will slow to a
crawl. Boundary enforcement is only as good as the lint rules; a gap in them is a gap in
the architecture. And a monolith makes it *easy* to reach across a boundary "just this
once", which is precisely why the enforcement is mechanical rather than cultural.

**Neutral.** Extraction is deferred, not prevented. The triggers above are the test, and
they are written down so the decision to split is made against a condition rather than a
mood.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Microservices from day one** | Good at independent scaling and team autonomy — neither of which exists yet. Costs distributed transactions for a wardrobe write, network hops inside one user request, and 6× the operational surface before the first user. The engine is identical everywhere, so there is nothing to scale apart |
| **Polyrepo + microservices** | Strongest ownership isolation. But the colour engine must be byte-identical across four consumers, and polyrepo turns that compile-time guarantee into a release-coordination ritual. Cross-repo contract drift would become the dominant failure mode of the thing we most need to be correct |
| **Single package, no workspaces** | Simplest to start. But nothing would stop the web app importing a database repository, and the engine could not be published or reused independently. The boundary is the point |
| **Monorepo, single deployable including web** | Fewer moving parts. But the web app and the API have genuinely different scaling and failure characteristics, and coupling their deploys means a CSS fix redeploys the API |

## Revisit when

- Any module satisfies two extraction triggers.
- CI wall time exceeds 15 minutes on an incremental change.
- More than one team owns a distinct part of the API.
