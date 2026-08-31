# Plan: F-048 — Wardrobe coverage and gap analysis

| | |
|---|---|
| **Feature** | F-048 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-42, FR-43 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages` · `@irodora/recommendation` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-31 |
| **Blockers** | F-045 (done) |

---

## Intent

Two questions about a wardrobe rather than about a colour: **how much does it actually give
me**, and **what one thing would give me more**.

"Done" to a user: they see that their wardrobe makes 34 outfits, that one jacket carries nine
of them, and that a light warm neutral would add eleven.

## The three decisions this turns on

### 1. "Valid" cannot mean "one garment per slot"

|tops| × |trousers| × |shoes| is a multiplication, not a coverage score. It says nothing about
colour and rises when you buy a second black jumper.

**A valid outfit is one that clears a stated score.** `scoreOutfit` already produces the
number, so coverage counts combinations at or above `COVERAGE_THRESHOLD` — a constant with its
reasoning beside it, in the shape `PREFERENCE_SATURATION` set. The threshold is a **judgement
and is labelled as one**; what it must not be is invisible, because "34 outfits" means nothing
without it.

### 2. The gap vocabulary is CONTENT, and it already exists

FR-43 wants gaps *"named in product language"* — its own example is *"no warm light neutral"*.

**`content/rules/phrase-lexicon.*.json` already publishes exactly that vocabulary**: 18 English
terms, each constraining OKLCh dimensions with a rationale, at a version, parsed by
`parsePhraseLexicon` in `@irodora/corpus` and already read by the Finder (F-021).

- lightness — `dark` `medium` `light` `pale`
- chroma — `grey` `neutral` `muted` `soft` `vivid`
- hue — `red` `orange` `brown` `yellow` `green` `teal` `blue` `violet` `pink`

Inventing a second vocabulary here would be **E-013's shape**: one content rule stated in two
places, drifting the first time an editor publishes. So a region is a combination of published
terms, and a gap's name is those terms joined. *"Warm"* comes from the **rule set's poles**
through `temperatureOf` (F-099, F-101) — also content, also versioned.

**A consequence worth stating: the gaps this can name are exactly the ones the lexicon can
express.** If an editor publishes no term for a region, no gap is reported there. That is the
correct failure — better a vocabulary an editor chose than one this file invented.

### 3. "The outfits it would unlock" is a PROJECTION, and must say so

Counting what a garment would unlock requires a garment that does not exist. The only
defensible one is a **representative colour at the region's centre**, and the number is
therefore a projection from a synthetic colour — not a measurement of anything.

Golden rule 11 applies to our own reports as much as to the UI. The return type carries the
representative colour it used, so the number is reproducible and its basis is visible; the
copy that eventually renders it is F-050's or a follow-up's problem, and this feature makes
lying about it inconvenient by handing back the evidence.

## Approach

**Reused:** `scoreOutfit`, `OUTFIT_SLOTS` and the slot vocabulary (F-045); `parsePhraseLexicon`
and the published lexicon; `temperatureOf` from the rule set; `Candidate`/`OutfitPiece`.

**New:** `packages/recommendation/src/coverage.ts` —

- `coverage(wardrobe, context)` → valid outfit count, per-garment counts.
- `applyChange(previous, change, context)` → the **incremental** recompute (criterion 1).
- `gaps(wardrobe, lexicon, context)` → named regions with their projected unlock counts.

**Increments:**

1. `coverage` and the threshold, computed whole. Tested.
2. `applyChange`, with the assertion that it equals a full recompute.
3. `gaps` over the published lexicon.

## Files to touch

```
packages/recommendation/src/coverage.ts       — NEW
packages/recommendation/src/index.ts          — exports
packages/recommendation/test/coverage.test.ts — NEW
tests/bench/…                                 — the incremental budget (gate 12)
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| Reads the phrase lexicon | the published lexicon version | `gate:content` — the lexicon is content and already gated; this adds a **second reader**, so a term removed in a later publish now breaks two things rather than one |
| A new engine entry point | `apps/mobile` when it renders this | `gate:typecheck` |
| The threshold constant | every number this feature reports | `gate:test` — and the constant is exported so a caller can state it beside the count |

**A link is owed** for the second-reader consequence: the Finder and this both read the
lexicon, and an editor removing a term now changes what two surfaces can say. That is E-013's
family and worth its own record because the dependents are different.

## Test plan

- **The threshold is load-bearing:** a wardrobe whose combinations all score below it has
  coverage 0, not `t × r × s`. Without this the count is a multiplication wearing a name.
- **Per-garment counts sum correctly** and identify the garment carrying the most outfits —
  the "one jacket carries nine" claim.
- **Incremental equals whole**, which is the criterion-1 assertion: after any sequence of adds
  and removes, `applyChange` agrees with `coverage` computed from scratch. Property-style over
  several sequences, because one sequence proves one path.
- **Removing then re-adding returns to the same number** — a cache that leaked state would drift.
- **Gaps are named from the lexicon, not from this file:** a term removed from the fixture
  lexicon disappears from the gap names. That is the decoy for "the vocabulary is content".
- **A gap reports the representative colour it projected from**, so the number is reproducible.
- **A wardrobe with no gaps reports none** rather than inventing one.
- **Perf:** the incremental path is measured against a budget; the whole recompute is the
  baseline it must beat by a stated factor.

## Verification

Commands read from [`gates.json`](../verification/gates.json), and **run one at a time** —
concurrent runs clobber each other through fixed-path lint fixtures and shared turbo outputs,
which produced two false reds and a false exit-2 in this session already.

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build && pnpm bench
```

Not applicable: `color-golden` (no colour maths — every judgement is `scoreOutfit`'s), `cvd`,
`contrast`, `a11y`, `security`, `artifact`, `e2e`.

## Risks and open questions

- **Cost is combinatorial.** Whole coverage is `t × r × s` calls to `scoreOutfit`. That is the
  reason criterion 1 says *incremental*, and the reason `perf` is in the verification list.
- **The threshold is a judgement.** If it turns out to be wrong the count moves for everybody,
  so it is exported and stated rather than buried.
- No `OQ-*` bears on this.

## Out of scope

- **The surface.** `service: packages`, and `a11y` is not in the verification list. Nothing will
  render a coverage number; that is filed rather than counted, as F-046's was.
- **Capsule optimisation (F-050)**, which is blocked on this.
- Recommending a specific *purchase* — a gap is a region, not a product.
