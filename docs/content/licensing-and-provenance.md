# Colour Content — Licensing and Provenance

| | |
|---|---|
| **Status** | Binding · reviewed before each corpus version |
| **Decision** | [ADR-0007](../adr/0007-colour-corpus-provenance-and-licensing.md) |
| **Governance** | [`.harness/governance/content-licensing.md`](../../.harness/governance/content-licensing.md) |

> **This document is an engineering and editorial policy, not legal advice.** Where it
> states a position on a specific work, that position is our working assumption pending
> confirmation by counsel, and it says so.

---

## 1. The position

**Irodora compiles its colour corpus in-house. We do not ingest third-party colour
datasets.**

Not because copying would necessarily be unlawful in every case — but because:

1. **The legal question is genuinely unsettled** and varies by jurisdiction. A hex value is
   probably a fact. A curated, selected, arranged and annotated *collection* of hex values
   with translations and historical notes is a different object under compilation copyright
   and EU database rights, and most source sites publish terms that say so.
2. **Copied data is unexplainable data.** These lists disagree with each other, because
   they derive from different printings, different photographic reproductions, and
   different assumptions about the viewing illuminant. Copying one means inheriting an
   error we cannot locate.
3. **A copied corpus is a commodity.** Anyone can copy the same list. The defensible asset
   is precisely what copying skips.

---

## 2. Source hierarchy

In order of preference:

| Rank | Source | `sourceType` |
|---|---|---|
| 1 | Physical measurement of dyed material under controlled illumination | `measurement` |
| 2 | Primary published sources with documented colour reproduction | `publication` |
| 3 | Museum and institutional records with documented provenance | `museum-record` |
| 4 | Documented contemporary practice — designers, mills, published collections | `publication` |
| 5 | Our own editorial curation, labelled as such | `editorial` |
| 6 | Published colour standards, where licensing permits | `standard` |

**Never:** scraped websites, other applications' data, unlicensed commercial systems, or
any dataset whose provenance we cannot state.

---

## 3. Sanzo Wada — the case worth being careful about

Wada's *Haishoku Sōkan* (配色総鑑, 1933–34) is the most-cited historical Japanese colour
combination work, and the most likely thing for someone to suggest we ingest.

### What we believe, and how confident we are

| Claim | Confidence | Basis |
|---|---|---|
| Wada died in 1967 | High | Well documented |
| The 1933–34 originals are public domain **in Japan** | Moderate–high | Japan's term was life + 50 at the time; that elapsed at the end of 2017, before the 2018 extension to life + 70, which was **not retroactive** |
| US status | **Unresolved** | URAA restoration may apply to a work under copyright in its source country on 1 Jan 1996. Wada died 1967, so restoration plausibly applies, giving 95 years from publication |
| The 2011 Seigensha edition is **in copyright** | High | A modern edition is a new work |
| Modern digitisations carry their own rights | High | Measurement, correction and selection are creative decisions |

### What follows

> **"Wada is public domain" is not the same statement as "this website's Wada dataset is
> free to ingest."**

Almost every accessible Wada dataset is a modern digitisation. The digitiser made choices —
which printing, how to correct for paper ageing, what illuminant to assume — and those
choices are the dataset.

### Our position

**Wada is inspiration, not ingestion.** We study the *system*: how combinations are
constructed, what relationships they encode, how the volumes are organised. We build our
own combinations from our own sources.

Any future use of Wada-derived data requires **written confirmation from counsel**,
recorded in the register below, per jurisdiction we operate in.

---

## 4. Other categories

| Category | Position |
|---|---|
| **Traditional colour name lists** (nipponcolors and similar) | Not ingested. Names may be common knowledge; the compilation is not. Names are independently sourced from primary works |
| **Commercial colour systems** (Pantone, DIC, and equivalents) | Trademarked and licensed. Never reproduced. We do not publish conversions to them |
| **Museum collections** | Ingested only under the institution's stated terms, with attribution |
| **Academic publications** | Cited, never reproduced. Formulae are implemented from published description |
| **Colour standards** (CIE, IEC, W3C) | Formulae implemented; standards documents not redistributed. See [`NOTICE.md`](../../NOTICE.md) |
| **User-contributed colours** | Tenant-private. Never enter the shared corpus |

---

## 5. Source register

Every source used by any published entry appears here before the version ships. Reviewed
before each corpus release.

