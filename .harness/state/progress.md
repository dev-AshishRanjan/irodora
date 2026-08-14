# Progress

Append-only history. Newest at the top. This is what a fresh session reads to find out what
happened, what was verified, and what to do next.

Every entry records **which gates ran and which did not**. The second half is the part a
reader cannot reconstruct.

---

## 2026-08-14 — F-005 IN PROGRESS · 2 of 8 increments · handoff

**F-005 is claimed and `in_progress`.** Two increments are done, committed and green. This
entry is the handoff — the plan
([`F-005-deployment-profiles.md`](../plans/F-005-deployment-profiles.md)) holds the rest.

### Done and committed

| Increment | Commit | What |
|---|---|---|
| 1 — `@irodora/config` | `ae56dd1` | The environment contract: 46 variables as a Zod schema, profile-aware strictness, 18 tests |
| 2 — `@irodora/ports` | `15ad3f5` | Cache and blob ports + conformance suites, 4 broken adapters proven caught |
| — | `1f0f917` | Gate 15 false positive, fixed both ways |

### Evidence at handoff

```
  ✓ state · typecheck · lint (10 guards) · format · test (165) · build
  ✓ security   gitleaks 11 commits, no leaks · audit: no known vulnerabilities

NOT run: color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf,
         e2e-full — none applicable.
NOT run: docker build, docker compose up — increments 5 and 6, not started.
```

### Two things worth carrying forward

**Gate 15 caught my own test fixtures, and I committed while it was red.** Two invented
32-character strings in `load.test.ts` were flagged as generic API keys — correctly; a
scanner cannot know a fixture is fake. Fixed in both directions: the fixtures now use the
placeholder vocabulary the config already allowlists, *and* a path-scoped exemption covers
the history that already has them. The exemption is one file, not `*.test.ts`, and its cost
is written beside it.

**The commit that shipped red did so because of a pipe.** The command was
`pnpm security:secrets 2>&1 | tail -1 && git commit`, and piping replaced the gate's exit
status with `tail`'s, so `&&` saw success. "Never commit red" was not overridden by a
judgement — it was lost to shell plumbing. **Read a gate's exit status directly; never
through a pipeline.** The same shape as
[[a-gate-that-errors-is-failing-open]], one layer further out: the gate worked, and the
harness around it discarded the answer.

**The conformance decoy that was not broken.** The first `AliasingBlob` subclassed the
in-memory store and delegated to `super.put`, which copies — so the "broken" adapter behaved
correctly and the proof failed. Written standalone now. A decoy has to be checked for being
a real decoy.

### Next, in order

3. **Minimal API: `/healthz`, `/readyz`.** `apps/api` is still an empty stub. `/healthz`
   answers about the process only; `/readyz` uses the ports. The negative test is the point:
   with the database stopped, `/healthz` must stay 200 and `/readyz` must not — asserted with
   the dependency actually down, not mocked.
4. **Migration runner under a Postgres advisory lock.** Zero migrations to run, which is the
   right order — the lock is infrastructure, the schema is F-034. Test with two processes
   started simultaneously against one database; a single-process test passes whether or not
   the lock works.
5. **Dockerfiles** — multi-stage, non-root, pinned **digests** not tags. Assert the running
   uid is not 0; a `USER` line is a claim, `docker run --rm <image> id -u` is the fact.
6. **`infra/compose/docker-compose.prod.yml`** — boots locally, no platform-specific keys.
7. **Terraform skeleton.** A commented backend block, not one pointing at a bucket nobody
   created.
8. Reconcile `docs/operations/deployment/*.md`, record, close.

### Known, and not solvable here

- **Acceptance 6 — deployed on a real VPS through Coolify AND Dokploy — cannot be met.**
  There is no VPS and no git remote for either platform to pull from. Both deploy *from* a
  repository. Delivered as runbooks plus a compose file built to be consumed unmodified;
  the deployment itself stays outstanding and F-005 cannot honestly close without it.
- **Acceptance 7's "remote state configured"** needs a real backend. The skeleton is
  deliverable; the backend is not.
- Docker **is** available (29.6.1), so increments 5 and 6 are genuinely verifiable here.

---

## 2026-08-14 — F-004 DONE · the gate that checks the gates could not fail

**Gate 15 (security) is active** — executed, and watched fire on planted secrets before being
switched on. **The gates ↔ CI mirror check had a hole in it**, found and closed.

### Evidence

```
  ✓ gate 0   state          13 checks, 1 known warning (E-009)
  ✓ gate 1   typecheck      31 tasks
  ✓ gate 2   lint           31 tasks + 10 boundary guards
  ✓ gate 3   format
  ✓ gate 4   test           136 tests
  ✓ gate 6   build          23 tasks
  ✓ gate 15  security       gitleaks 8.30.1 — 7 commits, ~1.23 MB, no leaks
                            pnpm audit --audit-level high — no known vulnerabilities
  ✓ mirror proof            all 7 active gates proven mirrored

NOT run: color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf,
         e2e-full — each activates with its own feature.
```

