# Plan: F-181 — The Atlas owns Compare, Find and Palettes

| | |
|---|---|
| **Feature** | F-181 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-26 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

Three of F-179's eight orphans. **The Atlas offered a list and nothing else** — a person could
browse a corpus and could not search it, compare within it, or build from it, though all three
screens were finished, tested and covered by the conformance suite.

`/atlas/palettes` is the transitive case: something *did* link to it — `/profile/export` — but
that route is itself an orphan, so the link led from nowhere.

## Approach

**Nothing is built.** Three routes exist; three screens exist; the props are already the shape
every destination here uses. What is missing is the offer.

**The Atlas** gains three affordances, under the search field rather than above the filters —
they are alternatives to browsing rather than refinements of it, and a person who has started
typing has already said which they wanted.

**The colour page** gains *"Compare this with another colour"*, carrying its slug.
`Compare` has taken `initialA` since F-019 for — in its own docblock — *"a future 'compare with
this one' entry point from the colour detail screen"*. This is that entry point, two releases
later, and it is what makes criterion 2 true: the comparison opens on the colour somebody came
from rather than on two empty slots they must fill before the screen says anything.

The route reads `?a=`; absent is a **state**, not an error, because opening from the Atlas
carries no colour and both slots start empty.

## Files to touch

```
apps/mobile/src/i18n/{en,ja}.ts            — five keys
apps/mobile/src/screens/Atlas.tsx          — three optional destinations, and the block
apps/mobile/src/screens/ColourDetail.tsx   — onCompareWith
apps/mobile/app/(tabs)/atlas/index.tsx     — supplies the three
apps/mobile/app/(tabs)/atlas/[slug].tsx    — supplies the comparison, with the slug
apps/mobile/app/(tabs)/atlas/compare.tsx   — reads ?a=
apps/mobile/test/screens.test.tsx          — both subjects render the new controls
.harness/verification/unreachable-routes.json — three declarations expire
```

## Test plan

- **Reachability:** orphans 7 → 4, reachable 10 → 13, and all three declarations **removed** —
  leaving any of them fails as a dead exemption, which is the direction that matters.
- **Route targets:** the new `?a=` push must still resolve; the count rises rather than falls.
- **Conformance:** both subjects render the new controls. A subject that omitted them would
  leave four controls outside every accessibility and contrast run — ADR-0054's shape, one prop
  along.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · reachability · route-targets ·
build`. Not run: `cvd`, `color-golden`, `content` — no colour, no maths, no corpus.

## Risks

- **Three secondary buttons in a column is the shape F-146 removed from Home.** It is the right
  answer *here* — these are three genuinely different tools rather than ten links to everything —
  but it is the same shape, and F-203's sweep should look at it again once the card system
  exists.
- **Nobody has used the comparison from a colour page.** Attested with the rest of R7's queue.

## Out of scope

The remaining four orphans (F-182), and any change to the three screens themselves.
