# A one-slot mailbox with two readers loses mail, and neither reader can tell

**E-042** · from `apps/mobile/src/lens/handoff.ts#takeReading` · guard `gate:test`
(`lens.test.ts`, both directions)

## What depends on what

The Lens hands a reading over through a module-level slot: `offerReading` writes,
`takeReading` **consumes**, and the consuming is deliberate — an offer that survives being
declined is not an offer, and without it somebody who navigated back would be re-proposed an
estimate they had just turned down.

That design is correct for one reader and quietly wrong for two. F-097 built it with profile
setup as the only consumer. F-043 made the wardrobe a second one.

## The failure, and why nothing would have caught it

Somebody scans a garment intending to add it, and passes through profile setup on the way.
**Profile setup takes the reading**, because the slot had no idea who it was for. Two things
then happen and both are silent:

- The wardrobe screen finds an empty slot and asks them to scan again.
- The profile has been offered an estimate built from a jumper.

Neither screen can distinguish *"nobody scanned"* from *"somebody else took it"* — they both
see `null`. No type catches it: both readers want a `LensReading` and both get one, or don't.
No test catches it either, because each screen's own tests plant an offer and read it back, and
the two never run in the same process in the order that breaks.

## The fix, and the half that is easy to get wrong

`offerReading(reading, to)` and `takeReading(to)`, with one slot still — a queue would offer
somebody a colour they had already moved on from, which is the thing the consume exists to
prevent.

**A mismatched take must leave the offer standing.** Consuming it and returning `null` would be
the original bug wearing a parameter: the rightful reader would still find nothing, and would
still have no way to tell that from nobody having scanned. That line is what the second
assertion in each test is for.

## The guard, and why it is a pair

Two tests, one per direction. **Either alone proves nothing**: a `takeReading` that ignored its
argument entirely passes every other assertion in that describe block — the offer is written,
it is read back, the second read is `null`, a second offer replaces the first. All still true.

Watched failing: mutating the check to `if (offered === null) return null` — dropping only the
destination comparison — turns exactly those two red and leaves the other 366 green.

## The shape worth carrying

This is the same family as
[[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]] seen from the
other end. There the problem was one producer and no reader; here it is one slot and two
readers. **The question that finds both is "how many things touch this, and does it know?"** A
mailbox, a cache, a module-level singleton and a route parameter all answer it the same way,
and all of them are correct until the second caller arrives.
