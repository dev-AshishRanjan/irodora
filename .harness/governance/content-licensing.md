# Content Licensing Governance

Policy: [`../../docs/content/licensing-and-provenance.md`](../../docs/content/licensing-and-provenance.md) ·
[ADR-0007](../../docs/adr/0007-colour-corpus-provenance-and-licensing.md).

---

## The rule

**No third-party colour dataset enters this repository.** Not from colour websites, not
from other applications, not from anywhere.

Every value is derived from a source we can name, by a method we can state, verified by a
person we can identify.

---

## Before any corpus entry ships

The `content` gate enforces all of this. There is no partial publication.

- [ ] `source` names a specific work, measurement or record.
- [ ] `sourceType` is one of `publication` · `measurement` · `museum-record` ·
      `editorial` · `standard`.
- [ ] `derivation` states **how** the value was obtained.
- [ ] `sourceLicence` is recorded where one exists.
- [ ] The source appears in the register in
      [`licensing-and-provenance.md`](../../docs/content/licensing-and-provenance.md) §5.
- [ ] `verifiedBy` and `verifiedAt` are set, and the reviewer is **not** the author.
- [ ] `classification` is correct, and our own work is labelled as ours.

---

## Requires written counsel confirmation

Recorded in the source register before use:

- Any Wada-derived data, in any form.
- Any commercial colour system.
- Any dataset published under terms we have not read in full.
- Any museum or institutional material beyond its stated terms.
- Any use in a jurisdiction we have not assessed.

**"Wada is public domain" is not the same statement as "this dataset is free to ingest."**
The 1933–34 originals are credibly public domain in Japan; the 2011 edition is not, US
status under URAA restoration is a separate question, and every modern digitisation
involved measurement and correction choices that are themselves the dataset.

---

## Never

- Scrape.
- Copy from another application.
- Reproduce a commercial colour system, or publish conversions to one.
- Assert that a hex value **is** a historical colour.
- Present our own curation as historical.
- Ship an entry whose provenance we cannot state.

---

## If a claim arrives

1. **Remove or suspend the affected entries within 24 hours.** Publish a corrected corpus
   version. Do not argue first.
2. **Trace the origin** through `provenance` — this is exactly what the field is for, and
   the reason it is mandatory.
3. **Assess** with counsel.
4. **Fix the process, not just the entry.** If one entry got in without proper provenance,
   the gate that should have caught it needs to change.
5. **Record** it as a lesson in [`../memory/lessons/`](../memory/lessons/).

Removing an entry means publishing a new corpus version, never editing a published one —
old recommendations must remain reproducible.

---

## Why this is strict

The corpus is the product's editorial asset. Its value is **not** the hex values, which are
copyable in an afternoon. Its value is that every value can be traced to where it came from.

A copied corpus is a commodity. A provenanced one is expensive to build honestly, cheap to
build dishonestly, **and the difference is visible** — which is precisely why it is worth
building.
