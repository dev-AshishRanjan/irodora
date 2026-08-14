---
kind: effect
id: E-011
title: A port change is a change to every adapter, and the conformance suite is what makes that true
severity: high
guard: gate:test
confidence: 0.9
created: 2026-08-14
scope: [packages/ports, packages/adapters, apps/api, apps/worker]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[a-gate-that-errors-is-failing-open]]
---

# A port change is a change to every adapter

```
packages/ports/src  →  @irodora/adapters  →  apps/api, apps/worker
        └── conformance suites, run against every adapter
```

## The property this buys

**"These two adapters are interchangeable" is a claim, and one suite run against both is the
only thing that makes it true.** The same artefact runs on a workstation, on a VPS and in a
cloud account (NFR-18); the in-memory adapter and the Postgres one are not "the real one and
the test one" — they are two adapters that must agree.

## How it gets severed

**By adding a method to a port and not adding a case to its suite.** The new behaviour is
then unspecified in exactly the place two adapters diverge, and the divergence appears in
production on the adapter nobody runs locally.

## What must happen on a port change

1. Change the interface in `packages/ports/src`.
2. **Add the conformance case in the same commit.** Not "next".
3. Update every adapter — the type error names them.
4. **Write a decoy that fails the new case**, and watch it fail. A conformance case that
   cannot fail launders every adapter through it.

## The trap this link exists to remember

Three of the four decoys written for these suites were wrong on the first attempt, in the
same way: **the decoy was not actually broken.**

- `AliasingBlob` subclassed the in-memory store and delegated to `super.put`, which copies.
- The Postgres lock-leak test re-acquired from the **same pooled connection** — and Postgres
  advisory locks are re-entrant within a session, so it always answered yes.
- Fixing that exposed `InMemoryDatabase` keeping locks **per instance**, so two "connections"
  never contended and the case passed vacuously. Locks now live in an `InMemoryLockTable` —
  the server, not the client, which is the topology a real database has.

Each looked correct, passed review by eye, and proved nothing. **The decoy needs the same
scrutiny as the code it guards** — see
[[a-decoy-that-is-not-broken-proves-nothing]].

## Coverage today

| Port | In-memory | Real |
|---|---|---|
| cache | ✓ | ✓ Valkey |
| database | ✓ | ✓ Postgres |
| blob | ✓ | **none yet** — the S3 adapter lands with F-042 |

The blob row is the honest gap: the suite exists and one adapter passes it, which proves the
suite runs but not that it discriminates between two implementations.
