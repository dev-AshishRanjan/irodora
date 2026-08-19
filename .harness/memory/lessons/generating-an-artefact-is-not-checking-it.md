---
kind: lesson
title: Generating an artefact is not checking it, so a build is never the guard
category: convention
confidence: 1.0
created: 2026-08-19
scope: [root, packages/design-tokens, packages/corpus, apps/api]
links: [[a-gate-that-errors-is-failing-open]], [[canonicalisation-decides-what-a-checksum-means]], [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]]
---

# Generating an artefact is not checking it

**E-004 named `gate:build` as its guard for months. A build has never compared anything.** It
produced the artefact; nothing looked at whether the committed copy matched. The graph read as
guarded and nothing was watching.

## The distinction

| act | what it establishes |
|---|---|
| generate | an artefact exists that reflects the source *right now, in this working tree* |
| check | the artefact **committed to the repository** still reflects the source |

Only the second one catches a hand-edit, and only the second one catches the far more common
failure: somebody changed the source and did not regenerate. A build does neither, because a
build overwrites rather than compares.

## The shape that works

Three derived artefacts in this repository now use the same one (ADR-0043's, generalised):

1. A **pure function** produces the artefact from its source, and a **deterministic serialiser**
   turns it into exactly the bytes on disk. Determinism is asserted, not assumed — a serialiser
   that varies between runs turns the check into a gate that fails at random, and a gate that
   fails at random is a gate somebody switches off.
2. A **`--check` mode** regenerates in memory and compares, exiting non-zero with a **reason**.
   "openapi.json is stale" sends the reader to a diff; "`/v1/colors/{slug}` is in the generated
   document and not on disk" tells them what happened.
3. The comparison **runs in a gate that is not the build**, and preferably in one that does not
   depend on the build: `openapi.test.ts` reads the committed file from source under gate 4, so
   a stale document fails without waiting for `dist`.

## And the artefact must be excluded from the formatter

Prettier collapses short JSON arrays. A byte-compared artefact that Prettier also formats leaves
two checks demanding different files with neither of them wrong — `format:check` on one side,
the staleness check on the other, and whichever runs second always fails. `.prettierignore`
already said this for the design tokens and the published corpus; the OpenAPI document joined
them for the same reason.

## The check on the check

Watch it go red, with the baseline green either side. For the OpenAPI document: a description
reworded by hand, a path deleted, a path invented, a response status removed, the version
bumped, the file corrupted — six edits, each asserted against the **reason** reported rather than
merely the fact of failure, because an edit that fails for the wrong reason is a check that will
mislead somebody at 2am.
