# ADR-0092 — Pixels come out of a file in JavaScript, and the PNG walk is ours

## Status

**Accepted** — F-166.

## Date

2026-09-05

## Context

FR-40 lists **image upload** as one of four ways to give a garment a colour, and it was reported
directly: *"in lens add option for import image from gallery"*.

It is not a fourth control. **This repository has never decoded an image**, and that is a
decision rather than an omission. [`packages/store/src/image.ts`](../../packages/store/src/image.ts)
bounds every wardrobe photograph by reading its header and says so in its own words:

> *every limit below is enforced by reading the header, and **this module never decodes
> anything***

because a decoder bomb is a few kilobytes that expands into gigabytes, and on a phone there is no
process to spend containing it — the containment has to happen *before* the decode rather than
around it.

Reading a colour out of a photograph needs pixels. So something has to decode, and the question
is what.

## Decision

**Decode in JavaScript.** `jpeg-js` for JPEG; `fflate` for the inflate inside a PNG, with the
chunk walk and the unfiltering written here.

**Decode a `SanitisedImage`, never bytes.** `decodePhoto` takes the branded type `ingestImage`
produces, so un-ingested bytes do not type-check at the call site. The trust boundary that
already existed stays the trust boundary, and the decode happens strictly behind it: byte count,
then type from the magic numbers, then pixel count from the header, then — and only then —
expansion.

**Bound the expansion twice.** `PHOTO_LIMITS.maxPixels` is 24 million, half the wardrobe's,
because these bound different things: the wardrobe's exists so a decoder *elsewhere* is never
handed a bomb, and this one is the size of an allocation **this process is about to make**.
`jpeg-js` is additionally given `maxMemoryUsageInMB`, which it enforces against its own
allocations. The PNG inflate is handed an output buffer of **exactly** the size IHDR implies, so
a stream that expands further fails against a buffer this code sized rather than a limit somebody
guessed.

## Why JavaScript rather than a native decoder

Three reasons, in the order that decided it.

1. **Memory safety.** A pure-JS decoder facing an arbitrary user file can exhaust memory or spin.
   It cannot corrupt memory. A native decoder's failure mode is the other one, and this input is
   a file a person chose from a gallery — which may have arrived from anywhere.
2. **Determinism.** Platform decoders differ between iOS and Android in IDCT precision and chroma
   upsampling. NFR-3 promises that the same inputs give the same observable value; *which phone
   decoded it* should not be one of the inputs to a colour reading.
3. **It can be checked here.** A native path would be entirely device-attested — a whole input
   path with no gate coverage. This runs in jest against fixtures, in CI, on every push.

The cost is real and is stated in the plan: **the decode blocks the JS thread**, seconds on a
large photograph, where a native decoder would not.

## Why the PNG walk is ours and the inflate is not

The first implementation used `fast-png`, and it did not survive contact with the runtime. The
library constructs `new TextDecoder('latin1')` **at module scope**, and Expo's `TextDecoder`
polyfill supports UTF-8 only:

```
RangeError: Unknown encoding: latin1 (normalized: latin1)
```

jest surfaced it because jest-expo installs the same polyfill the app ships — which is the
version of that failure worth having, rather than the one fifteen minutes into a Gradle build.

What that decoder wanted `TextDecoder` for is PNG's **text chunks**, and `ingestImage` has
already stripped every one of them — `tEXt`, `zTXt`, `iTXt` — before anything sees the file. The
dependency was carrying a feature we deliberately destroy upstream, and breaking on it.

So the split is by risk, not by convenience: **`fflate` does the inflate**, which is the hard,
security-relevant, widely-audited part; the chunk walk, the five filters and the Paeth predictor
are here, all fully specified by the PNG spec, all about a hundred lines.

**And they are checked against a file no library produced.** `test/lens-photo.test.ts` writes a
PNG byte by byte — signature, IHDR, an IDAT whose zlib stream uses only *stored* (uncompressed)
deflate blocks, IEND, with the CRC32 and Adler32 computed in the test — and asserts the decode
reproduces those exact pixels. A test that encodes and decodes with the same library proves the
library agrees with itself; this one does not have that shape.

