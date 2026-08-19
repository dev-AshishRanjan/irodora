# ADR-0014 — Offline-first with an outbox, field-level logical clocks, and typed merge rules

## Status

Accepted, **amended by [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)**. SQLite as the local store is
confirmed and is now the *only* store. The outbox, field-level clocks and merge rules are
**not built**, because there is nothing to sync to. The schema still carries client-generated
UUIDv7 ids, `updated_at`, tombstones and a `change_log` so this record can be implemented
later as a feature rather than a migration.

## Date

2026-08-13

## Context

The Lens works with no network by design ([ADR-0026](0026-privacy-on-device-by-default.md)).
The wardrobe must follow, because the moment a user photographs garments is often the
moment they have no signal — a fitting room, a basement, a shop.

The default sync design in the brainstorm was last-write-wins on whole entities. It is
easy to build and quietly wrong for exactly the data users notice:

- **Whole-entity replacement loses concurrent field edits.** One device adds a purchase
  price while another corrects the colour; one of them vanishes with no error.
- **Timestamp ordering trusts device clocks**, which are wrong — sometimes by hours,
  sometimes deliberately.
- **LWW on a counter is data loss.** Two devices each record a wear; the total should be
  two. LWW makes it one, and the user has no way to notice.

## Decision

**Local database is the client's source of truth. Outbox for propagation. Field-level
logical clocks for ordering. Typed merge rules where LWW would lose data.**

1. **Every write succeeds locally and immediately.** SQLite on mobile, IndexedDB on web,
   behind one repository interface with a conformance suite both must pass.
2. **Change records carry only changed fields**, plus a per-field logical counter:

   ```ts
   { entity, entityId, op, fields, clock: { [field]: number }, deviceId, at, baseRevision }
   ```

3. **Ordering is by logical counter, never by wall clock.** `at` is retained for display
   and debugging only. Ties break deterministically on `(deviceId, changeId)` — arbitrary,
   but *identical on every device*, which is the only property that matters. A
   non-deterministic tiebreak means devices converge to different states and neither is
   wrong.
4. **Typed merge rules override LWW** where it destroys information:

   | Field | Rule |
   |---|---|
   | `wear_count` | Sum the deltas |
   | `outfit_item[]` | Union by id; explicit removal beats implicit absence |
   | preference weights | Merge additively, then renormalise |
   | deletion vs update | Deletion wins |
   | profile after server re-derivation | Server wins |

5. **Push and pull in one round trip.** A mobile radio wake costs roughly the same for one
   request as for two.
6. **Idempotent on `changeId`**, because a batch that times out after the server committed
   it is indistinguishable, from the client, from one that never arrived.
7. **Tombstones retained 90 days.** A device offline longer gets `full_resync_required` —
   rare, explicit, and far safer than guessing.
8. **Image bytes do not ride the sync channel.** Metadata syncs; bytes go by presigned
   upload. A garment is fully usable with the upload still pending, because the colour was
   captured locally.

Full protocol: [`../architecture/sync-protocol.md`](../architecture/sync-protocol.md).

## Consequences

**Good.** The product works in the places people actually use it. No data loss in the
cases users would notice. Convergence is provable and property-tested. Offline is the
normal path rather than a degraded mode, which means it is exercised constantly rather
than only when something breaks.

**Bad.** Substantially more complex than LWW — per-field clocks, typed merge rules, a
tombstone lifecycle, and a conflict matrix to maintain as entities are added. Two local
store implementations to keep behaviourally identical. Every new syncable field needs a
merge decision, and forgetting to make one silently inherits LWW.

**Neutral.** Not full CRDTs. Field-level clocks with typed merges give convergence for
this domain's operations without CRDT payload overhead or the conceptual weight.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Entity-level last-write-wins** | Trivial to implement and easy to reason about. Loses concurrent field edits and destroys counters, in ways that produce no error and that users notice weeks later |
| **Full CRDTs (Yjs, Automerge)** | Mathematically strongest convergence, no merge rules to write. Heavy payloads, large dependency, and designed for character-level collaborative editing — the wardrobe has no concurrent text editing |
| **Server-authoritative, no offline writes** | Much simpler. Contradicts NFR-17 and the core use case: photographing garments where there is no signal |
| **A sync-as-a-service platform** | Would remove most of this work. Adds a vendor to the data path, complicates tenancy and residency, and the merge semantics above are domain-specific and would have to be layered on anyway |

## Revisit when

- The conflict matrix exceeds what is maintainable by hand as entities multiply.
- Genuinely collaborative editing appears (shared wardrobes in a team workspace, FR-64),
  which is where CRDTs would start to earn their weight.
