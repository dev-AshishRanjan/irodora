# A derived check catches the change a written-down one waves through

**Effect:** [E-085](../../state/effects.json) · `packages/ui/src/brand.tsx` →
`scripts/generate-brand-assets.mjs`, `scripts/png.mjs` · **high**

## What happened

F-165 redrew the app mark. The pipeline around it — geometry in source, every asset generated
from it, the mark read back out of the built APK by proportion — is the part of F-141/F-142 worth
keeping, and it was left alone deliberately.

**Two of its checks were about the shape that no longer existed.**

### The safe zone

`--prove` asserted that the Android adaptive icon fits the 66/108 circle Android guarantees:

```js
const inkDiagonal = 432 * Math.SQRT2;   // 432 = the OLD mark's ink box at the 576 grid
```

The new ink box is 20 grid units rather than 18, and **its corners are ink** — a stroke's end is
exactly the far point, so the bounding box's half-diagonal is the real radius rather than a
conservative one. At the same grid the ink would have reached **339 px against a guaranteed
313**, and Android would have cut the corners off the icon on every device that masks to a
circle.

The check would have gone on passing. It was asserting a true fact about a shape the product no
longer had.

Derived — `inkRadius(gridPx, geometry)` — it failed immediately and forced the adaptive grid from
576 to **504**. That number is a consequence, not a preference: the unit must stay a whole number
or the generator refuses to build at all, and 21 px is the largest that fits.

### The signature

`carriesMark` scanned the **middle row** for two ink runs — a fact about two fields side by side.
The new mark is three strokes stacked, so a horizontal scan crosses exactly one of them and
reports a single run: **precisely what a solid block reports.** The check would not have failed;
it would have stopped meaning anything.

It reads the centre **column** now, where the signature is five alternations and every one of them
is the same quantity — which is the mark's own idea, so the artefact is checked against the design
rather than against a coincidence of ink placement.

## The part worth keeping

**A check written as a constant is a check about the code that existed when it was typed.**

That is fine for a constant that is genuinely fixed — Android's 66/108 is Android's. It is not
fine for anything derived from a thing that can change shape, and the failure is silent in the
worst way: the assertion still passes, so nothing draws attention to it, and what it is asserting
has quietly become unrelated to what shipped.

**Deriving it is only half.** A derived check can still be vacuous — `inkRadius` of a small enough
mark passes trivially — so it needs a companion that must FAIL:

```js
say(inkRadius(576, g) > safeRadius, 'the grid this mark CANNOT use is refused');
```

Same for the signature: the decoy that matters is **two strokes**, because that is the shape this
repository shipped last year. A check that would accept the thing it replaced is not checking the
replacement.

## The near-miss that says how close this was

Nothing else would have caught either. The four PNGs are byte-compared by `--check`, so a
regenerated asset always "matches" — it matches *itself*. Gate 16 reads the icon out of an APK,
and no APK is built on every push. The only thing standing between a clipped app icon and the
store was an assertion that had stopped describing its subject.

## And one more time, the plants

Mid-feature, `verify-content-proof.mjs` failed on Windows with `EPERM` removing a fixture
directory — and its restore threw **after** deleting the contents, leaving four tracked fixture
files gone from the working tree. Third variant of the same disease
([[a-dependency-can-be-wrong-about-the-runtime-it-will-run-in]] carries the second): a `finally`
does not survive a timeout, does not survive a kill, and on Windows does not survive a file handle
somebody else is holding. `verify-ci`'s tracked-tree guard reports these before the next run, and
it is the only reason a `git add -A` did not commit the deletions.

Related: [[a-second-technology-a-second-blind-spot]] ·
[[one-name-under-a-swatch-is-a-claim-and-the-engine-refused-it]]
