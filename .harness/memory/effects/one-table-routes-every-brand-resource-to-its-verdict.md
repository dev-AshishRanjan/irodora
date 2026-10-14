# E-184 — One table routes every brand resource to its verdict

**Link:** `scripts/brand-verdicts.mjs` (`kindOf`, `decodeResource`, `verdictFor`, the iOS verdicts) →
`verify-native-assets.mjs` (the prebuild projects), `verify-apk.mjs` (gate 16, the APK)
**Guard:** both proofs — `verify-native-assets --prove` (14 cases) and `verify-apk --prove` (the resource
table reader, which needs no SDK; the aapt2-built branded fixtures, which do), and both halves run only
where a lane runs them: `android-build.yml`, dispatched by a person, and `release.yml`, at a tag. No pull
request runs either until F-341 **Severity:** high **Feature:** F-231

---

## Why B changes when A does

Two checks read the same drawings out of different files. Before F-231 each chose its own signature, and
both choices were wrong in a different place: the gate read every launcher layer with one signature
(F-230's review), and then the splash logo with the icon's (F-231's finding 1). One table now decides what
each resource is and what it must look like; a change to a drawing, a new layer, or a new appearance is made
there once, and both checks follow.

## What is not proven here

The aapt2 half of gate 16's proof cannot run on a workstation without the Android SDK; until CI runs it,
the parser is proven against aapt2's printed form taken from its source, and the fixtures are not.

## F-231's review (2026-10-08)

In a shortened release table, `mipmap/ic_launcher` and `mipmap/ic_launcher_round` also carry the anydpi-v26 adaptive-icon XML. Routed by resource name alone, it was read as an image and failed every real release APK. `brandResources` routes rasters only, and the SDK-free half of the proof now routes such a table, with routing by name alone as the decoy.

## F-340 (2026-10-14): the routing case passed an array, and the gate passed an iterator

`checkApk` hands `brandResources` the ZIP's `entries.keys()`, which is a one-shot iterator. B2's fix
above read that input twice: the name scan used it up, and the set that checks each file is in the APK
(it replaced `entries.has(path)`; the XML is skipped by the type test beside it) was built from nothing. So every file the table named was refused, and **every shortened release APK reported no
launcher icon or splash logo**. The SDK-free case passed an array, which can be read twice, so it
stayed green. The aapt2 shortened case did go red, but only in the Android lane, which a person
dispatches. The person reported it from there.

`brandResources` now reads its input once. The SDK-free case passes a `Map`'s `keys()`, as the gate
does ([[a-proof-must-call-the-function-the-way-the-gate-does]]).

**The SDK half does run on this workstation.** The SDK is at `%LOCALAPPDATA%\Android\Sdk` (build-tools
33.0.1, android-32), and `ANDROID_HOME` names its parent. With `ANDROID_HOME` pointed at the `Sdk`
directory, `node scripts/verify-apk.mjs --prove` builds its fixtures and runs all 26 cases. "What is
not proven here", above, was true only of the environment variable.
