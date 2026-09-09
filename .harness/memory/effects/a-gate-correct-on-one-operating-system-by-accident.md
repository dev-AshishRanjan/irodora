# A gate correct on one operating system, by accident

**Effect:** [E-123](../../state/effects.json) · `scripts/verify-route-targets.mjs` →
`scripts/verify-reachability.mjs` · **high**

## What happened

CI reported three orphans on `ubuntu-latest` for a commit that was green on Windows:

```
✗ /atlas/compare · /atlas/find · /atlas/palettes
```

All three are pushed by `app/(tabs)/atlas/index.tsx`, and the scanner found those targets. What
it then got wrong was **which route pattern the URL lands on**:

```js
const hit = patterns.find((q) => q.test.test(url));
```

`/atlas/find` matches **two** patterns — its own `^/atlas/find/?$` and the sibling
`^/atlas/[^/]+/?$`, because the atlas directory holds a `find.tsx` beside a `[slug].tsx`.
`Array.prototype.find` returns the first, and the order of `patterns` is `readdirSync` order:
**sorted on NTFS, hash-ordered on ext4.**

On Linux the dynamic route came first, the edge was attributed to `/atlas/[slug]`, and the three
literal routes were left with no inbound edge at all.

## The shape of the mistake

Not "the check is wrong". The check was **right on one operating system, and right by accident**
— which is worse than being wrong, because the failure is invisible to whoever runs it locally
and arrives as a CI result nobody can reproduce.

The tell is generic and worth carrying: **`find` on a list whose order comes from the
filesystem.** Any `find`, `[0]`, `sort`-free "first match" over a directory walk is the same
defect waiting for a different filesystem.

## The fix models the thing it checks

A static segment beats a dynamic one. That is not a tie-break invented for this gate — it is how
expo-router resolves, and the scanner exists to model the router. Fewest dynamic segments, then
the longer path, then the URL: a **total order**, so the answer never depends on discovery again.

`walk()` is sorted too, but that is hygiene rather than the fix. Sorting alone puts `[slug].tsx`
first on **every** platform, which only makes the wrong answer consistent.

## Why the proof could not see it

Its fixture was a tab, a route, a chained route and an orphan — **and no dynamic route at all**,
so no URL in it was ever ambiguous. The proof exercised the walk thoroughly and the resolution
not once.

The new cases carry the shape that shipped, and one asserts the property that was actually
violated: **the verdict is the same when the routes are discovered in reverse.** Asserting the
outcome without asserting the invariance would leave the next ordering difference to CI.

They were watched failing against the shipped behaviour — the old call site put back in a
temporary copy — because a case added beside a fix passes for two reasons that look identical.

## The general shape

When a check disagrees with itself across machines, look for an ordered read of an unordered
source before looking at the logic. And when a check models a system that already has a
resolution rule — a router, a resolver, a cascade — **implement its rule**, not a plausible one:
the accident is choosing your own and being right most of the time.

Related: [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]],
[[a-proof-that-names-a-file-rots-when-the-file-is-not-the-only-one]]
