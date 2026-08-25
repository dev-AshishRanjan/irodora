# Plan: F-093 — A cached task result is replayed for a world that changed

| | |
|---|---|
| **Feature** | F-093 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | root · `@irodora/design-tokens` · `@irodora/store` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-25 |

---

## Intent

`pnpm test` printed **31 successful, 31 total — 26 cached** while the same command with
`--force` was **red in four tests**. A gate that reports a pass it did not earn is the most
expensive thing in this repository, and this one had been doing it since F-018.

**Done, to a reader of the gates:** a green `pnpm test` means the tests ran against the files
that are on disk now, on the toolchain the repository pins — or it says loudly that it did not.

## Approach

### Three holes, and they are different problems

**H1 — a test that reads outside its package.** Turbo keys a task on the inputs of the package
it runs in. Two sets of tests read further:

| Test | Reads | Consequence |
|---|---|---|
| `packages/design-tokens/test/*` — **eight files** | `docs/design/design-system.manifest.json` | Editing the manifest does not re-run the tests that check it. This is E-007's own source, and its named guard `gate:contrast` covers only half of what depends on it |
| `packages/store/test/key.test.ts` | `content/versions/**`, `apps/mobile/src/**` | The one that actually fired: F-018 generated a bundle carrying 126 SHA-256 digests, the FR-56 check went red, and a cached pass was replayed through two features |

The two get **different fixes**, because they are different in kind. The manifest is a small
central artefact that legitimately belongs to the whole repository — `globalDependencies`, beside
`tsconfig.base.json`. `apps/mobile/src/**` is not: putting it there would invalidate all 31 tasks
on any app edit, and a cache people distrust is a cache people turn off.

So the key check **moves out of the package** into
[`verify-no-key-material.mjs`](../../scripts/verify-no-key-material.mjs), which already asks
`git ls-files` the neighbouring question and runs uncached in gate 14 — `requiredFor: always`,
which is stronger than `test`'s `requiredFor: code`. **A repository-wide check does not belong
inside one package's test suite**, and that is the general form worth keeping.

**H2 — the toolchain is not in the cache key.** `turbo.json` lists `.nvmrc` in
`globalDependencies`; `turbo run test --dry=json` confirms it hashes the **git blob of that
file** and, separately, the `engines` **range** from `package.json`. Neither is the runtime
actually executing. This workstation runs Node 22.16.0 against a repo pinning 24.19.0, so caches
produced under 24 are replayed under 22 — and the tests that differ are exactly the bitwise ones
(`identity`, `apca`, `wcag`; WCAG by 2 ULP).

`globalDependencies` cannot carry the answer: the dry run shows it hashes **tracked** files, so a
generated, git-ignored toolchain file would not be seen. `globalEnv` hashes **values**, so the
fix is an env var whose value is the resolved toolchain — set by a wrapper, because a `&&`-chained
preflight cannot mutate its sibling's environment and `FOO=x cmd` is not portable to Windows.

**H3 — a check that finds neither of the above next time.** H1 and H2 are two instances; the
durable deliverable is the check. `verify-cache-scope.mjs` scans every package's tests for a
path that escapes its own directory and fails unless the target is in `globalDependencies` or in
a short, reasoned allowlist.

### The wrapper, and the decision it embodies

`scripts/gate.mjs <task>` replaces every `turbo run <task>` in the root scripts. It:

1. compares `process.version` and the running pnpm against `.nvmrc` and `engines`;
2. **warns loudly** on a mismatch — it does not refuse;
3. sets `IRODORA_TOOLCHAIN` to the resolved versions and spawns `turbo run <task>`.

`IRODORA_TOOLCHAIN` goes in `globalEnv`, so a mismatched run can neither reuse nor produce a
cache entry a correct run would consume.

**Warn rather than refuse is a deliberate softening of what `engines` already does for
`pnpm install`**, and it gets an ADR because it will be re-litigated. The short version: a
false red is safe and a false green is not, so keying is the part that must be airtight; refusing
outright would leave this workstation — which cannot run `pnpm install` at all — unable to run
any gate, and the fix for that is a Node upgrade, not a policy.

Root script names do not change, so `gates.json` and the CI mirror are untouched.

**Reused:** `verify-no-key-material.mjs` (the key scan moves into it) · `annotate.mjs` for CI
annotations · the existing `--prove` idiom for a script that must be watched failing.

**New:** `scripts/gate.mjs` · `scripts/verify-cache-scope.mjs` · one ADR.

