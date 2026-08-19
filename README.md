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

# 2. Harness integrity — the gate that runs from day one, before any install
node scripts/verify-state.mjs

# 3. Everything else
pnpm install
```

**There is no step for backing services.** No database, no cache, no object store, nothing
to `docker compose up`. The app is local-first and the engine is dependency-free
([ADR-0051](docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)).

> **Node 24 is not optional.** `.nvmrc` pins 24.19.0, and on Node 22 six engine tests fail:
> `Math.pow` and `Math.cbrt` are implementation-approximated in ECMAScript and V8 differs
> between the versions by 1–2 ulp, which the cross-platform identity fixture is built to
> detect. They are not flaky — they are correctly reporting that you are on the wrong runtime.

Full bootstrap: [`scripts/init.ps1`](scripts/init.ps1) (Windows) or
[`scripts/init.sh`](scripts/init.sh) (POSIX).

## Layout

```
AGENTS.md      operating manual — authoritative, tool-agnostic
CLAUDE.md      Claude Code entry point (imports AGENTS.md)
.harness/      the working system: rules, skills, protocols, state, memory, gates
.claude/       thin Claude Code adapter over .harness/
docs/          PRD, architecture, ADRs, design, content, compliance, operations
apps/mobile    the app — the only surface
packages/      the colour engine, the store, and shared libraries (@irodora/*)
content/       the colour corpus, palettes, rules, locales — versioned content
tests/         bench · color-lab
scripts/       verification and bootstrap
```

## Platform

**iOS and Android, from one Expo codebase**
([ADR-0019](docs/adr/0019-mobile-expo-dev-client-new-architecture.md)) — SDK 57, React
Native 0.86, New Architecture. There is no web surface and no desktop build.

The colour engine is one TypeScript implementation with zero runtime dependencies, no
`node:*`, no DOM. That is not tidiness: it is what lets the same code produce byte-identical
results in Node, in a browser and on Hermes, which is the guarantee the whole product rests
on (NFR-3). A cross-boundary import fails `lint`, and
[`verify-guards.mjs`](scripts/verify-guards.mjs) plants a deliberate violation at each
boundary to prove the rule fires.

## Distribution

There is nothing to deploy. Builds come from EAS and ship to the App Store and Google Play;
JS-only changes, including corpus corrections, can ship as an Expo OTA update.

The trade this makes is worth stating plainly: **there is no instant rollback.** A staged
rollout halt is the fastest lever, and release discipline is what substitutes for a
redeploy. See [incident-response.md](docs/operations/incident-response.md).

## Accessibility

WCAG 2.2 AA is a **gate**, not an aspiration — the build fails on a contrast regression.
Colour is never the sole carrier of meaning anywhere in the product. Colour-vision
deficiency is modelled in the engine and scored in every recommendation. See
[`docs/design/ACCESSIBILITY.md`](docs/design/ACCESSIBILITY.md).

## Licence

Proprietary. All rights reserved. See [LICENSE](LICENSE), [NOTICE.md](NOTICE.md), and
[SECURITY.md](SECURITY.md).
