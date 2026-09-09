# A record type is a claim, and the parser is where it is kept

**Effect:** [E-102](../../state/effects.json) · **Feature:** F-196 · **Date:** 2026-09-08

The corpus needed curated combinations — *these three colours go together, because an editor
said so and recorded why*. The obvious move was a `category` on the existing palette record.
That would have been wrong, and the reason is worth keeping.

## Two record types, two different claims

```
palette      family    5–8   anchor + weights     "these belong together"
combination  pairing   2–4   lead + companions    "these go together"
```

**The bounds are what keep them from becoming synonyms.** One colour is a colour; five is a
palette. A schema that accepted five would make the distinction above a naming convention, and a
naming convention drifts — within a release somebody publishes a six-member "combination" and
every consumer downstream starts inferring which claim it is holding.

## The constraint is unconditional here, and conditional for an entry

`checkClassification` constrains an **entry** to our own curation only when its `sourceType` is
`editorial`, because an entry *can* legitimately be `historical` — somebody measured a dyed silk.

There is **no `sourceType` under which pairing two colours is a measurement of the world.** So
the combination parser refuses `historical` outright, rather than reusing the conditional rule
because it looked similar. Reusing it would have left a door open that has no honest use.

## What a licensing gate can and cannot do

The reference is *A Dictionary of Color Combinations*. The rule is that we do what the book does,
from our own corpus, and ingest nothing.

**No gate can detect ingestion.** Somebody transcribing a table by hand leaves nothing a scanner
sees. A check implying otherwise would be worse than none — it is the reason nobody goes looking
for the real control, which is review.

What the gate *does* enforce, and it is not nothing:

- every combination is `sourceType: editorial`, `rightsHolder: Irodora`
- every member resolves to a colour **we published ourselves**
- `provenance.source` resolves against the register, which refuses anything unregistered

Together those make re-expressing somebody else's table entirely into our corpus, under our
provenance, the only way through — at which point it is our selection of our own colours. **The
gate prints what it cannot see on every run.** [[a-check-must-report-its-scope-not-only-its-verdict]]

## An immutable artefact cannot grow a field

Adding a collection to the bundle broke every already-published bundle, because the loader
required the key. The published version cannot grow it — that is what immutability means.

Making the key optional everywhere would have fixed it and given up the distinction between *this
version has no combinations* and *this file was written by a build that did not know about them*
— for every future bundle too. `corpusSchemaVersion` already existed for exactly this: **required
from 1.1.0, absent-means-none before it.** An empty collection contributes no rows to the root
digest, so every checksum already in the ledger still verifies.

## The lesson

**When a new kind of record arrives, ask what claim it makes before asking what fields it needs.**
The fields follow from the claim; the bounds, the required roles and the refused classifications
are the claim written where a parser can enforce it. A record type that shares a schema with a
different claim will eventually be read as that claim.

[[an-engine-with-no-caller-is-not-a-finished-feature]]
