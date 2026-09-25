# Irodora — Design System

> **From R9 the mockups decide where this document and an approved mockup disagree** ([golden rule 14](../../AGENTS.md)). "Near-achromatic by rule" and the token values below are superseded by the mockup palette, which **`F-225` adopted on 2026-09-25** ([ADR-0111](../adr/0111-the-palette-is-the-mockups-and-a-sample-is-judged-against-the-surface-it-sits-on.md)): the README's Sumi Charcoal and Washi Minimal, plus Slate Graphite and Obsidian Noir derived per ADR-0107. The departures and their reasons are in [`R9-MOCKUP-FIDELITY.md`](R9-MOCKUP-FIDELITY.md) §6 (C10, C11); golden rules 11–13 are not affected and still bind.

| | |
|---|---|
| **Status** | **Approved** · 2026-08-14 · **values corrected 2026-08-15** ([ADR-0044](../adr/0044-status-tokens-corrected-and-status-colour-is-text.md)) |
| **Source of truth** | [`design-system.manifest.json`](design-system.manifest.json) |
| **Decisions** | [ADR-0020](../adr/0020-design-tokens-are-oklch-native.md) · [ADR-0021](../adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md) · [ADR-0033](../adr/0033-frontend-foundation-own-the-token-layer-headless-primitives.md) · [ADR-0043](../adr/0043-the-oklch-field-is-authoritative-and-srgb-is-derived.md) · [ADR-0044](../adr/0044-status-tokens-corrected-and-status-colour-is-text.md) |
| **Skills** | [`build-ui`](../../.harness/skills/build-ui/SKILL.md) · [`visual-taste`](../../.harness/skills/visual-taste/SKILL.md) · [`contrast-checker`](../../.harness/skills/contrast-checker/SKILL.md) · [`motion`](../../.harness/skills/motion/SKILL.md) |

---

## The thesis

> **Soft chrome, unaltered colour.**

Everything is generous — 20 px cards, 28 px containers, full pills, 44 px targets, the
mockups' slate neutrals (ADR-0111). **The swatch is generous too, in proportion** ([ADR-0090](../adr/0090-a-swatch-corner-is-bounded-by-the-area-it-removes-not-fixed-at-zero.md)).

This said `radius: 0` at every size, forever, and argued the case well: corner radius removes
sampled area from exactly the region the eye uses to judge a large flat colour, *"and the effect
grows as the swatch shrinks — at 24 px a 10 px radius eats a fifth of the shape"*.

**That worked example is the reason the rule changed rather than the reason it held.** 10 px on
24 px is a ratio of 0.42, and it does cost about 15 % of the sample — because a rounded square
loses `(4 − π)r²`, so the fraction lost depends on radius *relative to* size, exactly as that
sentence says. The corner was a ratio for two releases on that reasoning. **It is a scale step
now** ([ADR-0103](../adr/0103-the-scales-are-the-mockups-and-a-shadow-exists-only-where-one-is-drawn.md)):
F-220 measured what the mockups draw and they are lengths — 4 to 11.5 dp across 28 images, `sm` or
`md` per element. The ratio survives as the CEILING the manifest declares and refuses a corner
beyond — `min(step, 0.25 × side)` — so a sample too small for its step still rounds by a quarter of
its side.

What is given up is the older idea that a hard edge surrounded by softness reads as *deliberate
precision*. It is a real idea and it lost to the person looking at the product, who asked twice.

### Where it comes from

**A colour page is a product page, and here the colour is the product.** Fashion retail
solved our hardest constraint years ago: SSENSE, Net-a-Porter, COS and Aesop are near
monochrome *because the clothes carry the colour*. An entire industry arrived independently
at "the interface must not compete with the product"
([[the-constraint-and-the-taste-usually-agree]]).

So the swatch gets the treatment a garment photograph gets — 400 px, uninterrupted, undecorated
— and the specification sits quiet beneath it, exactly where size-and-composition sits on a
product page.

