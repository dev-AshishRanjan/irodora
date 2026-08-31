# Plan: F-049 — Duplicate detection

| | |
|---|---|
| **Feature** | F-049 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-44 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages` · `@irodora/optimization` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-31 |
| **Blockers** | F-045 (done) |

---

## Intent

Tell somebody they already own this. One criterion, and it is precise:

> *Flags items within ΔE00 5 in the same category, showing the measured difference.*

"Done" to a user: they are about to add a fourth navy jumper and the app says *"this is 2.3
ΔE00 from one you already have"* — a number, not an opinion.

## The four decisions, all small

### 1. ΔE00, imported, and compared pairwise

`deltaE00` from `@irodora/color-difference`. Re-deriving it here would be E-008's shape, and
[[deltae00-is-not-a-metric-and-cannot-be-indexed]] rules out the optimisation somebody will
reach for: **ΔE00 violates the triangle inequality**, so no spatial index over it is correct.
Pairwise within a category it is, and a wardrobe is small enough that this is not a problem
worth creating one.

### 2. "Category" is the garment **type**, not the slot

A jumper and a coat are both `top`. They are not duplicates. FR-44 says *"the same category"*,
and the finest thing the data carries is `garment.type` — free text, because FR-39 asks for two
fields and not a taxonomy. Compared **case-insensitively and trimmed**, since the type is
whatever somebody typed.

### 3. The threshold is the requirement's, not a judgement

**5**, from FR-44 — unlike F-048's `COVERAGE_THRESHOLD`, which I had to choose. It is named,
exported and cites the requirement, so nobody later mistakes it for a knob.

The acceptance says *"within ΔE00 5"* and the PRD says *"ΔE00 < 5"*. **Strict**, per the PRD,
and the boundary is asserted at exactly 5 so the choice is visible rather than incidental.

### 4. The measured difference is returned, never a boolean

*"Showing the measured difference"* is half the criterion. A `boolean` would satisfy the first
half and make the second half unimplementable one layer up — the same reason F-045 ranks on
the score object and F-048 carries its threshold. Golden rule 11: report the measurement.

## Approach

**Reused:** `deltaE00`; `xyzToLab` for the conversion; the `CoverageGarment` shape's spirit
from F-048, though this needs `category` rather than `slot`.

**New:** `packages/optimization/src/duplicates.ts` — `findDuplicates(items)` returning pairs
with their ΔE00.

### Which package — corrected mid-feature

I first built this in `@irodora/recommendation`, carrying F-046's package forward without
checking. **The feature list says `@irodora/optimization`**, and
[`ARCHITECTURE.md`](../../docs/architecture/ARCHITECTURE.md) draws the line clearly:
`recommendation` is *"rules, weights, scoring, explanation objects"*; `optimization` is
*"capsule and coverage solvers"*. Duplicate detection asks a question about the **wardrobe as a
set**, not about whether a colour suits a person.

Moved before this feature closed. `@irodora/optimization` gains `color-difference` and
`color-spaces` as workspace dependencies.

**F-048 has the same defect and is already committed** — its `coverage.ts` sits in
`recommendation` too. Filed as its own feature rather than widened into this one; F-050 will
want `coverage()` from inside `optimization`, so it is worth fixing before F-050 starts.

## Files to touch

```
packages/optimization/src/duplicates.ts       — NEW
packages/optimization/src/index.ts            — exports
packages/optimization/test/duplicates.test.ts — NEW
packages/optimization/package.json            — two engine dependencies
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| A new engine entry point | `apps/mobile` when it renders this | `gate:typecheck` |

**No new effect link expected.** This adds no shared contract and changes no existing
behaviour — it reads garments and returns pairs. If that turns out to be wrong, the moment a
link is owed is the moment the design was.

## Test plan

- **The boundary is exact:** a pair at ΔE00 just under 5 is flagged, one at exactly 5 is not.
  Computed from real colours rather than asserted against a mocked distance, because the point
  is that the engine's number decides.
- **Category separates:** two identical colours on different types are **not** duplicates —
  the decoy for a comparison that ignored the category and would flag a navy jumper against
  navy trousers.
- **Case and whitespace:** `"Jumper"` and `" jumper "` are the same category, because the type
  is whatever somebody typed.
- **The difference is reported**, and equals `deltaE00` recomputed independently in the test.
- **Every pair once:** three identical jumpers give three pairs, not six — an unordered pair
  reported twice is the same defect F-046's `pairingKey` exists to prevent.
- **A garment is never its own duplicate.**
- **An empty or single-item wardrobe returns nothing** rather than throwing.

## Verification

Commands from [`gates.json`](../verification/gates.json), run **one at a time**.

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

`color-golden` is **not** applicable: no colour maths is added or changed — `deltaE00` is
called, not defined. Also not applicable: `cvd`, `contrast`, `a11y`, `content`, `perf`,
`security`, `artifact`, `e2e`.

## Risks and open questions

- **Pairwise is O(n²) within a category.** For a wardrobe it is nothing, and the alternative is
  an index over a function that violates the triangle inequality — which would be wrong rather
  than fast. Stated here so the next person does not "optimise" it.
- No `OQ-*` bears on this.

## Out of scope

- The surface. `service: packages`, no `a11y` in the verification list; nothing renders the
  warning. Filed with F-046's and F-048's, which owe the same.
- Deciding what to **do** about a duplicate. FR-44 says *warn*, and merging or deleting is a
  different feature with a different consent story.
- Duplicates across categories, or by pattern, material or brand. The criterion says colour
  within a category.