### Increments

1. **Demonstrate the failure**, both halves, and record the transcript in the progress entry.
2. `globalDependencies` gains the manifest; re-demonstrate H1 as fixed.
3. Move the 64-hex scan from `packages/store/test/key.test.ts` into `verify-no-key-material.mjs`,
   with its decoy, and delete the cross-package read.
4. `scripts/gate.mjs` + `globalEnv`; re-demonstrate H2 as fixed.
5. `scripts/verify-cache-scope.mjs` + `--prove`, wired into `lint`.
6. ADR, effects, memory, progress.

## Files to touch

```
turbo.json                              — globalDependencies += the manifest; globalEnv += IRODORA_TOOLCHAIN
package.json                            — root scripts route turbo through scripts/gate.mjs
scripts/gate.mjs                        — NEW: toolchain preflight + turbo wrapper
scripts/verify-cache-scope.mjs          — NEW: a test may not read past its package unaccounted
scripts/verify-no-key-material.mjs      — gains the 64-hex literal scan and its decoy
packages/store/test/key.test.ts         — loses the scan; keeps the key lifecycle
.github/workflows/ci.yml                — the new lint step, if the mirror requires it
docs/adr/0068-…                         — NEW; plus the docs/adr/README.md index row
.harness/state/effects.json + memory/   — the new link
```

## Anticipated effects

| Change | Propagates to | Guard |
|---|---|---|
| **`turbo.json` `globalDependencies` / `globalEnv`** | every cached task in the repository | `script:verify-cache-scope.mjs` — **new** |
| **Root `package.json` scripts** | `gates.json` commands · the CI mirror | `script:verify-gate-mirror.mjs` — existing. Script *names* are unchanged, so the mirror should stay green; if it does not, the mirror is right and the plan is wrong |
| **The 64-hex scan moves gates** | gate 5 → gate 14 | `script:verify-no-key-material.mjs`, watched failing on a planted literal |
| **`docs/design/design-system.manifest.json` gains a second declared dependent** | E-007 | `gate:contrast` + now `gate:test` — the link's `to` grows |

## Test plan

- **Demonstration, before the fix** — this is acceptance criterion 3 and it is the whole point:
  edit the manifest, run `turbo run test --filter=@irodora/design-tokens`, observe **cache hit,
  no execution**. Then the same after the fix, observing a miss. Same shape for the toolchain,
  by comparing `--dry=json` global hashes with `IRODORA_TOOLCHAIN` differing.
- **Negative, with decoys:** `verify-cache-scope.mjs --prove` plants a test file that reads
  `../../docs` for a path *not* in `globalDependencies` and asserts the script goes red, with
  the baseline asserted green either side — a checker nobody has watched reject anything may
  only be capable of accepting.
- **The moved scan keeps its decoy**: a real ledger digest passes, a key-shaped literal that is
  not in the ledger is reported.
- **Unit:** none worth writing. Every deliverable here is a script whose behaviour is its exit
  code, and the honest test of an exit code is running it against a planted failure.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-cache-scope.mjs --prove
node scripts/verify-no-key-material.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
pnpm test            # expected RED on this workstation — see below
```

**`pnpm test` is expected to stay red here, and that is the feature working.** Node 22.16.0
cannot reproduce the committed identity fixtures, and
[F-083](../../docs/adr/) already says in as many words: *do not regenerate the fixture to go
green*. What this feature changes is that the red is now **visible** rather than cached over.
The evidence to capture is therefore a `--force` run of the packages this feature touches, plus
the demonstration transcripts.

## Risks and open questions

- **The wrapper adds a process to every gate.** Node startup, once per gate. Measured rather
  than assumed before it ships.
- **`globalEnv` invalidates every cache once**, on the first run after this lands. Expected and
  one-off.
- **`verify-cache-scope.mjs` can only see what it can parse.** A path assembled at runtime, or
  read through a helper, is invisible to it — the same honest limit `verify-motion.mjs` prints.
  It must say so on every run rather than implying coverage it does not have.
- **Warning rather than refusing leaves people working on an unsupported toolchain.** Recorded
  as the ADR's bad consequence, not hidden.
- No `OQ-*` blocks this feature.

## Out of scope

Upgrading the workstation's Node or pnpm — not something a repository change can do · the
bitwise divergence itself, which is **F-083** and explicitly must not be papered over ·
wiring `generate-design-tokens.mjs --check` into a gate, which is a *generator freshness* hole
rather than a cache hole and is filed separately · remote caching.
