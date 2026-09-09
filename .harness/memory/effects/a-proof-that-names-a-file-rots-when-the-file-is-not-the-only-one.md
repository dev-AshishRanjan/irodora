# A proof that names a file rots when the file is not the only one

**Effect:** [E-114](../../state/effects.json) · **Feature:** F-212 · **Date:** 2026-09-09

A mutation proof asserted that `surface.1` is reached *through a map* by planting:

```js
const MAP_FILE = 'packages/ui/src/Surface.tsx';   // remove nativeElevation from here
```

F-184 gave `Card.tsx` its own direct import of `nativeElevation`. From then on, removing the map
from one file left the token reached through the other, the discriminating half stopped
discriminating, and **CI was red at gate 8 until a person reading the pipeline reported it.**

## It had rotted once already, and the repair covered only one axis

The same case had failed before: F-143 and F-145 gave `surface.1` literal readers, and its own
docblock records that *"CI was red for every push afterwards"*. It was rebuilt into two halves
**to survive new literal readers**.

Nobody asked what else could grow. A second *map* reader was the other axis, and it arrived three
releases later.

## The fix was twenty lines below it the whole time

The spacing case in the same file, repaired for the same class of rot, had already written the
general form:

> *Picking the most-read step from the tree means the next conversion cannot rot it again.*

**Discover the subject; do not name it.** The plant now finds every file resolving through the
map. A third reader cannot rot it, because the plant will find that too.

## The shape to recognise

A fixture that hard-codes *where* something lives is a fixture with an expiry date, and the
expiry is silent: the proof keeps passing until the day the assumption breaks, and then it fails
for a reason that looks nothing like its cause.

**Two repairs of the same case, both reactive, is the signal to generalise rather than patch
again.** The question is not "what broke it this time" but "what is this plant assuming, and what
could make that untrue".

[[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]]
