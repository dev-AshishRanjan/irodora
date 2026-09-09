# Plan: F-215 — Route reachability resolves a URL by filesystem order

| | |
|---|---|
| **Feature** | F-215 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-26 |
| **Service** | `root` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The root cause

CI reported three orphans on `ubuntu-latest` for a commit that passes on Windows:

```
✗ /atlas/compare · /atlas/find · /atlas/palettes
```

`app/(tabs)/atlas/index.tsx` pushes all three. The scanner finds those targets, and then has to
say **which route pattern the URL lands on**:

```js
const hit = patterns.find((q) => q.test.test(url));   // verify-reachability.mjs:161
```

Each of those URLs matches **two** patterns:

| url | matches |
|---|---|
| `/atlas/find` | `^/atlas/find/?$` **and** `^/atlas/[^/]+/?$` |

`Array.prototype.find` returns the first, and the order of `patterns` is the order of
`walk()` → `readdirSync`, which is **sorted on NTFS and hash-ordered on ext4**. On Linux the
dynamic route came first, so the edge from the Atlas index was attributed to `/atlas/[slug]` and
the three literal routes were left with no inbound edge at all.

Reproduced deterministically by reversing the pattern array:

```
/atlas/find -> windows order: /atlas/find | reversed: /atlas/[slug]
```

**The gate has been correct on one operating system by accident.** That is worse than a gate that
fails, because the failure is invisible to whoever runs it locally.

## Why the proof did not catch it

Its fixture is a tab, a route, a chained route and an orphan — and **no dynamic route at all**.
The ambiguity it needed to see could not arise.

## The fix: resolve the way the router resolves

A static segment beats a dynamic one. That is not a tie-break invented here; it is how
expo-router matches, and the check exists to model the router.

```
resolveRoute(patterns, url)
  candidates = every pattern whose test matches
  pick       fewest dynamic segments, then most segments, then url — a total order
```

Both `find` sites move to it: the edge resolution and the tab-root resolution.

`walk()` also gains a `.sort()`, so the discovery order is reproducible across platforms. **That
is hygiene, not the fix** — sorting alone would put `[slug].tsx` first everywhere, which breaks
all three platforms consistently instead of one inconsistently.

## Test plan

Three cases in `verify-reachability.mjs --prove`, on a fixture that now has a dynamic route:

- **the shape that shipped** — a literal route beside a `[slug]` sibling, reachable;
- **order independence** — the same tree, patterns reversed, same verdict. This is the property
  that was actually violated, and asserting the outcome without asserting the invariance would
  leave the next ordering difference to CI again;
- **the dynamic route is still reachable** on its own, so specificity has not made `[slug]`
  unreachable — a fix that traded one orphan for another.

## Verification

`state · lint · format:check · test`.

## Risks

- **`resolveRoute` changes which edge is recorded**, so a route that was reachable only through a
  mis-attributed edge could now become an orphan. That would be the check reporting something
  true; the run below says whether it happens.

## Out of scope

`verify-route-targets.mjs`, which asks only whether *any* pattern matches. That question is
order-independent and already correct.
