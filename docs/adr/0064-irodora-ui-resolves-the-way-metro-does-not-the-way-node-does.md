# ADR-0064 — `@irodora/ui` resolves modules the way Metro does, not the way Node does

## Status

Accepted

## Date

2026-08-24

## Context

[`tsconfig.base.json`](../../tsconfig.base.json) sets `module: NodeNext` and
`moduleResolution: NodeNext` for the whole repository, and every package inherits it.
`apps/mobile` already overrides both — `module: Preserve`, `moduleResolution: bundler` —
because Metro resolves it and Metro is not Node. The reasoning is recorded in the app's own
tsconfig and enforced by [`verify-app-imports.mjs`](../../scripts/verify-app-imports.mjs),
which cost a fifteen-minute Gradle build to learn.

[ADR-0062](0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md)
made `@irodora/ui` the only package that imports `heroui-native`. Under NodeNext that import
does not typecheck:

```
error TS2305: Module '"heroui-native"' has no exported member 'Button'.
```

`--traceResolution` gives the exact cause. The package's own entry resolves fine; its
**internal re-exports do not**:

```
Resolving module './components/button' from '…/lib/typescript/src/index.d.ts'.
Resolving in ESM mode with conditions 'import', 'types', 'node'.
======== Module name './components/button' was not resolved. ========
```

`heroui-native` publishes declarations that re-export with extensionless, directory-index
specifiers — `export * from './components/button'`. That is bundler-style and perfectly normal
for a React Native library; NodeNext ESM resolution requires an explicit file extension and
does not do directory-index lookup. Every re-export failed silently, so `keyof typeof HeroUI`
was `never` and the barrel appeared to export nothing at all.

**The library is not wrong, and neither is NodeNext.** They model different resolvers, and this
package had been describing the wrong one.

## Decision

**`packages/ui` compiles with `module: Preserve` and `moduleResolution: bundler`,** matching
`apps/mobile`.

This is a correction, not an exemption. `@irodora/ui` is `private: true` ([ADR-0054](0054-react-native-core-primitives-and-ui-stays-a-package.md))
and has exactly one consumer, `apps/mobile`, which loads its `dist/` through **Metro**. No
Node process ever resolves this package. Declaring NodeNext described a resolver that does not
participate, and the mismatch was invisible only because nothing had yet depended on a package
that resolves the other way.

The rest of `packages/*` stays on NodeNext. They are consumed by Vitest, by the gate scripts
and by each other — all Node — and `@irodora/color-*` must keep resolving identically
everywhere under NFR-3.

Relative imports inside `packages/ui` keep their `.js` suffixes. Bundler resolution accepts
both forms, the emitted `dist/` genuinely contains `.js` files, and rewriting them would be a
change with no consumer asking for it.

## Consequences

**Good**

- The package's declared resolution matches the resolver that actually loads it. A dependency
  published for bundlers — which, on React Native, is most of them — now typechecks here
  instead of failing in a way that reads as "this library exports nothing".
- It aligns with `apps/mobile`, so the two halves of the UI layer no longer disagree about what
  a module specifier means.

**Bad**

- **One package in `packages/*` now differs from the rest**, and the difference is invisible
  unless someone reads its tsconfig. Mitigated only by this record and by the comment in the
  file; there is no check that would catch someone "restoring consistency" by reverting it,
  and the symptom would be the same confusing `has no exported member` error.
- Bundler resolution is more permissive. A specifier that only a bundler can resolve now
  compiles here, and `verify-app-imports.mjs` covers `apps/mobile` only — so `packages/ui` has
  no equivalent guard against a specifier Metro would reject. That gap is real and unfilled.
- If `@irodora/ui` ever acquires a second consumer that resolves through Node, this decision
  has to be reopened rather than extended.

**Neutral**

- Emit is unchanged in substance: `Preserve` writes the ESM already in the source, and the
  `.js` specifiers were always literally correct against `dist/`.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep NodeNext and shim HeroUI's types locally** | Contains the change to one file and leaves the repository uniform. But a hand-written ambient declaration for a fifty-component library is a second source of truth for someone else's API, drifting from the moment it is written, and silently wrong rather than loudly broken when it does. |
| **Keep NodeNext and deep-import the declarations** | `heroui-native/lib/typescript/…` would resolve. It is blocked by the package's own `exports` map, and by our deep-import guard — which exists for exactly this reason and should not be the thing that bends. |
| **Move the whole repository to `bundler`** | Consistent, and it would have prevented this. But `packages/color-*` are resolved by Node in tests and by the gate scripts, and NFR-3's guarantee is that the engine behaves identically in Node, the browser and React Native — describing it with a resolution mode Node does not implement is the wrong direction for the one package set where being wrong is worst. |
| **Ask HeroUI to publish NodeNext-compatible declarations** | The correct upstream fix, and worth raising. It does not unblock anything on our timescale, and ADR-0062 already records that this project's contributing guide reserves changes to the core team. |

## Revisit when

- **`@irodora/ui` gains a consumer that resolves through Node** — a second surface, a
  server-side render, a Vitest suite importing it directly.
- **`heroui-native` publishes declarations that resolve under NodeNext**, which would remove
  the forcing constraint and make this a preference rather than a requirement.
- **A specifier that Metro rejects reaches `packages/ui`** — that is the "Bad" consequence
  coming due, and the answer is a resolver check for this package, not a return to NodeNext.
