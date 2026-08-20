# Plan: F-041 — `@irodora/store`

| | |
|---|---|
| **Feature** | F-041 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-56, NFR-17, NFR-7 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/store` · `apps/mobile` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

The device becomes the system of record. To a user: what they save is there after a force-quit,
in airplane mode, on a phone that has never been online — and nothing they own leaves it.

[ADR-0051](../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
removed the server, which makes this the feature the product's durability rests on. It also
unblocks F-035, which ADR-0051 §5 calls a first-release feature precisely because *"with no
server, this is the entire durability story."*

## The decision this feature turns on

**The database cannot be tested on the thing it ships on.** `expo-sqlite` needs a device; CI is
a Windows runner with none. So either the tests run against a different SQLite than ships, or
there are no tests until there is a device.

The answer is the pattern this repository already uses for ports and for components: **one
repository interface, two drivers, one conformance suite run against both.**

- **`node:sqlite`** for CI. Built into Node 24 — verified here at SQLite **3.53.3**, with
  `STRICT` tables and a working `foreign_keys` pragma. Zero dependencies, which matters because
  the alternative (`better-sqlite3`) is a native module that must compile on every runner.
- **`expo-sqlite`** on the device, running the **same** suite. Attested, not gated.

**What this honestly does not prove**, and the gate must say so: SQLCipher. Encryption at rest
is not in `node:sqlite`, so *"the database is SQLCipher-encrypted with the key in the platform
keystore"* is verifiable only on a device and is **attested** (ADR-0038). What *is* gated is
that no key is written to the database or the bundle — which is a property of our code, not of
the driver, and is checkable here.

### The hazard that needs a guard, not a comment

`apps/mobile` bundles `@irodora/store`. **A `node:sqlite` import reachable from the package's
main entry is a crash on a phone** — exactly the shape `design-tokens/src/index.ts` warns about
for `node:fs`. So the Node driver is behind a separate export (`@irodora/store/node`) that the
app never imports, and a **boundary guard** proves the rule fires rather than trusting it. This
is the one place this feature can produce a runtime crash that every gate would miss.

## Approach

**Reused:** the `@irodora/ui/testing` shape for an exported conformance suite that returns
findings rather than asserting, so it runs under Vitest here and Jest in the app ·
`scripts/verify-guards.mjs` for the import guard · `packages/contracts` for any shared row type.

**New:** `packages/store` — schema DDL, the repository interface, the conformance suite, the
Node driver, migrations.

### Increments

1. **Schema and migrations.** The sync-shaped DDL from
   [`data-model.md`](../../docs/architecture/data-model.md) §2–3: UUIDv7 ids, integer-ms
   timestamps, `deleted_at` tombstones, `change_log`, `STRICT` tables, `CHECK` constraints for
   enums, and `PRAGMA foreign_keys = ON` **on every connection** — SQLite defaults it *off*,
   which is the single most common way a schema full of `REFERENCES` enforces nothing.
   A migration runner with a `user_version` ladder, forward-only.
   → `pnpm --filter @irodora/store test`
2. **The repository interface and the Node driver.** Behind `@irodora/store/node`.
   → `pnpm --filter @irodora/store test`
3. **The conformance suite.** Exported, findings-based. Covers: a write survives a reopen; a
   tombstone is distinguishable from a row that never existed; every write appends exactly one
   `change_log` row; a foreign key actually rejects; a `CHECK` actually rejects; ids are
   time-ordered; **and no method opens a socket.**
   → `pnpm --filter @irodora/store test`
4. **The import guard.** `node:sqlite` unreachable from the main entry, planted and watched
   firing in `verify-guards.mjs`.
   → `node scripts/verify-guards.mjs`
5. **The device driver and key handling.** `expo-sqlite` + `expo-secure-store`, wired into
   `apps/mobile`, running the same suite. The gated half: no key value reaches the database or
   the bundle. The device half: attested.
6. **Record and close.** Effects, progress, lessons.

## Anticipated effects

**NEW — the repository interface is a contract with two drivers.** The whole point is that the
tested driver and the shipped driver are not the same, so anything asserted about one is a
claim about the other only insofar as the suite covers it. Guard: the conformance suite, run
against both — and the device run is attested until it happens.

**Touches E-002** (`Color` reaches every surface): storing a colour writes canonical `xyz_*`
**plus** materialised `lab_*`, `oklch_*`, `hex`, and per `data-model.md` those derived columns
are written **by the engine, never computed in SQL** — one implementation of the maths
([E-001](../state/effects.json)). A schema that recomputed them would be a second engine.

## Test plan

- **Conformance:** the list in increment 3, run against every driver.
- **Negative, with decoys rather than empty fixtures:** a foreign key violation that must be
  rejected (proving the pragma is on — a schema with `REFERENCES` and the pragma off passes
  every naive test); a `CHECK` violation; a hard `DELETE` where a tombstone was required.
- **Assertions to reject:** "the row round-trips" without ever closing and reopening the
  database, which tests the cache rather than the durability; counting `change_log` rows
  without asserting *which* row and op; asserting `foreign_keys` is on by reading the pragma
  rather than by watching a bad write fail.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
node scripts/verify-guards.mjs
```

`e2e` is **removed from this feature's verification**: `pnpm test:e2e` exits 1 by design while
no surface declares the script, and gate 7's subject is a journey. The offline assertion it was
there for belongs to F-018/F-040 and is attested here.

## Risks and open questions

**Two SQLites.** `node:sqlite` 3.53.3 in CI, whatever `expo-sqlite` bundles on the device. SQL
semantics are the same; the binding and the encryption are not. Mitigation: the suite asserts
*behaviour*, never a driver-specific error string, and the device run is a named attestation
rather than an assumption.

**Drizzle is named in the tech cheat-sheet and is not in this plan.** ADR-0051 §2 says
"accessed through Drizzle". It is a query builder over a driver, and adding it before the
repository interface exists would settle the interface by accident. If it earns its place it is
a follow-up, and if it does not that is a deviation from ADR-0051 needing a record.

## Out of scope

The wardrobe model (F-042) · export and import (F-035) · FTS5 corpus search (NFR-7's other
half, which needs a corpus) · sync — `change_log` is written and **read by nothing**, and
ADR-0051 is explicit that it is not an outbox, because an outbox implies a destination.
