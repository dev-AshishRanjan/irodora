---
kind: effect
title: The shipped permission set is decided by the manifest merger, not by app.config.ts
category: contract
confidence: 0.95
created: 2026-08-21
scope: [apps/mobile, root]
links: [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]], [[sampling-lives-in-the-engine-not-the-platform]]
---

# E-018 — the permission set is decided by the manifest merger, not by us

**`apps/mobile/app.config.ts` → the merged `AndroidManifest.xml` in the built artefact ·
`scripts/verify-apk.mjs` · ADR-0058**

`app.config.ts` lists `CAMERA` and blocks `INTERNET`. That is a statement about **our**
manifest. The manifest that ships is the **merged** one, and Android's manifest merger folds
in the manifest of every dependency and every transitive AAR, **silently and by design**.

So a dependency added for an unrelated reason — an analytics shim pulled in by a UI library,
a native module that declares `INTERNET` because most apps want it — puts a network
permission into our artefact with **no source file in this repository changing** and every
gate green.

## Why this is the one that matters

NFR-12 is not a feature; it is the product's central claim, and it is phrased as an
impossibility: the app *cannot* transmit. `app.config.ts` says so in a comment —

> "the strongest form of that claim is an app that cannot transmit"

— and until F-080 nothing checked it. `blockedPermissions` is real and does work, but it is
the *input* to a merge, not the *output*, and the difference between the two is exactly where
this class of defect lives.

## The general shape, which is the reusable part

**A property asserted in the configuration is not the same property as the one in the
artefact, whenever anything between them can add to it.** Config is an input to a build; a
build is a merge; a merge has other inputs. Anywhere that pattern appears — Android
manifests, Gradle dependency resolution, Docker base layers, bundler externals — the honest
check reads the output.

The corollary is what makes it cheap: the output is usually *easier* to check than the input,
because it is one file with everything already resolved.

## The guard

Gate 16, `scripts/verify-apk.mjs`, run in `release.yml` and in the on-demand build lane. It
reads the APK's ZIP directory, decodes the binary `AndroidManifest.xml`, and fails on
`INTERNET`, `ACCESS_NETWORK_STATE` or `ACCESS_WIFI_STATE`. When `aapt2` is present it is used
as an **independent oracle** and a disagreement is a failure — a hand-written parser agreeing
with itself is the shape of a check that passes on a file it misread.

`--prove` builds ten fixtures with the real `aapt2` and watches each assertion fail, with a
clean fixture green either side. **It found a real defect on its first run**: the signing-block
walker treated a zero-length element as the end of a sequence, so a correctly signed APK read
as unsigned — and the only reason that surfaced is that one case was required to stay green.

## What it still does not cover

The AAB. Its manifest is protobuf rather than binary XML and needs a different parser; both
artefacts come from one Gradle run over one merged manifest, so the APK check covers the same
merge, but a difference introduced by `bundletool` would not be seen.

And the runtime half: a permission the app does not hold is a stronger fact than a promise,
but it is not the same fact as "no socket was opened". That is gate 7, on a device, and it
stays attested on F-039.
