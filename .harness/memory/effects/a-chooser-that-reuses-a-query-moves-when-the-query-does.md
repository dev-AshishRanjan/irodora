# E-229 — A chooser that reuses a query moves when the query does

**Link:** `apps/mobile/src/finder.ts#find` → the Finder and `08`'s chooser (`compare-readout.ts#pickList`)
**Guard:** `compare-states.test` (a name, a phrase and a hex each list `find`'s entries less the other
slot's colour; an empty field lists every entry but the other slot's; a query that finds nothing shows
`00`'s caption alone); `compare-readout.test` (`pickList` never offers the other slot's colour, for
every query it tries); `finder.test` **Severity:** low **Feature:** F-249

---

## Why B changes when A does

`08`'s *Change A* and *Change B* open a sheet whose field reads through the Finder's own `find()` — a
name, a phrase from the published lexicon, or a hex ranked by ΔE00 — so the two surfaces cannot answer
one query two ways. F-250 rebuilds the Finder to `09`; a change to `find()`'s contract (its order, its
limit, a hex's nearest count, an asynchronous answer) changes what `08`'s chooser lists, silently.

## What it does not guard

- **A 120-row list inside a floating sheet on a device**: windowing and scrolling inside the sheet are
  the attested half of criterion 5.
