# E-212 — A family chip's dot is its group's medoid

**Link:** `familyDot` (`apps/mobile/src/atlas.ts`) → `Chip`'s dot, the Atlas's family row,
`content/taxonomy.json` (`groups`), `content/colors`
**Guard:** `atlas.test` (each dot a member of its group, in its own hex and provenance, the same member
in any order; a group with no members has none); the inventory sweep (each of `05`'s six dots found by
its own id) **Severity:** medium **Feature:** F-246

---

## Why B changes when A does

`05` draws a dot of the family's colour on each family chip. No entry is *the* colour of a family, so
the dot is chosen by a stated rule (ADR-0143 D4): the **medoid** — the member whose summed CIEDE2000
to the other members, over each entry's published Lab, is least, with ties going to the earlier slug.

So the dot is a function of who the members are. A publish that adds, removes or recolours a member
can move it; a taxonomy edit that moves a family from one group to another can move two. Nothing on
the Atlas changes in code when that happens — the chip just shows another colour.

The dot is a real corpus colour drawn with that entry's own provenance, never an invented average
(rule 12), and it is decorative to a screen reader: the chip is named by its words.

## What it does not guard

- **That the medoid looks like the family.** A person judges that, on the capture.
- **Its size.** `SAMPLE_DOT` is the chip's, held by its own test against `05.json`.

Related: [[the-atlas-field-answers-what-its-placeholder-says]].
