---
kind: decision
title: The stack and topology, and the constraint that produced them
confidence: 1.0
created: 2026-08-13
scope: [root]
links: [[brand-name-and-namespace]]
---

# Stack and architecture

Settled 2026-08-13, with the user. Full reasoning in
[`docs/adr/`](../../../docs/adr/); this is the summary a session needs on arrival.

## The constraint that decided most of it

> **The colour engine must produce byte-identical results on every surface, offline,
> forever** (NFR-3).

That single requirement is why the engine is one TypeScript implementation in a monorepo
rather than a service; why it is dependency-free and platform-free; why it is validated
against published golden data rather than snapshots of itself; and why the version tuple
travels with every result.

## Topology

**Monorepo · modular monolith · three deployables** (`api`, `worker`, `web`).

Repository layout and deployment topology are separate decisions, and conflating them is how
teams get the costs of both. Extraction triggers are named in
[ADR-0001](../../../docs/adr/0001-monorepo-modular-monolith-with-extraction-triggers.md) —
a module becomes a service when at least two hold, and not before.

## Versions (pinned 2026-08-13)

Node 24.19.0 LTS · pnpm 11 · Turborepo 2 · TypeScript 7 · Fastify 5 · Zod 4 ·
Postgres 17 · Drizzle · Valkey 8 · Next.js 16 · React 19 · Tailwind v4 · Expo SDK 57
(RN 0.86) · Vitest 4 · Playwright.

**The workstation currently runs Node 22.16.0** and must be upgraded before F-001.

## Sequencing

**Web first**, mobile close behind. The Atlas is the organic-acquisition surface and the
public proof of the engine — and everything after R1 is only as trustworthy as that engine,
so it gets checked in public before anything is built on top of it.

## Deployment

Container-portable, three profiles behind ports: `local` · `vps` (Coolify **and** Dokploy,
a first-class target, not a fallback) · `cloud` (AWS via Terraform).

Every release is exercised on a real VPS before it ships. A portability story only ever
tested in cloud CI stops being true within a few releases.

## The engine has zero runtime dependencies

`culori` and `colorjs.io` are **test oracles**, never shipped
([ADR-0004](../../../docs/adr/0004-own-the-colour-engine-culori-as-test-oracle.md)). For a
product whose value is colour correctness, the core must be dependency-free,
precision-audited and portable to WASM.

## What was deliberately refused

Microservices at day one · a second database "for colour" · a search engine at R1 ·
server-side colour computation for scans · a vendor SDK inside the engine · an ML model in
the trust path.
