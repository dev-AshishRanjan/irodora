# An effect id is a primary key, and the schema cannot check it

**E-039** · from `.harness/state/effects.json` · guard `gate:state` (section 4), proven by
`scripts/verify-effect-id-proof.mjs`

## What depends on what

An `E-###` is how everything outside the graph points *into* it. ADRs cite ids. Source
comments cite ids. Other links' rationales cite ids. `memory/index.md` labels every effect
note with one. Gate 0's own warnings name them. Features list them in an `effects` array.

None of those references carries a copy of the link — they carry the id and trust it to
resolve. So **id uniqueness is the property every one of those citations rests on**, and it
is the graph's only primary key.

## Why nothing was checking it

`effects.schema.json` validates the *shape* of an id — `^E-[0-9]{3}$` — and stops there.
JSON Schema 2020-12 has `uniqueItems`, which compares whole objects, and **no
unique-by-property constraint**. Two links sharing an id while differing in every other
field are two distinct objects, so `uniqueItems` would pass them even if it were set.

That is a general shape, not a quirk of this file: a hand-maintained state document's
primary key is unchecked unless something outside the schema checks it —
[[a-schema-validates-a-shape-and-a-primary-key-is-not-a-shape]].

## What it cost

`E-032` was allocated twice on 2026-08-26:

| | added by | committed |
|---|---|---|
| `pnpm-workspace.yaml` → lockfile | F-098 (`0012992`) | **09:22:54** |
| `score.ts#hueBias` → `photo.ts` | F-028 (`c629d5b`) | **09:46:43** |

Twenty-four minutes, two features, neither aware of the other's write. Both validated. Gate 0
passed. The damage was not cosmetic:

- **Gate 0's own warning became unreadable.** It printed *"E-032 (high) has no guard"* while
  one E-032 named a proven guard and the other honestly named none. The warning was
  simultaneously right and wrong, and nothing in it said which link it meant.
- **A resolution had to be done by `from.ref` instead of by id.** F-099 says so in its own
  notes: resolving E-032 by id *"would have been a coin toss"*. The graph stopped being able
  to answer the one question it exists to answer.
- **E-034's rationale cited "(E-032)"** — an ambiguous pointer inside the document whose
  entire purpose is to be unambiguous about consequences.

## How it is checked now

Gate 0 section 4 accumulates ids while walking the graph and fails on the second sighting,
**naming both links' `from.ref`** — because "duplicate id E-032" on its own sends the reader
to `git log -S` to find out which two collided, which is the search the check exists to spare
them. The pass line reports the distinct-id count beside the link count, so the check is
visible when it succeeds and not only when it fails.

`verify-effect-id-proof.mjs` keeps it honest. Case 1 **reconstructs the historical
collision** — it is the regression test for this defect, and it will outlive everyone's
memory of it. Case 3 is the one that matters for a future maintainer: two links sharing an id
**and** the same `from.ref`, which a plausible wrong implementation (deduplicating on `from`,
or on the id/from pair) misses while passing every other case. The control adds a link with a
fresh id and must stay **green**, because a check that failed on any added link would
otherwise pass the whole proof — [[a-decoy-that-is-not-broken-proves-nothing]].

## The thing that would not have been found without the decoy

Mutating the check to key on `from.ref` instead of `id` did not merely fail case 3 — it turned
the **baseline** red on five pairs. `E-017`/`E-026`/`E-027`/`E-029` and `E-034`/`E-038` each
share a `from` with a sibling link, entirely legitimately: one source can have several distinct
consequences. **Multiple links sharing a `from` is normal; multiple links sharing an id is
corruption.** Any future check over this graph has to keep those apart.

## Related

[[a-duplicate-json-key-silently-deletes-the-earlier-one]] is the same family one level down —
there the parser resolved the collision silently and destructively; here it kept both and let
every reader resolve it differently. [[prose-in-a-state-file-rots-and-no-schema-can-see-it]]
is the same limit of schema validation applied to meaning rather than to keys.
