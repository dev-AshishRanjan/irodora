# ADR-0070 — A shareable card is a deterministic document, not a bitmap

## Status

Accepted

## Date

2026-08-25

## Context

FR-50 asks for *"a rendered card with name, kanji, hex and attribution"* and sets one acceptance
criterion that decides the whole design:

> The same entry at the same corpus version **renders the same card on both platforms**;
> includes corpus version

Read as *"the same pixels"*, that is unmeetable. iOS and Android rasterise text differently —
hinting, subpixel positioning, antialiasing — and so do two Android versions. No application
code changes it, and no test in this repository could ever check it: CI has no device, and the
one thing a device attestation cannot do is compare two platforms it is not both running on.

A criterion nobody can check does not stay a criterion. It becomes an attested-forever item, and
then quietly becomes nothing.

This repository has met this shape before. `archive.ts` faced FR-58's *"re-imports to a
byte-identical database"* and wrote down, in the file, that a SQLite **file** differs in page
layout and freelist state after an identical sequence of writes — so the claim worth making is
that **the data** round-trips exactly, and `digest()` is a canonical serialisation that is
compared byte for byte.

## Decision

**The card is a document. `cardSvg(entry, options)` is a pure function returning SVG text, and
that string is what the criterion is about.**

It is byte-identical across platforms because nothing platform-shaped touches it: every value
comes from the entry, the options, or a constant in the module. No clock, no locale lookup, no
random source, no platform API.

**The rasterisation is the platform's, and is not claimed.** That is stated in the module, in
the tests, and here — rather than left for somebody to discover when two screenshots differ.

What this buys, and it is the reason to prefer it over a bitmap even if bitmaps were
deterministic: **the criterion becomes checkable in CI, with no device at all.** `card.test.ts`
asserts byte equality over every entry in the corpus, in both themes.

### Consequences of the document being SVG

**Text does not sit on the sample.** Putting the hex over the colour would need a legible
foreground chosen per entry against 120 different backgrounds, with no declared pairing to lean
on — inventing exactly the contrast decision the manifest exists to make. The sample is a block;
the text sits on the card's own ground, where the pairing is declared and gate 9 already checks
it.

**The sample keeps `Swatch`'s two-tone keyline.** A near-white entry on a near-white card has no
perceptible boundary. F-068 measured that: one tone is invisible at its worst case, and the pair
was chosen so the worse of the two still reaches 4.23 against the worst possible sample. The card
reuses `swatch.hairline` and `swatch.hairline.inverse` and inherits that proof rather than
drawing a border and re-deriving it.

**Every colour in the document is accounted for.** An SVG needs literal colour values, which is
what the colour-literal rule forbids in a component. The resolution is E-019's, for the generated
stylesheet: the document is generated from tokens, and a test asserts every colour in it is
either a `@irodora/design-tokens` value or the entry's own published hex — over every entry, in
both themes, with a decoy proving a planted colour is reported.

### "Readable at thumbnail size" is arithmetic about declared numbers

The card declares its own coordinate space, so the design brief's requirement becomes checkable:
every type size, scaled by `THUMBNAIL_WIDTH / CARD_WIDTH`, is compared against a floor.

And the honest version of the claim is narrower than the phrase suggests. At 96 px wide **no
text on this card is comfortable**. What survives is the **colour** — so the sample occupies 62%
of the card — and the **kanji**, which is sized to clear the floor. The card does not pretend the
hex or the attribution are legible there, and a test asserts they are *below* the floor, so the
kanji claim means something rather than being one true statement among five vague ones.

### Getting bytes out of the app is FR-51

FR-50 asks for a rendered card. **FR-51 — export to CSV, JSON, CSS, ASE, PDF — is R5** and owns
files leaving the device. So this feature adds no `expo-sharing`, no rasteriser and no
device-only path, and the screen says so rather than leaving a person hunting for a share button.

## Consequences

### Good

- The acceptance criterion is true, and checked, over all 120 entries with no device.
- The card that leaves the app carries its **classification** (FR-23) and its **corpus version**,
  which matters most on the one artefact likely to be read with none of its context.
- The document is trivially inspectable — a reviewer can read the card rather than pixel-peep it.
- The thumbnail claim is *shown* on the screen at the size it is claimed for, so a person can
  disagree with the arithmetic instead of taking it.

### Bad

- **A card nobody can yet send anywhere.** Deliberate and bounded by FR-51, but until R5 the
  word "shareable" in the feature title is doing more work than the feature does.
- **`THUMBNAIL_MIN_PX` is declared, not measured.** It is a stated floor for CJK stroke
  separation, not a result from a legibility study, and it should not be quoted as one.
- **The thumbnail arithmetic is about declared sizes, not rendered glyphs.** A font whose figures
  are narrower than assumed is not covered — the same standing limit as F-019's tabular-numerals
  attestation.
- **SVG text rendering depends on the font being present.** The card names `Noto Sans JP`, which
  the app bundles; anything rasterising the document outside the app may substitute, and then the
  layout is not what was designed. Another reason the claim stops at the document.

### Neutral

- `react-native-svg` was already a dependency and had no importer. It has one now.

## Alternatives considered

**Rasterise a React Native view with `react-native-view-shot`.** The obvious approach, and it
makes the acceptance criterion permanently unverifiable. Rejected on that, not on the dependency.

**Render the card as React Native views and call that the card.** Then there is no artefact at
all — nothing to compare, nothing to send later, and "the same card" would mean "the same
component tree", which is a claim about our code rather than about what a person sees.

**Put the hex on the sample and compute a per-entry foreground.** Rejected: it invents a
contrast decision the manifest exists to make, and it would have to be checked against 120
backgrounds to be trusted.

## Revisit when

- FR-51 lands. Turning this document into a PNG or a PDF is where the rasterisation question
  becomes real, and where "the same card" will be tempted back towards meaning pixels.
- A palette card is wanted. The document approach extends; the layout constants do not.
