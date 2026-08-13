# ADR-0007 — The colour corpus is compiled in-house with per-entry provenance

## Status

Accepted

## Date

2026-08-13

## Context

Japanese traditional colour lists are everywhere on the internet. Hex values for 藍鼠,
納戸色 and several hundred others can be copied in an afternoon. Several existing products
appear to have done exactly that.

Three problems with copying, in increasing order of seriousness:

**Legal.** A hex value is a fact and probably not copyrightable on its own. A *curated,
selected, arranged and annotated collection* of them, with translations, historical notes
and modern interpretations, is a different matter — under EU database rights, under
compilation copyright, and under the licence terms most of those sites actually publish.
"It is only numbers" is a defence that has to survive contact with a lawyer who has read
the source site's terms.

The **Sanzo Wada** case is instructive precisely because it looks simple. Wada died in
1967; Japan's term was life + 50 at the time, so the original *Haishoku Sōkan* (1933–34)
entered the public domain there at the end of 2017 — before the 2018 extension to life + 70,
which was not retroactive. That much is credible. But: the 2011 Seigensha edition is a new
work with its own rights; every modern digitisation involved measurement, correction and
selection decisions that are themselves creative; and US status is a separate question
under URAA restoration. "Wada is public domain" is *not* the same statement as "this
website's Wada dataset is free to ingest."

**Quality.** These lists disagree with each other. The same colour name carries different
hex values across sources, because they derive from different printings, different
photographic reproductions, and different assumptions about the viewing illuminant. Copying
one means inheriting an error we cannot explain and cannot correct, because we do not know
where it came from.

**Strategic.** If the corpus is copied, it is a commodity. Anyone can copy the same list.
The defensible asset is precisely the thing copying skips: verified provenance,
professional derivation, and editorial judgement that can withstand being questioned.

## Decision

**Compile the corpus in-house. Every entry carries complete provenance. No third-party
dataset is ingested without verified licence.**

1. **Mandatory provenance on every entry** — enforced by the `content` gate (NFR-20), so
   an incomplete record fails the build rather than shipping:

   ```
   source            the specific work, publication or measurement
   source_type       publication | measurement | museum-record | editorial | standard
   publisher · published_year · rights_holder
   source_licence    with URL where one exists
   verified_by       a named person
   verified_at       a date
   editorial_notes   what was decided, and why
   ```

2. **Five classifications, never conflated** (FR-23), each displayed:
   `historical` · `traditional` · `modern-japanese` · `japanese-inspired` · `editorial`.
   Our own curation is labelled `japanese-inspired` or `editorial`. Presenting our work as
   historical would be the same dishonesty as copying someone else's.

3. **Derivation, not copying.** Preferred sources in order: physical measurement of dyed
   material under controlled illumination; primary published sources with documented
   colour reproduction; museum and institutional records; documented contemporary practice.

4. **Wada is inspiration, not ingestion.** We study the *system* — how combinations are
   constructed, the relationships they encode — and build our own. We do not copy his
   values. Any future use of Wada-derived data requires written counsel confirmation
   recorded in [`../content/licensing-and-provenance.md`](../content/licensing-and-provenance.md).

5. **No scraping. Ever.** Not from colour sites, not from retailers, not from anywhere.

6. **Language discipline.** A rendered hex is never asserted to *be* a historical colour.
   The phrasing is always "closest digital reference" (FR-7, NFR-21), and the copy lint
   enforces it.

7. **Depth over breadth.** Two hundred entries that withstand scrutiny beat two thousand
   nobody checked (OQ-4).

## Consequences

**Good.** A genuinely defensible asset. Legal exposure approaches zero. Provenance is a
*visible product feature* — users and professionals can see where a value came from, which
is exactly what no competitor can show. Errors become traceable and correctable because
every value has a stated origin.

**Bad.** Slow and expensive. Requires Japanese-language editorial expertise (OQ-5). The
launch corpus will be smaller than competitors' scraped lists, and someone will compare
counts. Physical measurement needs equipment and controlled conditions. This is the single
largest non-engineering cost in the product.

**Neutral.** The corpus becomes a versioned, immutable content artefact with its own
release process — which reproducibility (FR-10) requires anyway.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Ingest a public Japanese colour list** | Fast, free, and immediately larger than anything we can build. Carries compilation-copyright and database-right exposure, inherits unexplainable errors, and reduces the corpus to a commodity anyone can replicate |
| **Licence a commercial colour system** | Authoritative and defensible. Expensive, restrictive on redistribution, and typically industrial rather than cultural — it would not give us traditional Japanese colour at all |
| **Crowdsource** | Scales cheaply. Provenance becomes unverifiable, which is the one property that makes the corpus worth having |
| **Generate algorithmically from historical descriptions** | Clever and legally clean. But "the colour of a young chestnut" is not a coordinate, and inventing one and calling it historical is worse than copying — at least copying inherits somebody's real measurement |

## Revisit when

- Counsel confirms a specific third-party dataset is genuinely free to ingest, in every
  jurisdiction we operate in.
- A licensable authoritative Japanese colour reference becomes available on terms that
  permit redistribution.
