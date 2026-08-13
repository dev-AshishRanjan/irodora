# Sync Protocol

| | |
|---|---|
| **Status** | Baseline · lands with F-044 |
| **Implements** | FR-56, FR-57, NFR-6, NFR-17 |
| **Decisions** | [ADR-0014](../adr/0014-offline-first-sqlite-outbox-and-merge-policy.md) |

---

## 1. The stance

**The local database is the client's source of truth.** The server is durable shared
storage and the arbiter between devices — it is not something the client waits for.

Every write succeeds locally and immediately. Sync is a background reconciliation. A user
photographing garments in a fitting room with no signal is the normal case, not a
degraded one.

```
    write ──→ local DB ──→ outbox ──→ (when online) ──→ sync API ──→ Postgres
                  │                                                      │
              UI reads                                            other devices
```

---

## 2. Local storage

| Platform | Store |
|---|---|
| Mobile | SQLite (`expo-sqlite`), Drizzle schema shared with the server where shapes align |
| Web | IndexedDB behind the same repository interface |
| Secrets | Keychain / Keystore via SecureStore — never the app database |

The repository interface is identical on both, with a conformance suite both
implementations must pass. Two stores with subtly different semantics is how "works on
iOS, corrupts on web" happens.

---

## 3. Change records

```ts
interface ChangeRecord {
  readonly id: string;              // UUIDv7 — the change's own identity
  readonly entity: 'garment' | 'outfit' | 'profile' | 'preference' | 'feedback';
  readonly entityId: string;
  readonly op: 'create' | 'update' | 'delete';
  /** Only the fields that changed. Never the whole entity. */
  readonly fields: Record<string, unknown>;
  /** Per-field logical clock: field name → counter. */
  readonly clock: Record<string, number>;
  readonly deviceId: string;
  readonly at: string;              // device wall clock — advisory, never authoritative
  readonly baseRevision: number;
}
```

**Field-level, not entity-level.** Two devices editing different fields of the same
garment is the common case — one adds a purchase price while the other corrects the
colour. Entity-level replacement would silently discard one of them.

**A per-field logical counter, not a timestamp.** Device clocks are wrong, sometimes by
hours, sometimes deliberately. A monotonic counter per field gives a total order that does
not depend on any device telling the truth about the time. `at` is retained for display
and debugging only.

---

## 4. The exchange

```http
POST /v1/sync
{
  "deviceId": "d_01H...",
  "since": "cursor_abc",
  "changes": [ ChangeRecord, ... ]      // ≤ 500 per batch
}

→ {
  "applied":   ["chg_1", "chg_2"],
  "rejected":  [{ "id": "chg_3", "reason": "entity_deleted" }],
  "conflicts": [{ "id": "chg_4", "resolution": "server_wins", "serverValue": {...} }],
  "changes":   [ ChangeRecord, ... ],   // server → client since the cursor
  "cursor":    "cursor_def"
}
```

Push and pull in one round trip — a mobile radio wake is expensive, and two requests cost
roughly twice the battery of one.

The whole exchange is idempotent on `ChangeRecord.id`. A retried batch applies nothing
twice, which matters because a batch that times out after the server committed it is
indistinguishable, from the client, from one that never arrived.

---

## 5. Conflict resolution

Per field, in order:

1. **Higher clock wins.** The unambiguous case, and the common one.
2. **Equal clock → deterministic tiebreak** by `(deviceId, changeId)` lexicographic
   order. Arbitrary, but *identical on every device* — which is the only property that
   matters, because a non-deterministic tiebreak means devices converge to different
   states and neither is wrong.
3. **Entity-specific rules** override 1 and 2 where last-write-wins would lose data:

| Entity | Rule | Why |
|---|---|---|
| `garment.wear_count` | **Sum the deltas**, never replace | Two devices each recording a wear should total two. LWW loses one, and the user cannot tell |
| `outfit_item[]` | Union by garment id; explicit removal beats implicit absence | "Not in my copy" is not the same claim as "I removed it" |
| `profile.*` | Server value wins if the profile was re-derived server-side; otherwise higher clock | A re-derivation used inputs the stale device never had |
| `preference weights` | Merge additively, then renormalise | Both devices' feedback is real signal; discarding either is discarding user input |
| `garment` deleted | Deletion wins over concurrent update | Resurrecting a deleted item is worse than losing an edit to it |

**Rule 3 is where the design earns its keep.** A pure last-write-wins protocol is easy to
build and quietly wrong for exactly the fields users notice: wear counts drifting,
outfits losing items, feedback disappearing.

---

## 6. Deletion

Soft delete locally with a tombstone; hard delete on the server after the retention
window. Tombstones are retained for **90 days** — long enough that a device offline for a
season does not resurrect deleted garments on reconnect.

A device syncing after the tombstone window receives a `full_resync_required` response and
rebuilds from the server. Rare, explicit, and far safer than guessing.

Erasure under FR-58 is different: hard delete plus de-index everywhere, including
tombstones. An erasure that leaves a tombstone naming the record has not erased anything
meaningful.

---

## 7. Images

Metadata syncs; bytes do not ride the sync channel.

```
local image ──→ presigned PUT ──→ object storage ──→ change record carries the key
```

Upload is resumable and retried with exponential backoff. A garment is fully usable with
`image_key` pending — the colour, which is the part that matters, was captured locally and
does not depend on the upload ever completing.

---

## 8. Failure behaviour

| Situation | Behaviour |
|---|---|
| Offline | Writes queue. UI shows queued state, never an error — nothing failed |
| Server 5xx | Exponential backoff with jitter, cap 15 min; queue preserved |
| Server 503 | Client falls back entirely to the local engine (NFR-6) |
| Batch partially applied | Only `applied` ids are cleared from the outbox |
| Clock skew | Irrelevant — ordering is by logical clock |
| Schema version mismatch | Server rejects with the required client version; client prompts to update rather than corrupting data |

---

## 9. Verification

- **Conflict matrix** — every entity × every concurrent-edit pattern, asserted to
  converge. Both devices must reach the *same* state, not merely a valid one.
- **Property test** — apply a random permutation of a change set in any order; the final
  state is identical. Commutativity is the actual guarantee; testing one order proves
  nothing.
- **Offline e2e** — write offline, restart the app, reconnect, verify nothing is lost.
- **Partition test** — two devices diverge for 500 changes, then reconcile.
- **Tombstone expiry** — a device offline past the window is correctly forced to resync
  rather than resurrecting deleted entities.
