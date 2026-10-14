# Plan: F-340 — Gate 16 finds no icon in a release APK: the entry names are read twice from a one-shot iterator

| | |
|---|---|
| **Feature** | F-340 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `scripts/verify-apk.mjs`. No product code, no dependency, no workflow change. |
| **Author** | The implementing session (a contained harness fix; no planner subagent) |
| **Date** | 2026-10-14 |

---

## Intent

The Android lane (`android-build.yml`) is red at its *Artifact proof* step. The person reported it on
2026-10-14:

> the same, its resource paths SHORTENED (must stay GREEN) — expected GREEN, got: no launcher icon or
> splash logo in the artefact

The defect is in gate 16, not only in its proof. On every release APK, the gate finds no launcher icon
and no splash logo, because AGP's `optimizeReleaseResources` shortens every resource path. So when
the proof passes, the very next step, *Gate 16 — artifact*, would fail on the real APK for the same
reason. `release.yml` runs the same two steps, so a tagged release would fail in the same way.

After this feature, gate 16 resolves a shortened artefact's brand resources through the resource table
again. Its proof watches the same call shape that gate 16 makes.

## Root cause

`checkApk` calls `brandResources(entries.keys(), dump)`, where `entries` is the ZIP's central
directory as a `Map`. `entries.keys()` is a **one-shot iterator**. `brandResources` reads it twice:

1. `[...entryNames]` for the name scan. That reads the iterator to the end.
2. `new Set(entryNames)` for the shortened-table route. This gets a drained iterator, so the set is
   empty.

`names.has(path)` is then false for every file that the resource table names, so `resources` is
empty. A debug-named APK passes, because the name scan is the first read and finds the files.

