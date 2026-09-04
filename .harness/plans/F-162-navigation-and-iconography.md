# F-162 — Navigation and iconography

**Status:** in_progress · **Release:** R6 · **Blocked by:** F-161 (done)

---

## What exists

`Icon` draws three glyphs — `icon.check`, `icon.alert`, `icon.cross` — as composed `View`s. The
reasoning is ADR-0054's and ADR-0057's, and it holds: an icon **font** reintroduces the tofu
failure, where a missing glyph renders as a box, silently.

Its registry test asserts coverage **in both directions**: every icon token declared in the
manifest's `statusPairing` has a glyph, and every glyph is a declared token. That is what keeps
the two from drifting.

F-145 made the tab bar **typographic** on purpose — 10px uppercase labels at the `label` step.
The reporter wants icons.

**Icons plus labels is strictly better for NFR-9 than either alone**: shape and word are two
channels where the bar currently has one plus a colour.

---

## Two registries, because they are two different things

Navigation icons are **not statuses**. Putting them in `GLYPHS` would break the second direction
of the existing test — *every glyph is a declared status token* — and forcing five tab icons into
`statusPairing` to satisfy it would be a lie about what those entries are.

So: a second registry, with the **same bidirectional discipline** applied to its own subject. Every
tab has a glyph; every glyph belongs to a tab. The rule was right; only its subject differs.

---

## Drawn by us, as SVG, and why that is not a reversal

The three status glyphs are `View`s because a check, a triangle and a cross are rectangles. A
house, a grid, a lens and a person are not — composing them from bordered `View`s produces
something crude enough that nobody would call it minimal.

`react-native-svg` is a **required peer of heroui-native**, so it is already unavoidable in every
tree that renders this package — the same argument that admitted `react-native-reanimated` in
F-144 and `react-native-safe-area-context` in F-159. It costs no new dependency.

**And it does not weaken ADR-0057.** That decision is about FONTS: a font maps a codepoint to a
glyph *at render time*, and a missing mapping is a tofu box nobody sees in review. An SVG path is
the shape itself, shipped in the source. There is no lookup to fail.

**The paths are ours, not Lucide's.** Lucide is MIT and would be a defensible choice, but vendoring
third-party artwork carries the provenance obligations `content/AGENTS.md` sets out for everything
else this product ships — and five geometric glyphs matching a mark already made of rectangles is
both less work and more coherent than a general-purpose set. Criterion 4 — *one family, one
source, no mixed metaphors* — is then true by construction rather than by discipline.

### The five

| tab | glyph | silhouette |
| --- | --- | --- |
| index | a house | pointed roof |
| atlas | a 2×2 grid | four squares |
| lens | a circle inside a frame | the reticle it actually draws |
| wardrobe | two overlapping rounded rects | garments |
| profile | a circle over an arc | a person |

Distinguishable **in silhouette**, which is what NFR-9 asks for — not by colour, and not by
weight. `cvd` covers the colour half; the shape half is why they are listed here as outlines.

---

## Criterion 2 is a restraint, and it is the hard one

> *"Icons appear where they carry meaning and nowhere else"* — and the reporter said it twice:
> *"Not too much, keep things minimal."*

So this feature adds icons **to the tab bar and nowhere else**. Every other surface keeps its
words. A screen that gains an icon should gain it because somebody asked what the icon was doing,
which is a question for the feature that owns that screen.

---

## Risks

**A house for "home" is a metaphor, not a description.** It says *this app's front page*, which is
a convention rather than a meaning — the honest alternative is a word, and the word is still there
beneath it.

**Five glyphs drawn by hand will not be as even as a professional set.** Optical balance across an
icon family is real work, and this is a first pass at a 24-grid with one stroke weight.

---

## Definition of done

- [ ] The tab bar shows an icon and a label; the shapes differ in silhouette
- [ ] A second registry, bidirectional against the tab list, with a test
- [ ] The status glyph registry and its test are untouched
- [ ] No icon anywhere else, and no icon is the only channel for anything
- [ ] `pnpm verify:ci` green
- [ ] The optical judgement attested rather than claimed