**Gate 15 activated 2026-08-14**, after the F-001 precedent: run it, watch it pass, watch it
fail, then activate. Never before.

### The defect: gate 0's mirror check was matching substrings

`verify-state.mjs` asserted every active gate has a step in `ci.yml` via
`ci.includes(gate.command)`. Gate `test`'s command is `pnpm test` — a substring of eight
lines in the workflow:

```
 4 test    command="pnpm test"
         line  73 | run: pnpm test          ← the real step
         line  77 | run: pnpm test:golden
         line  93 | run: pnpm test:e2e
         … and five more
```

**Deleting the real `pnpm test` step left gate 0 green.** Gate `e2e` had the same hole via
`pnpm test:e2e:full`. A gate could be removed from CI and nothing would notice — which is
the precise failure gate 0 exists to prevent, sitting inside gate 0.

Now matches whole `run:` commands (handling block scalars), so a gate named in a *comment*
no longer counts as mirrored either — which matters, because the workflow names every gate
in prose.

**Confirmed by reverting:** with the old substring match restored, the new proof reports
`✗ test — gate 0 stayed GREEN with the step removed`. With the fix, all seven pass.

### `scripts/verify-gate-mirror.mjs` — the acceptance criterion as an executable check

F-004 asked that "a deliberately removed step makes it fail". That is not a thing to assert
once; it is a thing to run. The script removes **each active gate's step in turn** and
asserts gate 0 fails *and names that gate* — so a gate 0 that fails for an unrelated reason
does not count as the check working.

It checks its own baseline first. If gate 0 is already red, it says so and stops rather than
reporting seven false positives — the failure mode this repository has already hit twice.
`ci.yml` is restored in a `finally` and the restore is verified byte-for-byte.

### CI runs the command you run

The secret scan used `gitleaks/gitleaks-action@v2`, so `gates.json` declared
`pnpm security:secrets` while CI ran something else — and the mirror check would have failed
the moment gate 15 activated. **That was the check being right.** CI now installs pinned
gitleaks 8.30.1 and invokes the same command a developer does.

**One job, in order, stopping at the first failure**, per the acceptance. The security job
was merged into the gates job to satisfy that literally. The cost is named rather than
hidden: a failing typecheck now means the secret scan does not run on that push. It still
runs on every pull request, so a secret is caught before merge.

### Proving the security gate can fail, without committing a secret

A planted secret cannot go into git history to test the scanner — a secret in history is
compromised even when fake. Scanned a scratch directory with `--no-git` instead: **3 of 4
planted shapes detected, exit 1.**

Worth recording: the AWS documentation example key `AKIAIOSFODNN7EXAMPLE` is **not**
detected, because gitleaks' default rules allowlist published example credentials. A scan
that stays green on that is correct. Anyone testing this gate with the first AWS key they
find in a tutorial will conclude it is broken.

### Also

- **Changesets configured** for the 14 publishable packages; the 5 apps and `@irodora/testing`
  are ignored — they deploy, they do not publish. The one non-default setting is
  `fixed: [["@irodora/color-*", "@irodora/cvd-engine"]]`: **the engine packages version
  together**, because every result carries an `engine` version in its reproducibility
  envelope (FR-10), and `engine 1.4.0` cannot identify the code that produced an answer if
  the modules drift apart. No publish automation — a pipeline that can publish before anyone
  has decided what publishing means is one that publishes by accident.
- **gitleaks 8.30.1 installed on this workstation** (`go install`), with the user's approval.
  It is not a repo dependency; CI installs its own pinned copy.

### Not delivered, and why

**Branch protection (acceptance 3) is specified, not applied.** `git remote -v` is empty —
there is no GitHub repository. The settings are written up in
[`docs/operations/branch-protection.md`](../../docs/operations/branch-protection.md) ready to
apply, including the reasoning for requiring **one** check (`Verification gates`) rather than
sixteen: listing gates individually means editing branch protection every time one activates,
and forgetting is silent.

Creating a remote is publication, not local bookkeeping, so it was not done unasked. **Until
protection is applied the gates can be observed and ignored** — recorded in
`memory/observations.md` rather than left implied.

### Watch out

- **`pnpm security:secrets` needs gitleaks on PATH.** Installed here at `~/go/bin`. On a
  machine without it the gate errors rather than passing — which is correct, but the message
  is `command not found` and reads like a broken script.
- **Gate 0 is the named guard for several effect links and has no link of its own.** Editing
  `verify-state.mjs` traces to no dependents. The mirror check is now proven; its other
  twelve checks are not. Recorded as a missing guard.
- The mirror proof **writes to `ci.yml`**. If interrupted, `git checkout .github/workflows/ci.yml`.

### Next

**F-005** — deployment profiles — is the last R0 feature. **F-003 is deliberately not next:**
[ADR-0037](../../docs/adr/0037-design-tokens-wait-for-the-engine-r0-closes-incomplete.md)
added F-007 and F-008 as its real blockers, because its contrast gate and `cvdPairs`
assertion need colour maths that only R1 owns, and the manifest is `approved` so that gate is
blocking from the moment it exists. **R0 therefore closes with F-003 outstanding**, which is
deliberate and recorded.

