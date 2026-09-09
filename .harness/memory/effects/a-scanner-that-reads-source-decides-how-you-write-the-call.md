# A scanner that reads source decides how you write the call

**Effect:** [E-108](../../state/effects.json) · **Feature:** F-202 · **Date:** 2026-09-09

Home needed to open one of two destinations, so the natural code was:

```ts
router.push(
  subject.kind === 'entry'
    ? `/atlas/with/${subject.slug}`
    : `/atlas/with/reading/${subject.id}`,
);
```

Correct, readable, and **invisible**. `verify-route-targets` reads *source* and matches
`router.push(` followed by a quote. A ternary there matches nothing, so it extracted **zero**
targets from that call — and then reported *"Every target resolves"*.

Not a false negative on one route. **It went quiet about the whole call**, and reported success.

## What caught it

A different gate. `verify-reachability` walks the route graph and found the new route orphaned —
because the edge that would have reached it was the edge the first scanner could not see.

Two gates over the same subject from opposite directions, and only the second one noticed. That
is the argument for having both, and it is not the argument anybody made when they were written.

## The code changed, not the gate

The scanner's own docblock names this hazard:

> *An href assembled from variables would resolve at runtime and be invisible to it — which is
> precisely how the four exits went unchecked.*

So the fix is two calls, each with a literal the scanner can see. That is not a workaround: **a
navigation target that a static reader cannot find is one nobody can audit**, and writing it so
it can be found is the price of the guarantee.

## The shape to remember

**When a gate reads source rather than behaviour, the way you write the call is part of the
contract.** Refactoring into a form the scanner cannot parse silently removes the code from the
check — and the check keeps printing its cheerful summary over a smaller subject than it had
yesterday.

[[a-check-that-gets-quieter-is-worse-than-one-that-fails]]
