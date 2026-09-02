# ADR-0080 — The PDF report is Latin-1 and refuses what it cannot draw

## Status

Accepted

## Date

2026-09-01

## Context

FR-51 asks for a PDF among six export formats, and FR-65 sets the criterion that decides the
design:

> The report is **reproducible from its envelope**, and is generated **on the device** — no
> image or colour value is uploaded to produce it.

Two constraints follow immediately. Generated on the device means **no PDF service**, and this
product has no server tier at all ([ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)).
Reproducible from its envelope means the same subject at the same versions must produce the
same file — which is [ADR-0070](0070-a-shareable-card-is-a-deterministic-document-not-a-bitmap.md)'s
argument arriving in a second place: a document that cannot be compared byte for byte has a
criterion nobody can check, and a criterion nobody can check quietly becomes nothing.

So the writer is a pure function producing bytes, with no dates, no generated ids and no
compression — the three places non-determinism enters a PDF.

**Then there is text.** A PDF draws text with a font, and the font decides which characters
exist. There are two ways to have one:

**Base-14.** Every conforming reader has Helvetica. Nothing is embedded, the file stays small
and diffable, and the writer stays a few hundred lines of byte assembly with no dependency.
The encoding is single-byte, so the characters available are Latin-1's.

**An embedded CID font.** Any character, including the kanji this product is *about*. The cost
is a TrueType parser, a `cmap` walk to map code points to glyph ids, a subsetter, a
`ToUnicode` CMap so the text is selectable, and a font descriptor — **a font pipeline**, added
inside a feature about export formats, and 667 KB of font in every report.

The product's own corpus makes the choice sharp rather than academic. Colour names are kanji,
kana and romaji, and **nine of the 120 romaji carry macrons** (`sabi-dō`, `tō-yama`,
`yū-dachi` …) which Latin-1 has no code for either. The English names are ASCII, and so are the
slugs.

## Decision

**The PDF report is drawn with base-14 Helvetica under WinAnsiEncoding, and a character it
cannot encode is refused by name.**

Refused — not dropped, not replaced with a box, not transliterated. `toPdf` throws an
`ExportError` naming the character, its code point, and the field it appeared in, and says that
the CSV, JSON, CSS and design-token exports carry it.

One exception, and it is a narrow one: **our own labels are rewritten rather than refused.**
`ΔE00` is drawn as `dE00`, because the delta sign is a name we chose and we are free to spell it
in the alphabet the document can draw. A colour somebody else named is not ours to respell.

## Consequences

**A palette titled in Japanese cannot be exported as a PDF.** That is an ordinary thing for this
product, and it is the real cost of this decision. The person gets an error that says which
character stopped it and which formats do carry it — five of the six do, including both JSON
shapes and the CSV, so nothing is lost from the export *set*.

**A report about Japanese colours shows their English names.** The corpus publishes `name.en`
for every entry and it is ASCII throughout, so a report is complete and honest; what it is not
is Japanese.

**The writer stays diffable, and that is what the criterion needed.** `export.test.ts` asserts
the cross-reference offsets point at the objects they claim, that the declared stream length
equals the bytes written, and that the same subject writes the same bytes twice. None of that
would be possible against a compressed stream from a library, and **a viewer would not have
caught any of it** — a PDF with a broken xref table usually still opens, because readers rebuild
what they cannot parse.

**Silence was the alternative that had to be refused.** A writer that dropped unencodable
characters would produce a report that reads correctly, is missing a name, and is trusted. This
repository has the same rule about a camera estimate that lost its capture conditions
([ADR-0005](0005-measurement-provenance-is-a-type.md)) and about a colour band with no usable
pixels (F-054): **the refusal is the honest output.**

## Alternatives considered

**Embed a CID font now.** The right answer eventually, and the reason it is not this decision is
scope rather than doubt: a TrueType parser and a subsetter inside an export-formats feature is
the kind of addition that is not reviewed against any requirement. Filed as its own feature.

**Transliterate to romaji, or strip the macrons.** Both change somebody's name to make our
writer's life easier. `sabi-dō` is not `sabi-do`, and a product whose argument is provenance
does not quietly edit the data it is exporting.

**Use `Differences` to add the missing glyphs to the base font.** `omacron` and `umacron` are in
the Adobe glyph list, so this would work — in readers whose Helvetica substitute happens to have
those glyphs. Which readers those are is not knowable from here, and a document that renders
differently depending on the machine is exactly what a deterministic writer is for.

**Ship the PDF without text.** Swatches and hex values only. It would encode, and it would not be
a report.
