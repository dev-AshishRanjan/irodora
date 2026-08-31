# The phrase lexicon has two readers now, and they fail differently

**E-044** · from `content/rules/phrase-lexicon.*.json` · guard `gate:content` + `gate:test`,
**with a stated limit**

## What depends on what

The published phrase lexicon carries 18 English terms, each constraining OKLCh axes with an
editor's rationale. Until F-048 it had **one** reader: the Finder (F-021), which matches what a
person types.

F-048 added a second: `gaps` names a missing region using the same terms. The two consume the
same content and **break differently when an editor removes a term**:

| reader | a term disappears | how anyone finds out |
|---|---|---|
| Finder (F-021) | a phrase somebody types stops matching | they search and get nothing — visible, annoying, self-reporting |
| `gaps` (F-048) | a region stops being **nameable**, so no gap is reported there | **silence** — and silence is what "you have no gaps" looks like |

The second is the dangerous one. A removed term does not make gap analysis wrong; it makes it
**quieter**, and a wardrobe with a real hole reports nothing. Nobody types a query that comes
back empty, because nobody typed anything.

## Why the vocabulary lives in content anyway

Inventing a second vocabulary inside `coverage.ts` would be [[E-013]]'s shape — one content
rule stated in two places, drifting the first time an editor publishes. The lexicon has
rationales, a version and a digest; a hard-coded list in the engine has none of those and
nobody would notice it diverging.

So the trade is deliberate: **the gaps this feature can name are exactly the ones the lexicon
can express**, and that is written into the function's own header rather than left for somebody
to deduce from an empty result.

## The guard, and what it does not reach

`gate:content` verifies the lexicon parses, is digest-verified and carries a rationale per term.
`gate:test` asserts that removing a term removes the gap names that used it — the decoy that
proves the words come from content and not from the file. Watched failing: hard-coding
`['light', 'neutral']` in the push fails exactly that one test of 139.

**What neither reaches: an editor removing a term nobody is currently missing.** There is no
check that says "this lexicon can still express every region a wardrobe might lack", because
that would require knowing every wardrobe. The honest mitigation is that the count of terms is
small and each carries a rationale an editor had to write — removal is a deliberate act, not a
drift.

## The near-neutral boundary is the same number in two places, and that is correct

`gaps` only names regions below `NEUTRAL_CHROMA` (0.039), because above it a lightness-and-
chroma region has a hue nobody published and the representative colour would need one invented.

The lexicon's own `neutral` term ends at **exactly 0.039**. That is not a coincidence to be
tidied away into one constant: one is a **content** boundary an editor chose for a word, the
other is an **engine** boundary F-101 measured for when a hue angle stops meaning anything.
They agree today and they are free to disagree — if an editor widened `neutral`, `gaps` should
still refuse to invent a hue above where the engine says hue is real.

## Related

[[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]] is the
mirror: there a value had no reader, here a value gained a second one. Both are questions about
the edges of a content artefact, and both are invisible to a schema.
