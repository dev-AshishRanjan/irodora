# Plan: F-001 — Monorepo toolchain scaffold

| | |
|---|---|
| **Feature** | F-001 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 (boundaries machine-enforced) |
| **Service / package** | `root` — the workspace itself |
| **Author** | Claude (generator) |
| **Date** | 2026-08-14 |

---

## Intent

Make the workspace real: `pnpm install` resolves every package, Turborepo runs the pipeline,
and **the architectural boundaries that ADR-0001 and ADR-0004 depend on become lint errors
rather than intentions.**

"Done" looks like: a contributor who tries to deep-import another package, or to `import 'node:fs'`
inside the colour engine, gets a build failure — not a review comment.

## Approach

**Reused:** the root config already written in Phase 1 — `package.json`, `pnpm-workspace.yaml`,
`turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json`. This feature makes
them operative; it does not redesign them.

**New:**

1. **Per-package manifests.** Every directory in `packages/*`, `apps/*`, `tests/*` becomes a real
   workspace member: `package.json`, `tsconfig.json` (the LINT/editor project — src *and* tests,
   `noEmit`), `tsconfig.build.json` (the EMIT project — src only), and a minimal `src/index.ts`.

   The two-project split is deliberate and is the thing most likely to be got wrong: if
   `typecheck` runs the *build* project, type errors accumulate in test files where no gate can
   see them.

2. **Boundary enforcement, proven.** `eslint.config.mjs` already declares the rules. This feature
   adds **guard fixtures** — files that intentionally violate each rule — and a check that
   confirms ESLint reports them. A boundary rule nobody has watched fail is not a boundary.

3. **Gate activation.** `gates.json` moves `typecheck`, `lint`, `format`, `test`, `build` from
   `pending` to `active`. CI already has conditional steps keyed on `pnpm-lock.yaml`, so they
   begin running the moment the lockfile exists.

**Increments**, each leaving the tree green:

1. Package manifests + tsconfigs, workspace resolves
2. `pnpm install`, lockfile committed
3. Turborepo pipeline runs end to end on empty packages
4. Guard fixtures + proof the rules fire
5. Gate activation in `gates.json`

## Files to touch

```
packages/*/package.json            — 15 workspace members
packages/*/tsconfig.json           — lint project: src + tests, noEmit
packages/*/tsconfig.build.json     — emit project: src only
packages/*/src/index.ts            — minimal real export
apps/*/package.json                — 5 apps, private
tests/*/package.json               — 3 test packages, private
tests/guards/                      — NEW: fixtures proving each lint rule fires
.harness/verification/gates.json   — activate gates 1-4 and 6
pnpm-lock.yaml                     — generated, committed
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| Workspace membership | Turborepo task graph, CI, every future feature | `gate:build` |
| `eslint.config.mjs` boundary rules | Every package; the colour engine especially | `gate:lint` + the new guard fixtures |
| Gate activation | `ci.yml` must run them — the mirror check enforces this | `gate:state` |
| `tsconfig` project split | `typecheck` coverage of test files | `gate:typecheck` |

**No new effect link is needed** — this feature creates the enforcement that
[E-002](../state/effects.json) (the `Color` type reaching every surface) already names
`gate:typecheck` as its guard. It makes an existing guard real rather than adding a dependency.

## Test plan

- **Guard fixtures** (`tests/guards/`) — one file per rule, each a deliberate violation:
  deep import into a package's internals · `node:fs` in the colour-engine zone · `window` in the
  colour-engine zone · a floating promise. A script asserts ESLint reports **exactly** these and
  fails if any rule stops firing.
  > This is the negative-test-needs-a-decoy discipline applied to lint: a boundary rule that has
  > never been watched fail is not a boundary.
- **Turborepo** — `pnpm build` succeeds across the graph and caches on a second run.
- **Project split** — a type error introduced in a `*.test.ts` is caught by `pnpm typecheck`.

## Verification

```bash
node scripts/verify-state.mjs
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
node scripts/verify-guards.mjs        # proves each lint rule still fires
```

## Risks and open questions

**BLOCKING — Node version.** `package.json` requires `>=24.19.0 <25`; this workstation runs
**22.16.0**, and nvm-windows holds only 16, 20. `pnpm install` cannot run here.

The scaffold is written and reviewable, but **gates 1–4 and 6 cannot be executed until Node 24
is installed.** F-001 therefore stays `in_progress` — it is not done, and saying otherwise would
be exactly the false verification claim golden rule 11 forbids.

Unblock with:

```
nvm install 24.19.0 && nvm use 24.19.0
```

**Not** by lowering the `engines` constraint. Node 22 is in maintenance; 24 is the active LTS the
project is pinned to, and weakening a constraint to make a command succeed is the anti-pattern
this harness exists to prevent.

**TypeScript 7.** Pinned at `^7.0.2` — the native port. Its behaviour under project references at
this scale is worth confirming during install; if it misbehaves, dropping to 5.9 is an ADR, not a
silent edit.

## Out of scope

No application code, no colour maths, no UI. Packages export a single placeholder symbol so the
graph resolves. **The engine itself is F-006**; this feature only builds the room it lives in.