---

## 2026-08-14 — F-002 DONE · one definition, three uses — and the third one was lying

**`@irodora/contracts` exists.** Zod 4 schemas are the single source of runtime validation,
TypeScript types and JSON Schema. All six applicable gates green, plus ten boundary guards.

### Evidence

```
node v24.19.0 · pnpm 11.21.0 · zod 4.4.3 · vitest 4.1.10

  ✓ gate 0  state         13 checks, 1 known warning (E-009)
  ✓ gate 1  typecheck     31 tasks
  ✓ gate 2  lint          31 tasks + 10 boundary guards
  ✓ gate 3  format
  ✓ gate 4  test          31 tasks · 136 tests in 5 files
  ✓ gate 6  build         23 tasks

NOT run: color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf,
         e2e-full, security — all still `pending` in gates.json; each activates
         with its own feature (F-003, F-006, F-008, F-011, F-015, F-017, F-038,
         F-044, F-004). None applicable here.
```

No new gate activated. F-002 adds no gate; it adds content to gates 1–4 and 6.

### What the package contains

Cross-cutting wire primitives only — colour and provenance, the error contract, cursor
pagination, branded scalars, the JSON Schema bridge. **Endpoint schemas are deliberately not
here**; they arrive with the routes at F-015/F-016, and a contract package full of shapes
nothing serves is a contract package nobody trusts.

### The decision this feature turned on — [ADR-0036](../../docs/adr/0036-wire-schema-and-engine-type-pinned-by-the-compiler.md)

The colour engine has zero runtime dependencies (NFR-3), so **it cannot import Zod**, so it
declares `Provenance`, `MeasurementSource` and `ReproducibilityEnvelope` in plain TypeScript.
That is one shape defined twice — exactly what the TypeScript rules forbid, forced by a
golden constraint.

Resolved by keeping both and making the compiler prove they are the same shape.
`color.test.ts` asserts key-set equality plus mutual assignability; drift fails gate 1.

**This strengthens [E-002](../state/effects.json).** Its memory note previously ended *"it
does not catch a semantic weakening — making a field optional typechecks fine. That is a
review responsibility."* That is no longer true for these types, verified by breaking them:

```
Provenance.confidence made optional     typecheck FAILED   ← the exact weakening E-002 names
Provenance.originSpace removed          typecheck FAILED
MeasurementSource gains a member        typecheck FAILED
baseline                                typecheck passed
```

**One relaxation, taken deliberately and recorded as one:** `Provenance.capturedAt` and
`ReproducibilityEnvelope.profile` widened from `?: T` to `?: T | undefined`. Under
`exactOptionalPropertyTypes` those differ, and only the wider one is what a validator can
produce. Relaxing `Provenance` is precisely what E-002 exists to watch, so it is in the ADR
with its reasoning rather than sitting in a diff.

### Three checks that looked right and were not

Every one was found by **writing the violation and watching the check stay green** — not by
reading it. All three now fail on mutation, proven.

**1. Mutual assignability is not shape equality.** The type pin above originally asserted
assignability in both directions. Adding `device?: string` to `provenanceSchema` produced no
error at all: an object with an extra *optional* property is assignable both ways. Removing
one slips through identically. Adding a field is the most common drift there is, and the
guard would have shipped documented as catching it.
→ key set asserted separately. [[mutual-assignability-does-not-catch-an-optional-field]]

**2. The OpenAPI leg published the wrong side of the wire.** `z.toJSONSchema` defaults to
`io: 'output'`. `pageParamsSchema.limit` has a `.default()`, so the document marked `limit`
**required** while the validator accepts `{}`. Every generated client would have been told to
send a field the API does not need — wrong in the direction a client cannot work around.
→ `io` is now a required argument with no default.

This one is worth sitting with: the representability test was written specifically so
contract defects land when the schema is written rather than at F-015. It did not catch this,
because it only asserted *"does not throw"*. **A test aimed at the right risk can still be
aimed at the wrong property.**

**3. The self-enumerating schema scan could silently cover less.** It reads the barrel's own
exports so it "cannot fall behind" — and deleting one `export *` line dropped coverage from
18 schemas to 10 with every test green. The `length >= 10` floor did not notice.
→ the export list is pinned explicitly.

Also unpinned until review caught it: each error code's HTTP status. Changing
`validation_failed` from 422 to 400 passed typecheck, lint and the full suite. Now pinned.

### Independent verification found two of those three

The [evaluator subagent](../../.claude/agents/) ran the gates cold (`--force`, 92/92 tasks,
no cache), mutation-tested the type assertions 15 ways, and probed the new lint rule with
seven duplication forms. It returned **FAIL** with two blockers and four significant
findings. Defects 2 and 3 above are its findings, as is the discovery that the lint selector
covered two of roughly seven duplication forms — **missing string unions, which is the form
the two duplicated engine types actually take.**

