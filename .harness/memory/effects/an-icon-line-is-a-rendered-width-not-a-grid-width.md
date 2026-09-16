# An icon line is a rendered width, not a grid width

**Effect:** [E-133](../../state/effects.json) · `manifest.size.iconStroke` → the emitters →
`glyphStroke` → every glyph · gates 3 and 4 · **medium**

## Why the link exists

F-220 measured the mockups' icon line at about 1.65 dp on `01`'s tab icons. Every glyph in `Glyph` is
drawn on a 24-unit grid, and an SVG stroke width is in grid units — so a constant stroke in the path
data renders thinner on a 16 dp icon and heavier on a 28 dp one. The token is therefore declared as
the width a person SEES, and `glyphStroke(size) = iconStroke × 24 / size` converts it per size.

**The conversion is the thing that breaks quietly.** Change the token and every icon changes weight
together, which is intended. Change the arithmetic — or draw a glyph whose stroke does not come from
the pen — and one icon drifts from the set, which nothing visual in the suite would notice.

## What holds it

- The parser refuses a stroke outside [0.5, 3] dp, a string, and an absent key — watched failing, with
  a decoy accepting both ends and the declared value (`manifest.test.ts`).
- `emit.test.ts`: the TypeScript, React Native and CSS targets each carry the declared width.
- `glyphs.test.tsx`: every stroked shape in every glyph renders at the token at 16, 20, 24 and 28 dp;
  a stroked shape with no width is counted, not skipped. A ring drawn 10 % heavier was planted and
  failed all four sizes.
- Token reach: `ICON_STROKE` is declared unreached on the web binding with its reason;
  `nativeIconStroke` is read by `Glyph`.

## What it does not hold

That 1.65 dp is right. It is a reading off a JPEG at the image's resolution, recorded as measured in
R9-MOCKUP-FIDELITY §5; F-221's device captures beside the mockups are where it gets confirmed.