| ID | Source | Type | Rights holder | Licence | Cleared | Notes |
|---|---|---|---|---|---|---|
| IRO-ED-001 | Irodora editorial curation — seed corpus, 2026 | editorial | Irodora | Proprietary — Irodora original work | 2026-08-24 | The whole of the 2026.08.1 seed corpus. Every value constructed in OKLCh by editorial judgement and converted by the engine; every Japanese name an Irodora coinage. Nothing measured, nothing transcribed, nothing ingested (ADR-0065). One editor, self-reviewed (ADR-0060) |
| IRO-ED-002 | Irodora editorial curation — phrase lexicon, 2026 | editorial | Irodora | Proprietary — Irodora original work | 2026-08-25 | The phrase lexicon in `content/rules/` (F-021): the words a person may type and the OKLCh region each one means. Boundaries placed in the measured gap between adjacent authored bands of 2026.08.1 rather than chosen as round numbers, and held there by an agreement check over all 120 entries. Japanese terms written, NOT reviewed by a competent speaker (ADR-0060, OQ-5) |
| IRO-ED-003 | Irodora editorial curation — taxonomy vocabulary, 2026 | editorial | Irodora | Proprietary — Irodora original work | 2026-08-25 | The family vocabulary in `content/taxonomy.json` (F-090): what a reader sees for each `taxonomy.family`, in English and Japanese. Each Japanese form is a CHOICE, not a translation of the authoring slug, and carries its reason. Completeness is enforced in both directions by gate 11, because the key set comes from corpus data and `tsc` cannot see it. Japanese written, NOT reviewed by a competent speaker (ADR-0060, OQ-5) |

**A source not in this table cannot appear in a published entry.** The `content` gate
cross-checks `provenance.source` against this register — **as of F-011 it actually does**;
before that this sentence described a check nobody had built.

How the check reads this table, because the shape is now load-bearing:

- **`ID`** is what an entry cites in `provenance.sourceId`. It is matched exactly.
- **`Source`** must equal the entry's `provenance.source` text. Both are compared, not just the
  id: an id pointing at a different row than the entry claims would leave the entry displaying
  one provenance and licensed under another.
- The **column names and their order** are read by the parser. Renaming or reordering one stops
  the gate rather than letting it guess.
- The em-dash placeholder row is skipped, never registered — so an entry cannot cite `—` and
  resolve against it.
- **An unparseable table is a failure**, never an absence of constraint. A missing heading, a
  short row or a duplicate id fails the build.

**One row, and it is the whole seed corpus.** `IRO-ED-001` is our own editorial curation, which
is rank 5 in the hierarchy above — the lowest rank that is a source at all. That is the honest
position today: there is no colorimeter and no cleared primary work, so an entry claiming
anything better would be claiming something that did not happen ([ADR-0065](../adr/0065-the-seed-corpus-is-coined-not-canonical-and-constructed-not-measured.md)).
A reader auditing the corpus finds a single source behind all 125 records, and that thinness is
visible here rather than spread across 125 plausible-looking rows.

A source not listed still fails, which remains the correct direction: this table is a legal
safeguard reviewed by a person before each corpus version ships, and it stays a human-reviewed
document rather than generated data precisely so that review keeps happening.

---

## 6. If we get it wrong

If a third party asserts rights in material we have published:

1. **Remove or suspend the affected entries within 24 hours.** Publish a corrected corpus
   version. Do not argue first.
2. **Trace the origin** through `provenance` — this is exactly what the field is for, and
   the reason it is mandatory.
3. **Assess the claim** with counsel.
4. **Fix the process**, not just the entry. If one entry got in without proper provenance,
   the gate that should have caught it needs to change.
5. **Record it** as a lesson in [`.harness/memory/lessons/`](../../.harness/memory/lessons/).

Removing an entry means publishing a new corpus version, never editing a published one —
old recommendations must remain reproducible (FR-10). A superseded entry is retained and
marked, not deleted.

---

## 7. What we publish about our own corpus

The corpus is proprietary ([`LICENSE`](../../LICENSE)). We do publish, per entry:

- the source and its type;
- the licence under which we hold the right to use it;
- how the value was derived;
- who verified it and when.

**Provenance is a product feature, not a legal footnote.** It appears on the colour detail
surface, not on a terms page (FR-24). It is the thing a professional user checks, and it is
the thing no competitor can show.
