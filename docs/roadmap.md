# Irodora — Roadmap

Releases are **capability gates**, not dates. A release ships when its exit criteria are
met with evidence. Ordering is enforced by
[`.harness/state/feature_list.json`](../.harness/state/feature_list.json); the `state`
gate refuses to let a feature start while a blocker is unfinished.

The shape of the plan: **prove the engine in public before building on top of it.** R1
puts the colour engine on the open web where anyone can check it, because everything
after R1 — personal colour, outfits, wardrobe, capsules — is only as trustworthy as that
engine. Building the wardrobe first would mean discovering an engine flaw after four
features already depend on it.

---

## R0 — Foundation

*Nothing user-facing. Everything downstream depends on it being right.*

| | |
|---|---|
| **Features** | F-001 … F-005 |
| **Entry** | This PRD approved; harness gate 0 green |
| **Exit** | `pnpm typecheck lint format:check test build` all green on an empty workspace · CI runs every active gate · the stack boots on a real VPS through Coolify **and** through Dokploy · `verify-state` green |

- **F-001** Monorepo toolchain scaffold — pnpm, Turborepo, TypeScript project references, package boundaries lint-enforced
- **F-002** `@irodora/contracts` — shared schemas and types, the single source of truth for every wire format
- **F-003** `@irodora/design-tokens` — OKLCH-native tokens with a machine-readable manifest the contrast gate reads
- **F-004** CI/CD — GitHub Actions mirroring `gates.json` exactly, with the mirror itself checked
- **F-005** Deployment profiles — Dockerfiles, production compose, Coolify and Dokploy runbooks, Terraform skeleton

**Why the deployment profile is in R0 and not R4.** A deployment story retrofitted after
twenty features is a rewrite. Proving that a container-portable stack boots on a €5 VPS
on day one is what keeps every later feature honest about its runtime assumptions.

---

## R1 — The colour engine and the public atlas

*The release that has to be right. Everything else is downstream of it.*

| | |
|---|---|
| **Features** | F-006 … F-025 |
| **Entry** | R0 exit met |
| **Exit** | `color-golden` gate green against the full reference set · `content` gate green with 100 % provenance · `a11y` and `contrast` gates green on every route · Lens works offline with the network disabled, proven in e2e · a CVD user completes J1 and J4 unaided in usability testing |

**The engine** — F-006 colour spaces · F-007 difference and contrast · F-008 CVD and
separation · F-009 gamut mapping · F-010 the colour value type and provenance ·
F-013 naming · F-014 harmony

**The corpus** — F-011 schema, provenance and the content gate · F-012 the seed Japanese
atlas

**The surfaces** — F-015 API foundation · F-016 catalog API · F-017 web foundation
(design system, accessibility, en/ja) · F-018 Atlas · F-019 Compare · F-020 Palette
Studio · F-021 Finder · F-022 web Colour Lens · F-023 shareable cards · F-024 local-only
offline mode · F-025 the claims copy lint

**Open question to close first:** OQ-4 — how large the seed corpus is at launch. The
default is *verified depth over breadth*: two hundred entries every one of which
withstands scrutiny beats two thousand nobody checked. F-012 does not start until this
is decided and recorded.

---

## R2 — Personal colour and the outfit engine

| | |
|---|---|
| **Features** | F-026 … F-038 |
| **Entry** | R1 exit met |
| **Exit** | `cvd` gate active and green · recommendation p95 within NFR-4 · bias validation complete across every ITA° band with published per-band accuracy · cross-tenant read proven impossible by test · DSR export and deletion exercised end to end |

F-026 guided profile · F-027 photo-assisted profile · F-028 compatibility engine ·
F-029 rule and weight content system · F-030 outfit colour engine · F-031 scoring and
explainability · F-032 CVD outfit mode · F-033 authentication · F-034 tenancy and RLS ·
F-035 data subject rights · F-036 observability · F-037 ethical guardrails and bias
validation · F-038 performance gates

**F-037 is a release blocker, not a nice-to-have.** A personal-colour engine that has not
been validated across the full skin-tone range is not shippable, and finding that out
after launch is not an option we are willing to hold open.

---

## R3 — Mobile and the wardrobe

| | |
|---|---|
| **Features** | F-039 … F-047 |
| **Entry** | R2 exit met |
| **Exit** | `e2e-full` gate active and green across one live deployment · conflict matrix converges for wardrobe, outfits and preferences · median add-a-garment ≤ 20 s measured on device · offline-to-online transition loses nothing |

F-039 Expo foundation · F-040 mobile Lens (all capture modes) · F-041 offline storage ·
F-042 wardrobe model, API and image encryption · F-043 add-garment flows · F-044 sync ·
F-045 outfit builder · F-046 preference feedback · F-047 availability and degradation

---

## R4 — Intelligence, professional and revenue

| | |
|---|---|
| **Features** | F-048 … F-060 |
| **Entry** | R3 exit met |
| **Exit** | Capsule solve within NFR-4 at 40 garments · calibrated scan improves mean ΔE00 by ≥ 50 % on the device matrix · public API documented from generated OpenAPI · entitlements unbypassable from a client, proven by test · load test meets NFR-7 |

F-048 coverage and gaps · F-049 duplicates · F-050 capsule optimiser · F-051
cost-per-wear · F-052 shopping check · F-053 calibrated scan · F-054 outfit scanner ·
F-055 professional workspace · F-056 exports and reports · F-057 public API and quotas ·
F-058 billing · F-059 audit trail · F-060 scale validation

**Closes OQ-2** (billing provider) and **OQ-3** (reference card manufacture or partner)
before the features that depend on them start.

---

## R5 — Scale and content operations

| | |
|---|---|
| **Features** | F-061 … F-066 |
| **Entry** | R4 exit met |
| **Exit** | No corpus change is possible outside the admin application in production · device accuracy table published for the reference matrix · pattern extraction meets its accuracy target on the pattern corpus |

F-061 admin content application · F-062 editorial review workflow · F-063 device colour
lab · F-064 pattern and multi-colour extraction · F-065 occasion and weather context ·
F-066 team workspaces

---

## Sequencing rules

1. **WIP = 1.** One feature in progress at a time, globally. Enforced by the `state` gate.
2. **Blockers before dependents.** A feature cannot start while anything in its
   `blockedBy` is unfinished.
3. **Gates activate with the feature that makes them meaningful** — never earlier
   (a gate that cannot fail teaches nothing) and never later (a gate added after the
   fact finds a backlog instead of a regression).
4. **An open question blocks the feature that depends on it**, and closes as an ADR, not
   as a conversation.
5. **A release does not ship on a red gate.** The fix is the root cause. Lowering a
   threshold to go green is a governance violation, not a trade-off.
