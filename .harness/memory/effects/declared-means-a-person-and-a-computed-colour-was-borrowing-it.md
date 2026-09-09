# `declared` means a person, and a computed colour was borrowing it

**Effect:** [E-117](../../state/effects.json) · `packages/color-core/src/provenance.ts` →
`@irodora/contracts` · `@irodora/optimization` · `apps/mobile` · `claims.json` · **medium**

## What happened

`MeasurementSource` had four members, and three surfaces were rendering colours that fitted
none of them: a harmony companion, the centre of a lexicon region, and every swatch drawn from
a bare OKLCh triple. All three were filed as `declared`.

F-194 recorded the compromise honestly when it made it — *"`declared` is the untracked bucket
and is what this app already uses for exactly this, so following it keeps one answer rather
than inventing a second."* Keeping one answer was right. The answer was wrong.

**`declared` means a human asserted this value.** That is the member's entire content, and the
claims table binds "selected" and "entered" to it. A companion nobody has ever seen, filed as
`declared`, is the product stating that somebody vouched for a number no person has looked at.

Nothing failed, and nothing could: the only reader of `source` in the repository is
`isCaptured`, and every check downstream was satisfied because the value was in the union.

## The shape of the mistake

It is not a colour with **no** provenance — ADR-0005 makes that unrepresentable. It is a colour
with **somebody else's**. A union that is missing a case does not produce an error; it produces
a *nearest* member, and the nearest member is a claim.

## What the fix had to get right

**The line is "derived from another colour", not "the result of arithmetic".** Every value in a
colour engine is derived from something. Written loosely, a camera capture lands under `derived`
within a release. The Lens is the case that proves the line: `displayFromOklch` reports `derived`
for the swatch it renders, while `colourFromReading` writes `estimated` with the four conditions
ADR-0005 requires — because **the measurement is the stored row**, and the swatch is a rendering
of it.

**Two of five call sites moved, and the other three are the evidence it was not a rename.**
`UNSAFE_HEX_PROVENANCE` and the store fixtures stay `declared`: a hex string and a typed fixture
are what the word was always for. The camera, the corpus and the profile are untouched.

## Where a union member has to reach

Wider than the type. Each of these is a place a fifth member can be forgotten:

| | |
|---|---|
| the wire enum | pinned to the type by ADR-0036 — **this fired**, before the schema was updated |
| the untracked/captured split | free, because `UntrackedSource` is an `Exclude` rather than a list |
| the runtime validator's array | not free — a hand-written list inside `assertProvenance` |
| the ADR-0031 copy table | not free, and **unenforced**, so a missing row is silent |
| the SQL `CHECK` on `saved_color` | not free, and not migrated — deliberately |

The reach is checked in the app, because it is the only place that imports the engine, the wire
schemas and the store at once. The runtime witness of an erased union is
`measurementSourceSchema.options`, and that is not a second copy: the ADR-0036 pin is what makes
it trustworthy.

## The part that can go wrong quietly

**The database does not accept `derived`.** `saveColor` has no callers today, so nothing can
write one; a migration for a value nothing produces is speculative work against a table holding
user data, and SQLite cannot alter a `CHECK` without rebuilding the table.

A comment saying so would rot. A **test** pins it instead — discovering the allowed set from the
migration SQL, naming `derived` as the member the column lacks and `unknown` as the legacy value
the union lacks. The day a screen saves a computed colour it fails there, by name, with the
migration named as the work.

## The general shape

When a type's members are a claim about what the product knows, the missing member is not a gap
— it is the wrong claim being made confidently. Look for it where a value is *filed under the
nearest thing* with a comment explaining the compromise: that comment is the bug report, already
written, waiting for somebody to read it as one.

Related: [[provenance-in-the-type-is-what-makes-honesty-structural]],
[[a-proof-that-names-a-file-rots-when-the-file-is-not-the-only-one]]
