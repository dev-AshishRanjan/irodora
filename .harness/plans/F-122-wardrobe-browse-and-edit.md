# Plan: F-122 — The wardrobe gets a browse surface, and a garment can be edited

| | |
|---|---|
| **Feature** | F-122 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-41 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

There is no screen that shows somebody their own wardrobe. `app/wardrobe/` contains exactly one
route — `add.tsx` — so a garment can be created and then never seen again, and a price can be
typed once at creation and never corrected.

Done: a screen that lists the wardrobe grouped by colour, where opening a garment lets every
progressively-enriched field be changed.

## Why this was filed rather than assumed

`REQUIREMENTS-COVERAGE.md` maps FR-41 to **F-042** with verification `e2e, a11y` — and F-042 is a
`packages` feature that built the schema and the repository. **Neither of those gates can apply
to a package.** So the requirement has been recorded as delivered by work that could not have
delivered it, which F-051 found while looking for somewhere to put cost-per-wear and which is
criterion 3 here.

## Approach

**Grouping is `nearestByLab`'s answer, not a sort.** FR-41's criterion is *"colour grouping uses
perceptual distance, not hex string sorting"*, and the repository already owns the route from a
colour to a ranking: `nearestByLab(lab, 1)` returns the nearest published entries by ΔE00, and
each entry carries `taxonomy.family`. So a garment's group is **the family of the corpus entry it
is perceptually nearest to** — published vocabulary, published distance, and no new colour maths.

That also settles the Lens-captured case for free: a garment whose colour came from the camera
has no `corpus_slug`, and grouping by slug would have left it ungrouped. Distance works on any
colour.

**Reused:**

| Piece | Where |
|---|---|
| `nearestByLab` — the colour → ranking route, with the conversion inside it | `apps/mobile/src/finder.ts` (F-097) |
| `familyLabel(family, locale)` — the published family word | `apps/mobile/src/corpus` |
| `colorOf(row)` — a stored colour as a `Color`, with provenance | `apps/mobile/src/wardrobe.ts` |
| `WardrobeStore.enrichGarment` — every field, with `null` clearing one | `@irodora/store` (F-042) |
| `costEntry` — a typed price, refusing what it cannot record | `apps/mobile/src/wardrobe/cost.ts` (F-051) |
| `Swatch`, `TextField`, `Chip`, `Button`, `Surface`, `Text` | `@irodora/ui` |

**New:** `apps/mobile/src/wardrobe/browse.ts` — pure, and the only place grouping is decided:

```ts
export interface WardrobeGroup { readonly family: string; readonly garments: readonly StoredGarment[] }
export function groupByColour(garments: readonly StoredGarment[]): readonly WardrobeGroup[];
```

Three decisions:

1. **The group is the nearest entry's family, and the distance is reported nowhere on the
   screen.** A garment is *in* the group it is nearest to; showing "4.2 from ai-iro" would be a
   measurement presented as a property of the garment. The distance decides the grouping and then
   stops being interesting.
2. **Groups are ordered by size, ties broken by family name; garments within a group by
   lightness.** Both are total orders — `sort` is stable, so without a tie-break the order is the
   wardrobe's insertion order, and a browse screen that reshuffles when somebody adds a jumper is
   one nobody trusts. **Lightness rather than hex** is the criterion's own distinction.
3. **Editing is a selected state on the same screen, not a second route.** "Opened" in the
   ordinary sense, and it keeps both branches renderable by the conformance registry — a
   registry subject per branch is what gate 8 and gate 9 actually check.

**Increments:**

| # | Step | Verified by |
|---|---|---|
| 1 | `browse.ts` + `apps/mobile/test/browse.test.ts` | `test` |
| 2 | i18n for the fields and the screen; font subset | `typecheck`, `test:content` |
| 3 | `Wardrobe.tsx`, its route, a Home entry, registry subjects | `test`, `a11y`, `contrast` |
| 4 | `REQUIREMENTS-COVERAGE.md`'s FR-41 row | `state` |

## Revisions, recorded while building

**1. `nearestByLab(lab, 1)` is refused by the engine.** The plan said the group is the nearest
entry's family and wrote the call with a limit of 1. `nameColor` throws below
`MINIMUM_CANDIDATES` (3), and its message is the argument: *a single answer is an
identification, and this product does not assert that a colour IS a corpus entry* (FR-7,
ADR-0031).

The call now asks for `MINIMUM_CANDIDATES` and reads the nearest. That is not the floor worked
around: **a family is not an entry.** Several published entries share one, the heading is a
family word rather than a slug, and nothing on the screen says a jumper *is* ai-iro — the claim
a group makes is strictly weaker than the naming surface's, which is what the floor guards. A
vote across the three was considered and rejected: it breaks the property that matters most,
because a garment saved **as** a published colour would be outvoted out of its own family
whenever its two runners-up agreed with each other.

