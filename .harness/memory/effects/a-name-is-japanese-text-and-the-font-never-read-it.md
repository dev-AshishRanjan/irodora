---
kind: effect
title: A palette or combination name is Japanese text on a screen, and the font check never read one
category: contract
confidence: 0.9
created: 2026-09-24
scope: [content, apps/mobile, scripts]
links: [[a-corpus-publish-can-outrun-the-font-that-renders-it]], [[a-family-word-is-content-because-the-family-is]], [[the-palette-schema-now-runs-on-a-phone]]
---

# E-145 — a name is Japanese text, and the font never read it

**`content/palettes` (and `content/combinations`) → `verify-font-coverage.mjs` ·
`generate-font-subset.mjs` · the bundled subset · ColourDetail · Combinations · gate 11**

## What happened

`ColourDetail` prints `palette.name.ja` under *In these palettes*. `Combinations` prints
`combination.name.ja`. Palette Studio (`10`) and the profile (`23`) will print kasane names.
The two font scripts collected the corpus entries, the ja catalogue, the phrase lexicon and the
family words — **never a palette or a combination name.**

F-224 taught them to, and the check immediately named **seven** missing glyphs. Four were in the
new kasane names (露 匂 錦 吹). **Three were in palettes published on 2026-08-24**: 森 and 鉱 in
*森と鉱物*, 藍 in *藍の習作*. So a Japanese reader has seen tofu in two of the five seed palette
names for a month, with every gate green. The combinations needed no new glyph, and that was
luck, not coverage. They are read now as well.

## The pattern, a third time

E-017 (colour names), E-028 (family words) and now this: **every new kind of Japanese content
arrives without telling the font.** The only guard is the collection list, kept twice (the check
and the generator must stay in step, and the loud direction is the check requiring what the
generator did not add).

## How to apply

When content gains a field a screen prints in Japanese, add it to **both** collection blocks in
the same change, then run `node scripts/verify-font-coverage.mjs` before anything else. If it names
a codepoint, regenerate with `node scripts/generate-font-subset.mjs` from the cached source. Only
the printed field, never prose that stays off-screen.
