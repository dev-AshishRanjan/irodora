---
kind: effect
title: A migration cannot be rolled back, and it reaches two drivers and the backup format
category: contract
confidence: 0.95
created: 2026-08-25
scope: [packages/store, apps/mobile]
links: [[the-palette-schema-now-runs-on-a-phone]], [[a-tested-module-nobody-wired-up-passes-every-test-it-has]], [[a-gate-that-errors-is-failing-open]]
---

# E-023 — a migration reaches two drivers, a backup format, and a version gate

**`packages/store/src/schema.ts#MIGRATIONS` → `createRepository` · `archive.ts` · the shared
conformance suite · the device driver · `data-model.md`**

## The reason this link is different from an ordinary schema change

`migrate.ts` has **no `down`**, and that is deliberate: with no server, a rollback would run on
every user's device with no way to coordinate it, and a half-rolled-back population is
unrecoverable. Correcting a bad migration means shipping the next one.

So the usual comfort — *"we can revert it"* — is absent, and every dependent has to move in the
same commit as the migration.

## Three dependents that are not obvious

**The archive.** `readTables` is `SELECT *`, so a new column joins the backup format the moment
it is added, and it joins the **canonical digest** FR-58 compares byte for byte. Nobody edits
`archive.ts` to make that happen; nobody is told when it does.

**The conformance suite.** It is the only thing making a green CI run say anything at all about
the driver that ships — `expo-sqlite` needs a device and CI has none. A table the suite does not
exercise is a table proven on `node:sqlite` alone, and the two drivers implement `transaction`
separately. F-020 added `palette-durability` and `palette-atomicity` for exactly that reason:
the palette write spans three tables, so its rollback path is a different claim from the
single-row one.

**`SCHEMA_VERSION`.** An older build opening a newer database now *refuses to start* rather than
guessing. That branch has existed since F-041 and was unreachable while there was one version;
raising it to 2 made it reachable for the first time.

## Why `gate:test` and not `gate:typecheck`

None of this is a type error. **SQL is a string.** A column the repository forgot to write is a
runtime `null` on a device, and a `SELECT` naming a column that does not exist throws at the
first call rather than at build time. The compiler has nothing to say about any of it.

## What F-020 chose, and why it is part of the link

Migration 2's columns are **nullable with no default**. A `DEFAULT` would be a value nobody
chose standing in for one somebody must — `version_id DEFAULT ''` is a silent blank wearing a
NOT NULL constraint. `NULL` means one thing: *written before this column existed*, and the read
path refuses it **by name**.

That branch is unreachable through the write path, so its test plants a row through the driver
directly. Otherwise it would be a refusal nobody has ever seen fire.

## What it does not cover

Whether the migration runs correctly **on a device**, and whether SQLCipher encrypted anything
at all. Both are F-041's standing attestation; nothing off-device stands in for either.
