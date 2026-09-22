# Plan: F-286 — An archive carries its images, and an imported one is sanitised before it is written

| | |
|---|---|
| **Feature** | F-286 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-58, NFR-12, NFR-13 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/store` |
| **Author** | implementing session |
| **Date** | 2026-09-22 |

---

## Intent

**Anyone with one garment photograph has a backup that cannot be restored.** FR-58's export is the
only backup this product has — there is no server — and a `Uint8Array` serialises to
`{"0":137,"1":80,…}`, which `JSON.parse` returns as a plain object and SQLite refuses to bind. The
restore throws a `TypeError`, which is not an `ArchiveError`, so it escapes the archive's own error
type and rolls back whole.

The second half is the reason this cannot be fixed on its own: `importArchive` writes blob columns
straight from parsed rows, so the `SanitisedImage` brand — which means something only because the
`put*` methods are the sole writers — is bypassed. Fixing the encoding without fixing that would
make a hostile archive's arbitrary bytes reach the platform decoder **in the same commit**.

Found by F-241's security review.

## Approach

**Reused.** `ingestImage` and `ImageRejected` (F-050) — the magic-byte check, the byte and pixel
caps, the EXIF strip, all of it already written and tested. `parseArchive`'s existing discipline:
every field checked, a partial import treated as worse than a refused one.

**New.** A tagged encoding for bytes, a refusal for the archives that cannot be read, and an
ingest step on the way in.

### Bytes are tagged, not guessed at

```json
{ "bytes": { "$bytes": "iVBORw0KGgo…" } }
```

A wrapper rather than "the column called `bytes` is base64", because a convention about column
names is a rule the next table forgets. The shape is self-describing, `parseArchive` can validate
it the way it validates everything else, and it cannot be confused with a string a person typed.

Base64 also makes the size honest: at indent 2 the object form costs **20–25 bytes per image byte**,
so a 4 MB photograph builds a ~100 MB string in Hermes. Base64 costs 4/3.

### An archive that cannot be read is refused by name

An archive written before this change and holding an image is **unreadable** — the bytes are in it,
but as a JSON object whose keys are indices, and nothing can tell that from a legitimate object.
So `parseArchive` recognises that shape and refuses it with a sentence that says what happened,
rather than letting a `TypeError` escape from a `driver.run` three frames down.

An archive with no images is unaffected: those are the only ones that have ever imported, and they
still do. That is why the marker is a **per-value tag rather than a format version** — bumping
`format` would refuse every archive anyone has successfully written.

### Ingest happens on the way in, and the metadata comes from the bytes

An image column is re-ingested on import, and `width`, `height`, `format` and `byte_length` are
taken from the resulting `SanitisedImage` rather than from the archive's own row. A hand-edited
file claiming a 1 × 1 PNG over five megapixels of JPEG is then refused by the caps rather than
stored with metadata that lies about it.

Which columns are images is **declared**, not sniffed:

```ts
const IMAGE_COLUMNS = { garment_image: 'bytes' } as const;
```

A new image table adds itself here or its bytes are stored unchecked, so the test asserts this map
covers every archived table that has a BLOB column — self-cleaning, the shape the roster assertion
in F-241 uses.

**This depends on `ingestImage` being idempotent** — sanitising already-sanitised bytes must return
them unchanged, or a round trip would not digest identically. That is asserted rather than assumed;
if it turns out not to hold, the import runs the *checks* and keeps the bytes, and the plan says so
here rather than the implementation discovering it.

### Increments

1. **Record**: the claim, this plan.
2. **The encoding**: tag on the way out, decode on the way in, the named refusal for the old shape,
   and the round trip asserted **across the serialised string**.
3. **The ingest**: image columns re-ingested, metadata taken from the bytes, hostile cases refused.
4. **Effects and the record**, including what the threat model's boundary-③ row can now name.

## Mockup fidelity

Not applicable: nothing here is a surface. No app screen calls `backup.ts` yet.

## Files to touch

```
packages/store/src/archive.ts     the tag, the decode, the refusal, the ingest on import
packages/store/src/backup.ts      serialisation (the indent, if the size argument moves it)
packages/store/test/archive.test.ts   the round trip across the STRING, and the hostile cases
.harness/state/*, .harness/memory/effects/*, docs/architecture/security/threat-model.md
```

## Anticipated effects

1. **The archive's on-disk shape changes** → every file anyone has written. Guard: the per-value
   tag means image-free archives are byte-compatible, and the test that an old image-bearing
   archive is refused *by name* is what proves the failure is legible.
2. **`digest()` uses `readTables`**, so the digest's shape changes too → the round-trip proof
   itself. Guard: both sides use the same encoding, and the round-trip test compares a database
   restored from a *string* rather than from an in-memory object — which is the gap that let this
   defect live.
3. **Import gains a dependency on `ingestImage`** → the store's public surface and `image.ts`.
   Guard: the idempotence assertion, and the hostile-archive cases.
4. **The threat model's boundary-③ row currently reads `none yet`** → it gains a guard. Guard: the
   row is updated in the same feature, which is the point of having written it down.

## Test plan

- **The round trip that was missing**: a database holding a garment photograph → `exportArchive` →
  `serialiseArchive` → `JSON.parse` → `importArchive` into a fresh database → `digest()` identical.
  **Across the string**, because `archive.test.ts` handed `importArchive` the in-memory object,
  where a `Uint8Array` is still a `Uint8Array`, and that is exactly why the suite was green.
- **The decoy that the old shape fails**: the byte-index object form is refused with an
  `ArchiveError` naming it — not a `TypeError`, and not silence.
- **An image-free archive still imports**, so the refusal is about images rather than about age.
- **Hostile archives**: arbitrary bytes in an image column; a base64 payload that is not a JPEG or
  a PNG; one past the byte cap; one whose declared width disagrees with its header. Each refused
  as an `ArchiveError`, each with the plant proving the case is real.
- **Idempotence**: `ingestImage(ingestImage(x).bytes).bytes` equals `ingestImage(x).bytes`.
- **The declared map is complete**: every archived table with a BLOB column appears in
  `IMAGE_COLUMNS`, read from the schema rather than restated.
- **Gates**: state, typecheck, lint, format, test, security.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm security
```

## Risks and open questions

- **No open question blocks this.** The shape of the fix follows from the defect.
- **An archive somebody has already written, holding a photograph, stays unrestorable.** Nothing
  can change that — the bytes are recoverable in principle from the index-keyed object, but writing
  a recovery path for a file format that never worked, for a surface that does not exist, is scope
  nobody asked for. The refusal says what happened, which is the part that matters.
- **No surface calls `backup.ts`**, so this is unobservable to a person today. That is the reason
  it is worth doing now rather than later: the export surface is what makes it urgent, and landing
  the fix first means that surface ships onto a path that works.

## Out of scope

Any export or import UI. Encrypting the archive (ADR-0051 §5 settles that). The avatar, which
ADR-0105 keeps out of the archive entirely. The downscale and the APP2/MPF filter (F-287).
