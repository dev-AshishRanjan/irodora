# Plan: F-165 — The mark is redrawn

| | |
|---|---|
| **Feature** | F-165 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69 |
| **Service / package** | `packages/ui` · `scripts` · `apps/mobile/assets` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-06 |

---

## Intent

*"The Logo/Icon of this project is not good. It's not relevant and professional."* — reported,
then reported again unchanged. Done, to a person: the icon on their home screen looks like it
belongs to a product about Japanese colour, and they can tell it apart from thirty other icons.

## The audit, before anything is proposed

The `visual-taste` skill requires this stated specifically. What is wrong with the F-141 mark —
two identical rectangles, one offset by the interval:

1. **It has no closed silhouette.** Two free-floating slabs. Every icon that reads on a home
   screen has one figure you could trace; this has two, and it asks the eye to perform the
   arranging that the concept claims is the subject.
2. **The idea is legible only in prose.** The equality of gap and offset — the whole point — is
   invisible without measuring. A mark that needs its caption is a diagram.
3. **It reads as something else.** Two offset bars is a pause glyph, or a chart fragment. The
   rejection table ruled out three bars as "a bar chart" and then shipped two.
4. **Nothing in it is colour, and nothing in it is Japanese.** The brief asks for *arranged
   colour*; rectangles are arranged, and a person looking at it has no route to the product.
5. **The wordmark carries the identity alone** — so the one surface with no wordmark, the icon,
   is the weakest. That is backwards.

## Approach

**The mark becomes 彡 — the radical that means colour in 彩**, the character in *irodoru*, the
verb this product is named after.

That is the answer to the pre-flight question *"could this be any other product?"*: no, by
construction. It is not an abstraction of the subject; it is a piece of the subject's own
writing.

**Drawn as three equal strokes at 45°, separated by the interval.** Thickness, gap and shear are
**one quantity used three times** — which keeps and strengthens F-141's real idea (間 as the
subject rather than the leftover) while giving it a figure that reads.

```
grid 24, interval 4

        ▄▄▄▄▄▄▄▄▄▄▄▄        ← y 2..6     each stroke: bottom edge x 2..18,
       ▄▄▄▄▄▄▄▄▄▄▄▄           (gap 4)      top edge x 6..22 — a 45° shear of 4
        ▄▄▄▄▄▄▄▄▄▄▄▄        ← y 10..14
       ▄▄▄▄▄▄▄▄▄▄▄▄           (gap 4)
        ▄▄▄▄▄▄▄▄▄▄▄▄        ← y 18..22
```

**45° is not a stylistic choice, it is the one angle that cannot blur.** Shear equals thickness,
so the edge advances exactly one pixel per pixel row at any scale where the unit is an integer —
which is the condition the generator already refuses to build without. Every edge lands on a
pixel boundary.

**Monochrome, and the register decided that.** The reporter chose *soft minimal — Muji/Ghibli*.
A three-colour icon would be more obviously "a colour app" and would contradict the register they
picked, and BRAND.md's disqualifying line is unambiguous.

**Reused:** the whole pipeline, which is worth more than any mark it has drawn — `MARK` as
geometry in source, `markSvg`, `generate-brand-assets.mjs`, `carriesMark` reading the artefact
back by proportion. `react-native-svg`, already a `@irodora/ui` peer since F-162, so `Mark` can
draw the same polygons the SVG emits instead of a second geometry in `View`s.

**New:** nothing conceptual. `markStrokes()` replaces `markFields()`; the signature is read down
a **column** instead of across a row.

**Increments:**

1. `MARK` and `markStrokes` + the brand test. Nothing else moves.
2. `Mark` draws polygons; the two-`View` renderer goes.
3. The generator's geometry reader, its scanline fill, and `expectedSignature`.
4. `png.mjs`: a column signature, and `carriesMark` for three equal strokes.
5. Regenerate the four assets; BRAND.md §7 records what was drawn and why.

## Files to touch

```
packages/ui/src/brand.tsx           — MARK, markStrokes, markSvg, Mark
packages/ui/test/brand.test.tsx     — the equality, the one fill, the 16px floor
scripts/png.mjs                     — scan an axis; the new signature
scripts/generate-brand-assets.mjs   — read the new geometry, fill a sheared band
apps/mobile/assets/brand/*.png      — regenerated, byte-compared by --check
docs/design/BRAND.md                — §7 gains what was drawn against the brief
```

## Anticipated effects

- **`MARK`'s shape changes** ⇒ three readers: the component, the SVG emitter, and the generator's
  regex reader. Guard: the generator reads the source rather than restating it (E-059) and throws
  by name when it cannot find a field — so a reshaped constant is a build failure, not a drift.
- **The artefact signature changes** ⇒ `carriesMark`, `expectedSignature`, `verify-apk.mjs`.
  Guard: `--prove` in the generator already watches every assertion fail against two decoys; the
  decoys must be updated with it or they stop discriminating.
- **The four PNGs change** ⇒ `--check` byte-compares. Guard: gate runs it; a stale asset fails.
- **`Mark` gains an SVG dependency in `@irodora/ui`** ⇒ the conformance suite must still paint it.
  Guard: `paintedColors` reads SVG `fill` since E-081, so the contrast gate sees it — which was
  not true before F-162 and is the reason this is now possible at all.

## Test plan

- **The equality, as an assertion rather than a caption:** thickness, gap and shear are one
  number. A mark where they diverge is a different idea that still looks about right, which is
  precisely what a test is for.
- **One fill**, with a two-colour decoy that must fail it — the CVD guarantee, kept from F-141.
- **The 16px floor:** the narrowest feature is the stroke, and it is asserted against
  `MARK_MIN_SIZE` rather than eyeballed.
- **The signature, both directions:** three equal ink runs down the centre column with two equal
  gaps; and the generator's `--prove` decoys (a solid square, a two-band figure) must still be
  rejected. A signature that accepts anything with ink in it is worse than none.

## Verification

```
node scripts/verify-state.mjs
node scripts/generate-brand-assets.mjs --prove
pnpm verify:ci
```

## Risks and open questions

- **Nobody has seen it on a home screen.** That is the criterion that matters and it is a device
  attestation, exactly as F-162's glyph legibility is. The specific risk is that three parallel
  45° strokes read as speed lines or a strike-through rather than as a written form.
- **It is a kanji radical, and most people will not read it as one.** That is acceptable — it
  has to work as a shape first — but it means the story is for the brand document rather than for
  the person holding the phone.

## Out of scope

- A drawn wordmark. The name is still set type, for the reason `brand.tsx` already records: React
  Native has no path-text and this product has no type designer.
- The splash composition, the store listing, and anything about `app.json` beyond the four assets
  the generator already owns.
