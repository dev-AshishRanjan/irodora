# Plan: F-085 — The build lane produces the artefact it claims to

| | |
|---|---|
| **Feature** | F-085 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-12, NFR-14, NFR-17 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` · `.github/workflows/` · `scripts/` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-24 |

---

## Intent

The APK the build lane produced **does not run.** Installing it gives:

> Unable to load script. Make sure you're running Metro or that your bundle
> `index.android.bundle` is packaged correctly for release.

That is correct behaviour for the artefact F-080 asked Gradle for, and the wrong artefact to
have asked for. **A `debug` build deliberately omits the JS bundle** — React Native's Gradle
plugin skips bundling for every variant in `debuggableVariants`, which defaults to `["debug"]`
— because a debug build expects Metro to serve JS over the network.

So the lane built something that can only run with a laptop on the same Wi-Fi. That is not a
minor inconvenience: **it is useless for the purpose the lane was created for.** Its stated
job was discharging device attestations, and the two loudest are *"every core journey
completes with the device in airplane mode"* and *"the app opens no socket"*. An artefact that
requires a socket to start cannot test either.

Done looks like: dispatch the workflow, download, install, and the app opens — offline, on a
phone that has never seen this repository.

## Approach

**The internal artefact becomes a release build.** Not a debug build with the bundle bolted
on: the same build type production ships, so what is tested is what ships. The only
differences from a published release are where it goes and what version it carries.

That also disposes of two traps. The `src/debug/` and `src/debugOptimized/` manifests add
`SYSTEM_ALERT_WINDOW` and `usesCleartextTraffic="true"` — dev-client overlays that must never
reach a user. They are absent from a release variant by construction.

**Reused.** `release.yml` already builds exactly this. The internal lane converges on it
rather than inventing a third shape, and both call the same `setup-android-build` action, the
same config plugin, and the same gate 16.

**New.** `verify-apk.mjs` gains `--expect-permissions`: the artefact's permission set must
**equal** a declared list, not merely exclude `INTERNET`. This is the check that would have
caught a debug overlay leaking into a release, and it catches any dependency adding any
permission, not only a network one. Exact-set equality, so an unexpected permission and a
missing expected one are both failures.

**Increments.**

1. `--expect-permissions` with exact-set semantics, plus `--prove` cases for an extra
   permission, a missing one, and an exact match that must stay green.
2. `android-build.yml` becomes the internal lane: `assembleRelease`, release signing from the
   `release` environment, `versionCode` from `github.run_number` so successive internal builds
   upgrade over each other and a real release always upgrades over all of them.
3. `release.yml` adopts `--expect-permissions` too.
4. Docs: the two lanes described as what they now are.

## Files to touch

```
scripts/verify-apk.mjs              — --expect-permissions, exact set, with proof cases
.github/workflows/android-build.yml — internal: release build, release-signed, artefact only
.github/workflows/release.yml       — + --expect-permissions
docs/operations/release-process.md  — the lanes as they now are
.harness/verification/gates.json    — gate 16 also pins the permission set
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| The internal lane needs signing secrets | anyone dispatching it | it fails fast, naming what is missing, rather than 20 minutes in |
| Gate 16 pins the whole permission set | every future dependency that declares one | the gate itself; `--prove` covers both directions |
| Internal `versionCode` = run number | install order on a test device | documented; a release is ≥ 1 000 000 and always wins |

No new effect-graph link: E-018 already covers `app.config.ts` → the artefact's permission set,
and this strengthens its guard rather than adding an edge.

## Test plan

- **`verify-apk.mjs --prove`**, fixtures built by the real `aapt2`:
  - an APK declaring a permission not in the expected set → **red**;
  - an APK missing a permission the set requires → **red**;
  - an exact match → **green**, before and after;
  - the existing network-permission case still red, because `INTERNET` deserves its own
    message rather than being folded into "unexpected permission".
- **Not testable here, and stated plainly:** that the produced APK launches. No JDK and no
  Android SDK 36 on this workstation, so the lane cannot be run locally. **The evidence is a
  person installing it** — which is exactly the attestation this feature exists to make
  possible, and it stays outstanding until they do.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-apk.mjs --prove
node scripts/verify-gate-mirror.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```

## Risks and open questions

- **The internal lane now needs the `release` environment.** If that environment has required
  reviewers, every internal build waits for one. That is the safer default — the signing key
  is used by both lanes — and the alternative (repository-level secrets) removes the
  protection the environment exists to give.
- **R8 minification stays OFF.** `android.enableMinifyInReleaseBuilds` defaults to false and
  this change does not touch it. Enabling R8 is standard for production and materially reduces
  size, and it can break reflection-based native modules in ways only a device shows. Turning
  it on in the same change as "make the APK run at all" would confound the next failure.
  Filed as **F-086**.
- **A release cannot be cut while F-083 is open**, because `release.yml` calls `ci.yml` and
  gate 4 is red. The internal lane does not call `ci.yml` and is unaffected.

## Out of scope

- R8 and resource shrinking (F-086).
- Play Store upload. There is no listing and no service account.
- iOS (F-081).
- Fixing F-083.
