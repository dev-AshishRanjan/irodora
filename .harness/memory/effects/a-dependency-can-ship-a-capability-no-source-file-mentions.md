---
kind: effect
id: E-049
title: A dependency can ship an Android permission that no import and no config file mentions
severity: high
created: 2026-09-01
scope: [apps/mobile]
links: [[a-rule-is-a-source-and-scope-files-are-written-from-it]], [[saying-not-run-here-is-necessary-and-it-is-not-sufficient]]
---

# E-049 — a dependency can ship a capability no source file mentions

Adding a package can add an Android permission, and **neither the import nor `app.config.ts`
will say so**. Two mechanisms, both silent by design:

1. The package ships its own `android/src/main/AndroidManifest.xml`, and the **manifest merger**
   folds it into yours. That is what the merger is for.
2. The package ships an **Expo config plugin**, which Expo autolinks, and the plugin calls
   `withPermissions` itself.

## It has now happened twice

**`expo-file-system`** declares `INTERNET`, `READ_EXTERNAL_STORAGE` and
`WRITE_EXTERNAL_STORAGE` in its own manifest — and it is not even a direct dependency. It
arrives transitively and is autolinked.

**`expo-image-picker`**, added by F-043 for wardrobe photos:

```js
if (microphonePermission !== false)
  config = withPermissions(config, ['android.permission.RECORD_AUDIO']);
```

**Opt-out, not opt-in.** It is there for callers who capture video. This app passes
`mediaTypes: ['images']` and records no audio anywhere — and `RECORD_AUDIO` reached a signed
artefact, on a colour tool.

## The fix is at the source, never at the expectation

Adding `RECORD_AUDIO` to `EXPECTED_PERMISSIONS` would have made gate 16 green and shipped a
microphone permission — **the precise outcome the gate exists to prevent, reached by editing the
thing that objected.**

Instead, both halves:

- `['expo-image-picker', { microphonePermission: false }]` in `plugins` — the real fix, and the
  only way to pass the option, since Expo autolinks the plugin whether or not it is listed.
- `android.permission.RECORD_AUDIO` in `blockedPermissions` — the backstop, because plugin
  options are exactly the kind of thing a refactor drops.

## What to do when adding a native dependency

**Read its `android/src/main/AndroidManifest.xml` and its `app.plugin.js` before merging**, and
expect the permission list to be a property of the **built file** rather than of anything you
wrote.

That is why gate 16 reads the artefact. Every other check in this repository looks at source,
and source is exactly where this class is invisible.

## Guard, and its delay

`gate:artefact` (16) asserts the artefact's permission set **equals** `EXPECTED_PERMISSIONS` in
both directions. It is the only thing that catches this.

**It runs in `release.yml`.** So a dependency added on a Monday is caught at the next *tag*, not
on the pull request that added it — F-043 shipped, and five features closed, before this
surfaced. Closing that delay is [F-114](../../state/feature_list.json).
