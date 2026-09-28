---
kind: effect
title: A pinned font is a measured font, and its cut is rebuilt, not copied
category: contract
confidence: 0.9
created: 2026-09-28
scope: [scripts, apps/mobile]
links: [[a-corpus-publish-can-outrun-the-font-that-renders-it]], [[reproduce-a-published-number-before-trusting-the-method-it-states]]
---

# E-153 — the pinned sources → the committed faces → NOTICE.md

**`scripts/font-sources.json` → `Gelasio-Regular.ttf`, `NotoSerifJP-Subset.ttf` ·
`generate-font-subset.mjs` · NOTICE.md §4 · gate 11**

## What happened

ADR-0112 measured the weight each serif role is drawn at against Gelasio's own outlines, from ONE
file: google/fonts at a pinned commit, with a checked sha256. The face that ships is a static cut of
that file. So the pin is part of the measurement. A font that changes upstream has different stems,
metrics and names, and it has to be re-measured, not just re-downloaded.

**The cut is not a copy.** HarfBuzz's instancer, pinning `wght` at 400, keeps the default instance's
names: a Noto Serif JP cut at 400 called itself `NotoSerifJP-ExtraLight`. It also drops the licence
records (name IDs 13 and 14). Two cuts of one family at two weights would share a PostScript name, and
iOS refuses to register the second one. So the generator rebuilds the name table from the source,
and `--check` compares the rebuilt bytes.

## The guard

- `generate-font-subset.mjs --check` refuses a source whose sha256 is not the pinned one, and
  byte-compares every committed face.
- `verify-font-coverage.mjs` checks each static face for no `fvar`, the pinned weight class, the
  licence record, and no duplicate PostScript names. Each check has a `--prove` decoy.

## How to apply

To re-pin, re-run `mockups/tools/serif-weight.mjs` (and `--calibrate`) against the new file first.
Then update ADR-0112 if the weight moves, and NOTICE.md's version line. Only then change the sha256.
