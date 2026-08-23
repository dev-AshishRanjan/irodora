# ADR-0059 — A blocking advisory with no fix is accepted with an expiry, not ignored and not left red

## Status

Accepted

## Date

2026-08-23

## Context

Gate 15's dependency audit has failed on **every run since F-039**, and nobody noticed until
the first push to a remote made CI visible. `progress.md` last recorded this gate green before
Expo existed in the repository.

Two HIGH advisories, both `image-size`:

| Advisory | Range | First patched |
|---|---|---|
| [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) — ICNS parser infinite loop | `<= 2.0.2` | **null** |
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) — JXL and HEIF parsers infinite loop | `<= 2.0.2` | **null** |

Verified against the advisory API and the npm registry: the dist-tags are `latest: 2.0.2` and
`legacy: 1.2.1`, installed is 1.2.1 via `metro@0.84.4` and `metro@0.87.0`, both of which
constrain `image-size` to `^1.0.2`. **Every published version is affected.** There is no
upgrade, and a `pnpm.overrides` entry has nothing to point at.

[ADR-0024](0024-ci-cd-github-actions-trunk-based.md) says a failing gate is never disabled to
unblock a merge. That rule was written for a gate that *can* pass. This one cannot, and the
consequence is worse than the rule was designed to prevent: since F-080,
`release.yml` calls `ci.yml` first, so **no tag can ever produce an artefact** while gate 15
is red. A gate that blocks everything forever gets routed around, and then it is off without
anyone having decided to turn it off.

## Decision

**A blocking advisory either stops the build, or it is recorded in
[`.harness/verification/advisories.json`](../../.harness/verification/advisories.json) with a
reachability argument, a named owner, an ADR and an expiry date.**

1. **High and Critical still block. The bar has not moved.** Moderate and low are reported.
2. An entry requires all of: the GHSA id, the package, the severity, a **reachability
   argument of at least 80 characters**, an accountable owner, `decidedOn`, `expires`,
   `removeWhen`, and a link to this ADR. `scripts/verify-audit.mjs` enforces every one.
3. **An entry expires by itself.** Past `expires`, the gate fails until someone re-decides.
   An expiry that depends on a person remembering is not an expiry.
4. **A stale entry fails the build.** If an accepted advisory stops being reported, the entry
   must be deleted — a dead exception is how a live one gets waved through later.
5. **The two `image-size` advisories are accepted until 2026-11-21.** The argument:
   `image-size` is reached only through `metro`, the React Native bundler, which runs at build
   time and is never in the shipped bundle — an APK contains metro's *output*, not metro.
   Triggering either loop needs a crafted ICNS, JXL or HEIF file parsed as a bundled asset,
   and `apps/mobile/assets` holds exactly one file, `NotoSansJP-Subset.ttf`, with no images at
   all. Anyone able to add a malicious image here already has repository write access and
   better options. The worst outcome is a CI runner stalling until its timeout. Exposure to a
   person holding the app is nil, because this code is not in it.
6. **Gate 15 becomes one command**, `pnpm security`. It was two CI steps of which only the
   first was mirrored against `gates.json`, so the audit step could have been deleted with
   every gate still reading as covered.

## Consequences

**Good.** Gate 15 is green and can still go red, which is the only state in which it is worth
having. Every acceptance is now a written argument with a name and a date on it, which is
strictly more than pnpm's own mechanism gives and strictly more than most projects do. The
expiry converts an indefinite exception into a scheduled review, and the stale-entry check
stops the register accumulating decisions nobody re-reads. A release is possible again.

**Bad.**

- **It is an accepted risk, not a fix.** The vulnerable code is still installed. If the
  reachability argument is wrong — if some future asset pipeline feeds untrusted images to
  metro — the register says we thought about it and were mistaken, which is better than
  silence but is not protection.
- **The argument is reasoned, not measured.** There is no call-graph analysis here. The gate
  prints that limitation on every run rather than implying coverage it does not have.
- **CI will go red on 2026-11-21** if nobody acts, probably at an inconvenient moment. That is
  the intended behaviour and it is still a cost.
- **A register is a thing that can rot.** Three checks push against it — required fields, the
  reachability floor, the stale check — and none of them can tell a *good* argument from a
  long one.

**Neutral.** The mechanism is ~250 lines and proven by 11 cases. It will be used perhaps twice
a year.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Leave gate 15 red** | The purist position, and it is what was happening. It blocks every release, and a gate that always fails teaches nothing — people learn to read past it, which is worse than the risk being accepted deliberately |
| **`auditConfig.ignoreGhsas` in `package.json`** | pnpm's built-in, one line, zero code. Rejected because it has no expiry, no owner and no reason: an entry added at 6pm under pressure is indistinguishable from one that was thought about, and it is silent for years. That is the exact failure this decision exists to prevent |
| **Lower the threshold to `critical`** | One flag. It would silently accept every future High advisory in the repository, including ones that *do* have fixes and *are* reachable — trading a specific accepted risk for an unbounded one |
| **`pnpm.overrides` to a patched version** | The correct fix when one exists. None exists: every published `image-size` is in range. F-082 was filed proposing exactly this and withdrawn once the registry was actually checked |
| **Drop Expo / metro** | Removes the dependency and the entire product's toolchain with it |
| **Vendor a patched `image-size`** | Technically possible. It means maintaining a fork of an image parser to fix a build-time DoS we are not exposed to — cost wildly out of proportion |

## Revisit when

- **2026-11-21**, by construction — the entries expire and the gate fails.
- `image-size` publishes a release outside the advisory range, or `metro` drops it. Either
  makes the entries stale and the gate fails until they are deleted.
- The app gains real image assets, or any pipeline that feeds images metro did not get from
  this repository. **That invalidates the reachability argument** and the entries must be
  re-decided rather than renewed.
- A third advisory arrives. Two entries is a disposition; a register of ten is a habit, and
  the honest response to that would be reachability tooling rather than more prose.
