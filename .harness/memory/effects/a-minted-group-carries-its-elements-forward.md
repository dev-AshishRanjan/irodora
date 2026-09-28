# E-159 — A minted group carries its elements forward

**Link:** the manifest's `glyph.*` tokens → `Glyph`'s `SPECTRUM_GLYPHS` · `checkChromaCeiling` · the
runtime emit · coverage **Guard:** `c10-exceptions.test.ts`'s group block, `spectrum.test.tsx`,
token reach **Severity:** medium **Feature:** F-232 (ADR-0110's amendment)

---

## Why B changes when A does

Chroma a mockup draws before a token holds it is declared by ELEMENT (E-149). The feature that
builds the surface mints the token. F-232 minted the first two: `00`'s colour wheel and palette,
each an eight-stop hue sweep measured off the board. They landed as `glyph.wheel.1–8` and
`glyph.palette.1–8`.

The mint is declared as a **token group** exception: its `tokens`, the `elements` that draw it,
and `mintedBy`. The element exception is retired in the same change. The group carries the
elements forward, so each drawn element stays covered exactly once.

Rename, add or drop a stop and four readers move:
1. **`Glyph`'s literal list.** The reach check cannot see a token name built by concatenation, and
   its own rule is to stop constructing names, not to loosen the check.
2. **The chroma check,** which excepts the group's tokens and reports a group none of whose stops
   still needs it.
3. **The runtime emit,** which expands the group into one token exception per stop, because a
   device checks tokens.
4. **Coverage,** which counts a group's elements as covered.

## How to check

- **c10-exceptions.test:**
  - eight stops per group in every theme;
  - the two element exceptions gone;
  - a group carrying the wrong element leaves the drawn one uncovered;
  - a group without elements, or beside a token, is refused;
  - a stale group is reported;
  - one runtime exception per stop.
- **spectrum.test:** the stops in order; the colour laid over the silhouette; the one-ink decoy.
- **Conformance:** reads both spectrum buttons in every palette, and every stop resolves to a
  token.

## For the next mint

F-244 (`03`'s hue ring), F-257 and F-262 mint the same way. Measure, add the tokens, declare the
group with its elements, retire the element exception, and give the drawing its colour layer over
the unchanged silhouette.

Related: [[chroma-a-mockup-draws-before-a-token-exists-is-declared-by-element]],
[[the-icon-registry-is-keyed-by-the-inventories]].