The separation earned its keep on its first real use. A self-check would have reported six
green gates and stopped.

### Boundaries: 5 → 10

| New guard | Protects |
|---|---|
| contract layer may not hand-write a type | `interface X {}` |
| …may not hand-write a union | `type X = 'a' \| 'b'` — the form that mattered |
| …may not hide a type literal in a wrapper | `Readonly<{…}>`, `{…}[]`, `{…} & {…}` |
| …may not declare a TypeScript enum | `enum X {}` — neither interface nor alias |
| …may not import a Node API | `apps/web` and `apps/mobile` import this package |

The Node-API guard is a scope addition and is flagged as one: it was not in the acceptance
list. It exists because the alternative — giving the package `@types/node` for one test —
would have introduced the risk and deferred the guard, which is the failing-open shape.

### Watch out

- **`@types/node` is deliberately absent from `packages/contracts`.** If a future test needs
  to read a file, adding it is fine — the `node:*` lint rule already excludes tests and
  protects `src`. Do not add it to make a `src` file compile.
- **Cross-package type pins need a build.** `packages/contracts` typechecks against
  `color-core`'s built `.d.ts`. `pnpm typecheck` is sound (turbo declares `dependsOn:
  ["^build"]`); a bare `npx tsc -p packages/contracts/tsconfig.json` is **not**, and will
  pass on engine-side drift. Recorded in `memory/observations.md`.
- **Do not simplify the three assertions in `color.test.ts` into one.** `toEqualTypeOf`
  fails forever (readonly); the mutual pair passes forever (optional fields). One of those
  failure modes is silent.
- `CONTRACTS_VERSION` was **removed**, not implemented. Reasoning is in `version.ts`.
- The error-code enum is deliberately under-filled. Additive-only makes under-including the
  cheap direction; `quota_exceeded` (F-057) and `corpus_version_unknown` (F-016) are absent
  on purpose and have tripwire tests asserting so.

### Honest limits

- **Acceptance criterion 4 is enforced inside `packages/contracts` only.** A hand-written
  duplicate in a *consumer* package is not caught. There are no consumers yet; the rule
  lands with them at F-015. This is not full coverage of the criterion as written.
- **The E-004 chain is one link long.** Schema → validation → types → JSON Schema is live.
  OpenAPI, the SDK, and the regenerate-and-diff check do not exist and are F-015/F-057.
- `E-004.from.exists: true` is bookkeeping the state gate does not verify — it only checks
  path existence for `file|symbol|test|artifact|content` kinds. Recorded as a blind spot.

### Next

**F-003** — `@irodora/design-tokens` — and **F-004** and **F-005** are all now eligible
(each blocked only by F-001). Lowest id first: **F-003**. `/next-feature` → `/plan`.

---

## 2026-08-14 — F-001 DONE · the toolchain runs, and the boundaries are proven

**Node 24.19.0 installed. `pnpm install` ran. All six applicable gates executed and passed.**

### Evidence

```
node v24.19.0 · pnpm 11.21.0 · tsc 6.0.3

  ✓ gate 0  state        4s
  ✓ gate 1  typecheck    5s     31 tasks
  ✓ gate 2  lint        16s     31 tasks + 5 boundary guards
  ✓ gate 3  format       2s
  ✓ gate 4  test         1s     31 tasks
  ✓ gate 6  build        3s     23 tasks

NOT run: color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf,
         e2e-full, security — none applicable; each activates with its own feature.
