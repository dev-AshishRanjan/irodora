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

  // NO lab, oklch, hex, rgb, lch or gamut. They are DERIVED and UNAUTHORABLE — `parseEntry`
  // rejects them by name (§3). What the SOURCE printed goes in `sourceHex`, which is a record
  // of the transcription, never a derived value.
  "color": {
    "xyz":   { "x": 0.1284, "y": 0.1421, "z": 0.1657 },
    "measuredUnder": "D65",
    "adaptation": null,
    "sourceHex": "#526A6B"
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
    "sourceId": "WADA-1933",     // an ID in licensing-and-provenance.md §5. Cross-checked.
    "sourceType": "publication | measurement | museum-record | editorial | standard",
    "publisher": "…",
    "publishedYear": 1908,
    "rightsHolder": "…",
    "sourceLicence": "…",
    "sourceUrl": "…",
    "derivation": "How this value was obtained. Required.",
    "authoredBy": "ed-004",      // a roster id in content/editors.json (ADR-0047)
    "authoredAt": "2026-08-11",
    "verifiedBy": "ed-002",      // null before `verified`; required from `verified` onward
    "verifiedAt": "2026-08-13",
    "editorialNotes": "What was decided and why."
  },

  "relations": {
    "related": ["nando-iro", "kachi-iro"],
    "complementary": ["…"],
    "historicalVariants": ["…"]
  },

  // Every `null` above needs a reason here, and every reason needs a matching `null`
  // (FR-21: no silent blanks). Both directions are enforced.
  "unknowns": {
    "taxonomy.material": "no dyeing record survives for this name"
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
provenance.source · provenance.sourceId · provenance.sourceType · provenance.sourceLicence
provenance.derivation · provenance.editorialNotes
provenance.authoredBy · provenance.authoredAt
provenance.verifiedBy · provenance.verifiedAt   (from `verified` onward)
editorial.description_en · editorial.description_ja
status · versionId
```

> **This list is longer than it was.** Three documents disagreed about what complete
> provenance means: this section's original list omitted `sourceLicence`, `publisher`,
> `rightsHolder` and `editorialNotes`, while
> [ADR-0007](../adr/0007-colour-corpus-provenance-and-licensing.md) §1 requires them and
> **NFR-20 names the licence explicitly**. The accepted decision and the requirement win; this
> section was the outlier, and F-011 corrected it.
>
> `authoredBy` and `authoredAt` are **new** — see
> [ADR-0047](../adr/0047-editorial-identity-is-a-roster-id-not-a-name.md). Without an author
> field, "author and reviewer must differ" was a rule that could not run.

**Fields that do not apply are `null` with a stated reason**, never absent and never `"n/a"`.
`publishedYear` on a measurement is genuinely unknowable; `sourceLicence: "n/a"` is a
placeholder wearing a value. FR-21 requires every field present or explicitly `null` **with a
reason**, and both halves are enforced: a `null` with no entry in `unknowns` fails, and an
`unknowns` entry whose field is not `null` fails too — otherwise the reasons rot into
decoration while the record keeps explaining an absence that is no longer there.

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

`lab`, `lch`, `oklch`, `rgb` and `hex` are **derived from `xyz` by the engine** at publish
time. They are never typed by an editor and never computed by the database.

**They are unauthorable, not merely regenerated.** `parseEntry` rejects those keys by name, so
there is no state in which a source entry carries one. That is one step stronger than
[ADR-0043](../adr/0043-the-oklch-field-is-authoritative-and-srgb-is-derived.md), which must
regenerate-and-compare because the design manifest has to keep its `srgb` for browsers to read;
nothing reads a hex out of a source entry, so the stronger form is available here.

The derived block lives in the published version bundle
([ADR-0046](../adr/0046-published-corpus-is-an-immutable-generated-bundle.md)), together with
`inSrgbGamut`, `renderDeltaE00` and `lightnessOutOfRange` — because a colour measured on dyed
silk can sit outside sRGB, its hex is **gamut-mapped rather than clipped** (clipping shifts hue
by up to 33.6°), and "closest digital reference" is only an honest phrase when a number stands
behind it (ADR-0031).

This is effect link [E-001](../../.harness/state/effects.json): a change to the conversion
functions invalidates every derived value in the corpus. **Both ends are now guarded** — the
`color-golden` gate at the source, and the `content` gate at the destination, which recomputes
every derived value in the latest published bundle from its `xyz` under the current engine and
fails if they disagree. The fix is always to publish a new version, never to edit a published
one.

An editor supplies `xyz` (from measurement). A hex printed by a published source goes in
`color.sourceHex` — a record of what the source said, with the lossy conversion stated in
`derivation`. The gate compares it against the entry's `xyz`, which is where a transcription
error shows up.

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

1. **`draft`** — the author adds the entry with sources and derivation, recording themselves
   in `provenance.authoredBy`.
2. **`review`** — a different person checks provenance, derivation, translation and
   classification. Author and reviewer must not be the same identity; enforced.

   **Identity is a roster id, not a name**
   ([ADR-0047](../adr/0047-editorial-identity-is-a-roster-id-not-a-name.md)). `authoredBy` and
   `verifiedBy` resolve against `content/editors.json`, and the gate rejects an **unknown** id
   rather than treating it as a second person — because a free-text comparison passes
   `"A. Ranjan"` against `"Ashish Ranjan"`, and any typo satisfies "the two differ". The gate
   also rejects two *different* ids carrying the same `displayName`, which is the case the id
   scheme exists for.

   What this proves is narrow, and the gate says so on every run: **two distinct roster
   identities were recorded. Not that either person read the entry.** F-012 carries that as an
   attested obligation.
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
content/colors/**              source entries — authored, no derived values
content/palettes/**            source palettes
content/editors.json           the identity roster (ADR-0047)
content/rules/**               weights and harmony rules (F-029)
        ↓ validate → derive → checksum        scripts/generate-corpus.mjs
        ↓
content/versions/2026.08.1.json   GENERATED, immutable: entries + derived + per-entry digests
content/versions/index.json       append-only ledger: label → { checksum, engine, … }
```

- Label: `YYYY.MM.N`.
- Immutable once published; checksum verified at load
  ([threat model §9](../architecture/security/threat-model.md)).
- Recorded in every reproducibility envelope.
- Cache keys include it, so a publish mints a new version rather than invalidating —
  which means no cache can ever serve a half-updated catalog.

**The expected checksum lives in the ledger, not in the bundle.** A file checked against a
checksum stored inside itself is not checked: an editor who changes a value and re-runs the
generator produces a self-consistent file and a green build. Two digest levels — per entry, so
a mismatch *names the entry*, and a domain-separated root over those, which is the value in the
ledger and behind `ReproducibilityEnvelope.corpus`. The digest is taken over a **canonical
form**, not over file bytes, so a reformat is not indistinguishable from tampering.

> **What "immutable" delivers, exactly.** It is enforced against accident and **detected**
> against intent. A committer who edits an entry *and* updates its ledger row in the same commit
> passes every check here; the two-file diff and human review are the control, and the
> audit-logged publish path arrives with F-061. Gate 11 prints this on every run rather than
> letting the word imply more than it carries. See
> [ADR-0046](../adr/0046-published-corpus-is-an-immutable-generated-bundle.md).

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
- author and reviewer being the same identity — **or two ids naming the same person**, or an
  id that is not in the roster at all;
- a `historical` classification without a dated primary source;
- a record whose `sourceType` is `editorial` carrying **any** classification other than
  `japanese-inspired` or `editorial` — not merely `historical`. `traditional` claims an
  established name in the received canon and `modern-japanese` claims documented current
  practice, and neither is ours to assert from our own judgement;
- a derived value inconsistent with its `xyz` under the current engine;
- a derived value authored into a source entry at all;
- a `null` with no reason in `unknowns`, or a reason whose field is not `null`;
- a palette without an `anchor`;
- a relation pointing at a non-existent slug;
- a `published` entry differing from its checksum;
- a duplicate slug within a version;
- a cited source absent from the [§5 register](licensing-and-provenance.md), or a `sourceId`
  whose row names a different source than the entry claims. **An unparseable register is a
  failure**, never an absence of constraint.

**No partial publication.** A version publishes completely or not at all — a corpus that is
95 % verified is a corpus where nobody knows which 5 % to distrust.

### The gate has a problem, and here is what is done about it

F-011 ships this gate; F-012 ships the entries. On the day it activates `content/colors/` is
**empty**, and a gate that passes because there is nothing to check is failing open.

1. It **fails if it cannot locate its inputs** — corpus root, roster, register, fixtures —
   rather than passing over an empty set.
2. It runs **one valid and eighteen invalid fixture corpora** on every invocation, so the
   number of rules exercised is never zero. **The valid one carries a published version
   bundle**, which is the only thing that makes the checksum and derived-value rules
   executable before F-012 — without it that half of the gate is correct code that never runs.
3. Those fixtures **cannot become content**: they live under `packages/`, the corpus scan
   globs `content/` only, and a `fixture-` slug appearing under `content/` is itself a failure.
4. `scripts/verify-content-proof.mjs` mutates the **valid** fixture corpus twenty-five ways and
   asserts the gate goes red *and names the right field*, with the baseline asserted green
   either side. One case must stay **green** — an entry reordered and reformatted — because a
   proof where everything is red cannot distinguish a working gate from one that fails on
   everything.

The authored-entry count is printed beside the fixture count on every run, so a green gate over
an empty corpus cannot be read as coverage.

**Not checked here**, and printed every run: that a human *read* an entry, and an edit to a
published entry made together with a matching ledger update.
