# Plan: F-166 — A colour can be read from an image, not only from the camera

| | |
|---|---|
| **Feature** | F-166 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-40, FR-14, NFR-14, NFR-21 |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-05 |

---

## Intent

Reported as *"in lens add option for import image from gallery"*. Done, to a person: they pick a
photograph, **tap the part of it they care about**, and get the same reading panel a camera
capture produces — with the app saying plainly that this came from a photograph and what that
costs.

## Approach

**The hard part is not the button. It is that this repository has never decoded an image**, on
purpose: [`packages/store/src/image.ts`](../../packages/store/src/image.ts) bounds every wardrobe
photograph *by reading its header* and says so — *"every limit below is enforced by reading the
header, and this module never decodes anything"* — because a decoder bomb is a few kilobytes that
expands into gigabytes and a phone has no process to spend containing it.

**Decode in JavaScript, not through a native module**, and the reasons are three:

1. **Memory safety.** A pure-JS decoder facing an arbitrary user file can exhaust memory or spin.
   It cannot corrupt memory. A native decoder's failure mode is the other one.
2. **Determinism (NFR-3).** Platform decoders differ between iOS and Android in IDCT precision and
   chroma upsampling. A colour product whose central guarantee is *the same inputs give the same
   observable value* should not have "which phone decoded it" as an input.
3. **It can be verified here.** A native path would be entirely device-attested — a feature with
   no gate coverage at all. A JS decode runs in jest, against fixtures, in CI.

**Bounded before it is decoded, by the type that already exists.** `ingestImage` returns a branded
`SanitisedImage`; nothing outside that module can make one. So `decodePhoto` takes a
`SanitisedImage` and **un-ingested bytes do not type-check at the call site** — the same move
`LensReading` makes for frames. It also strips EXIF, which matters twice here: a picked photograph
carries GPS, and stripping Orientation makes what is *displayed* and what is *decoded* the same
image, so a tap lands where the person aimed.

**Reused:** `ingestImage` / `ImageRejected` / `SanitisedImage` from `@irodora/store`; `ImageSource`
and `bytesFromBase64` / `base64FromBytes` from `wardrobe/source.ts` (the port pattern, so the
screen stays renderable); `sampleStride` and `MAX_SAMPLES_PER_FRAME` from `lens/camera.ts`;
`read()` from `lens/modes.ts`; the whole capture machine, the shutter, the result sheet and both
hand-offs from F-160.

**New:**

- `apps/mobile/src/lens/photo.ts` — `decodePhoto`, `sampleAt`, `readPhoto`, `PHOTO_LIMITS`.
- Dependencies: `jpeg-js` (JPEG) and `fast-png` (PNG). Both pure JS, both MIT.
- `docs/adr/0092-…` — pixels come out of a file in JavaScript, and what that costs.

**Confidence: no new number is invented.** An imported photograph does not state its colour
space, so it is read as `space: 'unknown'`, which the existing `SPACE_CONFIDENCE_CEILING` already
caps at **0.6**. That is a bound with a documented reason rather than a mode invented today —
which is what ADR-0087 requires and what ADR-0091 committed to one feature ago. The reading is
taken as `garment-scan`, because the person selects the region: FR-14's interaction exactly.

**Increments:**

1. Dependencies + `photo.ts` + its test. Nothing wired.
2. `capture.ts` learns about a photograph as a source.
3. `Lens` draws the photograph, the reticle and the tap target.
4. `CameraLens` + the route wire the picker.
5. Copy, both locales. ADR-0092.

## Files to touch

```
apps/mobile/package.json                — jpeg-js, fast-png
apps/mobile/src/lens/photo.ts           — NEW. Decode, sample, read.
apps/mobile/src/lens/capture.ts         — a photograph is a third source beside still and live.
apps/mobile/src/screens/Lens.tsx        — the photograph, the reticle, the tap target.
apps/mobile/src/lens/CameraLens.tsx     — pick, ingest, decode, hold.
apps/mobile/app/(tabs)/lens.tsx         — supplies the ImageSource port.
apps/mobile/src/i18n/{en,ja}.ts         — the copy.
apps/mobile/test/lens-photo.test.ts     — NEW.
apps/mobile/test/screens.test.tsx       — a subject with a photograph loaded.
docs/adr/0092-…                         — the decoder decision.
```

## Anticipated effects

- **Two new runtime dependencies in the app** ⇒ the security gate and the lockfile-drift proof.
  Guard: `gate 15` (advisories) and `Gate 0 — lockfile drift proof`, both already in CI.
- **The app decodes untrusted bytes for the first time** ⇒ NFR-14's trust boundary. Guard: the
  `SanitisedImage` brand makes an un-ingested decode a compile error; `PHOTO_LIMITS` bounds
  pixels before allocation; every refusal carries a reason rather than returning null.
- **`space: 'unknown'` is now load-bearing for a whole input path.** If anyone later parses the
  ICC profile `ingestImage` deliberately keeps, an imported photograph would silently jump from a
  0.6 ceiling to 0.9. Guard: a test asserting an imported reading never exceeds
  `SPACE_CONFIDENCE_CEILING.unknown`, which fails loudly if that day comes.
- **The camera must stop while a photograph is up** ⇒ `demandFor`. Guard: asserted in
  `lens-capture.test.ts`.

## Test plan

- **Unit:** a hand-built PNG — written byte by byte with *stored* (uncompressed) deflate blocks,
  so no library is involved in making it — must decode to exactly the pixels written. That is a
  real cross-check of a third-party decoder against a file whose bytes we control.
- **JPEG:** a solid colour encoded at maximum quality must read back within one unit per channel.
  Encode and decode are different code paths, so a wrong IDCT scale or a wrong upsample would
  move it. Stated honestly for what it is: not an independent implementation.
- **Geometry:** a tap in each quadrant of a four-quadrant image reads that quadrant's colour —
  the assertion that the tap and the sample agree, which is the defect a person would notice
  first and no type would catch.
- **Refusal:** truncated bytes, a 16-bit PNG, an over-large header — each refused with a reason,
  and none of them returning a plausible colour.
- **Negative + decoy:** the confidence ceiling test needs a decoy, since a reading that always
  returned 0 confidence would pass it. The decoy is the quadrant test, which requires a real
  colour with real samples.

## Verification

```
node scripts/verify-state.mjs
pnpm verify:ci
```

## Risks and open questions

- **The decode blocks the JS thread.** A 12 MP JPEG is seconds in Hermes. Mitigated by painting
  the busy state and yielding a frame before starting, and by bounding pixels — not solved. A
  worklet runtime would solve it and cannot call a library that is not a worklet, which is the
  same open question `camera.ts` records for the engine.
- **`expo-image-picker` re-encodes.** The bytes are not the original file's. For a mean over
  ~2000 samples this is small — JPEG preserves block averages closely — and it sits well inside
  the 0.6 ceiling an unstated colour space already imposes. It is a real fidelity loss and the
  note says so rather than pretending the file is untouched.
- **A garment saved from an imported photograph is indistinguishable, in the store, from one read
  live.** Both are `estimated`, which is true of both. Recording *which* would be a schema change
  and is not this feature.

## Out of scope

- Reading the ICC profile. `ingestImage` keeps it deliberately; parsing it is its own work and
  would change the confidence story (see the effect above).
- Multi-region scanning, automatic garment detection, background removal — FR-14's automatic half
  is F-135.
- The camera-roll *capture* path (`captureWithCamera`): this feature reads what exists, and the
  Lens already has a camera.