```

**Gates 1–4 and 6 are now `active` in `gates.json`**, with `activatedAt: 2026-08-14`. They
were activated *after* being executed and seen to pass, not before — a gate that has never
run is theatre.

### All five boundaries enforced, proven not assumed

```
✓ colour engine may not import a Node API        no-restricted-imports
✓ colour engine may not touch a platform global  no-restricted-globals
✓ colour engine keeps deep-import protection     no-restricted-imports
✓ packages may not be deep-imported              no-restricted-imports
✓ a floating promise is an error                 @typescript-eslint/no-floating-promises
```

### Two real defects the guards caught

**1. A later flat-config object REPLACES a rule rather than merging it.** The colour-engine
override declared only the `node:*` patterns, silently making deep imports legal in exactly
the packages with the strictest written rules. Everything parsed, ESLint ran clean, nothing
failed. Guard #3 exists for this specific defect — and it found it *before the rule had ever
run in anger*. See
[[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]].

**2. The guard runner itself was failing open-shaped.** It shelled out to `npx eslint`, which
throws `EINVAL` on Windows under Node 20+. It correctly refused to pass — but reported all
five as *"NOT enforced"*, which would have sent the next person to fix the ESLint config
rather than the runner. Now uses the ESLint Node API and distinguishes **"could not run"**
from **"did not fire"**.

### Decision forced during install — [ADR-0035](../../docs/adr/0035-typescript-6-not-7-until-type-aware-linting-catches-up.md)

`typescript-eslint` peers on `typescript >=4.8.4 <6.1.0`. **It does not support TypeScript 7.**

The plan flagged this risk and said dropping from 7 would be an ADR, not a silent edit — so
it is one. **Pinned to `~6.0.3`.** Type-aware linting is load-bearing for NFR-24 and four of
the five guards; a compiler major is worth far less than the enforcement it would cost. The
alternative — keeping TS 7 and dropping the type-aware rules — is the exact anti-pattern this
harness exists to prevent.

`~` not `^`, because the peer ceiling is `<6.1.0` and a caret would eventually resolve past it
and break install at an unrelated moment.

### Also corrected

- **Invented dependency versions.** `eslint@^9.40.0` does not exist. Every version is now
  queried from the registry: ESLint 10.8.1, typescript-eslint 8.67.0, @types/node 24.13.3
  (matching the runtime, not `latest`), Prettier 3.9.6, Vitest 4.1.10.
- **`allowBuilds`**, not `onlyBuiltDependencies` — pnpm 11's field. `unrs-resolver` approved
  with its reasoning recorded: dev-only, transitive to the lint toolchain, never shipped.
- **Turbo `test` outputs emptied.** It warned on every run about missing coverage output;
  warning noise trains people to ignore warnings.

### Watch out

- **Node 24 is not on the default PATH.** `C:\Program Files\nodejs` is a real directory with a
  May-2025 `node.exe` (22.16.0), so nvm-windows cannot symlink over it. `node --version` in a
  fresh terminal still reports 22.16.0. Either remove the direct install and let nvm own the
  path, or run `nvm use 24.19.0` from an elevated shell. **CI is unaffected** — it reads
  `.nvmrc`.
- The TypeScript 7 upgrade is a standing task with no owner. Trigger: typescript-eslint
  shipping TS 7 support.

### Next

**F-002** — `@irodora/contracts` — is the next eligible feature. `/next-feature` → `/plan`.

---

## Superseded handoff — F-001 was blocked on Node

**Feature:** F-001 — Monorepo toolchain scaffold ·
[plan](../plans/F-001-monorepo-toolchain-scaffold.md)

### Blocked on

**`pnpm install` cannot run on this workstation.** Node is **22.16.0**; `package.json`
requires `>=24.19.0 <25`. nvm-windows holds only 16.13.2, 16.9.1 and 20.5.1.

```
Your Node version is incompatible with "E:\JCFIP".
Expected version: >=24.19.0 <25
Got: v22.16.0
```

**Unblock with:**

```
nvm install 24.19.0 && nvm use 24.19.0
```

**Not** by lowering `engines`. Node 22 is in maintenance, 24 is the active LTS the project is
pinned to, and weakening a constraint so a command succeeds is the anti-pattern this harness
exists to prevent. The refusal is the constraint working.

### Done

- **23 workspace members** scaffolded — 15 packages, 5 apps, 3 test packages. Each with
  `package.json`, `tsconfig.json` (lint project: src + tests, `noEmit`) and
  `tsconfig.build.json` (emit project: src only).
- **Package index files carry real intent**, not empty stubs — `Provenance` and
  `ReproducibilityEnvelope` shapes in `color-core`, the `RADIUS` scale with `swatch: 0` in
  `design-tokens`, `MeasurementSource`, `Classification`, `DeploymentProfile`. Each names the
  feature that implements it.
- **`scripts/verify-guards.mjs`** — writes a deliberately violating file at the exact path each
  ESLint rule targets, asserts the rule fires, deletes it. Five guards. Wired into
  `pnpm lint`.
- **Root dev dependencies** pinned.

### A real bug the guards found before they ever ran

Writing guard #3 surfaced a defect in `eslint.config.mjs`: **a later flat-config object
replaces `no-restricted-imports` rather than merging with it.** The colour-engine override
declared only the `node:*` patterns, which silently disabled deep-import protection in exactly
the packages that need it most.

Fixed, and guard #3 exists specifically to catch it recurring. This is the case for guard
fixtures in one paragraph: the rule looked correct, parsed correctly, and did not do what it
appeared to do.

### Gates

```
Ran:      state ✓  — 13 checks, 1 known warning
NOT run:  typecheck, lint, format, test, build — pnpm install is blocked on Node
          color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf, e2e-full, security
