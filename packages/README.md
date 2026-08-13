# Packages

Shared libraries, published under the `@irodora/*` scope. Code lands at R0–R1; the
directories and their scoped rules exist now so a boundary is never invented under pressure.

## The colour engine

The strictest zone in the repository — see
[`color-core/AGENTS.md`](color-core/AGENTS.md), which governs all of these.

| Package | Owns |
|---|---|
| `color-spaces` | Conversions. sRGB · P3 · linear · XYZ · Lab · LCh · OKLab · OKLCh · adaptation |
| `color-difference` | ΔE76 · ΔE94 · **ΔE00** · ΔEok · WCAG contrast · APCA |
| `cvd-engine` | Brettel–Viénot · Machado · the separation score |
| `color-harmony` | Harmony generators, geometric and editorial |
| `color-naming` | Nearest-match and naming |
| `color-core` | The facade · the `Color` value type · provenance · sampling · envelopes |

**Zero runtime dependencies. No `node:*`, no DOM, no `process`.** These must produce
byte-identical results in Node, the browser and React Native (NFR-3) and port to WASM without
a rewrite. Both constraints are lint-enforced.

## Domain

| Package | Owns |
|---|---|
| `corpus` | Typed corpus access and version pinning |
| `recommendation` | Rules, weights, scoring, explanation objects |
| `optimization` | Capsule and coverage solvers |

## Platform

| Package | Owns |
|---|---|
| `contracts` | Zod schemas — the single source of validation, types and OpenAPI |
| `design-tokens` | OKLCh tokens compiled to CSS · TS · React Native · Tailwind |
| `ui` | Shared React primitives |
| `telemetry` | OpenTelemetry wrappers |
| `config` | Environment schema and deployment profiles |
| `testing` | Golden datasets, property helpers, fixtures |

## Dependency direction is one-way

```
color-spaces  (depends on nothing)
     ↓
color-difference · cvd-engine · color-harmony · color-naming
     ↓
color-core
     ↓
corpus · recommendation · optimization
     ↓
apps/*
```

**No package imports an application.** A cycle fails `lint`.

## Boundaries

Import a package's entry point, never an internal path. Deep imports fail `lint`, because a
boundary that depends on vigilance is not a boundary — and these boundaries are what make
extracting a bounded context later a deployment change rather than a refactor
([ADR-0001](../docs/adr/0001-monorepo-modular-monolith-with-extraction-triggers.md)).
