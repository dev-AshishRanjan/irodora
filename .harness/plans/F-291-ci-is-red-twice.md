# Plan: F-291 — CI is red twice

| | |
|---|---|
| **Feature** | F-291 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19, NFR-17 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service** | `root` |
| **Author** | Claude Opus 5.5 · **Date** 2026-09-24 |

---

## The two failures

Reported by the user, and confirmed against the public jobs API. **They are two defects with
two causes**, in two workflows.

**CI** (run 35957177781 on `4cb522a`, and 35619327328 on `a22cc52` before it) stops at step 8,
`Gate 0 — state id-uniqueness proof`, with 33 steps skipped:

```
✗ FAILS CLOSED — the array is renamed, and the space is not silently skipped
    got: (nothing)
```

**Android build (internal)** (run 35961027407, `workflow_dispatch` on `4cb522a`) fails in the
shared setup action, at `android-actions/setup-android@v3`:

```
/usr/local/lib/android/sdk/cmdline-tools/16.0/bin/sdkmanager tools
Warning: Failed to find package 'tools'
```

The last green Android run was 34376646244 on `addd055`, 2026-09-09.

## 1 — the proof: gate 0 crashes, and a crash has no findings

Reproduced locally. Case 4 renames `features` to `featureList` and expects gate 0 to say the
id space `is not there … so its ids are unchecked`. Gate 0 instead dies:

```
file:///E:/JCFIP/scripts/verify-state.mjs:1746
    for (const f of JSON.parse(listText).features) {
TypeError: JSON.parse.features is not iterable
```

**Section 9b re-reads `feature_list.json` from disk and iterates `.features` unguarded.** Every
other section that needs a valid list reads `featureList`, the value `checkSchema` returns, which
is `null` when the schema fails, and every one of them is inside `if (featureList)`. 9b is the
only one that went round it. (4b also reads the raw file, deliberately and guarded. See the
amendment below.) An uncaught throw takes the report with it, so section 4b's finding, which is
already in `failures`, is never printed. Gate 0 still exits non-zero, but what it prints is a
stack trace about 9b, not the fault in the file. That is
[[a-gate-that-errors-is-failing-open]] one level up: the proof exists to catch it, and it did.

**Introduced by F-218** (`d59bc44`, 2026-09-14). Measured, not inferred: in throwaway worktrees
the proof is 7/7 at `d59bc44^` and 6/7 at `d59bc44`. CI did not see it until the next push, on
2026-09-21.

9b has a second, quieter defect of the same kind: it reads the path on disk and never the
`--features` override (F-137). So a proof that points gate 0 at a mutated list gets every section
checking the mutated list except this one, which checks the committed file.

**The fix is to delete the second read.** 9b reads `featureList` inside the same
`if (featureList)` guard the other sections use. A list that fails its schema is then reported
once, by the schema check, and 9b skips it like everything else does. The override reaches 9b
because it reaches `featureList`.

Rejected alternative: wrap 9b's parse in `try`/`Array.isArray`. That keeps two copies of the
list in the gate, and the second one still ignores `--features`. The defect is the second read,
not the missing guard.

## 2 — the Android lane: an action default named a package that no longer exists

`android-actions/setup-android@v3` declares `packages` with the default
**`tools platform-tools`** (read from its `action.yml` at `v3` = `9fc6c4e906`), and installs each
space-separated entry with `sdkmanager <pkg>`. We never set `packages`, so we took the default.

