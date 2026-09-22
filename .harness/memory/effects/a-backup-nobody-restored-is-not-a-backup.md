# A backup nobody restored is not a backup

**Effect:** [E-141](../../state/effects.json) · **Feature:** F-286 · **Date:** 2026-09-22

`archive.test.ts` had a round trip. It exported, imported and compared digests, with a comment
explaining that comparing an export to an export would be an echo. It was careful, it was
thought about, and **every archive holding a photograph was unrestorable**.

Two choices did it, and neither looks like a mistake on its own:

```ts
importArchive(fresh, archive);   // the in-memory object, where a Uint8Array is still one
```

and a fixture that writes colours. The defect lives in `JSON.stringify` — a `Uint8Array` becomes
`{"0":137,"1":80,…}`, `JSON.parse` returns a plain object, and SQLite refuses to bind it. **The
test never crossed the string**, and the only data that would have exposed it was never in the
fixture.

The failure that reached a person: a `TypeError` from `driver.run`, which is not an
`ArchiveError`, so it escapes the module's own error type and the restore rolls back whole. On
the only backup this product has — there is no server (ADR-0051 §5).

## The rule this produced

**A backup is a FILE. Test the file.**

Every test in `archive-images.test.ts` goes `exportArchive` → `serialiseArchive` → `JSON.parse` →
`importArchive`, because that is what a person's backup is. A test that hands the importer the
exporter's own object is testing two functions against each other, and the medium they are
supposed to survive is exactly where the data stops being itself.

The same shape recurs wherever a boundary is crossed in memory during a test and by a file, a
socket or a process in life: a screenshot that is never decoded, a form never submitted, a
migration never run against a real old database.

## And the half that could not ship separately

`importArchive` writes `INSERT INTO ${table}` from parsed rows, so the `SanitisedImage` brand —
which means something *only* because `putGarmentImage` and friends are the sole writers — was
bypassed on that path: no magic bytes, no byte cap, no pixel cap, straight to a `data:` URI and
the platform decoder.

Latent, because nothing could import an image at all. **Fixing the encoding alone would have made
it live in the same commit.** So they are one feature, and the test file says so.

A brand is a guarantee about a *set of writers*. Every time that set grows — an importer, a
migration, a repair tool — the guarantee needs re-checking, and the type will not remind anybody,
because the new writer is writing raw columns rather than calling the branded method.

## What was measured rather than assumed

- `ingestImage` is **idempotent**: sanitising sanitised bytes returns them unchanged. The
  round trip re-ingests on import, so without that the digest would differ and the restore would
  be "successful" and different. Asserted, not hoped.
- Both halves were **watched failing**: the encoding reverted, three tests red; the sanitise step
  removed, three more. A guard nobody has seen fail is a guard nobody has tested.

## The lesson

**When a test and the world disagree about the medium, the test is wrong.** Find the serialisation
boundary and put the test on the far side of it — and give the fixture the one kind of data the
boundary treats differently, which is usually the kind nobody writes into a fixture.

[[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
[[the-export-list-stopped-being-the-sync-list]]
