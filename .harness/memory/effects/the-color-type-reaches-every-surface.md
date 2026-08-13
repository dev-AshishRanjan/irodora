---
kind: effect
id: E-002
title: The Color type reaches every surface, and Provenance is the part that matters
severity: critical
guard: gate:typecheck
confidence: 0.95
created: 2026-08-13
scope: [packages/color-core, packages/contracts, apps/api, apps/web, apps/mobile]
links: [[srgb-xyz-is-the-root-of-every-derived-value]], [[provenance-in-the-type-is-what-makes-honesty-structural]]
---

# The Color type reaches every surface

**Changing `Color` touches every package, every surface, the wire contract and the database
columns at once.**

## Why

`Color` is the atom. It appears in the engine, in the contracts package, in API responses,
in database columns (`provenance_source`, `provenance_confidence`), in every UI component
that renders a swatch, and in the mobile app.

## The change that must never happen quietly

**Making `Provenance` optional.**

It would compile. Most tests would pass. And it would silently remove the product's
honesty guarantee ([ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)),
because the whole mechanism is that a component holding a `Color` *necessarily* has its
provenance and therefore cannot render it without one.

The failure would not appear as a bug. It would appear, months later, as a surface
displaying a measured-looking hex with no indication it was estimated under a warm bulb —
and nothing would flag it, because nothing would be broken.

## What must happen on a change

1. `pnpm typecheck` across the whole workspace — the guard, and it is a real one here
   because the type is used everywhere.
2. Update `@irodora/contracts` and regenerate OpenAPI and the SDK ([E-004](../../state/effects.json)).
3. Check the database columns and their migration.
4. Check every UI component that renders a colour.
5. **If the change touches `Provenance` itself, it needs an ADR** — that is a change to what
   the product claims about itself.

## The guard

`gate:typecheck` catches structural changes. It does **not** catch a semantic weakening —
making a field optional typechecks fine. That is a review responsibility, and it is written
down here because it is the one this link exists to prevent.
