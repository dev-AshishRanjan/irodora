# Plan: F-027 — Photo-assisted profile setup

| | |
|---|---|
| **Feature** | F-027 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-27, NFR-23 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-25 |

---

## Intent

A camera reading gives the profile a **starting point the person corrects**, instead of twelve
comparisons. It fills the dimensions a single reading can honestly support, says which ones it
cannot, carries a confidence well below the guided path's, and **nothing is stored until the
person explicitly confirms it**.

To a user: *"It looked once, told me what it thought and how sure it was, admitted it could not
tell one of the things, and did not save anything until I said so."*

## Approach

### What a single reading can and cannot support

`LensReading` (F-040) is a colour, a capture space, an illumination class, a quality class and a
confidence already capped by all three. From that, honestly:

| Dimension | From the reading | Not from the reading |
|---|---|---|
| `lightness` | a range centred on the reading's own OKLCh **L** | |
| `temperature` | bias from the reading's **hue** | |
| `chroma` | a tolerance ceiling from the reading's own **C** | |
| `contrast` | | **nothing.** One reading has no second colour to contrast with |
| `neutrals` · `accents` · `avoid` | derived from the three above, exactly as the guided path does | |

**`contrast` comes back with confidence 0 and the "not asked" sentence.** That is the design,
not a gap: FR-32's contrast preference is about the separation between two garments, and a
reading of one region cannot contain it. A photo path that answered all seven would be inventing
the one it cannot see, and it would be the dimension nobody checked.

### The ceiling, and the day it moves

Every derived dimension takes `min(PHOTO_CEILING, reading.confidence)`, with
`PHOTO_CEILING = 0.5` — **below `CONFIDENCE_MAJORITY`**, so a photo estimate never outranks a
split guided answer.

That is a **convention, not a measurement** (NFR-2), and the reason is NFR-23: nobody has
measured how this performs across ITA° bands, so a higher number would be a claim with nothing
behind it. The constant carries that sentence, and the day F-037 publishes per-band accuracy is
the day it can be replaced by something derived.

**Reused:** `src/lens/` (`LensReading`, `cappedConfidence`, `CaptureSpace`), `src/engine.ts` and
`@irodora/color-spaces` for the one conversion, `src/profile/derive.ts`'s list derivations,
`src/profile/dimensions.ts` (`applyDerivation` — the correction latch is already the rule), the
`ProfileSetup` summary, both catalogues.

**New:** `src/profile/photo.ts` — reading → profile; a confirmation state on the screen; the
route hand-off; copy in both languages.

**Increments:**

1. `photo.ts` + tests: the derivation, the ceiling, the contrast abstention.
2. The confirm-before-save state on `ProfileSetup`, and its tests.
3. Copy, route wiring, effects, docs, ADR note, progress.

### The conversion, and the space that will not say

`srgb` → `srgbToXyz`, `display-p3` → `displayP3ToXyz`. For `unknown` the module converts **as
sRGB and says so in its own words**: a value has to be produced, sRGB is the only defensible
default for a consumer capture, and the cost is already priced in —
`SPACE_CONFIDENCE_CEILING.unknown` is 0.6 and `reading.confidence` already carries it. What must
not happen is the conversion being silent about which branch it took.

**No colour arithmetic is written here.** One `fromSpace`/`xyzToOklch` call through the engine,
like every other call site.

## Files to touch

```
apps/mobile/src/profile/photo.ts          — NEW. LensReading → Profile
apps/mobile/src/profile/derive.ts         — export the three list derivations for reuse
apps/mobile/src/screens/ProfileSetup.tsx  — the estimate branch and the confirmation gate
apps/mobile/app/profile.tsx               — pass the reading through, when there is one
apps/mobile/src/i18n/en.ts · ja.ts        — the copy, in both
apps/mobile/test/profile.test.ts          — derivation, ceiling, abstention, no-image decoys
apps/mobile/test/screens.test.tsx         — the estimate branch and the confirmation gate
.harness/state/effects.json + memory      — E-030 grows a source; the reading seam
docs/adr/0072-…                           — a note: the photo path's ceiling and why
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| A second producer of `Profile` | `applyDerivation`'s latch, the store write, the summary | `gate:typecheck` + the existing origin tests — the latch is already total over the dimension union, so a second producer cannot bypass it |
| The three list derivations become shared | the guided path's own output | **`gate:test`** — the guided tests assert the lists exactly, so a refactor that changed them fails there |
| `LensReading` becomes an input to the profile | the F-040 seam: a change to its fields changes what the estimate can support | **E-030 grows a `from`** — or a sibling link. Decide during the trace, not now |
| New message keys | both catalogues, the font subset | **E-016** `gate:typecheck`; **E-017** `gate:content` |
| A new screen branch | contrast and a11y in both themes | **E-007**, `gate:contrast` + `gate:a11y` |

## Test plan

- **Unit:** each dimension from a constructed reading; the ceiling is applied and cannot be
  exceeded by a perfect reading; `contrast` abstains with confidence 0; an `unknown` space
  produces a lower confidence than the same reading in `srgb`.
- **Negative, with decoys:**
  - the derivation cannot receive an image — asserted on the **type**, with `ts-expect-error`
    so it fails on an unused directive if that stops being true (F-040's own move);
  - `photo.ts` imports nothing that reaches a network or a file path, with a decoy;
  - a photo estimate never overwrites a `user` dimension — and a `derived` one does move.
- **Screen:** the estimate branch renders every dimension with its confidence; save is refused
  before confirmation, **with the reason stated**, and the decoy asserts a confirmed estimate
  shows no such sentence.
- **E2E:** capture, estimate, correct, confirm, save. **Cannot run** — gate 7 pending, F-091
  blocked. Reported as not run.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test          # expect the two known-red packages; touched packages reported separately
pnpm build
pnpm test:a11y && pnpm test:contrast && pnpm test:content
```

**Known red on this workstation, not caused by this feature:** `test` on `color-difference` and
`color-spaces` (Node-22 ULP, F-083/ADR-0061) and `security` (F-096). Both proven pre-existing
during F-026 and neither may be described as green.

## Risks and open questions

- **Criterion 4 cannot be discharged here, and it is not merely hard.** *"Bias validation across
  every ITA-degree band with a stated minimum sample per band"* needs a stratified set of images
  of real people. That is a study, not a check, and it is **the same criterion F-037 carries** —
  while F-037 is `blockedBy: [F-027]`. So the work sits downstream of the feature that creates
  the need for it. Attested here, blocking release, with the overlap recorded rather than left
  for someone to rediscover.
- **There is still no camera screen.** F-040 shipped the seam and modes and attested every
  device criterion; nothing renders a viewfinder. So this feature takes a `LensReading` as an
  input and the capture UI stays where F-040 left it. Stated up front, as F-040 stated its own.
- **The mapping from a reading to a lightness range is a stated convention**, not a validated
  model. It must read that way in the code, in the copy and in the report.

## Out of scope

The camera surface itself · professional entry (F-028's sibling, FR-28, R5) · the bias study
(F-037) · changing the guided path's derivation · storing anything before confirmation.
