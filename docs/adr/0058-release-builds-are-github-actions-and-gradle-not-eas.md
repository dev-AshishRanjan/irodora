# ADR-0058 — Release builds are GitHub Actions running Gradle, not EAS Build

## Status

Accepted

## Date

2026-08-21

## Context

Everything up to this point assumed **EAS Build**, Expo's hosted build service. It was never
decided; it was inherited from the Expo template and then written down as though it had been.
Three places record the assumption:

- [`ADR-0024`](0024-ci-cd-github-actions-trunk-based.md) §7 describes a release as
  *"tag → build multi-arch images → push to registry → deploy staging → deploy production"*,
  which is a **server** release. That tier was withdrawn by
  [`ADR-0051`](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) and the
  release process was never rewritten to match. It describes a pipeline that cannot be built
  because the thing it deploys does not exist.
- [`.env.example`](../../.env.example) said *"signing credentials live in EAS, managed by the
  store tooling"*.
- F-039 carries the acceptance criterion *"EAS Build produces installable builds from a
  Windows workstation"*, attested and outstanding since the day it was written.

Meanwhile nothing has ever been built. There is no APK, and a dozen acceptance criteria
across F-006, F-017, F-035, F-039, F-040 and F-041 say *verified on a physical device* and
have been outstanding since they were written, because **no lane existed to get the app onto
a phone.** That is the actual problem to solve, and the build service is a means to it.

The workstation cannot solve it either: no JDK is installed, `JAVA_HOME` points at an
uninstalled JDK 18, the Android SDK has platforms 31 and 32 against a required `compileSdk`
36, and there is no NDK. Any answer here is a CI answer.

## Decision

**Release and test builds are produced by GitHub Actions running Gradle against a
`expo prebuild` output. EAS Build is not used, and no Expo account is required to ship.**

1. **`.github/workflows/release.yml`** runs on a `v*` tag. It *calls* `ci.yml` — the same job
   a pull request runs — then builds a signed APK and AAB, verifies the artefact, and
   publishes a GitHub Release with checksums, an SBOM and attested build provenance.
2. **`.github/workflows/android-build.yml`** produces a debug-signed APK on demand, with no
   secrets. This is the lane the device attestations run through.
3. **The native project stays generated.** `expo prebuild --clean` runs in CI;
   `apps/mobile/android/` remains gitignored and is never hand-edited. Signing is wired by a
   **config plugin** (`apps/mobile/plugins/withReleaseSigning.ts`), which is the mechanism
   [`apps/mobile/AGENTS.md`](../../apps/mobile/AGENTS.md) already requires.
4. **We hold the signing key.** A keystore the maintainer generates, stored as GitHub Actions
   secrets, materialised into the runner's temp directory and destroyed with the runner. See
   [`signing-and-credentials.md`](../operations/signing-and-credentials.md).
5. **The artefact is checked, not the configuration that produced it** — gate 16
   (`scripts/verify-apk.mjs`) reads the built APK and asserts no network permission, the
   package id, the version from the tag, and the signer certificate.
6. **The version comes from the tag.** `versionCode = major·10⁶ + minor·10³ + patch`, so two
   branches cannot mint the same one.
7. **F-039's EAS criterion is withdrawn and replaced**, not quietly reworded. The thing it
   wanted — *installable builds, from this repository, on a Windows workstation's project* —
   is delivered by a lane that does not need the workstation to have an Android toolchain at
   all, which is strictly more of what was asked for.

## Consequences

**Good.** No third-party build service in the critical path, and no account to keep paid for
the product to be buildable — which is the same argument ADR-0051 made about servers, applied
to the toolchain. The release runs the *same* gate job as a pull request, so a release cannot
be gated by a stale copy. The build is reproducible from the repository by anyone with the
secrets. Provenance is attested by GitHub and verifiable afterwards with
`gh attestation verify`. Above all: there is finally a way to get the app onto a phone, which
unblocks eleven attested criteria that no amount of local work could have closed.

**Bad, and this is the real cost.**

- **We now hold a private key, and losing it is unrecoverable.** Android identifies an app by
  package id *plus* signing certificate. If the keystore is lost after a store listing exists,
  nobody — not us, not Google — can publish an update to it. EAS managed this for us. The
  mitigation is a documented custody procedure and Play App Signing, and both are human
  discipline rather than a gate.
- **We own the toolchain.** An Expo or AGP upgrade that changes the template breaks our
  config plugin. That failure is loud by construction — the plugin throws rather than
  no-oping — but it is now our maintenance.
- **iOS is harder, not easier.** EAS's genuine strength is managing Apple certificates and
  provisioning profiles. Doing it ourselves needs a macOS runner (roughly 10× the Linux
  minute rate) and a paid Apple Developer Program membership. F-081 carries it, blocked on
  OQ-6, deliberately not half-built here.
- **Third-party actions are pinned to major tags, not commit SHAs**, matching the existing
  `ci.yml`. SHA pinning is the stronger supply-chain position and is not done yet.

**Neutral.** GitHub-hosted Linux runners are free for public repositories and cheap
otherwise; an Android build is roughly 10–20 minutes. EAS remains usable later for a store
submission lane without undoing any of this — `expo prebuild` output is what EAS builds too.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **EAS Build** | Genuinely good, and it manages iOS credentials properly — the one place this decision is clearly worse. Rejected because it puts a hosted service and an account in the path of building the product at all, which is the dependency ADR-0051 spent a whole rehaul removing; because the free tier queues and the paid tier is a recurring cost for a pre-revenue app; and because a build we cannot reproduce from the repository is a build we cannot audit |
| **Commit `android/` and drop `expo prebuild`** | Signing becomes an ordinary file edit and CI gets simpler. Rejected: it makes every Expo upgrade a manual native merge, and `apps/mobile/AGENTS.md` forbids hand-edited native projects for exactly that reason. The config plugin costs ~100 lines and keeps regeneration free |
| **Inject signing with `-Pandroid.injected.signing.*` on the Gradle command line** | No plugin at all — AGP supports it, and it is what Android Studio's own signed-build flow uses. Rejected because it puts the keystore password in a process command line, and because the release build type would still *read* as debug-signed in the generated project, so anyone inspecting it would draw the wrong conclusion |
| **Build on the workstation and upload by hand** | Fastest to a first APK. Rejected: unreproducible, unattested, and it puts the signing key on a daily-driver machine. It also does not work today — there is no JDK on it |
| **Fastlane** | Mature, and the standard answer for store submission. Rejected for now as a second toolchain to learn for a lane that is four `gh` commands; revisit when there is a Play listing to automate |

## Revisit when

- A Play Store or App Store listing exists — a submission lane is the point where Fastlane
  and EAS Submit are worth re-costing, and where Play App Signing changes the key-custody
  argument.
- OQ-6 closes and the iOS lane is built (F-081); if managing Apple credentials in GitHub
  Actions proves genuinely painful, EAS for iOS only is a reasonable split.
- Supply-chain hardening: pin every action to a commit SHA and add `persist-credentials:
  false` to checkout.
- CI wall time for a release exceeds 30 minutes.
