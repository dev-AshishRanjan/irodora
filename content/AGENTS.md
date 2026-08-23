# AGENTS.md — `content/`

> **Scoped harness. Extends [`../AGENTS.md`](../AGENTS.md), which still applies in full.**
> This scope is **stricter**, never looser.

The corpus is the product's editorial asset. Its value is **not** the hex values — those are
copyable in an afternoon. Its value is that every value can be traced to where it came from.

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

Not from colour websites, not from other applications, not from anywhere.

> **"Wada is public domain" is not the same statement as "this website's Wada dataset is
> free to ingest."** Almost every accessible Wada dataset is a modern digitisation, and the
> digitiser's choices — which printing, how to correct for paper ageing, what illuminant to
> assume — **are** the dataset. [[wada-public-domain-is-not-the-same-as-free-to-ingest]]

### 3. Our own curation is labelled as ours

`classification` is required and displayed. Our work is `japanese-inspired` or `editorial`,
**never** `historical`.

Presenting our curation as historical is the same dishonesty as copying someone else's data,
pointed the other way — and easier to commit, because it requires no external action.

---

## `derivation` is not a formality

These are different epistemic claims about the same field:

```
"Measured from dyed silk under D65, colorimeter, mean of five readings"
"Taken from the hex printed on page 47 of [publication], converted to XYZ (lossy)"
"Editorial: interpolated between two attested colours in the same family"
```

A future editor correcting an error needs to know which one they are looking at. Without it,
an error is untraceable and therefore uncorrectable.

## Derived values are computed, never typed

`lab`, `oklch` and `hex` are generated from `xyz` by the engine at build time. Typing them by
hand produces values that disagree with the engine, invisibly
([E-001](../.harness/state/effects.json)).

## Published entries are immutable

Correcting one means **publishing a new corpus version**. A recommendation made six months
ago must still be explainable (FR-10), and that requires the values it used to still exist.

## Review

`draft → review → verified → published → superseded`.

**Author and reviewer must be different identities.** Enforced.

**And when they are not, the entry says so.** `provenance.reviewIndependence` is
`"independent"` or `"self"`, required from `verified` onward and never defaulted
([ADR-0060](../docs/adr/0060-one-editor-and-self-review-is-declared-rather-than-assumed.md)).
Irodora has one editor today, so `"self"` is what an honest entry records.

This is enforced in **both** directions and is not a way around the rule above: `"self"`
*requires* author and reviewer to be the same id, two ids naming one person still fails under
it, and the reviewer still has to hold the `reviewer` role and be active.

**Write down what it costs.** One person checking their own work catches less than two, and a
single non-native editor cannot self-check a Japanese mistranslation at all. `"self"` makes
that visible. It does not make it equivalent.

---

## Rules and weights are content too

`content/rules/` holds recommendation weights and harmony rules.

- **Every rule carries a `rationale`.** A weight with no stated reason cannot be evaluated,
  defended, or safely changed by the next person.
- Weights sum to 1.0, validated at publish time. A set that does not normalise produces
  scores that are not comparable across contexts, and **fails silently**.
- A change mints a new immutable `rule_version`.

## Content is a trust boundary

Whoever can write here changes what every user is told **without touching a line of code**.
Silent, product-wide, and invisible to conventional monitoring.

Publication only through the admin application in production · checksums verified **at
load**, not only at write · every publish audit-logged with actor and diff.

**A checksum mismatch is a SEV1**, with no threshold and no grace period. There is no benign
explanation for immutable content differing from its recorded checksum.

---

## Verifying

```bash
pnpm test:content
```

## Before you start

[`.harness/rules/content/content-provenance.md`](../.harness/rules/content/content-provenance.md) ·
[`docs/content/color-corpus-spec.md`](../docs/content/color-corpus-spec.md) ·
[`docs/content/licensing-and-provenance.md`](../docs/content/licensing-and-provenance.md) ·
[`corpus-entry`](../.harness/skills/corpus-entry/SKILL.md).
