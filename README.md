<div align="center">

# Irodora

**See colour. Understand colour. Wear colour.**

A deterministic colour intelligence platform for what you wear — grounded in colour
science, rooted in Japanese colour culture, and accessible to people with colour-vision
deficiency by design rather than by afterthought.

</div>

---

## What this is

Irodora answers, for a real garment in real light:

- **What colour is this, exactly?** — with the measurement's provenance and confidence attached, never a bare hex pretending to be truth.
- **What goes with it?** — trousers, shoes, outerwear, accessories, ranked and *explained*.
- **Does it work for me?** — against a multidimensional personal colour profile, not a single skin RGB value.
- **Which Japanese colours is it near?** — a provenanced atlas of traditional and contemporary Japanese colour, not a scraped hex list.
- **Can everyone tell these apart?** — colour-vision-deficiency separation is a first-class score, not a display filter.

The intelligence is **deterministic**: colour science, published algorithms, curated
content and explicit rules. Every recommendation is reproducible from its inputs and
its engine, content and rule versions. See
[ADR-0002](docs/adr/0002-deterministic-core-tiered-capability-policy.md) for what that
does and does not permit.

## Status

**Phase 1 — product definition and harness. Pre-code.**

The product is fully specified and the working system that will build it is in place.
Application code begins with release **R0**, one feature at a time, through the harness.

| Where | What |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | The product, with numbered, testable requirements |
| [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) | How it is built |
| [`docs/adr/`](docs/adr/) | Why each decision was made |
| [`docs/roadmap.md`](docs/roadmap.md) | R0 → R5 |
| [`AGENTS.md`](AGENTS.md) | **How work gets done here.** Read this first. |

## For agents

**Read [`AGENTS.md`](AGENTS.md) in full before doing anything.** It is the authoritative,
tool-agnostic operating manual. Claude Code additionally loads [`CLAUDE.md`](CLAUDE.md),
which imports it.

The short version: the repository is the system of record, one feature at a time,
plan before code, verification is the proof, trace your effects, leave a clean state.

## For humans

```bash
# 1. Node 24 LTS + pnpm 11 (see .nvmrc)
corepack enable

# 2. Backing services for local development
docker compose up -d

# 3. Harness integrity — the gate that runs from day one
node scripts/verify-state.mjs
```

Full bootstrap: [`scripts/init.ps1`](scripts/init.ps1) (Windows) or
[`scripts/init.sh`](scripts/init.sh) (POSIX).

## Layout

```
AGENTS.md      operating manual — authoritative, tool-agnostic
CLAUDE.md      Claude Code entry point (imports AGENTS.md)
.harness/      the working system: rules, skills, protocols, state, memory, gates
.claude/       thin Claude Code adapter over .harness/
docs/          PRD, architecture, ADRs, design, content, compliance, operations
apps/          api · worker · web · mobile · admin
packages/      the colour engine and shared libraries (@irodora/*)
content/       the colour corpus, palettes, rules, locales — versioned content
infra/         docker · compose · coolify · dokploy · terraform
tests/         e2e-full · bench · color-lab
scripts/       verification and bootstrap
```

## Platforms

Web first ([Next.js](docs/adr/0018-web-nextjs-react-tailwind-radix.md)), mobile close
behind ([Expo](docs/adr/0019-mobile-expo-dev-client-new-architecture.md)). The colour
engine is one shared TypeScript implementation used identically by every surface —
that identity is the point, and it is enforced at compile time by the monorepo
([ADR-0001](docs/adr/0001-monorepo-modular-monolith-with-extraction-triggers.md)).

## Deployment

Plain containers. Three profiles, one image set:

| Profile | Target | Guide |
|---|---|---|
| `local` | Docker Compose on your machine | [local.md](docs/operations/deployment/local.md) |
| `vps` | Coolify or Dokploy on a single VPS | [coolify.md](docs/operations/deployment/coolify.md) · [dokploy.md](docs/operations/deployment/dokploy.md) |
| `cloud` | AWS via Terraform | [aws.md](docs/operations/deployment/aws.md) |

Cloud services sit behind ports, so the VPS profile is not a degraded mode — it is a
first-class target ([ADR-0016](docs/adr/0016-deployment-profiles-local-vps-cloud.md)).

## Accessibility

WCAG 2.2 AA is a **gate**, not an aspiration — the build fails on a contrast regression.
Colour is never the sole carrier of meaning anywhere in the product. Colour-vision
deficiency is modelled in the engine and scored in every recommendation. See
[`docs/design/ACCESSIBILITY.md`](docs/design/ACCESSIBILITY.md).

## Licence

Proprietary. All rights reserved. See [LICENSE](LICENSE), [NOTICE.md](NOTICE.md), and
[SECURITY.md](SECURITY.md).