### Taken and refused, deliberately

| From | Taken | Refused |
|---|---|---|
| **Apple HIG** | Deference — chrome recedes, content leads. 44 px targets | **Translucency and vibrancy near a swatch.** A material that tints what shows through it is disqualified on a colour surface |
| **Material 3** | Tonal elevation — surfaces lift by tint, not shadow, with one drawn exception (`25`'s light card, ADR-0103). Generous radii and state layers | **Dynamic colour.** Deriving a UI palette from a source colour would tint the entire interface from the thing being examined. Fatal here |
| **Fashion retail** | The whole information hierarchy: product first at full size, spec quiet beneath, editorial type, air | — |

---

## The manifest is the source of truth

```
design-system.manifest.json
   │
   ├─→ CSS custom properties     (with @supports P3 upgrade)
   ├─→ TypeScript constants      (@irodora/design-tokens)
   ├─→ React Native styles
   └─→ Tailwind v4 theme
```

Four targets, one source. A token that exists in CSS but not in React Native is a divergence
between web and mobile, and there is no mechanism for one to appear — which is also why
[Astryx was not adopted](../adr/0033-frontend-foundation-own-the-token-layer-headless-primitives.md):
it is web-only.

**The `contrast` gate reads this file and is blocking**, from the moment it exists (F-003).

### Token naming is shadcn/Base-UI compatible

Deliberately, so the wider ecosystem's tooling — tweakcn, efferd blocks, coss blocks —
remains usable as reference and as a starting point. **That is interoperability, not
adoption.** The values are ours, and so are the rules a general-purpose system would have no
reason to encode.

---

## What the manifest carries that a normal design system does not

**One selection treatment, and navigation is not selection** (F-176). Until R7 "chosen" was
expressed independently in three components and differed in all three — a grey border on
`Swatch`, an inverse fill on `Chip`, a lighter ground on `Tabs`. Every one drew a declared
pairing, so gate 9 measured all three and no check could see that they disagreed.

It is now `selectionTone` in [`selection.tsx`](../../packages/ui/src/selection.tsx):
`accent.muted` ground, `accent` edge, a drawn `icon.check` badge, and the announced state.
Two properties of it are load-bearing rather than stylistic — **the edge is reserved in every
state**, so selecting something never moves it, and **focus takes the edge while the fill and
the mark keep saying *chosen***, so the two states are visible at once.

`currentTone` is the same thing without the mark, for tabs and navigation: a tab is *where you
are*, and a tick would claim *what you chose*. The conformance rule `selection-treatment`
reads the treatment out of the rendered tree, so a component that draws its own fails.

**No chromatic accent: the primary action is white or ink** (F-225, [ADR-0111](../adr/0111-the-palette-is-the-mockups-and-a-sample-is-judged-against-the-surface-it-sits-on.md)).
The README's primary action is a white pill on Sumi and a sumi-ink pill on Washi, with the ground as
its text, so `accent` and `inverse` take those values and `accent.foreground` takes the ground.
`link` stays the same value as `foreground`, because there the underline is the channel. So
emphasis is carried by weight and grey, as it was before R7.

**The gold accent is withdrawn.** R7 gave the product one accent (F-175,
[ADR-0099](../adr/0099-the-ground-lifts-off-near-black-and-the-product-gets-one-accent.md)): gold on
dark and olive-gold on light, recorded as a chroma exception and kept away from every sample. No
mockup draws it. `accent.muted` is level 1, so a selected tile shows its card, and the one
selection treatment above keeps its shape with those values.

**The ramp is the README's**, a cool slate at h ≈ 264°. Sumi's ground is `#15171B` and its levels
are `#20232A` · `#282C35` · `#323742`. Washi's ground is `#F6F5F2`, with levels `#FFFFFF` ·
`#EEEDE8` · `#E5E3DE`. Where a blocking gate forced a value off the drawing, it moved the smallest
OKLab lightness step that passes, hue and chroma held. Every move is listed in
[R9-MOCKUP-FIDELITY §4 E3](R9-MOCKUP-FIDELITY.md#e3--accessibility-floors-that-are-blocking-gates).
**Focus is `ring`** (`#788090` / `#3A3B3E`), and `border.strong` (`#464D5B` / `#1A1B1E`) is
decorative wherever a label identifies the component. Where nothing else identifies it, as with the
sheet's drag handle, the token is `border.indicator`, checked at 3:1 like `ring`.

**`swatch.well`** — the ground beneath every colour sample, at every size. Functional, not
decorative: simultaneous contrast means whatever touches a sample changes how it reads. **It is
no longer neutral** ([ADR-0111](../adr/0111-the-palette-is-the-mockups-and-a-sample-is-judged-against-the-surface-it-sits-on.md), R9-MOCKUP-FIDELITY C11). The mockups draw every sample on its card,
the person decided twice to follow them, and so the well is level 1. The surround carries C 0.0086 to
0.0206. A neutral well at the same lightness would differ from it by ΔE00 2.94 to 6.50, and
`mockup-palette.test.ts` reproduces those numbers. ADR-0096 existed to prevent exactly this, and it
is superseded. `swatch.keyline` (`#FFFFFF22` / `#1A1B1E18`) is the README's hairline around a
sample; the older neutral hairline stays until F-233 draws the keyline.

**No status colour beside a sample** — the same physics, one step out. A saturated `status.*`
token adjacent to a colour sample changes how that sample reads, and the person is looking at
the sample in order to decide something about it. A red "poor quality" chip beside a green
fabric makes the fabric look different from the same fabric beside a grey one.

The rule is narrow so that it survives: **siblings**, and `swatch.well` on their shared parent
is the escape — if the sample is already in its well, the status colour is not touching it. A
rule that flagged a status chip in a header and a sample three screens down would be switched
off within a week, which is worse than no rule.

**Every component involved can be individually correct while the composition is wrong**, which
is why this is checked over the rendered tree (`checkStatusAdjacency`, F-069) rather than by a
token pairing. No `pairsWith` can express it: the other side of the adjacency is an arbitrary
garment colour.

**`radius.swatchRatio: 0.25`, bounded by `_minStraightEdgeFraction`** — the ceiling a sample's
corner may not exceed. The corner itself is a SCALE STEP (`sm` or `md`, bound per element in the
inventories), and the ratio is what keeps a small sample a field: `min(step, 0.25 × side)`. A pure
ratio gave the hero an 85 px corner, which is a curve rather than a corner (ADR-0103).

This was `radius.swatch: 0`, described here as inviolable.
[ADR-0090](../adr/0090-a-swatch-corner-is-bounded-by-the-area-it-removes-not-fixed-at-zero.md)
replaced the zero with a bound on the AREA a corner removes, and
[ADR-0094](../adr/0094-a-swatch-corner-is-bounded-by-what-stays-straight.md) replaced that bound
in turn: area was the wrong measure. Colour appearance does depend on area and needs an
order-of-magnitude change to matter, so the difference between losing 1.3 % and 5.4 % of a swatch
is invisible — while the 2 % ceiling held the corner at 5.5 px on a 44 px swatch, which is a
rectangle with the edges taken off. **What degrades a sample is the corner growing until the
shape stops being a field**: at ratio 0.5 a square is a circle, and a circle is a worse container
for judging a colour because proportionally more of it is edge, which is where simultaneous
contrast acts. So the loader now enforces that half of every edge stays straight.

**`chromaCeiling`** — no token may exceed chroma **0.026** without a recorded exception
([ADR-0111](../adr/0111-the-palette-is-the-mockups-and-a-sample-is-judged-against-the-surface-it-sits-on.md)). The value is the largest chroma the mockups draw in chrome (`#768290`, C 0.0256),
rounded up, and a test recomputes it. It was 0.01 while the interface was near-achromatic by rule.
The chrome is now the mockups' cool slate, and the rule it keeps is that nothing chromatic enters
the chrome unrecorded. **An exception names a token or the drawn elements**: chroma a mockup draws
where no token exists yet (C10, ADR-0110) is declared by inventory element, with its measured tints
and the feature that mints its token (the census is in R9-MOCKUP-FIDELITY §6).

**`cvdPairs`** — semantic pairs asserted distinguishable under simulated CVD at severity 1.0.
The product's own interface is held to the standard it applies to outfits. **The first time
that was measured, in F-003, five of eighteen combinations failed** and the status values
changed as a result ([ADR-0044](../adr/0044-status-tokens-corrected-and-status-colour-is-text.md)).

**`usage`** — every colour token declares whether it is `text`, `largeText`, `nonText` or a
`surface`, because a contrast gate cannot pick a WCAG minimum without knowing which it is
looking at. The default is the strictest, so an omission fails safe. For `status.*` the value
is `text`, and that single classification — not the lightness values — is the decision
ADR-0044 is really about.

**`compositeOver`** — a translucent token names **every** ground it may sit on, and the gate
judges it on the worst. Naming one ground lets a check pass a black hairline on white while
it is invisible on a meter track.

**`foreground.3` is ordinary text again, and has a card twin** (F-225, [ADR-0111](../adr/0111-the-palette-is-the-mockups-and-a-sample-is-judged-against-the-surface-it-sits-on.md)). The README's
tertiary `#768290` passes 4.5:1 on Sumi's ground but not on its cards. So `foreground.3` keeps the
drawn value on the ground, and `foreground.3.card` (`#94A1AF`) is its E3 move for levels 1–3. On
Washi, both are `#5D6674`. **No token is large-text-only any more**; the machinery below stays
and is proven against a stand-in.

*Until F-225:* **`foreground.3` was `usage: "largeText"`** — it failed AA against every surface
at small sizes, so micro-labels used `foreground.2`. Until F-003 this restriction was *claimed* to be gate-
enforced while `foreground.3` appeared in no `pairsWith` list, so nothing checked it at all.
It is now declared on the three surfaces that carry secondary text and checked at 3:1, and the
generated TypeScript emits `TEXT_TOKENS` and `LARGE_TEXT_TOKENS` **derived from the manifest's
own `usage` field**, with `TextToken` and `LargeTextToken` as literal unions of those names —
so `foreground.3` is not assignable where a `TextToken` is expected, structurally rather than
by declaration. (The first attempt used phantom brands that nothing produced and nothing
applied, so this sentence was false for as long as it stood. The F-003 evaluation caught it.)
The remaining half — catching a 13 px label that uses it — needs components and lands with
F-017.

**Greyscale `chart.1…5`** — series are separated by lightness, marker shape and a direct
label. A hue-coded chart would put five competing colours beside a sample the user is trying
to read, and hue-coding is also the encoding that fails under CVD. The accessible answer and
the correct-perception answer are the same answer.

**One icon set, and its line is a token** (F-228). Every icon a mockup draws is one entry in
[`Glyph`](../../packages/ui/src/Glyph.tsx), keyed by the name its inventory binds — 65 of them,
checked in both directions against `mockups/inventory/`, so an icon renamed there fails in
`@irodora/ui` rather than at a screen. **`size.iconStroke` (1.65 dp, F-220's reading of `01`'s tab
icons) is a rendered width, not a grid width**: a glyph draws its lines at `iconStroke × 24 / size`
grid units, so a 16 dp icon and a 28 dp icon carry the same line.

**A glyph is outline or solid as its governing element draws it** — `00`'s pencil, `02` and `03`'s
sun and `13`'s eye, figure and scales are solid, and thirteen glyphs draw no line at all. The first
draft made every one an outline, which was a house style rather than the mockups (F-228's review),
and where two governing elements drew one name differently the element took a name of its own:
`close-circle`, `hue-ring`, `image-solid`, `palette-solid`, `lock-solid`, `seal-star`, `seal-check`,
`filter-lines`. The ink is one colour — tint is the surface's (R9-MOCKUP-FIDELITY §6 C10, and OQ-37
for the icons it does not list) — and glyphs differ by silhouette, so the five `score-*` kinds are
five shapes before they are five colours (NFR-9). Four have the filled drawing a mockup uses for an
active state: `home` (01), `lens` (02), `profile` (02, 15, 18) and `compass` (09); asking any other
glyph for a fill draws it unchanged.

A glyph is **decorative to a screen reader**. One that is the whole of a control is an
[`IconButton`](../../packages/ui/src/IconButton.tsx), whose `label` is required by type and is its
only name — the props that could add a second name, change the role, contradict the state or hide
the control are refused by type and removed at render, because React Native lets an `aria-*` prop
override its `accessibility*` twin. `NavIcon` and the status `check` and `cross` draw through the
same registry; the status alert triangle, which no mockup draws, does not.
`scripts/verify-app-glyphs.mjs` holds the app to it: no screen imports `react-native-svg`, an icon
or drawing library, or an image file, and none writes SVG markup — except the share card, which is a
document rather than an icon
([ADR-0070](../adr/0070-a-shareable-card-is-a-deterministic-document-not-a-bitmap.md)), whose
exemption names the one binding it may take. What it cannot see is a drawing made of `View`s, or a
text character standing in for an icon — four places still spell one as `✓`, `●` or `○` (**F-280**).
Nor does anything yet check that a glyph LOOKS like the element it was drawn from (**F-281**); the
F-228 review caught nine that did not, by eye.

**One illustration set, at a measured tone** (F-229). The line art the screens are drawn with —
the plum branch, the kimono, the leaves, the sashiko stitching, the seigaiha wave, the silk band, the
hanger, the viewfinder, the documents — is one set in
[`Illustration`](../../packages/ui/src/Illustration.tsx), keyed by the names the inventories bind and
checked against them in both directions. **Each drawing carries its own grid**, because a 96-unit
silk band and a 24-unit sashiko tile are not one square, and `size.artStroke` (0.5 dp — half the icon
line) is converted into those units at the size being rendered, so the whole set holds one line
everywhere.

**The tone is a measurement.** F-229 read every bound element off the images and found the art drawn
two ways: as a **backdrop** behind a screen's content at 0.10 – 0.18 of `foreground` (median 0.15,
declared as `opacity.art`), and as a **figure**, where the drawing is the content, at 0.80 – 0.96.
No declared colour token matches that backdrop ink — the nearest are `chart.5` and `chart.4` at
ΔE00 4.6 – 7, which mean something else — so art is the foreground token turned down, not a colour of
its own. `27`'s hanger is tan, and `C10` declares that — but no surface can pass that tint yet: the ink
is constrained to the two quiet foregrounds, and widening it belongs to F-236, which builds `27`.

Three rules hold, and the second changed in R9. **Every colour is a token.** **Outline, with the
fills the mockups actually draw** — R7's rule was outline-only, and that reasoning survives as
*where* art may go rather than as a ban on a fill, since `27` draws a solid hanger and `18` fills the
lines on its document — which is which is read off the image, and F-229's review caught the first
pass drawing `18`'s page solid where the mockup strokes it. **A drawing never carries meaning the text does not**: every one is hidden from a screen
reader, and every query in its test has to ask for hidden elements to see it at all.

**Never over a sample** is asserted over the record's own geometry — no drawn illustration box
overlaps a drawn sample box, across 33 drawings and the 86 elements that draw colour a person
judges — swatches, bands, kasane strips and theme tiles — because simultaneous contrast is
the same physics that puts a sample in a well (F-069). The set carries a **version and a digest of
its path data**, so a redrawn line is a recorded change. What nothing yet checks is whether a drawing
LOOKS like the element it was drawn from (**F-281**); `18`'s script-face signature is not drawn at
all, pending **OQ-38**.

---

## Component contract

Every component in `@irodora/ui` must:

1. Consume tokens. No literal values.
2. Define every state its **kind** requires — `interactive` (default · focus · active ·
   disabled · loading), `data` (default · loading · error · empty), `static` (default).
   The kind is the only lever: a component cannot shorten its own list. There is no
   `hover` on a touch surface, and the conformance suite asserts that two declared states
   **render differently**, because a state that returns an identical tree exists in name only.
3. Take behaviour from **React Native's own primitives** — `Pressable`, `Text`, `Modal`,
   `FlatList` ([ADR-0054](../adr/0054-react-native-core-primitives-and-ui-stays-a-package.md)).
   There is no headless library: ADR-0033's argument was ARIA and focus management, and on
   React Native the accessibility tree *is* the platform's.
4. Work in both themes and both locales.
5. Be registered in the conformance registry, or rendered by something that is —
   `scripts/a11y-scope.mjs` fails on a component reachable from neither.
6. **Never rely on colour alone** to convey state.

### Colour components carry two more

7. **Never render a colour without its provenance.** The type system enforces it
   ([ADR-0005](../adr/0005-measurement-provenance-is-a-type.md)).
8. **Never place a decorative colour adjacent to a sample.** The `swatch.well` is mandatory.

---

## Verification

| Gate | Checks |
|---|---|
| `contrast` | Every `pairsWith` combination at the AA minimum its `usage` selects, **all four themes** (Sumi, Washi, Slate, Obsidian); APCA reported, never substituted; every `srgb` recomputed from its own OKLCh (ADR-0043); `chromaCeiling` on **every** token, exceptions recorded in the manifest. The **rendered** half landed in F-017: every colour a component paints must resolve to a token — an unresolvable one is a failure, never a skip — and a `largeText`-only token used below the size floor is reported. Each half prints which one it is, because neither can do the other's job |
| `a11y` | WCAG 2.2 A/AA over the rendered **accessibility tree**, every component and every screen, zero violations. Not axe — there is no DOM ([ADR-0055](../adr/0055-the-a11y-gate-renders-under-jest-expo-and-proves-the-tree-not-the-pixels.md)). It proves the tree, **not the pixels**: clipping at 200 %, overflow and measured tap-target size stay attested |
| `cvd` | `cvdPairs` separable at severity 1.0 |
| ~~`web-perf`~~ | Retired with the web surface ([ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)). It was still listed here, and still named in F-017 and F-038, nine months after the gate stopped existing — see F-074 |
| `lint` | No raw colour literals; no hard-coded user-facing strings; no arbitrary z-index |

---

## Still open

- ~~**Primitives**~~ — settled: React Native's own
  ([ADR-0054](../adr/0054-react-native-core-primitives-and-ui-stays-a-package.md)).
- **Perceptual Atlas arrangement** — colours positioned by hue and lightness rather than in
  rows. Possibly the most distinctive thing on the site, possibly an unnavigable novelty.
  Needs a prototype.
- ~~**Default theme on first visit**~~ — settled: the manifest's `defaultTheme` (`dark`),
  applied when the platform expresses **no preference**. `unspecified` counts as no
  preference; a stated `light` is honoured. It had been decided three ways at once —
  a fallback in a screen, `dark` in the manifest, and "open" here.
- **The mark** — in-product, or app icon only.
- **Fonts:** the Japanese face is a bundled Noto Sans JP subset generated from the corpus
  ([ADR-0057](../adr/0057-the-japanese-face-is-a-bundled-noto-sans-jp-subset-generated-from-the-corpus.md));
  **F-076** carries the asset. Latin is the platform face — Geist was "intended, licensing to
  confirm" and nobody confirmed it, and Latin has no tofu failure mode, so the script that can
  fail silently gets the bundled font and the script that cannot, does not.
  **The manifest's `families` are CSS stacks and React Native has no fallback cascade**, so
  the RN target deliberately emits no family name until the asset exists — naming a face the
  bundle does not carry fails over to the system font silently.