## What a photograph is not allowed to claim

**No new confidence ceiling is invented.** An imported photograph does not state its colour
space — `ingestImage` deliberately *keeps* the ICC profile and nothing parses it — so every
reading from one is `space: 'unknown'`, which `SPACE_CONFIDENCE_CEILING` already caps at **0.6**
for a reason written long before this feature.

That is [ADR-0087](0087-a-calibrated-reading-does-not-get-a-higher-confidence-until-it-is-measured.md)
applied in the direction it points, and the counterpart to
[ADR-0091](0091-a-deliberate-capture-is-fr-15s-precision-pick.md): there, a penalty whose stated
reason did not hold was not applied; here, a bound whose stated reason *does* hold is left to do
its work rather than being replaced by a number chosen today for imported images.

The reading is taken as `garment-scan`, because the person selects the region — FR-14's
interaction exactly. Its 0.9 ceiling is not what bounds the result and is not doing work.

**A guard exists for the day this changes.** A test asserts an imported reading never exceeds
`SPACE_CONFIDENCE_CEILING.unknown`. If anyone later parses the ICC profile, an imported
photograph would otherwise move silently from a 0.6 ceiling to 0.9 — an accuracy claim arriving
as a side effect of a colour-management feature. That test fails on that day and names why.

## Consequences

**Good** — FR-40's fourth path exists, behind the trust boundary the repository already had, with
gate coverage a native path could not have. Two dependencies, both pure JS, both auditable by the
security gate. The one that turned out to be unusable in this runtime was found in seconds rather
than in a device build.

**Bad** — **the decode blocks the JS thread**, and a large photograph freezes the UI for a second
or more. The busy state paints first and the pixel count is bounded, which makes it survivable
rather than solved. A worklet runtime would fix it and cannot call a library that is not itself a
worklet, which is the same open question `camera.ts` records about running the engine on the
frame thread.

**Bad** — **`expo-image-picker` re-encodes.** The bytes are not the original file's. For a mean
over roughly two thousand samples this is small — JPEG preserves block averages closely — and it
sits well inside the 0.6 ceiling an unstated colour space already imposes. It is a real fidelity
loss and the code says so rather than implying the file is untouched.

**Neutral** — **PNG support is partial by choice.** 16-bit, palette and interlaced files are
refused *by name*, each with a sentence saying which part could not be read. Scaling 16 bits to 8
is a colour operation and belongs in the engine, which has no opinion about PNG; the other two
are extra pixel paths to get wrong for files no camera produces.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **`@shopify/react-native-skia`** | The professional-looking answer: a platform-grade decoder, and it would unlock other drawing work later. Rejected on all three counts above — it is native (memory-unsafe failure mode), platform-dependent (two phones, two answers), and untestable here, so the entire input path would have shipped device-attested. It is also a large binary and a rebuild for one feature. |
| **A pure-JS decoder for both formats, ours end to end** | Consistent, and wrong. A JPEG decoder is thousands of lines of entropy coding and DCT that we would be maintaining and getting subtly wrong, against a library that many projects exercise daily. The line is drawn at *how hard is this to get wrong*: an inflate and a JPEG, no; a chunk walk and five filters, yes. |
| **Keep `fast-png` and polyfill `TextDecoder`** | The smallest diff, and it would install a global polyfill for a feature we destroy upstream, so the app would carry latin1 decoding forever to satisfy a code path that can never run. |
| **Refuse PNG and support JPEG only** | Halves the dependency surface, and a screenshot is exactly the image somebody would pick from a shop listing. `ingestImage` already accepts both, so refusing here would mean a person could add a PNG garment and not read a PNG's colour. |
| **Read the ICC profile and report a real colour space** | The right thing eventually, and it changes the confidence story rather than the decoding one — see the guard above. Doing it here would have bundled a claims change into a feature about reading a file. |
