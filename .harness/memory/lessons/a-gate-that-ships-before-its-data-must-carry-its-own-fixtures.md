---
kind: lesson
title: A gate that ships before its data must carry its own fixtures, or it is failing open for a whole release
category: convention
confidence: 1.0
created: 2026-08-18
scope: [root, content, packages/corpus]
links: [[a-gate-that-errors-is-failing-open]], [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# A gate that ships before its data must carry its own fixtures

**A gate activated over an empty dataset is green for a reason that has nothing to do with the
rules it claims to enforce — and it stays that way until the data arrives, which may be months.**

This is a different failure from [[a-gate-that-errors-is-failing-open]]. Nothing errors. The
gate runs, reads its input, finds nothing to object to, and exits 0 — correctly, by its own
logic. The problem is that the exit code carries no information.

## Where it came from

F-011 built the `content` gate. F-012 supplies the corpus entries. So on the day gate 11 became
blocking, `content/colors/` held zero files, and every rule in it — provenance completeness,
the classification rules, the editorial identity check, the register cross-check — was
exercised exactly zero times per run, for the whole of R1.

A gate in that state is not a check. It is a step that takes four seconds.

## What it takes to be honest about it

Four things, and the first three are worth as much as the fourth:

1. **Fail on an empty world you did not expect.** Assert the gate located its inputs — the data
   root, the roster, the register, the fixtures — and stop if any is missing. "There are no
   entries" and "I could not find the entries" are opposite facts, and only one of them means
   the build may proceed.

2. **Carry fixtures and run them every time**, so the number of rules exercised is never zero.
   One corpus that genuinely passes, and one per rule that is broken in exactly that way.

3. **Make the fixtures structurally unable to become data.** Three independent barriers, not
   one convention: they live outside the data directory, the scan globs the data directory
   only, and a fixture-prefixed identifier appearing in real data is itself a gate failure.

4. **Print the real count next to the fixture count, every run.** Gate 11 says
   `0 authored entries` beside `19 fixture corpora exercised`, with a line stating that
   everything green came from fixtures rather than from any colour. Someone reading the log a
   month later must not be able to mistake the green for coverage.

## The part that surprised us

**Generating the fixtures rather than hand-writing them was not a convenience — it was the
correctness argument**, and the fixtures proved it against themselves twice within an hour:

- The `duplicate-slug` fixture renamed one entry, which also orphaned a palette's reference to
  it. Broken in two ways, it failed for the *dangling relation* rule and passed for a rule it
  was not about.
- Once that was fixed, filenames were still derived from slugs — so both entries wrote to one
  file and the fixture stopped being invalid at all. The gate reported it as ACCEPTED.

Both were caught by the machinery, not by review. Eighteen hand-maintained near-copies would
have drifted the same way and nobody would have looked.

## The check on the check

`scripts/verify-content-proof.mjs` mutates the **valid** fixture corpus and asserts the gate
goes red **and names the right field** — an exit code alone would let a mutation "pass" by
breaking something unrelated. Baseline asserted green before and after every case.

**One case must stay green.** For gate 11 it is an entry reordered and reformatted, which
canonicalisation is supposed to absorb. Without at least one green case, the proof cannot
distinguish a working gate from one that fails on everything.
