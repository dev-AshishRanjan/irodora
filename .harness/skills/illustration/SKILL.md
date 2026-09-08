---
name: illustration
description: Draw a picture for this product — from its own vocabulary, from tokens, carrying nothing the text does not, and beside a colour sample without competing with it.
---

# Skill: illustration

Rules: [`motion.md`](../../rules/frontend/motion.md) ·
[`ACCESSIBILITY.md`](../../../docs/design/ACCESSIBILITY.md) · ADR-0054

---

## 1. Draw from the subject's own world

The temptation is a mascot, a magnifying glass, a person shrugging. This product's subject is
**colour**, and the shapes it already uses to talk about colour — a sample outline, a well, a
reticle, a pair — are the shapes to draw when there is none.

`visual-taste` states the general form: the subject's own world is where distinctive choices come
from. The specific form here is that a drawing which could belong to any app belongs to this one
least.

**Draw the ABSENCE, not the thing.** An empty wardrobe is three sample outlines and a dashed
fourth — *there is room for another*. Four solid outlines would say *here are four things*, which
is the opposite.

## 2. Three rules, and the third is the one that gets broken

**Every colour is a token.** No literal, ever, so both themes and every CVD simulation measure a
drawing the way they measure everything else.

**Outline, never fill.** A filled shape at illustration scale is a large flat field of colour,
and this product asks people to judge large flat fields of colour a few centimetres away. An
empty state that competes with a garment sample has forgotten where it is.

**A drawing may never carry meaning the text does not.** Hide it from the accessibility tree —
`accessible={false}` plus `accessibilityElementsHidden` plus `importantForAccessibility` — and
make the sentence beside it the whole content. Golden rule 13 read strictly: a picture is a
channel, and a channel carrying something no other channel carries excludes somebody.

## 3. `react-native-svg` will paint black for you

**State `fill` on every element, including the ones that have no interior.** The library injects
`fill: #000000` where none is given, and it does it to a `<Line>` as readily as to a `<Path>`.

This has now been found three times: E-081 on a card nobody had looked at, F-185 inside HeroUI's
own spinner, and **F-191 in the file whose docblock warns about it**, written by the same hand in
the same commit. A rule you have just written down is not a rule you have followed.

Only the rendered tree can see it — the literal is in the library, so no scan of your source will
report it. **Register the drawing in the conformance suite before you use it anywhere.**

## 4. One grid, one stroke, one registry

Three drawings on three grids is three styles. Put every drawing in one coordinate system with
one stroke weight, key them by name in one table, and derive the union from the table so a name
with no drawing cannot compile — the shape `Icon`'s glyph registry already uses.

**One drawing per kind of emptiness, not one per screen.** Twelve empty states in this product
are three emptinesses: nothing collected, nothing measured, nothing put together. Twelve bespoke
pictures is twelve things to keep in a style and twelve chances for one to drift.

## 5. They do not loop

An empty state is read once and left. A looping animation on a screen whose message is *"there is
nothing here"* draws the eye back to the absence, repeatedly.

The motion in this product is **on arrival** — `Screen` enters and the drawing enters with it —
which is animation at the moment it means something. If you want a drawing to move, first say
what event it is responding to.
