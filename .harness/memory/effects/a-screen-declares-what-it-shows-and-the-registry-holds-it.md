# E-191 — A screen declares what it shows, and the registry holds it to that

**Link:** `apps/mobile/src/states.ts` + every screen's `STATES` + `blank-panel` and `bare-zero` in
`checkSubject` → every subject, and every screen feature from F-242 to F-263
**Guard:** the declarations test in `screens.test` (both directions, one decoy each) ·
`blank-and-zero.test` **Severity:** high **Feature:** F-236

---

## Why B changes when A does

ADR-0129: an absence drawn as nothing (a forgotten branch, a blank card, a "0 pieces") fails no other
check. So each screen module declares the conditions it can reach and the state each shows. Each
subject of a declaring screen says, by a type built from that declaration, which states it renders.
The test holds the tree to the words, both ways. A screen rebuilt by an R9 feature keeps all three in
step, and a new module is named until it declares.

## Where the rules stop

A panel is a surface box sized by what it holds. A box at a set size, or laid over something, is a
mark (a rule, a track, a knob) and is not read. A declared sample is content. A zero is bare only when
it is the whole paragraph. A condition no subject draws is the one thing the test cannot see, which is
why every declared condition needs a witness.

## F-236's review (2026-10-09): the rules, narrowed to what they can see (S3, M3)

- **Marks.** Any set size had been exempt, so an empty panel 160 dp tall passed. A mark is now a
  box smaller than the tap target in either direction, or in absolute position.
- **Named elements.** Declared sample hexes had been exempt, which blinded the light pass wherever
  `#FFFFFF` was declared. Now a box inside a named element is part of it.
- **SVG.** An empty `<Svg>` is not content.
- **Zeros.** The rule now reads a full stop and several words after the count. It reads a labelled
  zero as a value, because Shopping's "New outfits this would add: 0" is an answer. AddGarment's
  "In your wardrobe: 0" was the absence case that form also covers, and the screen now draws its
  tally only when there is something to count.
