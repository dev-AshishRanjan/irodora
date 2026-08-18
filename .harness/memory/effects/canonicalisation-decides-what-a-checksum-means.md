---
kind: effect
id: E-014
title: Canonicalisation decides what a checksum means
severity: critical
guard: gate:content
confidence: 0.97
created: 2026-08-18
scope: [packages/corpus, content]
links: [[corpus-version-pins-caches-and-envelopes]], [[the-entry-schema-is-a-contract-with-every-authored-file]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# Canonicalisation decides what a checksum means

**Change `canonicalize` and every digest ever recorded becomes wrong — with nothing to notice,
because both sides of every comparison move together.**

## Why

A corpus checksum is not taken over file bytes. It is taken over a **canonical form**: keys
sorted by code unit, no insignificant whitespace, shortest-round-trip numbers, non-ASCII as
characters, UTF-8. That indirection is deliberate — hashing raw bytes would make a reformat
indistinguishable from tampering, and a SEV1 with a benign explanation is a SEV1 nobody
investigates.

The cost is this link. `canonicalize` is the definition of what a digest *is*, and that
definition is baked into every value already recorded: the per-entry digests in every published
bundle, the root checksums in `content/versions/index.json`, later the `checksum` column in
Postgres, and every cache key derived from a corpus version.

## Why it is critical rather than high

There is **no import edge** from `canonicalize` to any of that stored data, and **no test would
fail**. Recompute a digest after the change and it agrees with itself perfectly. The only thing
that disagrees is history — every version published before the change — and nothing in an
ordinary build compares the two.

Worse, it fails *quietly in the right direction to be believed*: a fresh publish is
self-consistent and green, and the first sign of trouble is a checksum mismatch on an old
version, which the runbook classifies as a SEV1 tampering incident. The investigation starts at
"who edited this content" and the answer is "nobody".

## The guard

[`packages/corpus/golden/canonical-digest.fixture.json`](../../../packages/corpus/golden/canonical-digest.fixture.json).

Two properties make it work, and both are easy to lose:

- Each row records the **canonical string** and its SHA-256, and the test hashes **the string
  in the file** — not `canonicalize(input)`. Hashing our own output would make every row agree
  by construction, which is the failure the fixture exists to prevent.
- The expected digests were produced by `node:crypto`, **never by this package**.

The hasher itself is checked separately against published SHA-256 vectors (`SHA256_VECTORS`),
including a non-ASCII one — so a hasher that encodes UTF-16 rather than UTF-8, which is
invisible on ASCII and wrong on every kanji in the corpus, fails before it reaches these rows.

**With zero authored entries, this fixture is the only thing standing here.**

## What to do when you change it

You almost certainly should not. If you must:

1. It is an **ADR**. Changing canonicalisation is changing what a corpus checksum means.
2. Every already-published version must be **re-published under a new label**, never
   re-checksummed in place — a bundle whose digest was recomputed under new rules is
   indistinguishable from one that was tampered with.
3. Regenerate the golden fixture with `node:crypto`, and confirm the values **changed**. If they
   did not, the change had no effect and the fixture is not covering it.
4. Run `node scripts/verify-content-proof.mjs`. The reformat case must stay **green**: it is
   what proves canonicalisation is still absorbing formatting rather than reporting it as
   tampering.
