---
kind: effect
title: The app reads a copy of the corpus, so a publish can leave it behind with every gate green
category: contract
confidence: 0.95
created: 2026-08-24
scope: [content, apps/mobile]
links: [[corpus-version-pins-caches-and-envelopes]], [[a-corpus-publish-can-outrun-the-font-that-renders-it]], [[the-source-register-is-a-markdown-table-that-125-records-depend-on]], [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
---

# E-022 — the app pins a corpus version, and a publish can leave it behind

**`content/versions/` → `apps/mobile/src/corpus/generated/bundle.ts` · the app's corpus module**

## The app does not read `content/versions/`. It reads a copy.

`content/` sits outside `apps/mobile/`, so Metro cannot see it without a watch folder, and
`loadPublishedVersion` takes **text** rather than a parsed object. So ADR-0066 ships the pinned
bundle as a generated module carrying two exports:

```ts
export const CORPUS_BUNDLE_TEXT = "…";   // the bundle file, verbatim
export const CORPUS_ROOT_DIGEST = "…";   // the LEDGER's row for it
```

## Why the failure is invisible without a check

Publish a new version and forget to regenerate, and **the app stays on the old one**. Nothing
looks wrong: the old pair still verifies, because it is a valid bundle checked against its own
valid ledger row. Gate 11 passes over `content/`, the app's tests pass over the module, the
build is green, and the product quietly serves a corpus that is one version behind.

This is the same shape as [[a-corpus-publish-can-outrun-the-font-that-renders-it]] — a publish
outrunning something downstream that nobody thought of as downstream.

## The two exports come from two files, and that is the mechanism

A bundle checked against a checksum it carries **verifies itself**. The expected value lives in
the ledger for exactly that reason (ADR-0046), and the generator keeps them apart on the way in:
the text is read from `<label>.json`, the digest from `index.json`.

A test asserts the bundle contains **no** self-describing root digest, so a future call site
cannot pass the bundle's own field by mistake. That is the design written as an assertion rather
than as a comment.

## The guard, and that it was watched failing

`node scripts/generate-corpus-bundle.mjs --check`, inside `gate:content`. It regenerates in
memory from the ledger's **last** row and byte-compares against what is on disk, so both
failure modes — a publish without a regenerate, and a hand-edit of the generated module — are
one comparison.

Watched going red on a hand-edited entry count before it was trusted, and green again after
regenerating.

## What it does not cover

**Which version the app pins is a decision, not a check.** The generator takes the newest ledger
row. Pinning to an *older* version deliberately would pass this guard and every other one; the
committed file is the only record, and a diff is what a reviewer reads.
