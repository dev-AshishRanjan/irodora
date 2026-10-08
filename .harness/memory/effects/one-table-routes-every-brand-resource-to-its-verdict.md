# E-184 — One table routes every brand resource to its verdict

**Link:** `scripts/brand-verdicts.mjs` (`kindOf`, `decodeResource`, `verdictFor`, the iOS verdicts) →
`verify-native-assets.mjs` (the prebuild projects), `verify-apk.mjs` (gate 16, the APK)
**Guard:** both proofs — `verify-native-assets --prove` (14 cases) and `verify-apk --prove` (the resource
table reader, run on every machine; the aapt2-built branded fixtures, run where the SDK is: CI's
`android-build.yml` and `release.yml`) **Severity:** high **Feature:** F-231

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
