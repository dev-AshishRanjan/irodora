# E-208 — One coverage context for 01's pill and 11's dial

**Link:** `coverageContext` and `placeableGarments` (`apps/mobile/src/wardrobe/coverage.ts`) → Home's
route and its count pill (`01.wardrobe.count`), the Wardrobe route and its coverage dial and gaps
**Guard:** `wardrobe-coverage.test` (a count through the shared context equals one through a context
written out by hand, the oracle; `undefined` without a profile; the Wardrobe route reads the helpers
and assembles no context of its own, read from source, with the shopping route as the decoy that
still does); `home-states.test` (the pill with and without coverage) **Severity:** medium
**Feature:** F-242

---

## Why B changes when A does

A valid outfit is one that clears the threshold against the person's profile, and counting them
needs four things: the profile, the rule set, the weights and the corpus as a reference. The
Wardrobe route assembled them inline (F-150). `01`'s count pill prints the same number, so a second
inline copy would have let the front door and the Wardrobe disagree the first time one of the four
moved. Both routes now take the context from one module.

So a change to what a valid outfit is counted against — a new weight file, a different reference
set, a profile read another way — reaches both screens at once, and the test's oracle says whether
the helper still assembles what a hand-written context would.

## What is left outside it

`shopping.tsx` still assembles its own context for the shopping check. It shares the reference set,
and F-258's notes say to move it here when that screen is rebuilt. Until then the source read keeps
it as the decoy that proves the read can see an inline context.

## Without a profile

There is nothing to count against, so the helper returns `undefined` and each screen leaves the
figure out: the Wardrobe omits its coverage section, and Home's pill says the garment count alone
(R9 §4 E2). Neither draws a zero it never computed.

Related: [[a-badge-is-the-shape-of-a-recorded-fact]].
