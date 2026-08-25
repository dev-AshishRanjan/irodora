---
kind: effect
title: A word in the lexicon is also a word in the taxonomy, and the link runs both ways
category: contract
confidence: 0.9
created: 2026-08-25
scope: [content, apps/mobile, packages/corpus]
links: [[the-entry-schema-is-a-contract-with-every-authored-file]], [[a-corpus-publish-can-outrun-the-font-that-renders-it]], [[the-app-pins-a-corpus-version-and-a-publish-can-leave-it-behind]], [[measure-a-hand-authored-set-against-itself-before-publishing]]
---

# E-026 — a word in the lexicon is also a word in the taxonomy

**`content/rules` → the generated lexicon module · the Finder · `content/colors` · the font
subset · gate 11**

## Two definitions of one word

Since F-021 **"dark" is defined twice**: as an OKLCh region in `content/rules`, and as an
authored `taxonomy.lightnessBand` on all 120 entries, which the Atlas filters on. Two
definitions of one word drift, and the one that drifts is whichever nobody is looking at.

So gate 11 asserts that every authored band falls inside the lexicon region of the same name —
**175 agreements over 28 terms**, and the count is printed, because a green check over *zero*
entries and a green one over 175 read identically otherwise.

## It paid for itself before it shipped

The boundaries were first written as round numbers, 0.40 and 0.04, on the strength of a
measurement printed to three decimals. The agreement check found that **0.40 sits one millionth
above the lowest entry an editor filed as `mid`** — `do-ma` at `0.3999990449505662`. It would
have been excluded from every query for a medium colour, silently, forever.

The boundaries now sit in the **measured gap** between adjacent bands: 0.395, 0.725, 0.039,
0.100.

> Three printed decimals hid a defect in the fourth. This is the same shape as
> [[measure-what-a-golden-set-can-detect-before-trusting-it]] — a measurement is only as sharp
> as the precision it was read at.

## The link runs BOTH ways, which is why it is worth recording

- editing a **boundary** breaks entries nobody touched;
- adding an **entry** across a boundary breaks a lexicon nobody touched.

Neither direction produces a compile error, and neither is visible in the diff that caused it.

## The destination nobody thinks of is the font

The lexicon's Japanese terms are **typed into** the Finder and echoed in the field, so they
render in the app's own subset exactly as a colour name does. `verify-font-coverage.mjs` now
reads them — and doing so immediately found two codepoints, **淡** and **鮮**, that nothing else
in the repository required. A person typing 淡い would have seen a tofu box.

This is [[a-corpus-publish-can-outrun-the-font-that-renders-it]] arriving from a new direction:
content that reaches a screen as *input* rather than as output, which is not where anybody was
looking.

**The subset generator keeps its own copy of that collection**, so the two must stay in step.
The dangerous direction is loud — the check requiring a codepoint the generator omits turns gate
11 red — and the quiet direction only ships a glyph nobody renders.

## And the generated module, which is E-022's shape again

Publishing a lexicon without regenerating leaves the app on the old vocabulary with every other
gate green. Guarded the same way: `generate-rules-bundle.mjs --check` inside gate 11, watched
failing on a hand-edited term count before it was trusted.

## What this link does NOT cover

Whether a term means what an English or Japanese speaker thinks it means. The gate checks that
the lexicon and the taxonomy agree with each other, not that either agrees with a person — and
the Japanese half has never been read by a competent speaker (ADR-0060, OQ-5).
