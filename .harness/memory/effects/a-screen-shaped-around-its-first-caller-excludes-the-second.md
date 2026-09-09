# A screen shaped around its first caller excludes the second

**Effect:** [E-103](../../state/effects.json) · **Feature:** F-197 · **Date:** 2026-09-09

`Combinations` took a corpus `slug`. Not because it needed one — the harmony engine takes an
OKLCh and never asked where it came from — but because the screen's only caller at the time had
a slug in hand. The parameter recorded **who called it first**, not what it was about.

Three releases later a garment needed the same answer, and could not ask. A garment's colour is a
hex somebody captured or typed; it is not in the corpus.

## The bridge that looked obvious, and why it was wrong

Resolve the garment to its nearest published colour and open the screen on that.

The repository had already written down why not, one file away:

> *Report a distance. A garment is **in** a group; printing "ΔE00 4.2 from ai-iro" beside a
> jumper would present a measurement as a property of the garment.* — `Wardrobe.tsx`

So the honest version of that route needs a number the screen may not print, and the version that
skips the number **quietly answers about a different colour than the one somebody asked about**.

Both branches are bad, and that is the signal: when every way of adapting the caller to the
interface is dishonest, the interface is wrong.

## What fixed it

The subject became a union — a corpus entry, or a colour. The engine was always able to take the
second; only the screen's signature said otherwise.

The consequence is correct and is **stated on the screen**: curated combinations are keyed by
slug, because an editor chose specific published colours. A free colour has none. A section that
was simply absent would leave a person unable to tell *nobody has curated one for this* from
*this product does not do that*.

## The decoy that makes it real

*"The garment's own colour goes in"* is satisfied by an implementation that ignores the colour —
resolving to a nearest entry, or falling back to a default — and returns the same answer for
every garment. **Two different colours must produce two different results.** Without that, the
whole point of widening the subject is a claim nothing checked.
[[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]]

## The lesson

**Ask what a function is about, not what its first caller happens to hold.** A parameter that
mirrors the caller rather than the subject looks correct for exactly as long as there is one
caller — and the second one arrives needing a lossy conversion that the honest version cannot
disclose.

[[an-engine-with-no-caller-is-not-a-finished-feature]]
