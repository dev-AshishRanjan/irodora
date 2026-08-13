# Colour Corpus Specification

| | |
|---|---|
| **Status** | Baseline · schema lands with F-011, entries with F-012 |
| **Implements** | FR-21, FR-22, FR-23, FR-24, FR-25, NFR-20 |
| **Decisions** | [ADR-0007](../adr/0007-colour-corpus-provenance-and-licensing.md) · [ADR-0011](../adr/0011-recommendation-rules-are-versioned-content.md) |
| **Skill** | [`corpus-entry`](../../.harness/skills/corpus-entry/SKILL.md) |

The corpus is the product's editorial asset. Its value is not the hex values — those are
copyable in an afternoon. Its value is that **every value can be traced to where it came
from**, which is the thing nobody else can show.

---

## 1. Entry schema

```jsonc
{
  "slug": "ai-nezumi",
  "classification": "traditional",

  "name": {
    "kanji":  "藍鼠",
    "kana":   "あいねずみ",
    "romaji": "ai-nezumi",
    "en":     "Indigo Grey"
  },

  "color": {
    "xyz":   { "x": 0.1284, "y": 0.1421, "z": 0.1657 },
    "lab":   { "l": 44.51, "a": -5.12, "b": -2.87 },
    "oklch": { "l": 0.5124, "c": 0.0186, "h": 213.4 },
    "hex":   "#526A6B",
    "measuredUnder": "D65",
    "gamut": "srgb"
  },

  "taxonomy": {
    "family": "blue-grey",
    "temperature": "cool",
    "lightnessBand": "mid",
    "chromaBand": "low",
    "era": "edo",
    "material": "indigo dye on silk",
    "season": ["autumn", "winter"]
  },

  "editorial": {
    "description_en": "…",
    "description_ja": "…",
    "historicalNote_en": "…",
    "contemporaryNote_en": "…",
    "fashionUse": ["outerwear", "trousers", "knitwear"]
  },

  "provenance": {
    "source": "…",
    "sourceType": "publication | measurement | museum-record | editorial | standard",
    "publisher": "…",
    "publishedYear": 1908,
    "rightsHolder": "…",
    "sourceLicence": "…",
    "sourceUrl": "…",
    "derivation": "How this value was obtained. Required.",
    "verifiedBy": "…",
    "verifiedAt": "2026-08-13",
    "editorialNotes": "What was decided and why."
  },

  "relations": {
    "related": ["nando-iro", "kachi-iro"],
    "complementary": ["…"],
    "historicalVariants": ["…"]
  },

  "status": "draft | review | verified | published | superseded",
  "versionId": "2026.08.1"
}
```

### Required for publication

The `content` gate fails the build if **any** of these is missing on **any** entry
(NFR-20). There is no partial publication.

```
slug · classification · name.kanji · name.kana · name.romaji · name.en
color.xyz · color.measuredUnder
taxonomy.family · taxonomy.temperature
provenance.source · provenance.sourceType · provenance.derivation
provenance.verifiedBy · provenance.verifiedAt
editorial.description_en · editorial.description_ja
status · versionId
```

**`derivation` is not optional and not a formality.** "Measured from a dyed silk sample
under D65 with a colorimeter, mean of five readings" and "taken from the hex value printed
in [publication]" are different epistemic claims about the same field, and a future editor
correcting an error needs to know which one they are looking at.

---

## 2. Classification (FR-23)

The single most important field, because it is what keeps the corpus honest.

| Value | Means | Required evidence |
|---|---|---|
| `historical` | Attested in a dated source with a documented material or dye | A primary source with a date |
| `traditional` | An established named colour in the received canon | Multiple independent sources |
| `modern-japanese` | Contemporary usage documented in current practice | Documented current usage |
| `japanese-inspired` | **Our editorial work**, acknowledged as such | Editorial rationale |
| `editorial` | Curated for use, no historical claim at all | Editorial rationale |

**Displayed, always.** The UI cannot present a `japanese-inspired` palette as `historical`,
because the renderer switches on this field and it is not optional.

Presenting our own curation as historical would be exactly the dishonesty
[ADR-0007](../adr/0007-colour-corpus-provenance-and-licensing.md) exists to avoid — it is
the same failure as copying someone else's data, pointed in the other direction.

