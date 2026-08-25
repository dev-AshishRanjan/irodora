---
kind: effect
title: A token leaves the app inside the card, and nothing regenerates a card somebody already sent
category: contract
confidence: 0.85
created: 2026-08-25
scope: [apps/mobile, packages/design-tokens]
links: [[a-token-change-is-a-contrast-change-in-both-themes]], [[the-stylesheet-is-generated-and-a-colour-function-in-it-hands-the-conversion-away]], [[generating-an-artefact-is-not-checking-it]]
---

# E-027 — a token leaves the app inside the card

**`docs/design/design-system.manifest.json` → `card.ts` · `card.test.ts` · gate 5**

## E-007 stopped at components. This is where it does not

E-007 already says a token change is a contrast change in both themes, and every destination it
names is inside the app: the token package, the gates, the design docs. Since F-023 the tokens
also travel **out**.

`cardSvg` bakes `background`, `foreground`, `foreground.2` and **both** `swatch.hairline` tones
into an SVG document as literal values, because an SVG has no other way to carry a colour.

## Why this is E-019's shape with one difference that matters

The generated stylesheet is E-019: an artefact built from tokens that something else evaluates
later. The difference is regeneration.

> **A stylesheet is rebuilt on every build. A card somebody sent last week is not.**

A shared card keeps the token values it was built with for as long as it exists, and no gate in
this repository reaches it. That is not a defect to fix — it is what a shared artefact *is* — but
it is worth knowing before a token is changed on the assumption that everything downstream
follows.

## What is guarded

Every colour in a freshly built document must be a design-token value or the entry's own
published hex — over **all 120 entries, in both themes**, with a decoy proving a planted colour
is reported. A hand-typed colour in the card is a failing test rather than a review note.

## What is NOT guarded, and it is the interesting half

**The keyline tones are inherited, not re-derived.** The card uses `swatch.hairline` and
`swatch.hairline.inverse` precisely so it inherits F-068's measurement — the worse tone still
reaching 4.23 against the worst possible sample. But that measurement lives in
`packages/design-tokens/test/swatch-edge.test.ts`, not here.

So a manifest change that moved `swatch.hairline` would keep **this** link green while the card
quietly lost its edge against a near-white sample. The two checks are complementary rather than
redundant, and that is the argument for reusing the tokens instead of drawing a border here: a
border invented in `card.ts` would have inherited nothing and been checked by nobody.

## The other reason the claim stops at the document

The card names `Noto Sans JP`, which the app bundles. Anything rasterising the document outside
the app may substitute a font, and then the layout is not the one that was designed. The
determinism claim is about the **document**, and
[ADR-0070](../../../docs/adr/0070-a-shareable-card-is-a-deterministic-document-not-a-bitmap.md)
says so rather than leaving it to be discovered when two screenshots differ.
