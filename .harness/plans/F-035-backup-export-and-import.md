# Plan: F-035 — Backup, export and import

| | |
|---|---|
| **Feature** | F-035 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-58 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/store` · `apps/mobile` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

**With no server, this is the entire durability story.** A lost phone is lost data, and
[ADR-0051](../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) §5
is explicit that export and verified re-import are a first-release feature rather than a
follow-up, *"because it must exist before the product is usable."*

To a user: what they have made can leave the device in a form they own, come back intact, and
be destroyed completely when they say so.

## The two claims that are easy to make and hard to mean

**"Re-imports to a byte-identical database."** Taken literally that is false and unmeetable: a
SQLite *file* differs on page layout, freelist state and `AUTOINCREMENT` sequence even after an
identical sequence of writes. The claim worth making — and the one FR-58 is reaching for — is
that **the data** round-trips exactly. So the check is a canonical serialisation of every row
of every table, compared byte for byte, and the plan says which one it is rather than letting
"byte-identical" quietly mean whichever is convenient at the time.

**"Erasure is immediate and local."** The criterion already carries its own warning: *"the
return value of the erase call is not the proof."* So erasure is verified by **re-querying every
store afterwards**, and — because the database is encrypted — by **destroying the key**, which
is what makes bytes already on disk unreadable. A file delete leaves recoverable blocks; a
row-by-row delete leaves them too.

## Approach

**Reused:** `@irodora/store`'s driver interface and conformance harness · the `node:sqlite`
driver for the gated round-trip · `forgetDatabaseKey` from F-041, which already exists for
exactly this · the findings-based suite shape so `apps/mobile` can run the same checks.

**New:** `packages/store/src/archive.ts` — export, import, canonical digest, erase.

### The archive format

Versioned JSON, not a copy of the database file. Three reasons, and the third is the one that
decides it:

1. A file copy is a copy of an **encrypted** database — useless without the key, and shipping
   the key with the backup makes the encryption theatre.
2. A file copy pins the SQLite page format into the user's backup.
3. **A backup the user cannot read is not a backup they own.** FR-58's point is portability.

The archive carries a `schemaVersion`, so an import into a newer app can be migrated forward
and an import into an *older* one is **refused** rather than guessed at — the same rule
`migrate()` already applies to the database itself.

### Increments

1. **Canonical serialisation and the digest.** Every table, every row including tombstones,
   in a declared order with declared key ordering. This is what "identical" means, and it is
   written first so the round-trip test cannot be defined by whatever export happens to emit.
   → `pnpm --filter @irodora/store test`
2. **Export and import**, with the round-trip asserted through the digest, and a decoy: an
   archive with one field altered must produce a different digest.
   → `pnpm --filter @irodora/store test`
3. **Erasure**, verified by re-query across every table plus key destruction — never by a
   return value. Decoy: a "delete" that only tombstones must **fail** the erasure check,
   because a tombstone is the opposite of erasure.
   → `pnpm --filter @irodora/store test`
4. **The app surface.** Export to a file the user picks, import with a confirmation, and the
   prompt before any destructive action. Copy through the catalogue (ADR-0056), so both
   languages. → `pnpm test:a11y && pnpm lint`
5. **Record and close.** Effects, progress, lessons.

## Anticipated effects

**Touches E-016** (the message key set): four or five new user-facing strings, each needing a
Japanese value and each subject to the same unreviewed-count reporting.

**NEW — the archive format is a contract with every past version of itself.** An archive
written today must be readable by an app shipped next year, and that is a promise nobody can
test against a version that does not exist yet. The guard is the `schemaVersion` field plus a
refusal to import a newer one; the honest limit is that forward compatibility is asserted only
against the versions in the repository. Recorded rather than implied.

## Test plan

- **Round-trip:** export → fresh database → import → digests equal. Over a corpus that includes
  a tombstoned row, a row with every column at a boundary value, and a palette with members, so
  the test is not exercising one happy row.
- **Negative, with decoys rather than empty fixtures:** an archive with one altered field must
  change the digest; an archive at a *newer* `schemaVersion` must be refused; an "erasure" that
  only tombstones must fail the erasure check; an import into a non-empty database must refuse
  rather than merge, because a silent merge is how a restore duplicates everything.
- **Assertions to reject:** comparing export output to export output (an echo); asserting the
  digest is "a string"; erasing and then checking the erase function returned `true`.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

`e2e` is not on this feature's list. FR-58 says *"asserted in e2e"* and `pnpm test:e2e` exits 1
by design while no surface declares the script; the round-trip is gated in Node, and the
on-device journey is **attested**.

## Risks and open questions

**"Byte-identical" is being interpreted.** The plan states the interpretation — canonical row
serialisation, not file bytes — because the alternative is a criterion that can never pass and
would eventually be softened quietly instead of deliberately.

**Encrypted backups are out of scope and that is a real gap.** The archive is plaintext JSON:
readable by the user, which is the point, and readable by anyone who obtains the file, which is
the cost. FR-58 asks for portability, not for a second encryption scheme. Recorded here so it
is a decision rather than an oversight.

## Out of scope

Cloud or off-device backup — there is no server ([ADR-0051](../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md))
· scheduled or automatic backups · encrypting the archive · the wardrobe model (F-042), whose
tables this must not assume exist.
