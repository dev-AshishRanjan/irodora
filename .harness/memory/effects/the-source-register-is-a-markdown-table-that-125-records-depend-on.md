---
kind: effect
title: The source register is a hand-edited markdown table that every published record depends on
category: contract
confidence: 0.93
created: 2026-08-24
scope: [content, docs/content, packages/corpus]
links: [[corpus-version-pins-caches-and-envelopes]], [[the-entry-schema-is-a-contract-with-every-authored-file]], [[wada-public-domain-is-not-the-same-as-free-to-ingest]], [[a-gate-that-errors-is-failing-open]]
---

# E-021 — the source register is a markdown table that 125 records depend on

**`docs/content/licensing-and-provenance.md` §5 → every entry · every palette ·
`parseRegister` · `gate:content`**

## This link did not matter until it suddenly mattered a great deal

`parseRegister` and `checkSourceRegistered` shipped with F-011. For thirteen features the
register held one placeholder row and nothing cited it, so nothing could break.

F-012 published 120 entries and 5 palettes, **all of which cite the single row
`IRO-ED-001`.** One careless edit to a document that reads like prose now invalidates the
entire corpus.

## What the parser actually reads, which is more than people expect

Not just the rows. **The column names and their order**, and the `## 5. Source register`
heading itself:

- rename or reorder a heading cell → the gate **stops**, rather than guessing which column
  is which;
- lose the section heading → the gate stops;
- a short row, or a duplicate id → failure;
- delete or rename a row → every record citing it fails.

Someone tidying a document, widening a table, or adding a column would trip every one of
these while believing they had touched only documentation.

## It binds in both directions, and the second one is the one that matters

Both were watched failing against the **real** corpus, not only against the fixtures:

1. An entry citing an id that is not in the table is rejected. Obvious.
2. An entry that keeps the registered id and changes its `source` **text** is rejected too.
   That is the case worth having: without it, the entry would **display one provenance and
   be licensed under another**, and nothing about the file would look wrong.

## Why it stays prose

Generating the table from JSON would remove the brittleness. It would also remove the reason
the document exists: §5 is a **legal safeguard read by a person before each corpus version
ships** (ADR-0007), and turning it into generated output moves it out of the place where that
review happens.

So the brittleness is handled the only honest way available: **an unparseable table is a
failure, never an absence of constraint** [[a-gate-that-errors-is-failing-open]].

## The thing to check before touching that file

Whether the corpus still publishes. `pnpm test:content` answers it, and the answer is not
inferable from reading the diff — a markdown table edit that looks harmless and a markdown
table edit that unpublishes 125 records look identical in review.
