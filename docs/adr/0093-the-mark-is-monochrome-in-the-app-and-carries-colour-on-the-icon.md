# ADR-0093 — The mark is monochrome inside the app and carries colour on the icon

## Status

**Accepted** — F-165 (second pass). Amends
[`BRAND.md` §7](../design/BRAND.md#7-the-mark) by interpretation rather than by exception.

## Date

2026-09-06

## Context

The brand direction has said since R0:

> a wordmark-led identity with a geometric mark suggesting *arranged* colour — relationship,
> adjacency, interval — rather than a swatch or a droplet. It must work in one colour, at 16 px,
> and under protan, deutan and tritan simulation.
>
> **A mark that depends on colour to be recognisable is disqualified from this product.**

Two marks were drawn against that and both were reported, in the reporter's words, as *"not
relevant"* and *"not professional"*:

- **F-141** — two rectangles offset by the interval.
- **F-165, first pass** — 彡, the radical that means colour in 彩, as three 45° strokes.

The second was a better idea than the first and failed the same way, which is the useful part:
**both were abstract geometric minimalism**, and "not relevant" is what that produces. A person
looking at an icon has a second to work out what the app is, and an abstraction gives them no
route at all — however good the sentence explaining it.

There was a second, quieter cause. `brand.test.tsx` asserted **exactly one `fill`** in the
emitted SVG and called that "the CVD guarantee". That assertion made monochrome a property of the
build rather than a decision, and it went unexamined through two redraws: **a colour product
whose icon has no colour in it.**

## Decision

**The mark is monochrome everywhere inside the app, and the app icon carries five colours.**

`Mark` — the component, used in headers and in the wordmark lockup — takes a single foreground
token and has no way to express more. The generated **icon** and **adaptive icon** fill the five
petals with five corpus colours; the eye takes the ink. The **splashes stay monochrome**.

**The five colours are corpus entries, pinned by slug**, not brand colours invented for the
purpose:

| | slug | hex | OKLCh |
|---|---|---|---|
| 実赤 Fruit Red | `mi-aka` | `#AC473E` | L 0.53 · C 0.134 · h 28 |
| 秋畑 Autumn Field | `aki-batake` | `#9F7850` | L 0.60 · C 0.074 · h 66 |
| 夏影 Summer Shade | `natsu-kage` | `#4E8164` | L 0.56 · C 0.072 · h 158 |
| 沖凪 Calm Offing | `oki-nagi` | `#449AAC` | L 0.64 · C 0.086 · h 214 |
| 夜川 Night River | `yoru-kawa` | `#507DB3` | L 0.58 · C 0.098 · h 254 |

Hues spread across the circle so the mark reads as *colours*; lightness held between 0.53 and
0.64 so they sit together calmly rather than shouting past each other. A year, in five colours.

## Why this does not breach the disqualifying line

The line is about **recognisability**, not about ink. It disqualifies a mark you cannot identify
without seeing its colours — a mark whose meaning is carried by hue.

This one's silhouette is a five-petal rosette however it is filled, and that is **asserted rather
than argued**: `brand.test.tsx` renders the mark in five colours and in one and compares the
geometry, with a decoy that must fail when the silhouette moves. That is a stronger check than
the fill count it replaces, which could only ever have said *this document has one colour in it*
— true of a blank page.

*"Works in one colour"* is satisfied literally, and by the version of the mark that appears most
often: every instance inside the app is one token.

## Why the app stays monochrome, and this is the load-bearing half

**Every surface in this product is used to judge a colour.** A five-colour mark in a header would
be five colours competing with the one the person is trying to read — which is the failure the
whole design system exists to prevent, and which `visual-taste`'s own test names: *put a real
garment colour on screen inside this interface; can you judge it accurately?*

The icon is the one surface with nothing to compete with. A home screen has no garment in it.

## Consequences

**Good** — the icon says what the app is at a glance, for the first time. The colours are the
product's own data, with provenance, rather than a brand palette somebody chose; `--prove` checks
each hex against the published corpus and fails by name if one moves, so a corpus republish
becomes a decision rather than a silent redraw. And the CVD check now tests the property the
brief actually states.

**Bad** — **the icon and the in-app mark are no longer the same artefact.** Somebody comparing
them side by side will see two things, and the argument for why is a paragraph rather than a
glance. The mitigation is that the *geometry* is identical and generated from one source, so they
can never drift in shape; only the fill differs.

**Bad** — five colours is five decisions, and colour palettes age. These are pinned to corpus
entries, which are versioned and provenanced, so the ageing is at least traceable.

**Neutral** — the generator gained an anti-aliased rasteriser. It previously refused any size
where the grid unit was not a whole number, on the ground that *"a fractional edge is a soft
edge"*. A circle has no straight edges to snap, so the rule changed rather than the goal: every
pixel is sampled 4×4 and the coverage becomes the blend, which is what an anti-aliased edge is.
Snapping a curve to whole pixels is staircasing, not sharpness. The integer-unit check stays,
because it keeps the six discs in exact proportion and keeps the artefact signature arithmetic.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep the mark monochrome and try a fourth abstract shape** | Two failed the same way for the same reason. The problem was not which geometry; it was that an abstraction has no route to the subject. |
| **Colour in the app as well** | Fails the one test that matters for this product: a mark with five colours in it, on a screen where somebody is judging a garment colour, is five colours of interference. The icon has no such problem, which is exactly why the split falls where it does. |
| **A gradient, or a photographic icon** | Both are the generic answer, both look like every other app, and neither survives being drawn from geometry in source — which is the property that keeps the icon from drifting away from the wordmark (F-142). |
| **Read the corpus at build time rather than pinning** | More honest-looking and worse: a corpus republish would silently change the app icon's bytes, and `--check` would report a mismatch nobody asked for. Pinned with a proof that the pin still matches, the corpus can move and somebody has to decide. |
| **Amend BRAND.md to permit colour outright** | Unnecessary. The direction as written already distinguishes *works in one colour* from *is one colour*; what changed is that we stopped reading the second into the first. §7 records what was drawn rather than being rewritten. |
