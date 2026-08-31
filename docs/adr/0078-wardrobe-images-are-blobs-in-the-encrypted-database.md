# ADR-0078 — Wardrobe images are BLOBs in the encrypted database, not files beside it

## Status

Accepted

## Date

2026-08-31

## Context

F-042 had to store a photograph of a garment, and found three documents disagreeing about what
that means:

| source | says |
|---|---|
| **NFR-13** | the database *and any stored imagery* are encrypted **with SQLCipher**; the key is on-device, in the Keychain / Keystore |
| **F-042 criterion 3** | wardrobe images are encrypted with a **device key held in the platform keystore**; key rotation is exercised in a test |
| **`data-model.md` §5** | there is no `image_encrypted` column *"because there is no envelope encryption to describe: the whole database **and the image directory** are covered by the device's own protection plus SQLCipher"* |

**The third was factually wrong, and that is what forced the decision.** SQLCipher encrypts a
database file. It does not reach a directory of image files sitting next to it. Those would be
covered by iOS Data Protection and Android FBE — real protection, and neither SQLCipher nor a
key we hold. So an `image_path` column would have made NFR-13 false while appearing to satisfy
it: the requirement names a mechanism, and the implementation would have used a different one.

This is the shape golden rule 11 exists for, one level in from the UI. A sentence in an
architecture document that overstates what a mechanism covers is the same defect as a screen
that overstates what a camera measured, and it is harder to notice because nobody reads an
architecture document looking for a claim.

The starting position also mattered: `apps/mobile` has **no filesystem package and no cipher**.
`expo-crypto` is digest and randomness; `@noble/hashes` hashes. Writing encrypted image files
would have meant adding both.

## Decision

**Wardrobe images are stored as BLOBs in the SQLCipher database**, in a `garment_image` table
with one row per garment.

Three options were considered and the other two are recorded because the reasons they lost are
not obvious.

### Rejected — encrypted files on disk

Files in the app's private directory, encrypted by us under a second keystore key. It matches
criterion 3's wording most literally and keeps the database small.

It loses on what it costs: **two new runtime dependencies** (`expo-file-system` and a cipher
such as `@noble/ciphers`) and a file-encryption layer of our own. Rotation becomes a resumable
re-encrypt loop over every file, which must be crash-safe — a rotation interrupted halfway
leaves files under two keys, and the recovery code is exercised on exactly the day it is needed
and never before. That is a lot of code whose failure mode is silent data loss, written to
avoid a limitation the alternative does not have.

### Rejected — plain files, OS protection only

What `data-model.md` actually intended, and what most local-first apps do. iOS Data Protection
and Android FBE are genuine.

It loses because it would require **amending NFR-13 and criterion 3** to describe weaker
protection than they currently promise. That is a decision the requirement's owner makes, not
one an implementer makes while building — and `state/README.md` is explicit that acceptance
criteria are not edited to match what was built. Left available if the costs below ever bite:
it is the honest fallback, and it needs a requirement change rather than a workaround.

### Accepted — BLOBs in SQLCipher

- **NFR-13 becomes true as written.** The imagery is in the database, and the database is
  SQLCipher.
- **No new dependency, and no cipher of ours.** The bytes inherit the encryption that is
  already there and already attested.
- **One key, already in the keystore.** There is no second key lifecycle to get wrong, and no
  window where an image is under one key and the database under another.
- **Rotation is `PRAGMA rekey`** — SQLCipher's own operation over the whole file, atomic from
  our side, rather than a loop we write.

## Consequences

**Good.** The requirement and the implementation name the same mechanism. Erasure (FR-58) is
simpler: deleting the key makes photographs unreadable along with everything else, with no
directory to sweep and no orphaned files to leak after a row is gone. And a backup is one file.

**Bad, and both are real.**

**A blob read is all-or-nothing.** SQLite has an incremental blob API; `node:sqlite` and
`expo-sqlite` do not expose it, so reading an image means loading it whole. This is why
`garment_image` is a separate table rather than a column on `garment` — a list screen must not
drag every photograph into memory — and why `byte_length`, `width` and `height` are columns
beside the bytes, so a caller can size a decode, or decline it, without touching the blob.

**Photographs join the backup.** `archive.ts` reads `SELECT *`, so the export grows by the size
of the wardrobe's images and so does its canonical digest. [E-023](../../.harness/state/effects.json)
predicted exactly this mechanism for any new column. It is arguably correct — a backup that
silently omitted your photographs would lose them — but it is a change in what an export costs,
and the number is the wardrobe's, not ours.

**The general SQLite guidance points the other way at scale.** Files beat blobs above roughly a
megabyte. Wardrobe images are resized on ingest and a phone-sized JPEG lands well below that, so
this sits on the favourable side of that line — but it is a line, and a future feature storing
full-resolution originals would be on the wrong side of it. That is the trigger for revisiting
this, and it is a size, not a feeling.

## What this ADR also corrected

The false sentence in `data-model.md` §5 is rewritten, and it names what was wrong rather than
quietly replacing it. `privacy-design.md` §4 is rewritten too: its encryption table described
TLS, HSTS, certificate pinning, per-tenant data keys and a KMS master key — the version-1.0
server architecture, months after ADR-0051 retired it, and the paragraph explaining why we do
not say "end-to-end encryption" gave a reason (*"the server can decrypt wardrobe images"*) that
depends on a server that does not exist.

Both survived because gate 0's retired-vocabulary check scans **feature criteria and PRD rows
only**. `privacy-design.md` contained *"per-tenant data key"* — a phrase on that check's own
retired list — with every gate green. Extending the scan to architecture and security documents
is filed as **F-107**.
