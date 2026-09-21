# The illustration set is keyed by the inventories

**Effect:** [E-137](../../state/effects.json) · `mockups/inventory` ↔ `Illustration` → `EmptyState`,
the screens · gates 4 and 8 · **high**

## Why the link exists

The drawings are keyed by the names F-220's inventories bind — `plum-branch`, `kimono`, `leaves`,
`sashiko`, `waves`, `silk-wave`, `hanger`, `viewfinder`, `no-results`, `document`, `page-fold`,
`blossom` — so a surface feature writes the name its inventory records and nothing translates it.
That makes the inventories an input to `@irodora/ui` for the second time; the icon set is the first
[[the-icon-registry-is-keyed-by-the-inventories]].

**High, for the same reason as the icon set's.** Rename an illustration in an inventory and a surface
asks for a drawing that does not exist; add a drawing nothing binds and the set holds a design nobody
made. Neither shows up as a colour, a contrast or a layout failure.

Two things sit outside the drawn set and are declared rather than deleted:

- **`signature`** — `18`'s envelope word *Signed*, in a script face. Type, not a drawing, and a claim
  about a person having signed something: **OQ-38**, and F-263 waits on it.
- **R7's three** — `swatches`, `reading`, `pairing` — which no mockup draws and eight screens still
  render. F-236 rebuilds those surfaces to `27`'s states; until then they stay (golden rule 6).

## What holds it

- `illustrations.test.tsx` reads the inventories and asserts both directions with a decoy each way;
  holds the unbuilt declaration to its binding and its question; holds R7's three outside the drawn
  set; and digests every path against the set's version, so a redrawn line is a recorded change.
- **No drawing over a sample**, asserted over the record's own geometry: 33 drawings against 73
  samples, with a planted overlap as the decoy. `10.art` is the one declared exception — its box is
  a scan blob that reaches into the card column, which is F-282, not a drawing over a sample.
- The conformance suite registers two drawings — the plum branch as a backdrop and the hanger, the
  one drawn with fills — so both are read under the colour-literal and both-theme rules.

## What it does not hold

**Whether a drawing looks like the element it was drawn from.** Twelve were compared against
magnified crops by a person, and five were wrong on the first pass — a solid document drawn as an
outline, a turned corner drawn as a slab, half circles where the wave is a corner fan, stitches that
joined across their blocks, a hanger twice as thick as the one `27` draws. No assertion here could
see any of that; **F-281** is the check that could.
