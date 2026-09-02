# Plan: F-131 — FR-41's filter half

| | |
|---|---|
| **Feature** | F-131 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-41 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-02 |

---

## Intent

FR-41 is *"browse, filter and group the wardrobe"*. F-122 built the browse surface and the
colour grouping and **filed this rather than absorbing it**, because closing the coverage row as
fully covered while a third of the requirement was unbuilt would have been the defect F-122
existed to fix, wearing a new coat.

Done: the wardrobe can be narrowed by type, season and formality; the controls say what is
applied; a filter that matches nothing says so; and a narrowed wardrobe is **still grouped**.

## Approach

**A pure predicate in `browse.ts`, composed in front of `groupByColour`.** F-122 made grouping a
function over a list precisely so a filter could sit in front of it with no change to the
grouping — `groupByColour(filterGarments(wardrobe, filter))` is the whole composition, and
criterion 3 is satisfied by construction rather than by a screen remembering to re-group.

**Two different kinds of axis, and the difference is in the data.**

| axis | options | why |
|---|---|---|
| **season** | the four `GARMENT_SEASONS` | a closed set the schema defines. All four are offered even when nothing carries one, because a chip that vanished would hide the axis |
| **type**, **formality** | **whatever the wardrobe contains** | free text. FR-39 asks for two required fields, not a taxonomy, so there is no vocabulary to offer — a fixed list would filter to nothing for anybody who typed something else |

**Matching is normalised** — trimmed and case-folded, the same rule `familyOf` and
`findDuplicates` already use for a garment type, so `Coat` and `coat ` are one option rather than
two.

**Reused:**

| Piece | Where |
|---|---|
| `groupByColour` — a pure function over a list | `src/wardrobe/browse.ts` (F-122) |
| the `Row` chip idiom, `atlas.all`, `atlas.clear` | `src/screens/Atlas.tsx` (F-018) |
| `GARMENT_SEASONS`, `season.*` copy | `@irodora/store`, `en.ts` |

**Increments:**

| # | Step | Verified by |
|---|---|---|
| 1 | `filterGarments`, `filterOptions` + tests | `test` |
| 2 | i18n for the controls and the empty result; font subset | `typecheck`, `test:content` |
| 3 | the controls on `Wardrobe.tsx`, composed in front of the grouping | `test`, `a11y`, `contrast` |
| 4 | registry subject for a narrowed wardrobe and for a filter that matches nothing | `a11y`, `contrast` |

## Files to touch

```
apps/mobile/src/wardrobe/browse.ts        — filterGarments, filterOptions
apps/mobile/test/browse.test.ts           — the predicate, with decoys
apps/mobile/src/screens/Wardrobe.tsx      — the controls, and the composition
apps/mobile/test/wardrobe-screen.test.tsx — the controls actually narrow the list
apps/mobile/src/i18n/{en,ja}.ts           — the copy
apps/mobile/assets/fonts/*                — regenerated if new kanji appear
apps/mobile/test/screens.test.tsx         — two registry subjects
docs/REQUIREMENTS-COVERAGE.md             — FR-41's gate column
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-016** `en.ts` → `ja.ts` and every render site | New keys for three axes and the empty result | **`gate:typecheck`** |
| **E-017** Japanese copy → the font subset | New ja strings | **`script:verify-font-coverage.mjs`** |
| `groupByColour`'s contract | **Unchanged** — the filter composes in front of it, which is what F-122 built it for | `test` |

**No new effect link.** Nothing shared moves.

## Test plan

- **The predicate:** each axis alone; two axes together (**and**, not or); an empty filter
  returns the input; an unknown value returns nothing rather than everything.
- **The decoys, and they are the feature:**
  - **An empty filter must return everything**, or "it filtered" is satisfied by a predicate
    that always returns `false` and the screen is permanently empty.
  - **Two axes must intersect**, or a filter that ORs would pass every single-axis case.
  - **A garment with `formality: null` must not match a formality filter** — and must still
    appear with no filter, or absent data becomes a hidden exclusion.
  - **`filterOptions` must not offer a value nothing carries**, and must offer every value
    something does — both directions, or an option list that is empty or complete passes.
- **The screen:** choosing a chip narrows the list; **the narrowed list is still grouped**,
  asserted by the group heading still being drawn; clearing restores. An interaction test, since
  the conformance registry never presses anything.
- **Nothing matched is not an empty wardrobe** — two different sentences, asserted apart.
- **Mutation, precondition first:** drop each axis from the predicate, make it OR, and make
  `filterOptions` return a fixed list; each must go red.
- **Not applicable:** `color-golden`, `cvd`, `perf`. `e2e` — gate 7, F-091.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:content
pnpm test:a11y && pnpm test:contrast
pnpm build
```

## Risks and open questions

- **No `OQ-*`.**
- **Free-text axes make the option list a function of the data**, so a wardrobe of one garment
  offers one type. That is correct and it also means the controls look different for everybody —
  worth knowing before somebody reports it as a bug.
- **Three axes is the whole of what the criterion names.** Colour is deliberately not a filter
  axis: the grouping already answers "which colours", and a colour filter on top of a colour
  grouping would be two answers to one question.

## Out of scope

- **Sorting.** FR-41 names browse, filter and group; the order within a group is F-122's and is
  fixed by lightness.
- **Saving a filter.** State for a decision nobody has taken, which F-042 and F-052 both refused.