---

## 3. Derived values are computed, never entered

`lab`, `oklch` and `hex` are **derived from `xyz` by the engine** at build time. They are
never typed by an editor and never computed by the database.

This is effect link [E-001](../../.harness/state/effects.json): a change to the conversion
functions invalidates every derived value in the corpus. The corpus build regenerates them,
and the `color-golden` gate is the guard.

An editor supplies `xyz` (from measurement) or `hex` (from a published source, with the
conversion recorded in `derivation` as a lossy step).

---

## 4. Palettes

```jsonc
{
  "slug": "quiet-neutrals",
  "name": { "en": "Quiet Neutrals", "ja": "静かな中間色" },
  "classification": "japanese-inspired",
  "category": "contemporary",
  "colors": [
    { "slug": "kinari",   "role": "light",   "rank": 1, "weight": 1.0 },
    { "slug": "hai-iro",  "role": "neutral", "rank": 2, "weight": 0.9 },
    { "slug": "sumi",     "role": "anchor",  "rank": 3, "weight": 0.8 }
  ],
  "provenance": { "…": "as above" },
  "status": "published",
  "versionId": "2026.08.1"
}
```

**Roles:** `anchor` · `neutral` · `light` · `accent`. A palette without an anchor is a
colour list, not a palette — validated at publish time.

The R1 palette systems (FR-22): Quiet Neutrals · Indigo Studies · Forest and Mineral ·
Earth and Clay · Seasonal.

---

## 5. Editorial workflow (FR-68)

```
draft ──→ review ──→ verified ──→ published ──→ superseded
  │         │           │             │
author   a DIFFERENT  provenance   immutable
         reviewer     complete
```

1. **`draft`** — the author adds the entry with sources and derivation.
2. **`review`** — a different person checks provenance, derivation, translation and
   classification. Author and reviewer must not be the same identity; enforced.
3. **`verified`** — provenance complete, `verifiedBy` and `verifiedAt` recorded.
4. **`published`** — included in a version. **Immutable from this point.**
5. **`superseded`** — corrected by a newer entry. The old one is retained, because
   reproducibility requires that an old envelope still resolves (FR-10).

**Correcting a published entry means publishing a new version, not editing the old one.**
A recommendation made six months ago must still be explainable, and that requires the
values it used to still exist.

---

## 6. Versioning (FR-25)

```
content/colors/**       source entries
content/palettes/**     source palettes
content/rules/**        weights and harmony rules
        ↓ build: validate → derive → checksum
        ↓
version 2026.08.1  ── immutable, checksummed, served
```

- Label: `YYYY.MM.N`.
- Immutable once published; checksum verified at load
  ([threat model §9](../architecture/security/threat-model.md)).
- Recorded in every reproducibility envelope.
- Cache keys include it, so a publish mints a new version rather than invalidating —
  which means no cache can ever serve a half-updated catalog.

---

## 7. Quality standards

**Measurement.** Prefer physical measurement of dyed material under controlled
illumination. Record instrument, illuminant, observer angle, sample count, and the material
measured. Colour on silk and colour on cotton are genuinely different measurements of the
same dye.

**Translation.** English names are an **editorial decision**, not a translation. 藍鼠 is
literally "indigo mouse"; "Indigo Grey" is a judgement about what communicates. Record the
reasoning.

**Descriptions.** What the colour *is*, what it was made from, where it was used. Not how
it makes you feel. No invented history — if a colour's origin is uncertain, the description
says so.

**Relations.** Asserted from sources or from measured proximity, and the entry says which.

---

## 8. The `content` gate

Fails the build on any of:

- a required field missing from any entry;
- `verifiedBy` or `verifiedAt` absent on a `verified` or `published` entry;
- author and reviewer being the same identity;
- a `historical` classification without a dated primary source;
- a derived value inconsistent with its `xyz` under the current engine;
- a palette without an `anchor`;
- a relation pointing at a non-existent slug;
- a `published` entry differing from its checksum;
- a duplicate slug within a version.

**No partial publication.** A version publishes completely or not at all — a corpus that is
95 % verified is a corpus where nobody knows which 5 % to distrust.
