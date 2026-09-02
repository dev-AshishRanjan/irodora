# The pattern corpus

**Constructed, not photographed** — and re-derivable from this file alone, which is the corpus's
own convention for an editorial construction ([ADR-0081](../../../docs/adr/0081-the-pattern-corpus-is-constructed-so-its-ground-truth-is-exact.md)).

Every image is 40 × 40 samples in row-major order, built by
`packages/color-sampling/test/pattern.test.ts` from four colours and nothing else. There is no
measurement in any of it, so **the ground truth has no error term**: the proportions below are
exact by construction, not to within anything.

## The four colours

Encoded sRGB, chosen mid-range so nothing sits near a clip or in the noise floor — a pattern
whose colours `partition` rejected would be testing the rejection rules rather than the
extractor.

| Name | r | g | b |
|---|---|---|---|
| `NAVY` | 0.13 | 0.18 | 0.32 |
| `CREAM` | 0.93 | 0.90 | 0.80 |
| `RUST` | 0.66 | 0.29 | 0.16 |
| `MOSS` | 0.35 | 0.44 | 0.28 |

## The images

| Image | Construction | Exact proportions |
|---|---|---|
| `stripes` | rows 0–29 `NAVY`, rows 30–39 `CREAM` | 0.75 / 0.25 |
| `check` | 10-pixel squares, `NAVY` where `⌊x/10⌋ + ⌊y/10⌋` is even | 0.5 / 0.5 |
| `blocks` | quarters: `NAVY` top-left, `CREAM` top-right, `RUST` bottom-left, `MOSS` bottom-right | 0.25 each |
| `print` | `RUST` where `(7x + 13y) mod 23 = 0`, `MOSS` where it is 1, `CREAM` otherwise | 21/23 ground |
| `blendedStripes` | rows 0–28 `NAVY`, row 29 and row 30 a linear-light ramp at ⅓ and ⅔, rows 31–39 `CREAM` | 0.725 / 0.05 ramp / 0.225 |
| `graded` | every row `mix(NAVY, CREAM, y/39)` in linear light | no flat region at all |

**`check` is 10-pixel squares and not 8**, and the reason is recorded because the fixture check
caught it: eight gives five squares per side, twenty-five in total, which cannot be halved. It
was 13 to 12 — 52 % — and the file claimed 50 %.

## The two images that exist because a mutation survived

`blendedStripes` and `graded` are not extra coverage; each was added after a deliberate
mutation **passed** against a corpus that lacked it.

- **`blendedStripes`** — every hard-edged construction has each pixel exactly equal to a source
  colour, so a quantiser and a colour *counter* score identically on all of them. Five per cent
  of this image is in colours that are in no palette.
- **`graded`** — even the blended stripes were not enough: a 20 % trimmed mean over a cluster
  that is 97 % a single colour **is** that colour, so replacing the engine's mean with "the
  first member of the cluster" still passed. `graded` has no flat region, so a mean is a value
  the image does not contain and a member is one it does.

That is [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]], twice, in the
same file.

## What this corpus does not cover

**A photograph.** No sourced imagery: it is licensed content (`content/AGENTS.md`), and a
photograph has no exact ground truth to measure an extractor against. Camera-path accuracy is
F-063's, is attested, and is blocked on F-053.

**A real print.** `print` is many small deterministic marks on a ground — the *shape* of a
floral, and a genuine stress case for a quantiser — but it is not a photograph of one, and no
result here should be read as a claim about prints in the wild.
