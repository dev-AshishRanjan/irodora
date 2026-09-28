---
kind: effect
title: The mincho is subset to what the mockups bind it to
category: contract
confidence: 0.9
created: 2026-09-28
scope: [mockups, scripts, apps/mobile]
links: [[a-name-is-japanese-text-and-the-font-never-read-it]], [[a-corpus-publish-can-outrun-the-font-that-renders-it]]
---

# E-155 — the inventories' mincho elements → the Japanese serif subset

**`mockups/inventory` (`type.face: "mincho"`) → `generate-font-subset.mjs` ·
`verify-font-coverage.mjs` · `NotoSerifJP-Subset.ttf`**

## What changed

`20`'s card sets the colour's kanji in a mincho (C6). F-226 ships Noto Serif JP for it, subset to
exactly the kanji of every corpus name, because that is the only text any mockup sets in it:
`20.card.kanji` binds `corpus:entry.kanji`.

## Why the text is DERIVED, not listed

E-145 and E-146 are the same failure, found late: Japanese text a screen printed that neither font
script read, shipped as tofu with every gate green. So both scripts derive the mincho's text from
the inventories. They walk every element drawn in the mincho and map its binding to the content it
reads. A mincho element with a binding neither script knows **fails both**, naming the element. The
coverage check's `--prove` decoy shows that it does.

## How to apply

When a mockup draws the mincho around new text (a kasane name, a heading, kana), teach both
`MINCHO_BINDINGS` tables where that text lives, then regenerate. Kana are not in the subset today,
because no mincho element binds any.
