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
