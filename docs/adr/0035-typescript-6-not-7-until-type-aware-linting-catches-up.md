# ADR-0035 — TypeScript 6, not 7, until type-aware linting catches up

## Status

Accepted

## Date

2026-08-14

## Context

F-001 pinned TypeScript at `^7.0.2` — the native port, and the current `latest` tag. The
plan for F-001 flagged this as a risk to confirm during install, and said explicitly that
dropping from 7 would be an ADR rather than a silent edit.

Install surfaced the conflict immediately:

```
typescript-eslint peerDependencies:
  typescript: ">=4.8.4 <6.1.0"
```

**typescript-eslint 8.67.0 does not support TypeScript 7.** The highest version it accepts is
`6.0.x`; TypeScript 6.0.3 is published and stable.

That matters more here than it would in most projects, because type-aware linting is not a
convenience — it is the mechanism behind commitments made elsewhere:

- **NFR-24** — module and package boundaries are *machine-enforced*.
- **`no-floating-promises`, `no-misused-promises`, `await-thenable`** — a dropped `await` on
  an async port is a bug the compiler cannot see, and these rules need a real TypeScript
  program to find it.
- **Guard #5** in `scripts/verify-guards.mjs` asserts the floating-promise rule fires. Without
  a type-aware program that guard cannot pass, and a guard that cannot pass is a boundary we
  do not have.

So the choice is: the newest compiler, or the enforcement that several requirements depend on.

## Decision

**Pin TypeScript to `~6.0.3` across the workspace.**

Type-aware linting is load-bearing for NFR-24 and for four of the five boundary guards. A
compiler major version is worth far less than the enforcement it would cost us.

`~6.0.3` rather than `^6.0.3`: the peer range is `<6.1.0`, so a caret would eventually resolve
to a version typescript-eslint rejects and break install at an unrelated moment.

### What this gives up

TypeScript 7's headline is compile speed — the native port is substantially faster on large
codebases. We are a 23-package workspace with almost no source in it today, so the benefit is
currently near zero and the cost is immediate and structural. That balance will change, which
is what the revisit condition is for.

### What is deliberately *not* done

**Dropping the type-aware rules to keep TypeScript 7.** That would remove the machine
enforcement behind NFR-24 in order to hold a version number, and it is the precise shape of
the anti-pattern this harness exists to prevent: weakening a check so a command succeeds.

## Consequences

**Good.** Type-aware linting works, so `no-floating-promises` and the boundary rules genuinely
enforce rather than decorate. Guard #5 can pass. The whole toolchain resolves against published
peer ranges with no overrides, no `--force`, and no pinned transitive hacks.

**Bad.** We are a compiler major behind `latest`, and will be until typescript-eslint ships TS 7
support. We forgo the native port's compile-speed improvement — irrelevant today, increasingly
relevant as `packages/color-*` and the API fill out. There is a standing upgrade task nobody
owns yet, and `~6.0.3` means we do not even take 6.1 automatically if it appears.

**Neutral.** No source code changes. TypeScript 6.0 and 7.0 are compatible at the language
level for everything we write; this is a toolchain-compatibility pin, not a language decision.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep TS 7, drop type-aware rules** | Newest compiler, faster builds. Removes the machine enforcement behind NFR-24, breaks four of five boundary guards, and trades a real guarantee for a version number |
| **Keep TS 7, use `overrides` to silence the peer warning** | Install would succeed. typescript-eslint would then run against a compiler it does not support — either failing obscurely or, worse, silently producing wrong type information, which makes the *lint results themselves* untrustworthy |
| **TS 5.9.3** | Also within the peer range and more widely battle-tested. 6.0.3 is stable, published, and is the highest supported — no reason to give up a major for nothing |
| **Wait for typescript-eslint TS 7 support before starting F-001** | Blocks all R0 work on someone else's release schedule, for a compile-speed benefit we cannot currently measure |

## Revisit when

- **typescript-eslint publishes TypeScript 7 support.** This is the trigger; the upgrade should
  follow shortly after, as a single-commit change to the pin plus a full gate run.
- Or: `pnpm typecheck` wall time becomes a measurable drag on the development loop, at which
  point the trade genuinely tightens and is worth re-examining rather than assumed.
