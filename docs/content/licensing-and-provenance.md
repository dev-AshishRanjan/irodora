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
| — | *No sources registered yet. Corpus entries begin at F-012.* | — | — | — | — | — |

**A source not in this table cannot appear in a published entry.** The `content` gate
cross-checks `provenance.source` against this register.

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
