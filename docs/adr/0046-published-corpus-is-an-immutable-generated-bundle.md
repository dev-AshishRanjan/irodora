# ADR-0046 — A published corpus version is one immutable generated bundle, vouched for by a ledger

## Status

Accepted

## Date

2026-08-18

## Context

FR-25 requires the corpus to be versioned, immutable once published, checksummed, and verified
at load. [`color-corpus-spec.md`](../content/color-corpus-spec.md) §6 draws the pipeline —
*source entries → validate → derive → checksum → version* — but not the file layout, and the
layout decides three things that F-012, F-016 and F-061 all build on: what a reviewer sees in a
diff, what a checksum is taken over, and what "immutable" is enforced by.

Two shapes were genuinely available.

**A directory per version**, holding a full copy of every entry at that version. Immutability
becomes a property of files: nothing rewrites `2026.08.1/ai-nezumi.json`, so nothing can. It is
the shape most content systems reach for.

**One generated bundle plus a ledger.** `content/versions/2026.08.1.json` holds every published
entry with its derived values and per-entry digest; `content/versions/index.json` is an
append-only row per version carrying the root checksum.

The deciding question was not storage. It was **what a correction looks like in review.** A
one-entry correction under the directory shape produces a two-hundred-file diff in which the
real change is invisible — and a diff nobody can read is a review nobody performs. Since the
control on content is *human review before publish* ([`content/AGENTS.md`](../../content/AGENTS.md):
content is a trust boundary), a layout that defeats review defeats the control.

A second question decided where the expected checksum lives. A bundle that carries its own
expected digest is not checked by it: an editor who changes a value and re-runs the generator
produces a self-consistent file and a green build.

## Decision

**A published version is one generated file. The checksum that vouches for it lives somewhere
else.**

```
content/colors/<slug>.json       authored — no derived values, ever
content/palettes/<slug>.json     authored
content/editors.json             the identity roster (ADR-0047)
content/versions/<label>.json    GENERATED, immutable: entries + derived + per-entry digests
content/versions/index.json      append-only ledger: label → {checksum, engine, publishedAt, entryCount}
```

1. **The bundle stores entries in their AUTHORING shape.** `color.xyz` is written back as
   `{x, y, z}`, not the `Triple` the engine works in, so the file a reviewer reads, the file
   the loader parses, and the file an author wrote are one shape read by one `parseEntry`. A
   separate reader for the published form would be a second schema free to drift from the
   first. (Found by a test: the first version could not load its own output.)

2. **Two digest levels.** Per entry, so a mismatch *names the entry* rather than starting a
   search; and a domain-separated, order-independent root over those digests, which is the
   value in the ledger, in every cache key, and behind `ReproducibilityEnvelope.corpus` (E-006).

3. **The per-entry digest covers the authored record AND its derived block.** The first version
   covered only the authored half, reasoning that derived values are regenerable. A test found
   the hole: a tampered `hex` loaded clean, and `apps/api` would have served it. The derived
   values are what a consumer renders, so they are part of the artefact whose integrity is
   claimed.

4. **The digest is over a canonical form** (RFC 8785-shaped), not over file bytes. `.gitattributes`
   normalises line endings so bytes would *mostly* work — but then a reformat would be
   indistinguishable from tampering, and a SEV1 that fires on whitespace teaches people to
   ignore SEV1s.

5. **`loadPublishedVersion` takes the expected root digest as a required argument**, from the
   ledger. There is no options object, no warn mode, and no overload that reads the digest out
   of the file being verified.

6. **The generator refuses to overwrite a published bundle**, and `--check` regenerates in
   memory and compares — so a hand-edited bundle, or one produced by a different engine, fails
   rather than being silently rewritten.

## Consequences

**Good.** A correction is a reviewable diff: one new bundle file and one appended ledger row.
The checksum means something narrow and true — the content changed — rather than firing on
formatting. A mismatch names the entry. And the split between bundle and ledger turns tampering
into a two-file disagreement instead of a self-consistent lie.

**Bad — and this is the sentence that must not be softened.** **Immutability here is enforced
against accident and *detected* against intent.** A committer who edits an entry *and* updates
the ledger row in the same commit passes every check in this repository. The controls that
close that gap are human review of a two-file diff, and — in production — the audit-logged
admin publish path, which does not exist until F-061. Gate 11 prints this limitation on every
run rather than letting a green gate imply more than it delivers. Anyone reading "immutable"
as "cannot be changed" has been misled, and the word is doing real work in FR-25, so the
qualification travels with it.

**Bad, second.** One file per version means the whole corpus is rewritten on every publish, so
a version's diff against its predecessor is large even when the change is small. The per-entry
digests make the *actual* change locatable, but only to someone who knows to look at them. As
the corpus grows past a few hundred entries this will want a diff tool, and that is a real cost
we are accepting rather than one we have solved.

**Neutral.** The bundle is not the serving format. F-016 defines what the API returns, and it
will be a projection of this — `@irodora/contracts` owns that shape, not this file.

**Neutral.** Older versions are checksum-verified but their derived values are **not**
re-checked against the current engine. They were produced by an engine we no longer have, and
asserting that today's engine reproduces yesterday's answer is exactly the claim FR-10 says we
must not make. Gate 11 prints which versions it skipped, every run.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **A directory per version, one file per entry** | Immutability becomes a property of files, which is genuinely stronger against accident. Rejected because a one-entry correction produces a two-hundred-file diff — and human review before publish is the actual control on a content trust boundary, so a layout that defeats review defeats the control |
| **Store the expected checksum inside the bundle** | Simplest to implement and to hand to a consumer. It is not verification: a file checked against a checksum it carries verifies itself. The ledger is what makes tampering a two-file disagreement |
| **Digest the raw file bytes** | No canonicalisation code, no RFC to track. A reformat, a re-indent or a tool reordering keys would then be indistinguishable from tampering — and a SEV1 with a benign explanation is a SEV1 nobody investigates |
| **Digest only the authored record, not the derived block** | Defensible: derived values are regenerable, so arguably not part of the claim. Rejected on a failing test — a tampered `hex` loaded clean and would have been served |
| **Re-derive values on load instead of storing them** | Removes a whole class of staleness. It also silently returns *today's* engine's answer for an old version, which destroys reproducibility (FR-10) — the exact failure the envelope exists to prevent |
| **Keep derived values in the source entry, regenerate and compare (the ADR-0043 shape)** | Consistent with how design tokens work. Not needed here: the design manifest must keep its `srgb` because a browser reads it, while nothing reads a hex out of a source entry. So the stronger form — derived values are *unauthorable* — is available, and taking the weaker one for symmetry would be a real loss |
