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

**Introduced by `508ea1d`** (F-231's review, B2). That commit added the set, so that the adaptive-icon
XML is skipped. The SDK-free routing case added in the same commit passes an **array**, which can be
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
  with `brand: true`, and it must report the SHORTENED note and route seven rasters. The proof's
  case covers this, and the note is read by hand once.

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

1. **R1: CI's build-tools are newer than this workstation's** (37 against 33.0.1). In CI, the branded
   case passed with its colours read from the resource table, so CI's aapt2 prints the form that
   `parseResourceDump` reads. The fixed routing is the same code either way.
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
