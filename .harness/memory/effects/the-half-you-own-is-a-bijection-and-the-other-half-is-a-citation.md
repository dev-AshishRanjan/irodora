# The half you own is a bijection, and the other half is a citation

**Effect:** [E-118](../../state/effects.json) · `packages/recommendation/src/outfit.ts` →
`apps/mobile/src/wear.ts` → the catalogues and `Wear.tsx` · **low**

## What happened

`alternativesFor` had run inside every `recommendForSlot` call since F-030 — relative to the top
pick rather than to the garment, `temperatureOf` rather than `hueBias` (ADR-0076), one candidate
to one axis after F-101 found three chips over a single swatch — and the only screen that asks
for a ranking threw every object it produced away.

The same class R7 kept finding, and the reason it survived two gates that now exist for it: the
alternatives are a *field on a reachable object*, not an unreachable export. `verify-dead-exports`
sees a symbol nobody imports. Nothing sees a property nobody reads.

## The testing problem, which is the reusable part

One acceptance criterion was **an axis with no candidate stays omitted**. The screen cannot be
made to produce that state: it reads the published corpus, and the corpus offers all four axes
for every slug and slot measured. Forcing it would have meant a pool port on the screen existing
only so a test could starve it — test-driven API damage, on a screen whose injected ports are
otherwise all real product seams.

What the screen actually owns is narrower and checkable:

> it draws **exactly** what the engine returned — no axis added, none dropped.

So the test counts labels and compares against `wearWith`'s own answer, and the omission itself is
**cited**: `packages/recommendation/test/outfit.test.ts` → *"OMITS an axis with no candidate
rather than filling it"*, which reduces the pool to two near-identical off-whites.

Two properties make the citation honest rather than a shrug:

- **The expected count is read off the engine**, not written down. The day the corpus starves an
  axis, both sides move together instead of the screen test turning red for being right.
- **The cited test is named in the file**, so a reader can check it exists — the same reason
  F-204's sweep record carries a `cited` field.

## The part that can go wrong quietly

A citation to a test that gets deleted or renamed. Nothing links them; the reference is prose.
This is the same rot F-212 found in the token-reach proof, one abstraction up, and it is not
guarded here — the honest position is that a bijection plus a named citation is stronger than a
port added for a test, not that it is airtight.

## And one design note worth keeping

**An alternative already visible in the list above is not a duplicate.** The label is the
content: *"like that, but cooler"* is a different statement from *"fourth"*. It can equally be a
colour the list never reached, because the engine searches all 64 shortlisted candidates while
the screen shows six.

Related: [[a-test-tree-has-no-height]],
[[a-proof-that-names-a-file-rots-when-the-file-is-not-the-only-one]]