**2. `formatMinor` cannot seed the price field.** The plan listed `costEntry` as reused and
assumed its inverse existed. `formatMinor` renders **minor** units at the currency's precision —
`formatMinor(4550, 'GBP')` is `'4550.00'` — which is right for a cost-per-wear rate and would
have multiplied a garment's price by a hundred on every save here. `minorToMajor` was added to
`cost.ts` as `costEntry`'s actual inverse, and **E-052 gained a third consumer of the exponent
table, at a second scale.**

**3. A fourth increment that was not planned: an interaction test.** `browse.test.ts` proves
`textPatch` writes `null` for an emptied field; it cannot prove the screen calls it, and the
conformance registry never performs the tap that would show. Every screen test in this app was
static. `test/wardrobe-screen.test.tsx` is the first that drives one —
[[a-static-render-suite-cannot-check-what-a-form-does-on-save]].

**4. FR-41's filter half was filed, not absorbed.** The requirement is *browse, filter and
group*; this feature's criteria name browse and group. Closing the coverage row as fully covered
would have been the same defect this feature exists to fix, in a new coat. **F-131** is filed.

## Files to touch

```
apps/mobile/src/wardrobe/browse.ts       — NEW. Grouping, ordering
apps/mobile/test/browse.test.ts          — NEW. With decoys
apps/mobile/src/screens/Wardrobe.tsx     — NEW. The list and the editor
apps/mobile/app/wardrobe/index.tsx       — NEW. The route
apps/mobile/src/screens/Home.tsx         — one entry
apps/mobile/app/index.tsx                — its push
apps/mobile/src/i18n/{en,ja}.ts          — the field labels and the screen's copy
apps/mobile/test/screens.test.tsx        — registry subjects for both branches
apps/mobile/assets/fonts/*               — regenerated if new kanji appear
docs/REQUIREMENTS-COVERAGE.md            — FR-41's row
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-016** `i18n/en.ts` → `ja.ts` and every render site | Adds keys — one per enrichment field | **`gate:typecheck`**, plus `i18n.test.ts` |
| **E-017** Japanese copy → the bundled font subset | New ja strings. It has fired on three features today | **`script:verify-font-coverage.mjs`**, regenerated before any gate is declared |
| **E-052** the currency exponent is not stored beside the price | This is the **second** writer of `cost_minor`, and it must use `costEntry` rather than parsing a price itself | the exponent table's pinned test, and a browse test asserting the edit goes through `costEntry` |
| `enrichGarment`'s null-clears-a-field contract | An editor that wrote `''` for an empty text field would store an empty string where the person meant "remove" | a test asserting a cleared field writes `null`, not `''` |

**No new effect link.** Nothing shared moves; the screen is a consumer.

## Test plan

- **Grouping:** garments of clearly different colours land in different families; two garments of
  the same corpus colour land in the same one. **The decoy is a Lens-captured garment** — no
  `corpus_slug` — which must still be grouped, because grouping by slug is the wrong
  implementation that a corpus-only fixture would rate identically.
- **Ordering:** groups by size then name; within a group by lightness. Asserted over a fixture
  whose insertion order is deliberately *not* the expected order — otherwise the assertion passes
  for a function that does nothing.
- **Editing:** every enrichment field round-trips through `enrichGarment`; an emptied field writes
  `null` rather than `''`; a price goes through `costEntry` and a refused one writes nothing.
- **Screens:** registry subjects for the list and for a garment opened, so both branches meet
  gate 8 and gate 9 in both themes.
- **Not applicable:** `color-golden`, `cvd` — no colour maths here; the distance is
  `nearestByLab`'s and it has its own coverage.
- **E2E:** in FR-41's verification and **cannot run** — gate 7 is pending on F-091. This feature's
  own list is `state, test, a11y, contrast`, which is what criterion 3 is about: a feature whose
  service can satisfy the gates the requirement names.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:content
pnpm test:a11y && pnpm test:contrast
pnpm build
```

**Will not run:** `e2e` (gate 7, F-091), `color-golden`, `cvd`, `perf`.

## Risks and open questions

- **No `OQ-*`.**
- **`nearestByLab` is called once per garment**, and it ranks against the whole corpus. For a
  wardrobe of tens that is fine; for hundreds it is worth memoising, and the module computes each
  garment's group once per render rather than per row.
- **A family word is content.** `familyLabel` reads the published taxonomy vocabulary, so a family
  the vocabulary does not name would render as its raw key — which is visible rather than silent,
  and `verify-content.mjs` already asserts every family used by an entry has a word.

## Out of scope

- **Filtering.** FR-41 says *"browse, filter and group"*; this feature's own criteria name the
  browse and the grouping. Filtering by type, season and formality is a further increment and will
  be filed if it is not folded into a later feature.
- **Deleting a garment.** No criterion asks, and a destructive action deserves its own design.
- **Cost-per-wear on this screen.** It is F-051's, it is on the outfit builder, and moving it is a
  decision about where that number belongs rather than a consequence of this screen existing.
