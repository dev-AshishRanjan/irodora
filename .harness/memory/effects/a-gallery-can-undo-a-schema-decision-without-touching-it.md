# A gallery can undo a schema decision without touching it

**Effect:** [E-073](../../state/effects.json) · `apps/mobile/src/screens/Wardrobe.tsx` →
`gallery.ts`, `packages/store/src/schema.ts` · **medium**

## What happened

`garment_image` has existed since F-042. It keeps a photograph's bytes in **their own table**, and
the schema comment says exactly why:

> the split is what makes the list query cheap

F-150 was the first feature to read one back. A wardrobe of forty garments, twelve cells visible,
and the obvious implementation reads **forty BLOBs** and base64-encodes each one to draw twelve.

The database would be unchanged. The comment would still be true. **The property it describes
would be gone.**

## Why this shape is easy to miss

Nobody edits the schema. Nobody argues with the comment. The decision is defeated by a caller in
another package that never mentions it — and every review of that caller is a review of a
gallery, not of a query plan.

A performance decision recorded in one layer is only as durable as the callers nobody has written
yet.

## What holds it

**The cost is part of the interface.** `galleryImages` splits the same two questions the schema
splits:

| question | cost | asked for |
| --- | --- | --- |
| does this garment have a photograph | metadata row | every cell |
| what are its bytes | BLOB + base64 | visible cells only |

**And the tests count the calls rather than trusting the shape.** Three assertions:

- "has a photograph" never touches the BLOB — `blobCalls()` is `0`
- a garment is read **once**, however often its cell re-renders
- a garment with **no** photograph is remembered as an answer, not re-queried

That last one is easy to get wrong: written as `cached !== undefined` instead of `cache.has()`,
every photo-less garment re-queries on every frame — which is the common case in a new wardrobe.

## The half that is one decision, not two

A **bounded cache in front of an unbounded render is a cache that thrashes.** Holding twelve
encoded photographs is only the right bound because `SectionList` virtualises; without that, forty
cells ask at once, the cache evicts what it just stored, and it decodes forty photographs to show
twelve — slightly worse than having no cache at all.

## What to carry forward

When a lower layer has been shaped for a cost, **the first consumer inherits an obligation the
type system cannot express.** Write the test that measures the cost, not the result — a test that
only checks the picture appears passes on every implementation, including the one the schema was
designed to prevent.

Related: [[virtualisation-breaks-a-rendered-tree-proxy-not-the-property]]
