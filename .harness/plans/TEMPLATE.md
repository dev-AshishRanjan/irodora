# Plan: F-0NN — <feature title>

| | |
|---|---|
| **Feature** | F-0NN — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-*, NFR-* — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/…` · `@irodora/…` |
| **Author** | <agent or person> |
| **Date** | YYYY-MM-DD |

---

## Intent

What this delivers and why, in two or three sentences. What "done" looks like **to a user**
— not to the build.

## Approach

The design in brief.

**Reused:** which existing packages, ports and utilities. Name them. If the answer is
"nothing", say why — it is usually wrong, and a second implementation of anything in
`packages/color-*` is a defect by definition.

**New:** types, interfaces, modules being introduced, and where they live.

**Increments:** the sequence of small, independently verifiable steps. Each one leaves the
build green.

## Files to touch

```
path/to/file.ts        — what changes, and why
```

## Anticipated effects

Shared contracts this may change, and their known dependents. Feeds the
[effect-link protocol](../protocols/effect-link.md).

> e.g. "Changes the `BlobStore` port ⇒ both adapters + the conformance suite."
> e.g. "Changes `srgbToXyz` ⇒ every derived corpus value ⇒ corpus rebuild (E-001)."

For each, name the **guard** that will catch a violation — or note that one must be built.

## Test plan

- **Unit / property:** …
- **Golden:** which datasets, from which source. Any new one, and its citation.
- **Conformance:** which port suites must pass.
- **E2E:** the journey, if user-facing.
- **Negative:** what must *not* happen, and how that is asserted. Remember a negative test
  needs a **decoy**, not an empty fixture.

## Verification

The exact gates to run, and the evidence to capture
([verification protocol](../protocols/verification.md)).

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm test && pnpm build
# plus: color-golden | cvd | content | a11y | contrast — whichever apply
```

## Risks and open questions

Anything uncertain. Any `OQ-*` that must close before or within this work — an open
question blocks the feature that depends on it.

## Out of scope

What this feature deliberately does not do. **The acceptance list is the contract; extra
scope is as much a failure as missing scope**, because it is work nobody reviewed against a
requirement.
