# Plan: F-201 — The Lens answers against a target

| | |
|---|---|
| **Feature** | F-201 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-74 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Intent

F-200 armed a target. This is the half that answers against it, and it completes the report:
*"scan a colour and check its similarity/difference against a target colour."*

## Nothing here computes a difference of its own

- **ΔE00** — `deltaE00` from `@irodora/color-difference`, CIELAB (D65), the same one `compare.ts`
  ranks with.
- **Warm or cool** — `temperatureOf` from `@irodora/recommendation`, with the **published**
  poles from `content/rules`. It is the definition the outfit engine scores with, and a second
  one here would be the second place this product decides what warm means (E-005).
- **The signed hue arc** — `compare.ts`'s rule: the shortest arc, because subtracting two hue
  angles is *"the one place in this file where the obvious arithmetic is wrong"*.

## Why `compare()` is not reused

It takes two `PublishedEntry` values, deliberately — *"so a caller cannot hand it a colour whose
origin nobody recorded"*. **Neither side here is one.** A reading is a capture and a target may
be a colour the engine generated.

The *rule* is right and is kept: the new function takes `Color` on both sides, which carries
provenance under ADR-0005 for exactly this reason. What is refused is a signature taking two
triples, which would let an unrecorded colour through.

## The word "match" appears nowhere

Criterion 3, and it is the whole register of this feature. `similarityPercent` exists in
`@irodora/color-naming` and is **not** used here: a percentage invites *"96% match"*, which is a
claim about identity that a ΔE00 does not make. The screen reports a distance and a
decomposition, and the claims lint holds the wording in both languages.

## A poor capture speaks first

Criterion 4, and it is an ordering requirement rather than a content one. The module returns the
capture block and a `poorCapture` flag; **the screen renders the capture line above the number**,
so a person reads *"this capture was poor"* before they read a figure that depends on it.

The threshold is the app's own `CaptureQuality`, not a new one.

## Which way it is off, in words

Criterion 2 asks for words as well as numbers, per axis:

| axis | words | basis |
|---|---|---|
| lightness | lighter / darker / the same | signed OKLCh ΔL |
| chroma | more vivid / less vivid / the same | signed OKLCh ΔC |
| hue | warmer / cooler / neither | `temperatureOf` on both, published poles |

**Hue direction is expressed as temperature and not as a rotation.** "+40° of hue" is a
measurement a person cannot act on, and "clockwise" is meaningless. Warm and cool is the one
hue-direction vocabulary this product already has a published definition for — and the arc is
still reported as a number beside it, so nothing is hidden.

A dead band around zero, so a difference too small to see is reported as *the same* rather than
as a direction. The band is a **convention**, stated as one.

## Files to touch

```
apps/mobile/src/against-target.ts         — new. The comparison. Computes nothing itself.
apps/mobile/src/screens/Lens.tsx          — the panel, above the readout
apps/mobile/src/lens/CameraLens.tsx       — pass the target through
apps/mobile/app/(tabs)/lens.tsx           — read the context
apps/mobile/src/i18n/{en,ja}.ts           — the words and the labels
apps/mobile/test/against-target.test.ts   — the axes, the dead band, the ordering
apps/mobile/test/screens.test.tsx         — a Lens subject with a target armed
```

## Test plan

- **Every axis reports its direction**, with a decoy: a reading identical to the target must
  report *the same* on all three, or the words are being generated rather than measured.
- **The hue arc is the shortest one:** 350° against 10° is +20, not −340.
- **The dead band is a band:** a difference just inside it reads *the same*, one just outside
  does not. Both sides, or the band is a threshold nobody crossed.
- **`poorCapture` follows the capture, not the distance** — a perfect ΔE00 with a poor capture
  is still a poor capture, which is the case criterion 4 exists for.
- **The copy contains no claim of identity**, asserted over the keys this feature adds.
- **Conformance:** the Lens with a target armed, in both themes.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · cvd · build`.

## Risks

- **Warm/cool is a convention with published poles, not a fact about hue.** It is the right
  vocabulary here and it is still a convention; the arc is reported beside it so the number is
  never replaced by the word.
- **Nobody has held a real object against a target.** Attested — and gate 7 is pending.

## Out of scope

Persisting a comparison, and anything that ranks or scores the result.
