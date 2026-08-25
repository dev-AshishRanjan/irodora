---
kind: effect
title: The palette schema now runs on a phone, so tightening it for editors breaks saving
category: contract
confidence: 0.9
created: 2026-08-25
scope: [packages/corpus, content, apps/mobile]
links: [[the-entry-schema-is-a-contract-with-every-authored-file]], [[a-migration-reaches-two-drivers-and-a-backup-format]], [[provenance-in-the-type-is-what-makes-honesty-structural]]
---

# E-024 — `parsePalette` has a second caller, and it is not a build step

**`packages/corpus/src/palette.ts#parsePalette` → `content/palettes` · Palette Studio ·
gate 11 · gate 5**

## Until F-020 this was a build-time function

`parsePalette` read authored JSON during `gate:content`. Since F-020 it also runs **on a device,
every time somebody saves a palette** — deliberately, because FR-49 says *"palettes validate
against the same schema as corpus palettes"* and the two rules a palette **editor** breaks are
the two the schema already states:

- at least one member has role `anchor`;
- ranks are contiguous from 1 — which is what a delete-without-renumber destroys.

Writing those again in a screen would be a second answer to *"is this a palette"*, and the copy
that drifts is always the one nobody is looking at.

## What that correctness costs, and where it will be paid

The schema now has two callers with **opposite tolerances**. An editor tightening it for
repository content — requiring `sourceUrl`, lengthening `MIN_DERIVATION`, adding a provenance
field — breaks **saving on a phone**, and:

- there is **no compile error**, because the device record is assembled as `unknown` and only
  the parse decides;
- **gate 11 stays green**, because `content/palettes/*.json` gets updated in the same commit and
  the device record does not exist in any file to update.

The change would look complete. The failure would arrive as a crash on a save, on a build
already shipped.

## The guard

Two tests, not one:

- `packages/store/test/palette.test.ts` — saves, reads back out of real SQLite, re-expresses as
  a corpus record and parses it. A required field the device cannot supply fails here.
- `apps/mobile/test/palette.test.ts` — the malformed-draft table, with the decoy that a
  well-formed draft parses.

Both fail on exactly the change described above, which is what makes `gate:test` the guard
rather than a hopeful note.

## The reserved identities are part of this link

A device record carries `sourceId: "USER-LOCAL"` and `authoredBy: "user-local"` — free strings
to `parsePalette`, cross-checked against the register and the roster by gate 11, which never
sees a device. `verify-content.mjs` forbids either under `content/`, because a content record
wearing one would fail as *"not in the source register"* rather than as *content claiming to
have come from somebody's phone*.

Both constants live in `packages/corpus` so the writer and the forbidder read the same strings.
**Two copies of a reserved word is how a reserved word stops being reserved.**

## The one this link cannot see

`classification: "editorial"` renders as *"Irodora original"*, which is false of a palette
somebody else made. The Studio never renders the corpus classification label and a screen test
asserts its absence — but that assertion lives on **one screen**. A future surface rendering
user palettes with the corpus renderer reintroduces the defect and this graph would say nothing.
Recorded in ADR-0067 as the consequence to watch.
