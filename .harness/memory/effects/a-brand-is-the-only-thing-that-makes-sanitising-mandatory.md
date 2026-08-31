# A brand is the only thing that makes sanitising mandatory

**E-041** · from `packages/store/src/image.ts#SanitisedImage` · guard `gate:typecheck`, proven
by two `@ts-expect-error` directives in `test/garment-image.test.ts`

## What depends on what

`Repository.putGarmentImage` accepts a `SanitisedImage` and nothing else. `SanitisedImage`
carries a `unique symbol` field that no code outside `image.ts` can produce, so the only way to
obtain one is to call `ingestImage` — which strips EXIF, checks the magic bytes, and bounds the
size and the pixel count before anything decodes.

Widen that parameter to `Uint8Array` and the guarantee is gone, silently. Nothing else in the
package would change, no test would fail, and every existing call site would keep working —
because they all ingest first. The one that forgets is the one nobody wrote yet.

## Why a brand rather than a convention

The convention version of this is a comment saying *"call `ingestImage` first"*, and it holds
until somebody has a buffer already in hand and a deadline. The failure is invisible in review:
`putGarmentImage(id, bytes, now)` looks exactly like the correct call, and the difference is a
function that was not called.

What makes the brand work is that it is **not inhabitable by accident**. A plain marker field
(`readonly sanitised: true`) would let any object literal claim it, which is why the second
`@ts-expect-error` in the test plants a hand-made object with the right shape: without the
unique symbol that line compiles, and the brand is decoration.

This is [[provenance-in-the-type-is-what-makes-honesty-structural]] applied to hostile input
rather than to colour, and it is the same move F-040 made with `LensReading`, whose type has no
field a camera frame could be assigned to.

## What the guard covers, and what it does not

**Covered:** any call site in this repository that tries to store bytes it did not ingest.
`tsc` refuses it, and the two directives in the test fail the build if that ever stops being
true — an unused `@ts-expect-error` is itself an error, which is what turns a comment about a
type into an assertion about it.

**Not covered:** `ingestImage` being changed to strip less. The brand says a function ran; it
cannot say what the function did. That half is `test/image.test.ts`, where every stripping
assertion is paired with a decoy — the metadata went **and** the image is still an image, with
the ICC profile intact, because a stripper that truncated the file would satisfy "no EXIF"
perfectly.

## The thing that is deliberately kept

`APP2` / `iCCP` — the ICC profile. A "strip all metadata" implementation is the obvious one and
it is wrong in a colour product: without the profile a Display P3 photograph is silently
reinterpreted as sRGB and comes back muted, with nothing anywhere to say why. The drop lists
name what goes rather than what stays, so adding a marker to the keep set is a decision somebody
makes rather than a default they inherit.