**Introduced by `508ea1d`** (F-231's review, B2). That commit moved the routing out of `checkApk` and
replaced its `entries.has(path)` with the set: the check that a file the table names is in the APK.
*(Corrected after the review, M1: this said the set skips the adaptive-icon XML. The type test
beside it does that.)* The SDK-free routing case added in the same commit passes an **array**, which can be
read twice. So the proof meant to cover the fix could not see the bug.

**Reproduced on this workstation.** The SDK is at `%LOCALAPPDATA%\Android\Sdk`, with build-tools
33.0.1 and android-32. `ANDROID_HOME` names its parent, which is why earlier sessions recorded the SDK
half as "not run here".

- `node scripts/verify-apk.mjs --prove` fails the shortened case with the person's message. Every
  other case passes.
- `parseResourceDump` and `brandResources` route all seven rasters of that APK when they are given
  an array of its entry names.
- `checkApk` reports none of them.

## Approach

**1. `brandResources` reads its input once.** The first line materialises `entryNames` into an array.
Both the name scan and the set use that array. A comment says why: the parameter is any iterable,
and `checkApk` passes a one-shot iterator.

**2. The SDK-free routing case passes the names the way `checkApk` does.** It builds a `Map` from the
names and passes `.keys()`. This is the part that runs on every machine, so the defect is caught
without the SDK. It is watched failing on the current `brandResources` first.

**3. The SDK half needs no change.** Its shortened case is already the right test, and it was red. It
goes green with item 1, and it is run here against build-tools 33.0.1.

**Reused:** `brandResources`, `parseResourceDump`, the proof's case table, and the aapt2-built
fixtures. Nothing new.

**Increments:**

0. Claim and plan.
1. Items 1 and 2. The routing case is watched failing before item 1 lands, and the full proof is
   watched failing before and passing after, against the local SDK.
2. Close-out: effects, a lesson, records.

## Mockup fidelity

Not applicable. No surface changes.

## Files to touch

```
scripts/verify-apk.mjs   — brandResources reads its input once; the routing case passes entries.keys()-shaped input
.harness/state/effects.json, .harness/memory/effects/one-table-routes-every-brand-resource-to-its-verdict.md (E-184), a lesson, feature_list.json, progress.md
```

## Anticipated effects

| id | from → to | guard |
|---|---|---|
| **E-184** (existing, high) | `brand-verdicts.mjs` → `verify-native-assets.mjs`, `verify-apk.mjs`, gate 16 | Its guard sentence on the SDK-free routing case gains "passed as `checkApk` passes them, a one-shot iterator". Its note records the defect and that the SDK half does run on this workstation when `ANDROID_HOME` points at the Sdk directory. |

`verify-native-assets.mjs` does not call `brandResources` (checked by grep), so it is unaffected.

## Test plan

- **Watched failing first, SDK-free:** with only item 2 applied, `node scripts/verify-apk.mjs
  --prove` and `ANDROID_HOME` unset must fail at "a shortened table routes the rasters". After item
  1, that line passes.
- **Watched failing first, with the SDK:** with `ANDROID_HOME` set to the Sdk directory, the proof on
  the tree as it is fails only the shortened case. After the fix, every case passes.
- **Decoy:** the routing case's existing decoy, routing by name alone, still takes six files. A
  drained iterator must not let the routed count pass by accident: the case asserts exactly four.
- **Gate 16 itself, on a release-shaped artefact.** `checkApk` runs on the proof's shortened fixture
  with `brand: true`, and it must report the SHORTENED note and route seven rasters. Read by hand
  once. *(After the review, M2: the proof's case now asserts the SHORTENED note too, and the named
  case asserts its absence, so each case proves the route it names.)*

## Verification

```
# Tier 1 per increment (ADR-0132): format:check, typecheck, the root lint, state
# plus the domain gate: node scripts/verify-apk.mjs --prove, with and without ANDROID_HOME pointing at the SDK
# Tier 2 once: state, typecheck, lint, format, build, security, node scripts/verify-ci.mjs --all
```

## Attestations

**Criterion 3, gate 16 on the lane's real release APK.** A Gradle release build needs a JDK, which this
workstation does not have, and the run needs a push, which is the person's call. The attested entry
names the run and the two steps that must conclude success.

## Risks and open questions

**No `OQ-*` blocks this feature.**

1. **R1: CI's build-tools are newer than this workstation's** (37 against 33.0.1). The fixed routing is the
   same code either way. *(Corrected after the review, M4: this argued that the branded case passing
   in CI showed CI's aapt2 was found. It does not, because with no table the branded case passes
   anyway, with the colours skipped and a note. What the record has is the reproduction: the iterator
   defect alone produces the person's message exactly. That CI's aapt2 was found is inferred, because
   job logs need authentication. The proof now prints each failure's detail, so the next CI log
   tells the two causes apart, and criterion 3 settles it.)*
2. **R2: a real release APK has five densities and AGP's own shortening.** F-231 resolved them through
   the table in the same way. Only the read-twice defect stood between that work and a green gate, and
   criterion 3's attestation is what settles it.

## Out of scope

- Repointing this workstation's `ANDROID_HOME`. That is the person's environment, so it is recorded
  rather than changed.
- Anything else in gate 16.
- **Recorded as a backlog feature instead:** `verify:apk:prove` runs only in `android-build.yml` (by
  hand) and in `release.yml` (at a tag), never on a pull request. That is why a defect landed on
  2026-10-08 surfaced only when the person next built. GitHub's Ubuntu runners carry the Android SDK,
  so the proof could run in `ci.yml`. Adding it is a change to CI's shape, which is beyond this
  feature's acceptance.

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | `c4a6386` | Claimed at the person's report; this plan. **Tier 1:** format:check 0, verify-state 0. |
| 1 | `3c94578` | **`brandResources` reads its input once; the routing case passes a `Map`'s `keys()`.** Watched failing first. Without the SDK, with only the case changed: "0 routed", exit 1. With the SDK (build-tools 33.0.1), the tree as it was failed only the SHORTENED case, with the person's message. After the fix: 4 routed without the SDK. With the SDK: exit 0, and all 26 cases discriminate. By hand, `checkApk` on a release-shaped APK prints the SHORTENED note, with 7 rasters resolved and none refused. **Tier 1:** format:check, typecheck, verify-state and lint each 0. `turbo test --filter='...[HEAD]'` was 0, with no package task. |
| 2 | `2147e31` | E-184's guard and note. The lesson *a proof must call the function the way the gate does*. F-341 filed (backlog): no pull request runs the proof. **Tier 1:** format:check, verify-state and claims each 0. |
| review | this commit | **The one review (evaluator): PASS as delivered**, with 1 significant and 7 minor findings. **Its Tier 2 on `2147e31`:** state, typecheck, lint, format:check, build, and `verify:apk:prove` with the SDK each exited 0. `pnpm security` exited 1 on F-322's nine advisories. `verify-ci --all` had 36 passed, 2 failed (the iOS half on win32, and gate 15, which is F-322) and 1 not run (the gitleaks install). No journal was left. **Its own checks:** each criterion was reproduced from `git archive` trees of `c4a6386` and HEAD. On HEAD, every one-shot iterator routes 4, and on the old code 0. **R2 was modelled two ways.** A five-density Expo-layer APK, shortened with and without sparse encoding, has 0 failures on HEAD (35 rasters), and the old code fails. **The repository's real Expo prebuild `res/`**, compiled, linked and shortened, has 0 failures on HEAD, and the old code fails. Each finding was fixed: |
| | | **S1, fixed.** E-184's guard said the proof "runs everywhere", and its note said "run on every machine". It runs only where a lane runs it, and no pull request runs it until F-341. Both now say so. |
| | | **M1, fixed.** Four records said the set skips the adaptive-icon XML. It is the membership check that replaced `entries.has(path)`, and the type test beside it skips the XML. The plan, F-340's notes, E-184's note and the lesson are all corrected. |
| | | **M2, fixed.** The SHORTENED case asserted only zero failures. It now requires the SHORTENED note, and the named case requires its absence. Watched catching: with the two APKs swapped, both cases fail with their own reason. |
| | | **M3, fixed.** The SDK-free fixtures printed `type=PNG` on `.webp` files, which aapt2 does not. They now print no type, as aapt2 does, and the reader's sample asserts `type === null`. Watched catching: a router that rejects an untyped file routes 2, and the case goes red. |
| | | **M4, fixed.** R1 is reworded: CI finding aapt2 is an inference, not evidence. A green case's failures now print their detail, which tells an empty route from a missing aapt2. Watched printing it. |
| | | **M5, fixed.** The ANDROID_HOME discovery recurs *saying "not run here" is necessary, and it is not sufficient*. That lesson gains an F-340 addendum, and the two lessons link both ways. |
| | | **M6, fixed.** That lesson's index line moves to Environment and carries the SDK path, so initialization finds it. |
| | | **M7, fixed.** The shortened table now names `res/Ah.webp`, which the APK does not hold. Watched catching: with `names.has(path)` removed, 5 are routed and the case goes red. |