```

**Gates 1–4 and 6 were deliberately NOT activated in `gates.json`.** Activating a gate that
has never been executed would make it theatre — the exact failure the verification protocol
warns about. They activate when they have been run and seen to pass.

### Next action

1. `nvm install 24.19.0 && nvm use 24.19.0`
2. `pnpm install` — expect the lockfile to be created; commit it
3. `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`
4. `node scripts/verify-guards.mjs` — **all five guards must FAIL to lint**, i.e. report their
   rule. If any guard passes silently, that boundary is not enforced.
5. Only then: activate gates 1–4 and 6 in `gates.json`, and close F-001.

### Watch out

- **TypeScript 7** (`^7.0.2`) is the native port. Its behaviour under project references at this
  scale is unproven here. If it misbehaves, dropping to 5.9 is an **ADR**, not a silent edit.
- `verify-guards.mjs` shells out to `npx eslint`. On Windows it uses `npx.cmd`; if that path is
  wrong in CI, the script throws rather than passing — deliberately, since a guard that cannot
  run is a guard that is failing open.
- The scaffold is committed but **unverified**. Nothing is broken — gate 0 is green and there is
  no build to break — but do not treat these packages as working until step 3 has run.

---

## 2026-08-14 — Phase 2c: R1 surface designs complete

**Scope:** the remaining R1 surfaces designed on the approved system. No application code.

### Delivered

Home · Compare · Palette Studio · Finder · share card · Flow B (personal colour setup) ·
Flow C (CVD outfit check). Same token scope as the design system, so the two artifacts are
one system rather than two.

**Every R1 surface in [`DESIGN-BRIEF.md` §3](../../docs/design/DESIGN-BRIEF.md) is now
designed.**

### Decisions worth recording

**Compare suspends the separator rule, deliberately.** An `ADJACENT` mode butts the two
samples together with no well between them — the one place in the product where that rule is
lifted, and lifted *for the same reason it exists*. A colorist judges a difference by putting
two samples edge to edge; the boundary **is** the comparison. `SEPARATED` restores the wells
for judging each colour alone. Two modes, two questions, and the toggle names which one is
being asked. This is an exception to a hard constraint and is recorded as one.

**The Finder's interpretation panel became a feature.** Showing that "dark muted green"
resolved to `L 0.25–0.45 · C 0.02–0.06 · H 120–165°` from a versioned lexicon explains an
empty result, makes the search adjustable rather than a retry, and puts the determinism claim
on the most ordinary screen in the product.

**Flow C's grammar is the design.** Every sentence takes a colour pair as its subject, never
the user — "the rust and the olive separate by 38", not "you may struggle to distinguish
these". That single choice is the difference between an instrument and a diagnosis, and it
belongs in copy review, not just in design.

**The share card drops the well.** A card is a self-contained artefact landing on an unknown
background, so the card's own margin becomes the neutral ground. Edge-to-edge swatch.

### Gates

```
Ran:      state ✓  — 13 checks, 1 known warning
NOT run:  everything else. Still no application code.
```

### Next

1. **Settle Radix vs Base UI** — the last open foundation question before F-017.
2. Then **F-001**, the monorepo toolchain scaffold, via `/next-feature` → `/plan`.
3. Design work remaining is R2+ only, and follows its features rather than preceding them.

Nothing is `in_progress` in the feature list.

---

## 2026-08-14 — Phase 2b: design system approved · frontend foundation decided

**Scope:** the Stage 1 wireframes were rejected, the design was rebuilt, and the frontend
foundation question was researched and settled. No application code.

### The rejection, and what was wrong

Stage 1 wireframes came back as *"very bad — they lack design thinking and creativity."*
That was correct.

**The error:** C1 (*the interface must not decorate with colour*) was read as a reason to
remove things. The output was structurally sound and lifeless — a spec document with the word
*wireframe* on it. The constraint was treated as a limit to work within rather than as the
direction to work toward.

**What was actually true:** the references supplied — efferd, coss, and the fashion-retail
canon — all converge on neutral chrome, greyscale data, chroma held back. That is not a
compromise those designers accepted; it is what a product whose subject carries the colour
genuinely wants. Captured as
[[the-constraint-and-the-taste-usually-agree]], and it is why
[`visual-taste`](../skills/visual-taste/SKILL.md) now exists.

### Design system — approved

Rebuilt on the thesis **soft chrome, exact colour**: everything generous — 20px cards, 28px
containers, full pills, 44px targets, warm neutrals — except `radius.swatch: 0`, forever.
Surrounded by softness the hard edge reads as deliberate precision, and that tension is the
idea.

Framing: **a colour page is a product page, and here the colour is the product.** The swatch
takes the treatment a garment photograph gets; the specification sits quiet beneath it.

Taken and refused deliberately rather than blended: **deference** and 44px targets from Apple
HIG, **refusing** translucency near a swatch; **tonal elevation** and soft geometry from
Material 3, **refusing** dynamic colour outright — deriving a UI palette from a source colour
would tint the whole interface from the thing being examined.

`design-system.manifest.json` now carries **real values**, `status: "approved"`, and rules a
general-purpose system would have no reason to encode: `swatch.well` as a mandatory neutral
ground · `chromaCeiling` of 0.01 on surfaces and text · `foreground.3` marked
`largeTextOnly` because it fails AA at small sizes · greyscale `chart.1…5` · `cvdPairs`.
**The `contrast` gate is blocking from the moment it exists (F-003).**

### Frontend foundation — [ADR-0033](../../docs/adr/0033-frontend-foundation-own-the-token-layer-headless-primitives.md)

**Astryx evaluated and not adopted.** It is genuinely good — 150+ accessible components, an
MCP server, and Tailwind integration better engineered than expected (pre-compiled CSS,
explicit `@layer` ordering, a token bridge).

**It is web-only, and that is decisive.** Our manifest compiles to four targets including
React Native precisely so web and mobile cannot drift; adopting Astryx would split the design
system down the middle of the product, with the Lens on the far side. Its theme packages also
own the colour semantics that are this product's substance.

**Taken from it anyway:** its best idea is not its components — it is the MCP server letting
an agent browse the design system. Recorded as a backlog candidate for our own tokens.

Token names stay shadcn/Base-UI compatible so tweakcn, efferd and coss blocks remain usable
as reference. Interoperability, not adoption. **Radix vs Base UI to settle before F-017.**

### Skills adopted

Three published design skills **read and adapted**, not installed — per
[ADR-0029](../../docs/adr/0029-harness-agnostic-core-thin-adapter.md) we adapt and record
provenance. Rather than five overlapping skill files, each source went where it belonged:

| Source | Into | Adaptation |
|---|---|---|
| taste-skill (MIT, Leonxlnx) | **new** [`visual-taste`](../skills/visual-taste/SKILL.md) | Anti-generic discipline bound to *this* subject: the escape from generic here is restraint executed with craft, not added visual interest |
| Emil Kowalski, *Animations on the Web* | [`motion`](../skills/motion/SKILL.md) | Duration by interaction class, exits faster, ease-out default, compositor properties only. Overridden wherever it meets "motion may never alter a colour" |
| Impeccable · shadcn conventions | [`build-ui`](../skills/build-ui/SKILL.md) | Type-scale contrast, tracking by size, measure, proximity-before-size, tabular numerals |

Provenance recorded in [`NOTICE.md`](../../NOTICE.md). No third-party code is vendored.

### Gates

```
Ran:      state ✓  — 13 checks, 1 known warning
NOT run:  everything else. Still no application code.
```

### Next

1. Design the remaining R1 surfaces to the approved system — Palette Studio, Finder results,
   the share card, Compare, Home — plus Flows B and C.
2. Settle Radix vs Base UI.
3. Then F-001.

Nothing is `in_progress` in the feature list.

---

## 2026-08-14 — Phase 2a: Stage 1 wireframes, R1 web

**Scope:** the design tooling decision, and the first wireframe deliverable. No code.

### Done

**[ADR-0032](../../docs/adr/0032-design-in-claude-wireframes-before-visual-before-code.md)** —
design is produced in Claude rather than Figma, and the deliverable splits into three
separately-approved stages: **wireframes → visual design → code**.

The staging is the substantive part. A single combined design review collapses two different
questions, and feedback about type weight arrives before anyone has agreed what is on the
page. It matters more here than usual because half the hard constraints in the design brief
are about what colour does to perception (C1, C6, C7) — which cannot be judged from a
wireframe, while structural questions cannot be judged once the page is full of colour.

`DESIGN-BRIEF.md` §7 rewritten to match: it now specifies the three stages, what is approved
at each, and the greyscale rule with its one exception.

**Stage 1 wireframes delivered** — R1 web, published as an inspectable artifact:

- Colour detail (`/colors/[slug]`) — desktop and mobile, 11 annotations. Designed first
  because every other surface reuses its parts.
- Colour Atlas · Colour Lens (permission → live → result) · Compare · Home
- Flow A as an annotated six-step sequence with p50 budgets
- Eight component states, including the ones usually left blank: loading, no-results,
  camera-denied, offline, poor-confidence, focus-visible
- Six decisions surfaced explicitly for the reviewer, each with the alternative I did not take

**The greyscale rule and its exception.** Wireframes are greyscale except where a colour
*sample* appears — a sample is content, not decoration, and **C1 is only testable if you can
see a garment colour sitting inside the chrome.** The document's own chrome follows the
product's rule: one chromatic value in the entire page, a muted moss used only for annotation
markers, chosen because the samples shown are indigo-family and a reviewer's eye must never
conflate an annotation with a colour under examination.

### Gates

```
Ran:      state ✓  (node scripts/verify-state.mjs) — 13 checks, 1 known warning
NOT run:  everything else. Still no application code.
```

Verified after the ADR and brief edits: 33 ADRs, index consistent; 172 governed documents,
all links resolve.

### Recorded, not resolved

- The **perceptual Atlas arrangement** (annotation 2.3) is the largest open question. It may
  be the most distinctive thing on the site or an unnavigable novelty; it needs a stage-2
  prototype before we commit either way.
- **Colour values in the wireframes are placeholders.** Real corpus entries land with F-012,
  each with complete provenance and a named reviewer. Nothing in the deliverable is a
  verified colour claim, and the document says so.

### Next

1. **Review the wireframes.** Feedback references annotation numbers.
2. On approval: wireframe the remaining R1 surfaces — Palette Studio, Finder results, the
   shareable card — plus Flows B and C. Held until after this review so a structural
   correction lands before they are drawn rather than after.
3. Then stage 2 (visual design), then F-001.

Nothing is `in_progress` in the feature list. Design work precedes R0.

---

## 2026-08-13 — Phase 1: product definition and harness

**Scope:** convert the four brainstorm documents into a production-grade documentation set
and build the working system that will govern every subsequent change. No application code.

### Done

**Brand.** Irodora, from 彩り (*irodori*), "the arrangement of colours". Namespace verified
free before locking: `.com .io .app .co .net .org .design`, npm `@irodora`, GitHub
`irodora`. Kasane was the stronger concept and lost on the exact-match `.com`.

**Decisions settled with the user:** monorepo + modular monolith with named extraction
triggers · web first, mobile close behind · container-portable deployment with Coolify and
Dokploy as a first-class VPS target and AWS as the managed one.

**Documentation** — `docs/`:

- `PRD.md` — 68 FR and 24 NFR, each testable, each owned by a release; personas, six
  journeys, monetisation, metrics with targets, non-goals with reasons.
- `REQUIREMENTS-COVERAGE.md` — requirement → feature → gate, machine-checked.
- `roadmap.md`, `glossary.md`.
- `architecture/` — ARCHITECTURE, color-engine, data-model, api-contract, sync-protocol,
  security/threat-model, security/privacy-design.
- `adr/` — 31 records plus template and index.
- `design/` — BRAND, DESIGN-BRIEF (the input to the design phase), DESIGN-SYSTEM,
  ACCESSIBILITY, and the token manifest.
- `content/` — corpus spec and the licensing position.
- `compliance/data-governance.md`; `operations/` including per-platform deployment runbooks.

**Harness** — `.harness/`: AGENTS.md, 3 instruction docs, 13 rule files across 8 areas,
7 protocols, 8 governance documents, 23 skills, 8 commands, the plan template.

**Adapter** — `.claude/`: settings, 6 subagents (planner · generator · evaluator ·
color-scientist · designer · security-reviewer), and content-free shims for every command
and skill.

**Verification** — 16 gates defined in `gates.json` with activation triggers;
`scripts/verify-state.mjs` written and green; `.github/workflows/ci.yml` mirroring the
gates, with the mirror itself checked.

**State** — 66 features across R0–R5, R0–R2 fully specified with acceptance criteria;
10 seed effect links, each with its narrative note and named guard; memory seeded with
2 decisions, 9 lessons, 10 effect notes, 1 glossary entry, 1 product note.

### Deliberate departures from the brainstorm

1. **"Non-AI" became a four-tier capability policy** (ADR-0002). The blanket ban was
   unenforceable and would have outlawed the classical CV the Lens needs. The guarantee is
   now testable: disable tiers 1–3 and the product still answers.
2. **Measurement provenance is a type, not a disclaimer** (ADR-0005). A disclaimer is
   optional at every call site; a required field is not.
3. **Web is a first-class surface**, not a companion — the Atlas is the public proof of the
   engine.
4. **en/ja from day one** (ADR-0028). Retrofitting Japanese typography means redesigning.
5. **A real licensing position on colour data** (ADR-0007) — clean-room corpus, per-entry
   provenance, Wada as inspiration only.
6. **Ethical guardrails** (NFR-22, NFR-23) — no dermatological, ethnic or attractiveness
   inference, plus ITA-stratified bias validation as a release blocker.
7. **Monetisation defined** (ADR-0027), with accessibility permanently outside every paywall.
8. **Honest crypto language** — envelope encryption is described as what it is, and never as
   end-to-end.

### Gates

```
Ran:      state ✓  (node scripts/verify-state.mjs)
NOT run:  typecheck, lint, format, test, color-golden, build, e2e, a11y, contrast,
          cvd, content, perf, web-perf, e2e-full, security
