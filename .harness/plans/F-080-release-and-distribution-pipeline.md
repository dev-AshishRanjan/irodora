# Plan: F-080 — Release and distribution pipeline: signed Android artefacts from a tag

| | |
|---|---|
| **Feature** | F-080 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-12, NFR-14, NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` · `.github/workflows/` · `scripts/` · `apps/mobile` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-21 |

---

## Intent

A person can install Irodora on a real Android phone from an artefact this repository
produced, and can tell — from the artefact itself, not from a promise — that it was built
from a named commit, signed with our release key, and cannot open a socket.

Two lanes, because they answer different questions:

- **`android-build.yml`** — on demand, debug-signed, uploaded as a workflow artefact. This
  is the lane that exists so the device attestations can finally be discharged. It is
  explicitly **not** for distribution.
- **`release.yml`** — on a `v*` tag, every gate first, then a release-signed APK and AAB
  published to a GitHub Release with checksums, an SBOM and build provenance.

## Approach

**Reused.** `.github/workflows/ci.yml` becomes `workflow_call`-able and the release workflow
*calls it*, so a release runs the same gate job a pull request runs — not a copy of it. A
second gate list is exactly the drift ADR-0024 exists to prevent. The gate ↔ CI mirror in
`scripts/verify-state.mjs` is generalised rather than duplicated. Signing is wired through an
Expo **config plugin**, which is the mechanism `apps/mobile/AGENTS.md` names — the generated
`android/` project is never hand-edited.

**New.**

- `apps/mobile/plugins/withReleaseSigning.ts` — a config plugin adding a `release`
  signingConfig that reads the keystore from the environment, and pointing the `release`
  build type at it instead of at the debug key. The string transform is exported and
  unit-tested, including the case where the Expo template changes and the anchor is gone —
  which must **throw**, because the silent version of that failure is a release-labelled
  build signed with a debug key that every machine in the world already has.
- `scripts/verify-apk.mjs` — reads a built `.apk` and asserts what the artefact claims:
  `INTERNET` is absent (NFR-12 as a property of the shipped file rather than of the config
  that produced it), the package id, the version code and name, and — for a release — that
  the signing certificate fingerprint matches the one the repository expects. `--prove`
  builds synthetic inputs and watches each assertion fail.
- `.github/workflows/release.yml`, `.github/workflows/android-build.yml`.
- `docs/operations/signing-and-credentials.md` — what a person must create and where it
  goes. **Every step in it is a step only a person can take**; nothing in it is automatable
  from here, and pretending otherwise is how a private key ends up in a repository.

**Increments.** Each leaves the build green.

1. Version and signing reach the native project: `app.config.ts` derives `version` and
   `android.versionCode` from the environment; the config plugin lands with its tests;
   `.env.example` documents the two variables. Verified by running `expo prebuild` and
   reading the generated `build.gradle`.
2. `scripts/verify-apk.mjs` with its `--prove` mode.
3. `ci.yml` becomes callable; `android-build.yml` lands.
4. `release.yml` lands; gate 0's mirror check is generalised to reach it; the mirror proof
   covers it.
5. Docs: `release-process.md` rewritten for the product that exists, the ADR, the state.

## Files to touch

```
.harness/state/feature_list.json           — F-080; F-039's EAS criterion re-attested to this lane
.harness/verification/gates.json           — gate 16 `artifact`, mirrored in release.yml
.github/workflows/ci.yml                   — + workflow_call; the steps themselves unchanged
.github/workflows/android-build.yml        — NEW: installable debug APK on demand
.github/workflows/release.yml              — NEW: tag -> gates -> signed APK+AAB -> Release
scripts/verify-state.mjs                   — the mirror reads a gate's declared workflow
scripts/verify-gate-mirror.mjs             — proves it, per gate, in whichever workflow
scripts/verify-apk.mjs                     — NEW: the artefact must prove its own claims
apps/mobile/app.config.ts                  — version and versionCode from the environment
apps/mobile/plugins/withReleaseSigning.ts  — NEW: the sanctioned way to reach build.gradle
apps/mobile/test/release-signing.test.ts   — NEW: the transform, and the anchor that must throw
apps/mobile/package.json                   — + @expo/config-plugins
.env.example                               — IRODORA_VERSION_NAME, IRODORA_VERSION_CODE
docs/adr/0058-release-builds-are-github-actions-and-gradle-not-eas.md — NEW
docs/operations/release-process.md         — rewritten; it currently describes a retired tier
docs/operations/signing-and-credentials.md — NEW: the human half
docs/REQUIREMENTS-COVERAGE.md              — F-080 against NFR-12 / NFR-14 / NFR-19
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| `app.config.ts` gains environment reads | every build; the generated manifest | gate 0's env contract; `verify-apk.mjs` asserts the version actually reached the artefact |
| The `release` build type stops using the debug key | every release artefact | `verify-apk.mjs` fingerprint assertion — the *artefact* is checked, not the config that produced it |
| `ci.yml` gains `workflow_call` | gate 0's mirror; the release workflow | `verify-gate-mirror.mjs`, which already removes each step and watches gate 0 fail |
| A gate may now live in a workflow other than `ci.yml` | the mirror check itself | the mirror proof is extended to mutate whichever workflow the gate declares |

**E-018 (new).** `apps/mobile/app.config.ts` → the built artefact's permission set. The
central privacy claim is a build-time fact; the guard is gate 16.

## Test plan

- **Unit:** the signing transform against the real Expo template text; a missing anchor
  throws; applying it twice is refused.
- **Negative, with a decoy:** `verify-apk.mjs --prove` builds a synthetic manifest that
  *does* declare `INTERNET` and asserts the checker goes red, plus one that does not and
  must stay green. A proof where everything is red cannot tell a working checker from one
  that fails on everything.
- **Mirror:** `verify-gate-mirror.mjs` must fail gate 0 when gate 16's step is removed from
  `release.yml`, and when it is conditioned out.
- **Not tested here, and said plainly:** that the workflows run. There is no remote. Every
  YAML file in this feature is unexecuted, and the first push is the first run.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-gate-mirror.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
node scripts/verify-apk.mjs --prove
pnpm --filter @irodora/mobile exec expo prebuild --platform android --clean --no-install
  # then read android/app/build.gradle and confirm the release signingConfig is there
```

## Risks and open questions

- **No remote exists.** The workflows can be reviewed, not executed. Recorded as an attested
  criterion rather than glossed.
- **No JDK, and Android SDK 31/32 against a required 36, on this workstation.** The local
  `assembleRelease` half of the lane is unverifiable here and stays attested.
- **Keystore custody is a human decision.** Generating a key, choosing where the backup
  lives, and setting the repository secrets are steps a person takes. If the key is lost, a
  Play Store listing cannot be updated by anyone, ever.
- **Actions are pinned to major tags, not commit SHAs** — consistent with the existing
  `ci.yml`. SHA pinning is the stronger position and is recorded in the ADR to revisit.

## Out of scope

- **iOS.** It needs a paid Apple Developer account, a macOS runner and certificates that
  cannot be created from here. Filed as F-081 rather than half-built.
- **Play Store / App Store upload.** Needs a listing and a service account that do not exist.
- **`expo-updates` / OTA.** ADR-0051 names it as the corpus-correction path and
  `app.config.ts` already records why it is deliberately absent until there is a corpus.
- **Making the current app worth distributing.** One screen ships today. That is F-018 and
  the R2 surfaces, not this.