`tools` is the legacy *Android SDK Tools* package, replaced years ago by `cmdline-tools`.
**Google stopped serving it around 2026-09-15** (upstream issue
[android-actions/setup-android#537](https://github.com/android-actions/setup-android/issues/537)).
`sdkmanager tools` now exits 1, and the action treats that as fatal. The upstream fix,
[#538](https://github.com/android-actions/setup-android/pull/538), drops `tools` from the default,
but only in `v4.0.2` and later. The `v3` tag (`v3.2.2`) does not have it.

Nothing in this repository uses `tools`: every SDK path we read is
`build-tools/*/{apksigner,aapt2}` or `platforms/*/android.jar` (`android-build.yml`,
`release.yml`, `verify-apk.mjs`), and those components are installed explicitly by the next
step. `platform-tools` **is** kept, because the action installs it today and puts it on `PATH`.
Removing it would be a behaviour change this feature has no reason to make.

**The fix is to name the list:** `packages: platform-tools` on the `setup-android` step in
`.github/actions/setup-android-build/action.yml`. Both lanes use that action (`android-build.yml`
and `release.yml`), so one edit fixes both and they cannot drift apart. The cause was relying on an
upstream default, so the fix does not rely on the upstream fix either: the list is ours, and
upstream can change its default again without affecting us.

Rejected alternative: bump to `@v4`. It carries the upstream fix, but it is a major-version change
to an action for a one-input problem, and it would still leave the package list up to someone
else's default. A deliberate bump is a separate change. It belongs with the other `node20`-era
actions, which all get bumped together.

## Files to touch

```
scripts/verify-state.mjs                         — 9b reads featureList; the second parse goes
.github/actions/setup-android-build/action.yml   — packages: platform-tools, with the reason
.harness/state/feature_list.json                 — F-291
.harness/state/progress.md                       — the record
.harness/state/effects.json + memory/effects/    — if the trace finds a link (below)
```

## Anticipated effects

- **`verify-state.mjs` §9b now honours `--features`.** Its one caller,
  `verify-blocked-reason-proof.mjs`, passes a clean copy of the committed list (identical content,
  so 9b's verdict is unchanged) and three mutations of F-126's blocked fields, none of which touch
  `mockups`. Guard: that proof itself, which runs in gate 2's lint chain.
- **Gate 0's output for a schema-invalid list changes** from a stack trace to the schema finding
  plus 4b's. Guard: `verify-state-id-proof.mjs` case 4, and gate 0's own baseline.
- **The composite action feeds both Android lanes.** Guard: each lane runs gate 16 at the end, and a
  setup failure turns the lane red before it gets there. It cannot be observed from this
  workstation. See Risks.
- Existing links: check `effects.json` for anything whose `from` is `verify-state.mjs` or the
  setup action, and follow each one.

## Test plan

- **The proof is the regression test.** Case 4 was written to catch exactly this crash, and it
  did. It must report 7/7 with all four files byte-identical.
- **Watched failing first.** It is 6/7 at HEAD before the change. That is the red half, recorded
  above.
- **9b still discriminates.** Plant an R9 `mobile` feature with no `mockups` through the
  `--features` override: gate 0 must name it. That override path did not reach 9b before, so this
  also shows the second defect is closed. Ad hoc, in the scratchpad. The override is read-only,
  so nothing is written into the tree.
- **No other reader crashes on the same plant.** Run gate 0 against the renamed-array list and
  confirm it exits 1 with findings, no stack trace.
- **Every CI step in order**, on Node 24.19.0 / pnpm 11.21.0 as CI pins them. The failure skipped
  33 steps, and F-105 is the record of fixing the first red step only to find a second behind it.
- **The action input** is read back from the `v3` source (`src/main.ts`: `getInput('packages')`
  split on spaces, one `sdkmanager` call per entry), so `platform-tools` alone is exactly one call.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-state-id-proof.mjs
# then every ci.yml step in order, from step 4 to step 41
```

Gates on the feature: `state · lint · format`. The CI walk runs all of them regardless.

## Risks and open questions

- **The Android criterion cannot be proven here.** There is no JDK, so `sdkmanager` cannot run.
  Whether a package resolves depends on Google's repository and the runner image, and a
  `workflow_dispatch` needs a push, which is the user's call. It is attested (ADR-0038), blocking
  release, and verified by step 3 of the next dispatch.
- **9b still parses `mockups/index.json` with no `try`.** That is not a second read of state the
  gate already checked. It is 9b's own input, validated by `verify-mockups.mjs` in gate 2, so it
  is not this defect and is not changed here. A malformed index would still crash gate 0 with a
  stack trace, though never a green one.
- **Beyond the setup step the Android lane is unobserved since 2026-09-09.** Fifteen days of
  commits have not been through Gradle. A later step may fail for a reason unrelated to this
  one, and this feature does not claim otherwise.

## Out of scope

- Bumping `setup-android`, or any other action, off `node20`-era majors.
- A general "gate 0 never throws" wrapper. The defect was a second read of state, and removing it
  is the fix. A wrapper would hide the next one.
- Anything else the CI walk turns up is fixed here only if it is the same defect. Otherwise it
  is recorded as its own feature.

## Amended after review (2026-09-24)

The evaluator reviewed F-291 once. Its findings changed the scope as follows. Nothing here was
reviewed a second time. The gates were re-run on the final tree.

- **4b had the same silent half, and it is fixed here.** The id-uniqueness table resolved every
  space under `.harness/`, so a duplicate id in a list `--features` names passed. That is the
  same defect as 9b's, a section checking the committed file instead of the list gate 0 was
  pointed at, so it is in scope. 4b still reads the raw file on purpose, because it must report
  a space it cannot find after the schema has already failed. Its feature-list entry now carries
  `at: featuresPath`.
- **The override is now tested where it lives.** `verify-state-id-proof.mjs` gains case 6 (a
  duplicate through `--features`), and `verify-mockups.mjs --prove` gains an override case for
  9b. Both were watched failing against the pre-fix gate in a throwaway worktree.
  `verify-blocked-reason-proof.mjs` passed against the pre-fix gate, so it is not named as a
  guard.
- **Criterion 1 said "reads the feature list once", which was false.** It now says what is true,
  and names its checks. Criterion 2 names `verify-ci.mjs --all`.
- **Criterion 3 bundled a checkable half into an attestation.** The attestation is now only the
  runner outcome. The static half, a check that the setup names its packages, becomes **F-293**,
  together with `cmdline-tools-version`, which is still defaulted.
- **`mockups/index.json`'s unguarded parse, and a double message and over-count on a list that is
  not JSON,** are a different defect and pre-existing. They are recorded as **F-294**.
- **Behaviour change, recorded:** on a list that fails its schema but still parses (a bad
  `status`, say), the old 9b also reported its mockup findings. The new 9b is silent until the
  schema is fixed, like every other section that reads `featureList`. The verdict is the same:
  gate 0 fails either way.
- **Wording:** the action comment, E-144 and its note had claimed that both lanes died, that every
  runner failed, and that v3 "will not" get the fix. Only the internal lane ran, once, and v3.2.2
  *does not* have the fix. All three now say that.
- **The review's blocker was mine:** F-292's note quoted the phrase the claims lint refuses, so
  lint was red on the tree under review. The note was reworded.

