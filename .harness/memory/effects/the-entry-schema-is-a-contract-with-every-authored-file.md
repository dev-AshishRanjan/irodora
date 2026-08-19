---
kind: effect
id: E-013
title: The entry schema is a contract with every authored file — and with the spec
severity: high
guard: gate:content
confidence: 0.95
created: 2026-08-18
scope: [packages/corpus, content, docs/content]
links: [[srgb-xyz-is-the-root-of-every-derived-value]], [[corpus-version-pins-caches-and-envelopes]], [[canonicalisation-decides-what-a-checksum-means]]
---

# The entry schema is a contract with every authored file

**`parseEntry` is the corpus schema. Changing it invalidates every entry at once — and
silently stales the document that tells editors what an entry is.**

## Why

`packages/corpus/src/entry.ts` is the only executable description of a corpus record. Adding a
required field, tightening a pattern, renaming a key or rejecting a new value changes what
every file under `content/colors/**` and `content/palettes/**` must satisfy — retroactively,
for records nobody is touching.

## Why it is easy to miss

The compiler cannot see it. There is no import edge from `entry.ts` to a JSON file, and the
package's own tests exercise the parser against fixtures the same commit updated. A schema
change plus its fixture update is a green build over a corpus that no longer parses.

**The destination nobody thinks of is the specification.**
[`color-corpus-spec.md`](../../../docs/content/color-corpus-spec.md) and `parseEntry` are two
descriptions of one thing, and only one of them is executed. The document drifts without
anything going red, and it drifts in the direction that matters: an editor follows the
document, writes an entry the parser rejects, and concludes the gate is broken.

F-011 found them already disagreeing **three ways** about which provenance fields are required
— the spec's §1 list, ADR-0007 §1 and NFR-20 each named a different set. That disagreement had
existed since the documents were written, and nothing had been able to notice.

## The guard

`gate:content` re-parses **every** entry on every run. That is the load-bearing detail: a
cached "this one validated last time" flag would make a schema change invisible until someone
happened to touch the file, which is precisely when it is least convenient to discover.

The spec half has no automatic guard and cannot easily have one. What exists instead is the
rule that a required-field change needs an ADR (ADR-0047 is one), which is a checkpoint where
someone is obliged to open the document.

## What to do when you change it

1. Change `parseEntry` **and** `color-corpus-spec.md` §1 in the same commit. Not the next one.
2. Run `pnpm test:content`. Every authored entry is re-parsed.
3. If the change adds or removes a **required** field, write an ADR — it is a contract change
   that F-012, F-016 and F-061 all build on.
4. Update the fixture corpora via `node scripts/build-corpus-fixtures.mjs`, and re-run
   `node scripts/verify-content-proof.mjs`. A schema change can quietly stop a mutation from
   discriminating [[a-decoy-written-against-old-values-quietly-stops-discriminating]].
5. Bump `CORPUS_SCHEMA_VERSION`, which is stamped into every published bundle.
