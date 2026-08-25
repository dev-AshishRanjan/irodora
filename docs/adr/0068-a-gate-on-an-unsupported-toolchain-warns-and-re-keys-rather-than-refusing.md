# ADR-0068 — A gate on an unsupported toolchain warns and re-keys rather than refusing

## Status

Accepted

## Date

2026-08-25

## Context

`pnpm test` printed **31 successful, 31 total — 26 cached**. The same command with `--force`
was **red in four tests**. Both statements were true, and the gate had been reporting the first
one for at least two features.

Part of that was a test reading outside its own package. The rest is this: **turbo's global hash
contains no fact about the runtime executing it.** Its own dry run says so:

```
files:   { ".nvmrc": <git blob>, "tsconfig.base.json": <git blob>, … }
engines: { "node": ">=24.19.0 <25", "pnpm": ">=11.0.0" }
env:     ["NODE_ENV"]
```

`.nvmrc` is hashed as **the file that requests a version**. `engines` is a **range**. Neither is
the process that ran. So a cache produced under Node 24 is replayed under Node 22 — and the
tests that differ between V8 builds are exactly the bitwise identity and golden fixtures this
product's central guarantee rests on. WCAG contrast came back `4.500078715444717` against a
pinned `…719`: two units in the last place, a hard failure, invisible behind a cache hit.

`package.json` already declares `engines`, and **pnpm enforces it — for `pnpm install`**. On the
workstation this was found on, `pnpm install` refuses outright: Node 22.16.0 and pnpm 9.3.0
against a repo requiring 24.19.0 and pnpm 11. Every gate ran anyway.

So there is an existing, documented position — *this toolchain is required* — and the gates were
the one place not applying it. The question is what applying it should mean.

## Decision

**Every cached turbo task is started by `scripts/gate.mjs`, which sets `IRODORA_TOOLCHAIN` to
the exact running Node and package-manager versions. `turbo.json` declares that variable in
`globalEnv`. On a major-version mismatch the wrapper prints a loud warning and continues.**

### The keying is exact; the warning is coarse

`24.19.0` and `24.20.0` are **different cache namespaces**. Nothing says a patch release cannot
move a transcendental by an ULP, and the cost of an extra namespace is one cold run.

The **warning** compares major versions only. A warning that fires on a legitimate setup is a
warning people learn to scroll past, and a warning nobody reads is worse than none.

### Why warn and not refuse

Because the two failure modes are not symmetrical.

|  | On an unsupported toolchain |
|---|---|
| **Without keying** | a cache made elsewhere is replayed → **false green** |
| **With keying** | the run executes and may fail for toolchain reasons → **false red** |

A false green is a gate lying about the code. A false red is a gate being unhelpful. Only the
first is dangerous, and keying removes it completely — a mismatched run can neither reuse nor
produce an entry a supported run would consume.

Refusing would add nothing to that guarantee. What it would add is a workstation that can run
no gate at all — this one already cannot `pnpm install` — and the fix for that is a Node
upgrade, which is not something a repository change can perform.

### Why a wrapper rather than a preflight in the script chain

`globalDependencies` hashes **tracked** files, confirmed by the dry run, so a generated
toolchain file would not be seen. `globalEnv` hashes **values**, which fits — but a `&&`-chained
preflight cannot mutate its sibling's environment, and `FOO=x cmd` is not portable to Windows.
The thing that knows the toolchain has to be the thing that starts turbo.

Root script *names* are unchanged, so `gates.json` and the CI mirror are untouched.

## Consequences

### Good

- A green cached run now means the tests ran on this toolchain, or said loudly that they did
  not. That is the property gate 5 was asserting and did not have.
- The warning names what a red run may mean, so a developer on the wrong Node is not sent
  hunting for a bug in the code that is really a bug in their `nvm` state.
- `verify-cache-scope.mjs` fails if a cached task is invoked around the wrapper, so the
  mechanism cannot be bypassed by someone editing a script in good faith.

### Bad

- **Somebody can keep working on an unsupported toolchain indefinitely**, seeing a warning they
  eventually stop reading. That is the real cost of not refusing, and it is the thing to revisit
  if it turns out to matter more than the access it preserves.
- **A red run on an unsupported toolchain is ambiguous.** It might be the code; it might be V8.
  The warning says so, but resolving it still requires the right Node.
- **Every gate pays one Node process.** Small, and paid on every invocation.
- **Cache entries multiply by toolchain.** Intended, and it means a machine switching Node
  versions goes cold once per switch.
- **`IRODORA_TOOLCHAIN` is in `.env.example`** and is not configuration. It is documented there
  because the `state` gate's env contract is two-way and there is no third category; the entry
  says plainly that setting it by hand can only lie.

### Neutral

- Landing this invalidated every cache once.

## Alternatives considered

**Refuse to run on a mismatched toolchain.** The strongest option and the one `engines` already
takes for installs. Rejected for the access reason above, not because it is wrong — if this
repository ever has more than one contributor, or a workstation that can install its own
dependencies, it becomes the better answer.

**Put the version in `globalDependencies` via a generated file.** The dry run shows
`globalDependencies` resolving to **git blob hashes**, so a git-ignored generated file would
contribute nothing and the fix would look like it worked. Committing the file instead would
churn on every machine.

**Disable caching for the affected tasks.** Trades a wrong answer for a slow one. A slow gate is
a gate somebody eventually skips, which is the same defect arriving by a different route.

**Regenerate the identity fixtures so Node 22 passes.** Never. F-083 says it in as many words:
that converts a discovered violation of the product's central guarantee into a silent one.

## Revisit when

- The workstation runs the pinned toolchain. At that point refusing costs nothing and should
  probably replace the warning.
- Remote caching is introduced. A shared cache across machines makes the toolchain key
  load-bearing rather than precautionary, and makes any gap in it much more expensive.
- `turbo` adds first-class runtime-version hashing, at which point the wrapper is deletable and
  should be deleted.
