---
kind: effect
title: A corpus publish can outrun the font that renders it, and the failure is a silent empty box
category: contract
confidence: 0.95
created: 2026-08-20
updated: 2026-09-24
scope: [content, apps/mobile]
links: [[the-message-key-set-is-a-contract-with-every-render-site]], [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]], [[corpus-version-pins-caches-and-envelopes]]
---

# E-017 — a corpus publish can outrun the font that renders it

**`content/colors` → the bundled Japanese face · `ja.ts` · `verify-font-coverage.mjs`**

A missing glyph renders as **tofu**: an empty box. Nothing throws, nothing logs, no gate goes
red. The text simply is not there.

## Why this one lands in the worst possible place

The Japanese text most likely to contain a rare character is the **colour name itself** —
蘇芳 (suō), 纁 (sohi), 苅安 (kariyasu). So the failure appears on the corpus entries that are
the reason the product exists, in front of the audience whose judgement matters most, on a
build where every other gate is green.

It is also invisible to everyone who does not read Japanese, which is most of the people
looking at the screen before release.

## Why it is checkable at all

The corpus is an immutable, signed bundle at a pinned version
([[corpus-version-pins-caches-and-envelopes]], ADR-0046, ADR-0051 §4). **The set of codepoints
the app can render is therefore knowable at build time.**

That single property is what made ADR-0057 choose a bundled subset over the platform face. With
the platform font — iOS Hiragino Sans, Android Noto Sans CJK — the same claim is verifiable
only on a device, on every OS version, forever.

## The guard is blocking, and it has fired

`scripts/verify-font-coverage.mjs` parses `cmap` formats 4 and 12, collects required codepoints
from the corpus and the `ja` catalogue, and names the entry and the codepoint on a miss. Two
things it refuses to do:

- a `cmap` with no subtable it understands **throws** — *"I found no subtable I understand"* and
  *"I found no missing glyphs"* are opposite facts;
- a format-4 segment counts a codepoint only when the glyph id is **non-zero**, because treating
  segment presence as coverage would count every codepoint in a range whose glyphs were subset
  *away* — which is exactly what a subsetter produces.

`--prove` builds a synthetic TTF in memory, so it is watched discriminating today rather than
trusted until the day it matters [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]].

**F-076 shipped the asset and wired it into `pnpm test:content`. F-012 is the first publish it
could actually judge, and it caught one.** With 120 entries in place and every other gate green,
it reported **183 codepoints missing** from the committed subset — 赤, 土, 鉄, 雨, 石, 青 among
them, which is to say the colour names themselves. The subset was regenerated: 272 required
codepoints against 639 in the face, and the asset grew from 451 KB to 547 KB.

That is the whole value of the link, delivered: the corpus went in, everything else stayed
green, and the one check that could see the problem saw it at build time rather than a reader
seeing empty boxes on a device.

### What this note said before, and why that is worth recording

Until F-012 this section was headed *"built and proven, and is not yet blocking"*, and said the
script exits 1 because no font asset exists. **Both stopped being true when F-076 landed, and
the wording survived two features past its expiry.** Nothing executes a rationale, so an effect
note goes stale exactly the way a comment does — the difference is that this one is the thing a
future session reads to decide whether a check can be trusted. Re-read the note against the
gate, not the gate against the note.

`past-state-ok: the phrase is quoted here to describe the rot, not asserted — the guard has been blocking since F-076.`

## The remedy is never to relax the check

Regenerate the subset. A codepoint the app can render and the font cannot is a tofu box, and a
widened tolerance would only make it a silent one.

## 2026-09-24 (F-292): the guard fired, and nothing ran it

F-239 added 幅 and 触 to the settings copy, plus 仕 and 様 in a comment. The generator and the
check both read comments, so a comment costs a glyph and not a failure. The subset was not
regenerated. The guard was right from the first push, 2026-09-21, but CI stopped at step 8 on a
different failure (F-291) and never reached step 34, where this check runs. **A guard behind a red
step is not running.** CI marks the steps after a failure *skipped*, not failed, and a skipped
step reads like one with nothing to report. `pnpm verify:ci --all` runs past the first failure.

The subset is regenerated from the cached source, and CI's byte comparison is **expected** to
agree, on three conditions. The source is the same bytes: its git blob matches google/fonts
`main`. `subset-font` and `harfbuzzjs` are the lockfile's versions. And hb-subset gives the same
bytes on ubuntu as on Windows. The evidence for the third is four earlier subsets generated on this
Windows workstation that passed CI's gate 11 (3d70459, a6b60ea, a56e7b4, c81ffe7). It is confirmed
only when CI runs gate 11 on the pushed commit, and the source is not pinned by hash anywhere
(F-297).
