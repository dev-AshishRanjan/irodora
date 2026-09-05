# A dependency can be perfectly correct and still wrong about the runtime it will run in

**Effect:** [E-083](../../state/effects.json) · `apps/mobile/src/lens/photo.ts` →
`@irodora/store`, `jest.config.mjs`, gate 15 · **high**

## What happened

F-166 needed pixels out of a picked photograph — the first time this repository has decoded an
image at all, deliberately, because
[`packages/store/src/image.ts`](../../../packages/store/src/image.ts) bounds every wardrobe
photograph by reading its header and says in its own words that *"this module never decodes
anything"*.

`fast-png` was the obvious choice: pure JavaScript, MIT, maintained, 8.0.0. It installed, it
type-checked, and importing it threw:

```
RangeError: Unknown encoding: latin1 (normalized: latin1)
    at Object.<anonymous> (fast-png/src/helpers/text.ts:11:23)
```

**At module scope.** `new TextDecoder('latin1')` runs on import, and Expo's `TextDecoder`
polyfill supports UTF-8 only.

## The part worth keeping

There was nothing wrong with the library. It is correct in Node and correct in a browser, and it
is unusable in this app — and no amount of reading its source, its README or its dependency tree
would have said so, because the incompatibility is not a property of either side alone.

**jest caught it, and only because jest-expo installs the same polyfill the app ships.** That is
the whole value of the test runner mirroring the runtime rather than approximating it. The same
class of mistake reached a Gradle build once before — the `.js`-suffix mapper that made jest
resolve what Metro would not — and the fix then was the same as the vindication now: *make the
test environment resolve what the device resolves*.

So: **a new dependency is not verified by installing and type-checking it.** It is verified by
importing it in the runtime that will run it. In this repository that is one `pnpm test` away,
which is cheap, and the alternative is finding out fifteen minutes into a device build.

## And the feature it broke was one we destroy anyway

`fast-png` wanted `TextDecoder` for PNG's **text chunks** — `tEXt`, `zTXt`, `iTXt` — every one of
which `ingestImage` strips before anything else sees the file, because a wardrobe photograph's
metadata carries a home address.

The dependency was carrying a feature we deliberately remove upstream, and breaking on it.

That reframed the decision. The replacement is not another decoder: it is **`fflate` for the
inflate, and the chunk walk and the five scanline filters written here** — about a hundred lines
of a fully specified format. The split is by risk rather than by convenience. An inflate is hard
to get right and security-relevant, so it stays a library. A Paeth predictor is nine lines from
the spec.

## The fixture is the reason that split is safe

`test/lens-photo.test.ts` writes a PNG **byte by byte** — signature, IHDR, an IDAT whose zlib
stream uses only *stored* (uncompressed) deflate blocks, IEND, with the CRC32 and Adler32
computed in the test — and asserts the reader reproduces exactly those pixels.

Stored blocks are what make that feasible: `BTYPE=00` is a length, its complement, and the
literal bytes, so no encoder is involved anywhere. **A round-trip fixture would have been the
reader agreeing with itself**, which is no check at all once the reader is ours.

The JPEG has no such option and the test says so out loud rather than implying more than it
proves: a solid colour survives encode and decode within two units a channel, and the tolerance
is 2 rather than 0 because JPEG's colour transform is lossy at any quality — the first run
measured 178 for an input of 180. **A tolerance nobody can explain is one that will be widened
again** the next time something moves.

## A claim that would have arrived as a side effect

An imported photograph does not state its colour space, so it is read as `space: 'unknown'`,
which the existing `SPACE_CONFIDENCE_CEILING` caps at 0.6. **No new number was invented for
imported images**, which is [[a-deliberate-capture-is-not-a-ceiling-raise]] pointed the other
way.

But `ingestImage` deliberately *keeps* the ICC profile. So the day somebody parses it — a colour
management feature, entirely reasonable — an imported photograph would silently move from a 0.6
ceiling to `garment-scan`'s 0.9. An accuracy claim, arriving as a side effect of a feature about
something else.

There is a test asserting an imported reading never exceeds the unknown-space ceiling. It fails
on that day and names the reason. **The general form: when a bound is load-bearing because of
something that is currently unknown, write the test that fires when it stops being unknown.**

Related: [[one-name-under-a-swatch-is-a-claim-and-the-engine-refused-it]] ·
[[a-second-technology-a-second-blind-spot]]
