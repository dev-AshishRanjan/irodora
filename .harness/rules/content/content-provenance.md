# Content and Provenance Rules

**Mandatory for anything under `content/`.**

Spec: [`color-corpus-spec.md`](../../../docs/content/color-corpus-spec.md) ·
Policy: [`licensing-and-provenance.md`](../../../docs/content/licensing-and-provenance.md) ·
[ADR-0007](../../../docs/adr/0007-colour-corpus-provenance-and-licensing.md).

---

## Three absolute rules

### 1. No entry without complete provenance

```
source · sourceType · derivation · verifiedBy · verifiedAt
```

The `content` gate fails the build on a single incomplete record. **There is no partial
publication** — a corpus that is 95 % verified is one where nobody knows which 5 % to
distrust.

### 2. No ingestion of third-party datasets

Not from colour websites, not from other applications, not from anywhere. Every value is
derived from a source we can name and a method we can state.

**"Wada is public domain" is not the same statement as "this website's Wada dataset is free
to ingest."** Almost every accessible Wada dataset is a modern digitisation, and the
digitiser's choices — which printing, how to correct for paper ageing, what illuminant to
assume — are the dataset.

### 3. Our own curation is labelled as ours

`classification` is required and displayed. Our editorial work is `japanese-inspired` or
`editorial`, never `historical`.

Presenting our curation as historical is the same dishonesty as copying someone else's
data, pointed in the other direction.

---

## `derivation` is not a formality

These are different epistemic claims about the same field:

```
"Measured from dyed silk under D65, colorimeter, mean of five readings"
"Taken from the hex printed on page 47 of [publication], converted to XYZ (lossy)"
"Editorial: interpolated between two attested colours in the same family"
```

A future editor correcting an error needs to know which one they are looking at. Without
`derivation`, an error is untraceable and therefore uncorrectable.

---

## Derived values are computed, never typed

`lab`, `oklch` and `hex` are generated from `xyz` by the engine at build time.

**Never type them by hand.** They will disagree with the engine, and the disagreement will
be invisible until someone notices two representations of the same colour.

This is effect link [E-001](../../state/effects.json): a change to the conversion functions
invalidates every derived value in the corpus.

---

## Published entries are immutable

Correcting a published entry means **publishing a new corpus version**, never editing the
old one.

A recommendation made six months ago must still be explainable (FR-10), and that requires
the values it used to still exist. A superseded entry is marked, not deleted.

---

## Review

```
draft → review → verified → published → superseded
```

**Author and reviewer must be different identities.** Enforced.

The reviewer checks: provenance completeness · derivation plausibility · translation
quality · classification correctness · the relations resolve.

---

## Language

- Descriptions say what the colour **is** and what it was made from. Not how it makes you
  feel.
- **No invented history.** If an origin is uncertain, the description says so.
- English names are an **editorial decision**, not a translation. 藍鼠 is literally "indigo
  mouse"; "Indigo Grey" is a judgement about what communicates. Record the reasoning.
- Japanese descriptions are **written**, not machine-translated.
- **Never assert that a hex value *is* a historical colour.** "Closest digital reference",
  always ([ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md)).

---

## Rules and weights are content too

`content/rules/` holds recommendation weights and harmony rules
([ADR-0011](../../../docs/adr/0011-recommendation-rules-are-versioned-content.md)).

- **Every rule carries a `rationale`.** A weight with no stated reason cannot be evaluated,
  defended, or safely changed by the next person.
- Weights sum to 1.0. Validated at publish time — a set that does not normalise produces
  scores that are not comparable across contexts, which fails silently.
- A change mints a new immutable `rule_version`.

---

## Content is a trust boundary

Whoever can edit content changes what every user is told, without touching a line of code.
It is silent, product-wide, and invisible to conventional monitoring
([threat model §9](../../../docs/architecture/security/threat-model.md)).

- Publication only through the admin application in production.
- Checksums verified at load, not only at write.
- Every publish audit-logged with actor and diff.
- **A checksum mismatch is a SEV1**, with no threshold and no grace period. There is no
  benign explanation for immutable content differing from its recorded checksum.