Why:      no application code exists yet. Those gates activate with the features
          recorded in gates.json (`activatesWith`), starting at F-001.
```

Gate 0 is not a placeholder: it validates both state files against their committed schemas,
the effect graph and its memory pairing, path existence, guard coverage on critical links,
requirement traceability in both directions, the ADR index, the CI mirror, the env contract,
the golden-rule scan across scoped harnesses, and every relative link in every governed
document.

### Known and recorded

- `E-009` (rule weights) carries `guard: "none"` with `feature: F-029`. The graph is
  honestly reporting a check we owe rather than hiding it behind a lowered severity.
- Four open questions block the features that depend on them: OQ-1 (OIDC provider, R2),
  OQ-2 (billing, R4), OQ-3 (reference card, R4), OQ-4 and OQ-5 (corpus seed size and
  Japanese editorial reviewer, R1).
- Four gate blind spots recorded in `memory/observations.md`, including that
  `verify-state.mjs` implements a JSON Schema **subset** and reports its unsupported
  keywords rather than silently passing them.
- **The workstation runs Node 22.16.0.** `.nvmrc` pins 24.19.0. Gate 0 runs on 22; `pnpm
  install` will fail the engine check. Upgrade before F-001.

### Next

1. **UI design phase** — `docs/design/DESIGN-BRIEF.md` is the input. On approval, the token
   values land in `design-system.manifest.json` and its status moves from `placeholder` to
   `approved`, which makes the contrast gate blocking.
2. **Then F-001** (monorepo toolchain scaffold) via `/next-feature` → `/plan`.

Nothing is `in_progress`. The next session starts with `/next-feature`.
