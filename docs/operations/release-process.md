# Release Process

| | |
|---|---|
| **Status** | Implemented in CI. The remote exists as of 2026-08-23 and `ci.yml` has run; `release.yml` has not |
| **Decisions** | [ADR-0024](../adr/0024-ci-cd-github-actions-trunk-based.md) · [ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) · [ADR-0058](../adr/0058-release-builds-are-github-actions-and-gradle-not-eas.md) · [ADR-0059](../adr/0059-a-blocking-advisory-with-no-fix-is-accepted-with-an-expiry.md) |
| **Feature** | F-080 |

> **This document was wrong for a whole release cycle.** Until F-080 it described a container
> pipeline — multi-arch images, a registry, a staging environment, a deploy to a real VPS,
> `/readyz`, a 5xx rollback trigger. [ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
> withdrew the server tier and nobody rewrote this. A runbook describing infrastructure that
> does not exist is worse than no runbook: it is read under pressure and believed.
>
> Irodora is an app on a phone. There is nothing to deploy, nothing to roll back, and no
> production to be down. A release is **an artefact somebody installs.**

---

## Branching

Trunk-based on `main`. Short-lived branches, small merges, `main` always releasable.
Conventional Commits. Changesets for versioning publishable packages.

Branch protection is specified in [`branch-protection.md`](branch-protection.md) and **not yet
applied**. The remote now exists, so nothing blocks it but the decision to apply it — it is
F-004's outstanding attested criterion.

---

## The gates

Run in order, stop at the first failure. Defined in
[`../../.harness/verification/gates.json`](../../.harness/verification/gates.json) and
mirrored by the workflow each gate declares — **the mirror is machine-checked by the `state`
gate**, and [`verify-gate-mirror.mjs`](../../scripts/verify-gate-mirror.mjs) proves that check
can fail, per gate, by deleting each step and watching gate 0 go red.

```
0  state         1  typecheck    2  lint        3  format
4  test          5  color-golden 6  build       7  e2e (pending)
8  a11y          9  contrast    10  cvd        11  content
12 perf (pending)                              15  security
16 artifact  ← release.yml, not ci.yml
```

Gate 16 is the only one that runs somewhere other than `ci.yml`, because there is no APK on a
pull request. `gates.json` records that with a `workflow` field so the omission cannot be
mistaken for a gap.

> **Never disable a failing gate to unblock a release.** A gate that is genuinely wrong is
> changed deliberately, with an ADR. A flaky gate is fixed, or quarantined with a tracked
> feature. It is never silently deleted — that is how a gate becomes theatre.

---

## Two lanes

### A test build — [`android-build.yml`](../../.github/workflows/android-build.yml)

Run it from the Actions tab (`workflow_dispatch`). It produces a **debug-signed APK** as a
workflow artefact, with no secrets involved.

**This is the lane the device attestations run through.** Every `attested` entry in
[`feature_list.json`](../../.harness/state/feature_list.json) whose `verifiedBy` says
*"on a physical device"* is discharged from a build this lane produced — the engine identity
digest under Hermes (F-006, F-039), the store conformance suite and encryption-at-rest
(F-041), TalkBack and 200 % text scaling (F-017), kinsoku line breaking (F-017), the Lens
frame-processor questions (F-040), and export/import against a real file (F-035).

It is **not a release**: the debug keystore is public, so the artefact is fine for a phone you
control and unfit for anyone else's.

```bash
adb install -r irodora-debug.apk
```

### A release — [`release.yml`](../../.github/workflows/release.yml)

```
tag vX.Y.Z
   ↓  every gate, by CALLING ci.yml — not a copy of it
   ↓  derive versionName and versionCode from the tag
   ↓  expo prebuild --clean, then gradlew assembleRelease bundleRelease
   ↓  apksigner verify        — the signature is cryptographically valid
   ↓  gate 16                 — and it is OUR certificate, and no network permission
   ↓  SBOM · SHA-256 sums · attested build provenance
   ↓  GitHub Release, artefacts attached
```

Nothing is deployed anywhere. Publication is the last step and the only one that can write.

---

## Versioning

| Artefact | Scheme |
|---|---|
| The app | `vMAJOR.MINOR.PATCH`, optionally `-prerelease` |
| Published packages | Semver via Changesets |
| Corpus | `YYYY.MM.N`, immutable |
| Rules | `YYYY.MM.N`, immutable |

`versionCode = major × 1 000 000 + minor × 1 000 + patch`, derived from the tag and nothing
else. It is **monotonic forever**: a code published to a store can never be reused, and a
phone holding code 500 refuses code 400 as a downgrade. Deriving it from the tag rather than
incrementing a committed integer is what stops two branches minting the same one.

A pre-release tag shares its final release's code. That is fine for sideloading and wrong for
a store, so pre-releases are flagged and must not be uploaded to Play.

The colour engine's version is part of every reproducibility envelope (FR-10). **A change
that alters engine output is a MAJOR version**, even if no API changed — downstream, an
envelope that no longer reproduces is a broken contract regardless of what the types say.

---

## Release checklist

Automated — the workflow fails rather than asking:

- [x] Every gate green, in order
- [x] The artefact declares no network permission (gate 16, NFR-12)
- [x] The artefact carries the tag's version
- [x] The artefact is signed by the expected certificate, not the debug key
- [x] Checksums, SBOM and provenance published
- [x] No accepted dependency advisory has expired, and none has gone stale (gate 15, [ADR-0059](../adr/0059-a-blocking-advisory-with-no-fix-is-accepted-with-an-expiry.md))

A person still does these, and no gate can:

- [ ] **Screen-reader pass on a device** — TalkBack on Android, VoiceOver on iOS
- [ ] **Both locales rendered** on every changed surface, on a device
- [ ] Text scaled to 200 % loses no content or function
- [ ] Any new `IRODORA_*` variable is in `.env.example` (gate 0 checks the contract; that it
      is *described correctly* is a person's job)
- [ ] Corpus and rule versions pinned, or intentionally latest with the reason recorded
- [ ] Effect graph updated; no critical link without a guard
- [ ] Threat model reviewed if a trust boundary changed
- [ ] Every `attested` criterion that `blocks: release` is either `verified` with evidence, or
      consciously accepted for this release and said out loud in the release notes

**Major releases additionally:**

- [ ] Real CVD user testing completed (A10)
- [ ] Device colour lab results updated if capture changed
- [ ] Bias validation re-run if the profile engine changed (NFR-23)

---

## After a release

There is no dashboard to watch, because there is no server to watch it on. What replaces the
old post-deploy checklist:

1. **Install the published APK on a real device from the Release page** — not the one left in
   the build directory. A release nobody installed is a release nobody tested.
2. **Verify the provenance from outside CI:**
   ```bash
   gh attestation verify irodora-X.Y.Z.apk --repo <owner>/<repo>
   ```
3. **Check the checksum** published in `SHA256SUMS.txt` against the downloaded file.

### If a release is bad

**There is no rollback**, and pretending otherwise is the dangerous version of this section.
An artefact somebody has installed stays installed. What can actually be done:

| Situation | Action |
|---|---|
| Not yet distributed | Delete the GitHub Release and the tag; fix; tag a new patch |
| Distributed, defect is not harmful | Fix; tag a patch; the higher `versionCode` upgrades over it |
| Distributed, defect is harmful (data loss, a false accuracy claim, a privacy regression) | Mark the release as pre-release so it is not the "latest" download, publish a patch, and say plainly in both releases' notes what was wrong |

A privacy regression is the case worth naming: if an artefact shipped with a network
permission, gate 16 failed to run or was bypassed, and the incident is about the pipeline as
much as the build. See [`incident-response.md`](incident-response.md).
