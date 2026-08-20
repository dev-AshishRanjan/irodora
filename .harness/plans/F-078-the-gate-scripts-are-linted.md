# Plan: F-078 — The gate scripts are linted

| | |
|---|---|
| **Feature** | F-078 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `scripts/` · `eslint.config.mjs` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

The code that decides whether everything else may ship is itself checked by nothing.

## The gap, confirmed rather than assumed

`pnpm lint` is `turbo run lint`, which invokes **each package's** `eslint .`. `scripts/` is in
no package, so nothing reaches it. Running it by hand does not help either:

```
$ npx eslint scripts/verify-state.mjs
Parsing error: project was set to `true` but couldn't find any tsconfig.json
```

**23 files**, including `verify-state`, `verify-contrast`, `verify-guards`,
`verify-engine-purity`, `verify-claims`, `verify-content`, `verify-motion` and
`verify-font-coverage`.

Same class as F-071, F-072, F-073 and F-074 — a defect in the verification apparatus itself —
and filed as a `tests` feature on that precedent rather than pulled from a later release.

## Approach

**Linted without type-awareness.** They are plain `.mjs` in no tsconfig project, and the
type-aware rules cannot parse them. Everything else applies: undefined variables, unreachable
code, unused values, the correctness rules that do not need a type checker.

**Reached explicitly.** The root `lint` script gains `eslint scripts`, because `turbo run lint`
structurally cannot — it walks packages.

### Increments

1. The config block and the root wiring.
2. Fix whatever it finds — **fixed, not suppressed**. A finding in a gate script is a finding in
   the thing that judges everything else.
3. Close the observation, naming what closed it.

## Test plan

- **The gap is closed:** a planted violation under `scripts/` fails `pnpm lint`, watched.
- **Assertions to reject:** "eslint now runs on scripts" asserted by the config existing. The
  same mistake `verify-guards.mjs` exists to prevent — a rule nobody has watched fail is
  configuration that parses.

## Out of scope

Converting the scripts to TypeScript · type-aware linting for them, which would mean a tsconfig
covering `scripts/` and is a larger decision than this defect warrants.
