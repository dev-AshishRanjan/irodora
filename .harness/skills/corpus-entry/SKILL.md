---
name: corpus-entry
description: Add a colour or palette to the corpus with complete provenance, correct classification, and a real derivation.
---

# Skill: corpus-entry

Spec: [`color-corpus-spec.md`](../../../docs/content/color-corpus-spec.md) ·
Rules: [`content-provenance.md`](../../rules/content/content-provenance.md) ·
[ADR-0007](../../../docs/adr/0007-colour-corpus-provenance-and-licensing.md).

The corpus's value is **not** the hex values — those are copyable in an afternoon. It is
that every value can be traced to where it came from.

## Before you start

**Do you have a source you can name?** If not, stop. There is no path from "I found this
hex on a website" to a publishable entry.

**Is the source in the register?**
[`licensing-and-provenance.md` §5](../../../docs/content/licensing-and-provenance.md).
If not, it goes there first, with its licence.

**Does it need counsel?** Anything Wada-derived, any commercial colour system, any dataset
whose terms you have not read in full. See
[`content-licensing.md`](../../governance/content-licensing.md).

## Steps

### 1. Establish the value

In order of preference:

| Rank | Method | `sourceType` |
|---|---|---|
| 1 | Measure dyed material under controlled illumination | `measurement` |
| 2 | A primary published source with documented reproduction | `publication` |
| 3 | A museum or institutional record | `museum-record` |
| 4 | Documented contemporary practice | `publication` |
| 5 | Our own editorial curation, labelled as ours | `editorial` |

For a measurement, record: instrument · illuminant · observer angle · sample count · the
**material**. Colour on silk and colour on cotton are genuinely different measurements of
the same dye.

### 2. Classify — the most important field

| Value | Requires |
|---|---|
| `historical` | A dated primary source with a documented material or dye |
| `traditional` | Multiple independent sources |
| `modern-japanese` | Documented current usage |
| `japanese-inspired` | **Our editorial work.** Say so |
| `editorial` | Curated for use, no historical claim |

**Our own curation is never `historical`.** Presenting our work as historical is the same
dishonesty as copying someone else's, pointed the other way.

### 3. Write the derivation

Not a formality. These are different epistemic claims about the same field:

```
"Measured from dyed silk under D65, colorimeter, mean of five readings"
"Taken from the hex printed on page 47 of [publication], converted to XYZ (lossy)"
"Editorial: interpolated between two attested colours in the same family"
```

A future editor correcting an error needs to know which one they are looking at.

### 4. Names

- `kanji`, `kana`, `romaji` — from the source.
- `en` — an **editorial decision**, not a translation. 藍鼠 is literally "indigo mouse";
  "Indigo Grey" is a judgement about what communicates. Record the reasoning in
  `editorialNotes`.

### 5. Descriptions

What the colour **is**, and what it was made from. Not how it makes you feel. **No invented
history** — if an origin is uncertain, say so. Japanese is written, never machine-translated.

### 6. Do not type the derived values

`lab`, `oklch` and `hex` are computed from `xyz` by the engine at build time. Typing them by
hand produces values that disagree with the engine, invisibly.

Supply `xyz` from measurement, or `hex` from a published source with the lossy conversion
recorded in `derivation`.

### 7. Relations

Assert from sources, or from measured proximity — and say which.

### 8. Submit for review

`status: "draft"`. **The reviewer must not be you.** Enforced.

## Verify

```bash
pnpm test:content
```

The `content` gate fails on: any missing required field · `verifiedBy` absent on a verified
entry · author and reviewer identical · a `historical` claim without a dated source · a
derived value inconsistent with `xyz` · a palette without an anchor · a relation pointing at
a missing slug · a checksum mismatch · a duplicate slug.

**There is no partial publication.** A version publishes completely or not at all.

## Never

- Copy from a colour website, another application, or an unlicensed dataset.
- Assert that a hex value **is** a historical colour.
- Edit a published entry — publish a new corpus version.
- Ship an entry whose provenance you cannot state.
