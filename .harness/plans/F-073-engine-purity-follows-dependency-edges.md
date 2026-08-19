# Plan: F-073 — Engine purity follows `@irodora/*` dependency edges

| | |
|---|---|
| **Feature** | F-073 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-3, NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `tests` — `scripts/verify-engine-purity.mjs` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-19 |

---

## Intent

`verify-engine-purity.mjs` scopes the engine by **package name** — `color-*` and `cvd-engine` —
and treats any `@irodora/*` specifier inside those as allowed **without following the edge**.

So an engine package may depend on a workspace package that imports `node:fs`, or that declares
a third-party runtime dependency, and **every gate stays green while NFR-3 is broken**.
Byte-identical output in Node, the browser and React Native is the one guarantee that cannot
bend, and it is exactly what a transitive `node:fs` breaks.

Done means: the zone is computed from the dependency graph rather than from a naming
convention, and the check has been watched to fail on a transitive violation.

## What is true today, and why the check is still needed

**Nothing is violating this right now.** The engine's `@irodora/*` edges close over the named
zone exactly:

```
color-core   → color-spaces, color-difference, cvd-engine, color-harmony, color-naming
color-spaces → (nothing)
color-difference, color-naming, cvd-engine, color-harmony → color-spaces / color-difference
```

That is a fact about this commit, not a property anyone is maintaining. F-011 already hit the
hazard once: `color-naming` was expected to import `@irodora/corpus`, which is **not** in the
zone, and it was handled by giving `packages/corpus/src` a portability override plus boundary
guard #11. **That is one package handled by hand, not a rule** — and the note in F-073 says so.

The check must therefore be built now, while the closure is clean, so the first edge out of the
zone fails rather than being discovered later.

## Approach

**Reused:** the whole script — the TypeScript preprocessor for import extraction, the manifest
walk, the `--prove` harness. Only the definition of "in the zone" changes.

**Changed:** replace `isEngine(name)` with a computed closure.

```
roots   = packages matching color-* or cvd-engine   (the declared engine)
zone    = roots ∪ every package reachable from them through `dependencies`
          entries beginning @irodora/
```

Every package in `zone` is then held to both existing rules: no non-`@irodora` runtime
dependency, and no non-relative, non-`@irodora` import under `src/`.

**Reported, not silent:** the script prints the roots AND the packages pulled in transitively,
with the edge that pulled each one. A package that is in the zone because something depends on
it should be visible without reading the graph by hand — that is the difference between a check
and a surprise.

### Increments

1. Compute the closure; report roots and reached-by edges. Behaviour unchanged today because
   the closure equals the roots.
2. Extend `--prove` with the transitive case: make an engine package depend on a non-engine
   workspace package that imports `node:fs`, and watch the check fail **naming both**.
3. Update the gate description and the rules that describe the zone by name.

## Files to touch

```
scripts/verify-engine-purity.mjs   the closure, the report, the new proof case
.harness/verification/gates.json   the lint gate description
.harness/rules/color/color-science.md   the zone is a graph, not a naming convention
packages/color-core/AGENTS.md      same, in the scoped harness
```

## Anticipated effects

**No source changes, so no engine behaviour moves and no golden value shifts.**

The real effect is on future work: a package pulled into the engine zone by a dependency edge
inherits the whole constraint set. That is the intent — and it is also a cost worth stating,
because someone will one day want an engine package to use a convenience helper from a package
that reads a file, and this makes that a design decision rather than an accident.

Guard: increment 2. The transitive case must be watched to fail, or this is a rename.

## Test plan

- **Proof (`--prove`):** the two existing planted violations must still fail, and a **third**
  is added — an engine package gains a `@irodora/*` dependency on a non-engine package whose
  `src/` imports `node:fs`. The check must fail and name the transitive package and the edge.
- **Negative control:** the clean tree must pass, before and after each planted case.
- **Report control:** with the closure equal to the roots, the run must say so explicitly rather
  than printing a bare count that cannot distinguish "no transitive packages" from "did not
  look".

## Gates

`state` · `lint`

`lint` runs the script. `state` because the gate description and the feature record change.
