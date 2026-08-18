# Plan: F-013 — Colour naming engine

| | |
|---|---|
| **Feature** | F-013 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-7, and NFR-3 which constrains every line of it — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/color-naming` |
| **Author** | Claude Code (Opus 5) — planner subagent, adopted after verifying its load-bearing claims |
| **Date** | 2026-08-18 |

---

## Intent

Given a colour, return the corpus entries nearest to it ranked by ΔE00, each with a similarity
percentage — **and be able to prove the ranking is exactly the ranking a full scan would have
produced.** That proof is the feature; the rest is plumbing around it.

To a user: the Lens says *"closest digital reference: 藍鼠 ai-nezumi, ΔE00 2.4 — alternatives:
…"*. It never says *"this is 藍鼠"*, and the three candidates are genuinely the three nearest,
not the three nearest the accelerator happened to find.

**No colour ships here.** `content/colors/` is empty (F-012, blocked on OQ-4/OQ-5). F-013
delivers the algorithm and proves it against corpora it generates itself.

---

## What exists, and four facts verified in the tree

`packages/color-naming` is a ten-line stub — `NAMING_VERSION = '0.0.0'`, a doc comment already
stating the ADR-0031 constraint, and `dependencies: {color-spaces, color-difference}`. No
devDependencies, so `vitest` cannot run until increment 1.

**1. The colour-engine ESLint override does NOT exclude tests.**
[`eslint.config.mjs:94`](../../eslint.config.mjs) scopes the platform-API ban to
`packages/color-*/**/*.ts` with **no `ignores`** — unlike the `contracts` and `corpus`
overrides, which both carve tests out. So `packages/color-naming/test/**` may not import
`node:fs`. F-010 hit this same wall and moved a census into `scripts/`.

**This single fact decides the fixture design, and it decides it well:** there are no fixture
*files*. Corpora are generated in-process from recorded seeds, which removes the "could this be
mistaken for content" question that cost F-011 two rounds.

**2. `@irodora/corpus`'s runtime dependencies are still only engine packages**
(`color-core`, `color-difference`, `color-spaces`), and `packages/corpus/src/**` carries the
portability override plus boundary guard #11. So the F-073 hazard is contained for this package
today — but `verify-engine-purity.mjs` only walks packages named `color-*` or `cvd-engine`, so a
`zod` appearing in `packages/corpus/package.json` tomorrow would fire nothing. **D5 avoids
creating the edge at all**, which is the only answer that does not lean on F-073.

**3. `docs/architecture/color-engine.md:229` says "candidate retrieval from the corpus
(spatially indexed for speed)".** Read against
[[deltae00-is-not-a-metric-and-cannot-be-indexed]] that is defensible — the *retrieval* is
indexed, not the ranking — but it is the phrasing that invites the defect, in a document the
rules tell an implementer to read in full. Corrected here, as F-011 corrected the corpus spec.

**4. F-025 (claims copy lint) is `todo`, `blockedBy: [F-004]` (done), and is NOT in F-013's
`blockedBy`.** Criterion 4 names it. See D6.

---

## Approach

### Reused

| What | From | For |
|---|---|---|
| `deltaE00` | `@irodora/color-difference` | **the ranking authority (E-003).** Not wrapped, not approximated, not pre-filtered by a cheaper metric |
| `xyzToLab` | `@irodora/color-spaces` | the query's Lab |
| `Lab`, `Triple`, `Xyz` | `@irodora/color-spaces` | every coordinate type |
| `Color`, `Provenance` | `@irodora/color-core` | the query type — golden rule 12 has no naming exemption |
| `createPrng`, `sampleSrgb` | `@irodora/testing` | seeded, stratified synthetic corpora (F-071 wants recorded seeds) |
| `differenceCiede2000` (culori) | devDependency | a third independent ranking path, the role it already plays in `ciede2000.test.ts` |
| The uncalibrated-named-constant voice | `packages/cvd-engine/src/separation.ts` | `similarity.ts` |

**Not reused, deliberately:** `deltaEok`. It is genuinely metric and would make a real spatial
index possible — and ADR-0008 already rejected that trade: an approximation promoted to the
stated result to buy an index we do not need at 200 entries.

### New — all in `packages/color-naming/src/`

```
errors.ts       NamingError(what, detail)
record.ts       NamingRecord; PublishedLabSource — the structural corpus contract
similarity.ts   similarityPercent + SIMILARITY_HALF_LIFE_DELTA_E
rank.ts         the total comparator, rankRecords, MINIMUM_CANDIDATES
bound.ts        LabBox, labBucketKey, boxLowerBoundDeltaE00 + its named constants
buckets.ts      buildNamingIndex, NamingIndex
name.ts         nameColor (two-stage) · nameColorExhaustive (the reference path)
corpus.ts       namingRecordsFrom(bundle) — no import of @irodora/corpus
index.ts        the facade; NAMING_VERSION → '0.1.0'
```

---

### D1 — The correctness problem, which is the whole feature

**The tempting design is a fixed radius, and it is wrong.** "Shortlist everything within R Lab
units, then rank those." ΔE00 is not a metric; Lab-Euclidean distance does not bound it; so an
R sufficient for one corpus is insufficient for another, and adding one entry can silently make
the answer wrong. Criterion 3's test would then prove the radius correct *for the corpus it ran
on* — the one property that will not survive F-012.

**The design is a sound lower bound plus expansion until the k-th best cannot be beaten.**
Correctness does not depend on tuning; tuning affects only speed.

```
1. bucket every record on floor(L/step), floor(a/step), floor(b/step)
2. for each OCCUPIED bucket store the TIGHT AABB of its members, not the nominal cell
3. lb(box) = a provable lower bound on ΔE00(query, p) for every p in box
4. visit buckets in increasing lb; rank exactly with deltaE00; keep the k best
5. STOP when lb(next bucket) >= the k-th best ΔE00 found so far
```

Step 5 is the guarantee: everything unvisited has a lower bound at least as large as the k-th
best, so nothing outside can enter the top k. The shortlist is the union of visited buckets —
literally a coarse Lab-bucket shortlist as criterion 2 words it — and it is *provably*
sufficient rather than usually sufficient.

**The bound.** For CIEDE2000 with unit weights,
`ΔE00² = x² + y² + z² + Rt·y·z` where `x = ΔL/S_L`, `y = ΔC′/S_C`, `z = ΔH′/S_H`.

Four algebraic facts give a computable bound. **Each is a claim the implementer must re-derive
and the property test must confirm — none is to be taken from this plan on faith:**

1. `ΔC′² + ΔH′² = Δa′² + Δb′²` exactly, and `a′ = (1+G)a` with the **same** `G ∈ [0, 0.5]`
   applied to both colours. So `ΔC′² + ΔH′² ≥ Δa² + Δb²`.
2. `|Rt| ≤ 2·sin(60°) = √3`, since `Rc < 2` and `Δθ ∈ (0°, 30°]`. Hence
   `y² + z² + Rt·y·z ≥ (1 − √3/2)(y² + z²) ≈ 0.13397(y² + z²)`.
3. `S_H ≤ S_C` always: `T ≤ 1.93` and `0.015 × 1.93 = 0.02895 < 0.045`. So one divisor
   `S_C = 1 + 0.045·C̄′` bounds the chroma-and-hue pair, with `C̄′` maximised at a box corner.
4. `S_L` is monotone in `|L̄ − 50|`, so its supremum over the box is at an endpoint.

```
lb(box)² = (ΔL_min / S_L_max)² + 0.13397 × (d_ab_min / S_C_max)²
```

`ΔL_min` and `d_ab_min` are distances from the query to the box along L and in the (a,b) plane,
both 0 when the query is inside. Each term bounds its part below for every point in the box.

**Honesty about what this buys.** The `0.13397` factor and the `S_C` divisor make the bound
loose in high-chroma regions — roughly `lb ≈ 0.37 × d_ab / S_C`. At a 200-entry corpus the
search will often examine a large fraction of it, and **that is correct behaviour, not a
failure**: worst case is exactly brute force. So `shortlistSize` is returned on every result and
the fraction examined is **measured and reported** at 200 / 2 000 / 20 000 entries rather than
claimed. If the 200-entry figure is ~100 %, the plan says so. A measured reduction is asserted
only at 20 000, where it certainly exists — a threshold at 200 would flake and then get deleted.

---

### D2 — Ties, and the trap that would make criterion 3's test flaky

The two stages enumerate candidates in different orders. `Array.prototype.sort` is stable, so a
comparator ranking only on `deltaE00` **inherits input order** — and the two paths would then
legitimately disagree on any tie, intermittently, looking exactly like a shortlist bug.

So the comparator is **total**: `(deltaE00 ascending, then id by code unit ascending)`. Both
paths use the same `rankRecords`, and the *only* difference between `nameColor` and
`nameColorExhaustive` is which records reach it. That reduces criterion 3's test to precisely
the claim it is about: **does the shortlist contain the true top k.**

Exact ties are not hypothetical — two entries may share a Lab. The synthetic corpus therefore
**contains exact duplicates on purpose**, or the tiebreak decoy proves nothing
[[a-decoy-that-is-not-broken-proves-nothing]].

---

### D3 — The input, and why the query is a `Color`

```ts
interface NamingRecord { readonly id: string; readonly lab: Triple }

buildNamingIndex(records, options?: { bucketStep?: number; corpusVersion?: string }): NamingIndex
nameColor(index: NamingIndex, query: Color, options?: { limit?: number }): NamingResult
nameColorExhaustive(index, query, options?): NamingResult   // the reference path

interface NamingCandidate {
  readonly id: string; readonly lab: Triple;
  readonly deltaE00: number; readonly similarityPercent: number; readonly rank: number;
}
interface NamingResult {
  readonly query: { readonly lab: Triple; readonly provenance: Provenance };
  readonly candidates: readonly NamingCandidate[];
  readonly corpusVersion: string | null;
  readonly shortlistSize: number;   // criterion 2, made observable
  readonly bucketsVisited: number;
  readonly exhaustive: boolean;     // the search degenerated to a full scan
}
```

**The index is built once from a pre-loaded `VersionBundle`, by whoever loaded it** —
`apps/api` at boot (F-016), the client after fetching the corpus for offline mode.
`@irodora/color-naming` cannot read a file and never will. `buildNamingIndex` is O(n) and pure.

> **CORRECTED DURING INCREMENT 1 — the query is a Lab `Triple`, not a `Color`.**
>
> The plan originally specified a `Color` query, carrying `Provenance`, on the golden-rule-12
> argument that FR-7's permissible copy is selected by `Provenance.source`. It also asserted
> "no cycle (`core → spaces`, `naming → core, spaces, difference`)". **That is wrong, and
> `pnpm typecheck` said so immediately:** `@irodora/color-core` is the *facade* and already
> depends on `@irodora/color-naming`. Depending back is a cycle by construction, and the
> `@irodora/corpus` devDependency closed the same loop a second way (`naming → corpus → core →
> naming`).
>
> So `@irodora/color-naming` depends on **`color-spaces` and `color-difference` only**. The
> query is a Lab `Triple`; provenance-aware wrapping belongs in `@irodora/color-core`, which is
> the facade, already depends on this package, and is exactly where such a composition lives.
>
> The `VersionBundle`-assignability guard (D5) moves too: it becomes a test in
> **`packages/corpus`**, which may devDepend on `@irodora/color-naming` without a cycle. That is
> the better home anyway — the contract belongs to the package that owns the schema.

**Candidates carry `id`, not names.** Joining `id` → entry is F-016's wire projection. Putting
`EntryName` in the engine would drag the corpus schema into a package that must be
byte-identical on three runtimes, for no gain.

---

### D4 — Similarity is a stated scale, and it needs ADR-0048

`color-engine.md:241` already governs this: *"Similarity is reported as a percentage derived
from ΔE00 against a stated scale, and the ΔE00 value itself is always available — a percentage
alone invites over-reading."* F-013 must say **which** scale, and that is a product decision
with no standard answer.

**Proposed: `similarityPercent(ΔE00) = 100 × 2^(−ΔE00 / SIMILARITY_HALF_LIFE_DELTA_E)`, constant
`= 10`.** What makes it defensible is not the curve — it is what the ADR commits to:

- **It is a definition, not a measurement.** The constant is documented as **not calibrated**,
  and the ADR states it must never be described as a probability, a confidence, or a percentage
  of agreement.
- **Strictly decreasing on [0, ∞), so it is rank-identical to ΔE00 and can never contradict the
  ranking.** Property-tested. This is why a smooth curve rather than the clamped ramp
  `separationDetail` uses: a ramp reads 0 % past its ceiling, losing the ordering *and*
  displaying a legitimate third candidate as "0 % similar" — a number that reads as a claim.
- `similarity(0) = 100` exactly; range `(0, 100]`. No finite ΔE00 ever displays as zero.
- **ΔE00 is always returned beside it**, and `deltaE00` is what ranks (E-003).

> **A finding carried in, and not to be copied forward.** `separation.ts:37` justifies its
> ceiling as "well above the ~2.3 just-noticeable difference". 2.3 is the classic **ΔE\*ab** JND
> (Mahy et al. 1994); the constant it guards is a **ΔE00**, whose commonly quoted JND is ≈ 1.
> Nothing computed is wrong — the constant is explicitly uncalibrated — but the rationale
> conflates two metrics. **ADR-0048 must not cite that number without the colour-scientist
> confirming a source.** If none survives review the ADR says the anchor is editorial, which is
> honest and sufficient for a stated scale. The `separation.ts` rationale itself is recorded as
> a proposed follow-up, **not repaired under this number**.

`Math.pow`/`Math.exp` are implementation-approximated in ECMAScript. That is already accepted
product-wide — `deltaE00` calls `atan2`, `exp`, `sin`, `cos` and `pow`, and gate 5 carries a
determinism digest for exactly that reason. F-013 adds its own seeded digest under gate 4 rather
than widening gate 5.

Where the constant eventually lives is versioned content with the rule weights (F-029, E-009).
Not moved now — a scale tuned before any consumer exists is fitted to nothing.

---

### D5 — `@irodora/color-naming` does not depend on `@irodora/corpus`, at all

F-011's plan anticipated that it would, and pre-emptively gave `packages/corpus/src/**` the
portability override plus guard #11. That mitigation is real and still holds. **But the edge
does not need to exist**, and not creating it is strictly better than containing it:

```ts
/** The shape of a published bundle this adapter reads. Declared STRUCTURALLY so that
 *  @irodora/color-naming has NO dependency on @irodora/corpus — not at runtime, and not in
 *  its emitted .d.ts. A real VersionBundle is assignable to it. */
export interface PublishedLabSource {
  readonly label: string;
  readonly entries: readonly {
    readonly entry: { readonly slug: string };
    readonly derived: { readonly lab: Triple };
  }[];
}
```

Consequences, all good:

- `dependencies` stays `{color-core, color-spaces, color-difference}` — every one an engine
  package. `verify-engine-purity.mjs` passes for the real reason, not because it does not
  follow edges.
- **F-073 is not needed for F-013 to be safe, and F-013 does not discharge it.** It stays owed.
- Nothing leaks into the emitted `.d.ts`.
- `@irodora/corpus` becomes a **devDependency**, used by exactly one thing: a type-compatibility
  test asserting `VersionBundle` is assignable to `PublishedLabSource`. A corpus schema change
  removing `derived.lab` then fails `typecheck` here. Its decoy is a `@ts-expect-error` case
  proving a bundle *without* `derived.lab` is rejected
  [[mutual-assignability-does-not-catch-an-optional-field]].

**The adapter reads `derived.lab`. It does not re-derive from `entry.color.xyz`.** FR-10 and
`load.ts` are explicit: loading reproduces what was published, not what today's engine would
compute. A test builds a bundle whose `derived.lab` deliberately disagrees with its `xyz` and
asserts the published value wins — a decoy against a future "helpful" re-derivation.

---

### D6 — Criterion 4 is half-deliverable, and the split is declared now

> *"Output language is closest digital reference, never an assertion of identity; **enforced by
> the claims lint**"*

The claims lint is **F-025** — `todo`, `blockedBy: [F-004]` which is done, repo-wide in scope.
**It is not added to F-013's `blockedBy`**: that would invert the dependency (F-025 wants real
copy to lint, and F-013 produces some), F-013 is already `in_progress` under `wip_limit: 1`, and
F-025's subject is the whole repository. **No second banned-construction list is built here**
either — two lists is the duplication defect, and F-025 owns the list.

**F-013 delivers the structural half — the output *cannot* assert identity:**

1. **`MINIMUM_CANDIDATES = 3`, enforced.** `limit < 3` throws, naming the reason: a single
   answer is an identification, and ADR-0031 forbids one. `buildNamingIndex` throws on fewer
   than 3 records for the same reason. This makes criteria 1 and 4 the same mechanism.
2. **No field can be read as an identity claim.** No `name`, no `match`, no `isExactMatch`. A
   test asserts the exact key set of `NamingCandidate` and `NamingResult` — not
   shape-assignability, which would not notice an added key — with a decoy object carrying
   `exactMatch` that the same helper must reject.
3. Doc comments and identifiers follow `.harness/rules/color/color-science.md` §Language, so
   F-025 finds this package already clean.

**F-025 delivers the enforcement half.** Criterion 4 is recorded as an **attested criterion**,
`blocks: release`, `verifiedBy: F-025`, criterion string matching `acceptance` verbatim — gate 0
enforces that. F-011's precedent, applied identically.

---

## Increments

| # | Increment | Verified by |
|---|---|---|
| 0 | This plan committed; `feature_list.json` gains `plan` and the criterion-4 attested entry | `state` |
| 1 | devDependencies (`vitest`, `fast-check`, `@irodora/testing`, `culori`, `@irodora/corpus`); dependency `@irodora/color-core`; `errors.ts`, `record.ts`; `NAMING_VERSION → '0.1.0'` | `typecheck`, `lint`, `test`, `build` |
| 2 | **ADR-0048** + `similarity.ts` + property tests (monotone, `s(0)=100`, range, rank-consistency) | `state`, `test` |
| 3 | `rank.ts` — total comparator, `rankRecords`, `MINIMUM_CANDIDATES`, `nameColorExhaustive` | `test` |
| 4 | `test/synthetic.ts` — the seeded generator and its adversarial strata | `test` |
| 5 | **`bound.ts`** — soundness property, slack measurement, and the unsound-bound decoy | `test` |
| 6 | `buckets.ts` — `buildNamingIndex`, tight AABBs, validation | `test` |
| 7 | `name.ts` — the expanding search and stopping rule; `shortlistSize`, `bucketsVisited` | `test` |
| 8 | **Criterion 3: the equivalence suite**, the culori third path, the fixed-radius decoy watched to fail, the reduction measured at 20 000 | `test` |
| 9 | `corpus.ts` — `namingRecordsFrom`, assignability test + `@ts-expect-error` decoy, the "does not re-derive" decoy | `typecheck`, `test` |
| 10 | The definitional regression fixture (imported, not read) + the determinism digest | `test` |
| 11 | Docs and state: `color-engine.md` §8; E-015 + note + index line; **E-003's note rewritten**; `progress.md`; notes | `state` |
| 12 | Full gate run, evidence captured | all |

**Increment 5 before 6–8 is deliberate:** the bound is the correctness argument and must be
watched to fail before anything is built on it.

---

## Files to touch

```
packages/color-naming/package.json                     — deps + devDeps
packages/color-naming/src/{errors,record,similarity,rank,bound,buckets,name,corpus,index}.ts
packages/color-naming/test/synthetic.ts                — seeded generator; PURE, no node:*
packages/color-naming/test/*.test.ts                   — new
packages/color-naming/test/naming.fixture.json         — definitional, IMPORTED not read
docs/adr/0048-similarity-percentage-is-a-stated-scale.md
docs/adr/README.md                                     — index row
docs/architecture/color-engine.md                      — §8, replacing "spatially indexed for speed"
.harness/state/effects.json                            — new E-015; E-003 rationale
.harness/memory/effects/deltae00-is-the-ranking-authority.md — its consumer now exists
.harness/memory/effects/<E-015 note>.md                — new
.harness/memory/index.md                               — the new line
.harness/state/feature_list.json                       — plan; attested criterion 4; notes
.harness/state/progress.md
```

**Not touched:** `eslint.config.mjs`, `verify-guards.mjs`, `verify-engine-purity.mjs`,
`gates.json`, `ci.yml`. No gate activates here, and **F-013 introduces no new boundary** because
D5 declines to create one.

---

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| **The shortlist lower bound is what makes two-stage ≡ brute force** — tighten it wrongly and every ranking is quietly, regionally wrong with no error | `nameColor`; F-016 catalog, F-022 Lens, F-047 search, F-049 duplicates | **New E-015**, `severity: critical`, `guard: gate:test`. Three parts: the soundness property over random box/point pairs from a recorded seed; the equivalence suite; and the **unsound-bound decoy**, which is what proves the other two can fail |
| **`@irodora/color-naming` becomes a live consumer of `deltaE00`** | E-003 | E-003 exists and already lists this package. **Its memory note says the consumers "do not exist yet"** — that becomes false here and the note must be rewritten. Gate 0 checks a note *exists*, not that it is true, and F-011's evaluation caught exactly this class of stale note |
| **`labBucketKey` is a contract with any future SQL narrowing** | F-047, F-016 | **No guard exists and none is built here.** ADR-0008 puts the coarse narrowing in Postgres; a second bucket function in F-047 would break the transfer of this guarantee with no import edge to notice. Recorded inside E-015's note so F-047 inherits the obligation |
| **`similarityPercent` becomes a user-facing number** | F-016 wire, F-022 copy | **ADR-0048** + the monotonicity property + the regression fixture. Uncalibrated and says so; F-029 is where it would become versioned content |
| **`PublishedLabSource` is a structural contract with `VersionBundle`** | `@irodora/corpus` | The assignability test + `@ts-expect-error` decoy under `typecheck`. Deliberately **not** a new link — E-013 already owns "the entry schema is a contract", and this is one more destination for it |
| **Criterion 3 is proven against synthetic corpora, because the real one is empty** | F-012 | The equivalence test asserts a non-zero record count and **prints the real-corpus count (`0`) beside the synthetic count**, gate 11's precedent. **No automatic guard makes the same property run over real entries when F-012 lands** — stated here and in F-012's notes rather than left implied |

---

## Test plan

**Golden.** There is **no published dataset for naming, and there cannot be**: naming makes no
new claim about physical reality. It composes `deltaE00` (all 34 Sharma–Wu–Dalal pairs, gate 5)
and `xyzToLab` (CIE 15:2018, gate 5). What ships instead is a **definitional regression
fixture** — a small corpus and query set with expected ranked ids and ΔE00, cross-computed by
`culori`, **imported as JSON** because tests may not read files. It lives under gate 4, **not
gate 5**: putting a definition into the gate that guards claims about physical reality would
blur the distinction gate 5 exists to hold.

**Property (`fast-check`, recorded seeds — F-071):**

- **Bound soundness.** Random query, random box, random point inside: `lb(box) ≤ deltaE00(query,
  point)`. Millions of samples. **The sharpest instrument in the feature** — the equivalence
  test only catches unsoundness the data happens to hit
  [[measure-what-a-golden-set-can-detect-before-trusting-it]].
- **Bound slack, measured not assumed.** Report the worst observed `lb / actual` ratio.
- Similarity: strictly decreasing; `s(0) = 100`; range `(0, 100]`; ordering ≡ ΔE00 reversed.
- Comparator: total, deterministic, invariant under input permutation — over a corpus
  **containing exact duplicates**.
- **`bucketStep` invariance**: identical results at steps 1, 5, 25 and 10⁶ (one bucket = full
  scan). This is what proves correctness is not a function of the tuning parameter.
- Self-identity: a query equal to a record ranks it first at ΔE00 = 0, similarity 100.
- Result length = `min(limit, records.length)`, always ≥ 3.

**The synthetic corpora — generated, not authored, and that is the correctness argument.**
Sizes 50 / 500 / 5 000 / 20 000, each from a recorded seed, deliberately adversarial rather than
realistic: stratified in-gamut samples; dense clusters producing near-ties; **exact duplicates**;
high-chroma points where `S_C` is largest and the bound loosest; the blue region near h ≈ 275°
where `Rt` bites; `L` at 0 and 100 where `S_L` peaks. Equivalence is a property of the algorithm
over arbitrary corpora, so **thousands of adversarial entries test it harder than two hundred
real ones would.** Ids are prefixed `fixture-`, matching F-011's convention.

**Conformance.** None applies — no port. **E2E.** None; no surface until F-022.

**Negative — decoys, never empty fixtures** [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]:

| # | Decoy | Must |
|---|---|---|
| 1 | An **unsound bound** (Euclidean/2, no `S_C` divisor) | make the soundness property find a counterexample **and** the equivalence suite go red |
| 2 | A **fixed radius of 10 Lab units** instead of the stopping rule | make the equivalence suite go red; record the corpus size and query where it first fails |
| 3 | The **id tiebreak removed** | make permutation-invariance go red on the duplicate-bearing corpus |
| 4 | `limit: 1` and `limit: 2` | throw, naming ADR-0031 |
| 5 | `buildNamingIndex([])`, and with two records | throw, naming FR-7 |
| 6 | A record with `NaN`/`Infinity` in its Lab | throw at **build**, not at query |
| 7 | A bundle whose `derived.lab` disagrees with its `xyz` | the adapter returns the **published** value |
| 8 | A bundle-shaped object missing `derived.lab` | `@ts-expect-error` — not assignable |
| 9 | An object carrying an `exactMatch` key | rejected by the same shape helper the real result passes |

Cases 1–3 are the ones that matter: **without them, criterion 3's test is a test nobody has
watched fail.**

**Measurements recorded rather than claimed:** worst bound slack; mean and max
`shortlistSize / recordCount` at 200 / 2 000 / 20 000; the radius at which decoy 2 first fails.

---

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm build
pnpm test:golden                       # E-003's guard; this feature is now its consumer
node scripts/verify-engine-purity.mjs
node scripts/verify-guards.mjs
pnpm test:content                      # unaffected; run to prove it
```

**Evidence:** the pass line for every gate; the new test count; the recorded fast-check seeds;
the three measurement tables; each of the nine decoys with what it produced; the printed line
showing `0` real corpus entries beside the synthetic count; and an explicit **Not run** list.

**No gate activates in this feature** and `gates.json` is not edited.

---

## Risks and open questions

- **No `OQ-*` blocks this feature.** OQ-4 and OQ-5 attach to F-012 and concern *which colours
  exist*. F-013's correctness claim is a property of the algorithm over arbitrary corpora — and
  that is only true because the design refuses to depend on real data. This is the load-bearing
  unblocking argument.
- **The algebra in D1 is the planner's, not the repository's.** Four constants, two
  inequalities. **The property test is the authority, not this plan** — if soundness finds a
  counterexample, the bound is wrong. **Have the colour-scientist review the derivation before
  increment 6 builds on it.**
- **The bound may be loose enough that the shortlist is the whole corpus at R1 sizes.** Then
  criterion 2's mechanism is architecture rather than optimisation at 200 entries, and that must
  be *measured and printed* rather than dressed up.
- **Criterion 4 ships half-gated**, declared attested against F-025 rather than discovered at
  the end.
- **The similarity constant is uncalibrated and ADR-0048 must say so**; the `~2.3 JND`
  conflation in `separation.ts` must not be copied forward.
- **Interpretation, stated because it is a real ambiguity.** Criterion 2 says "coarse Lab-bucket
  shortlist" — the natural reading is *a fixed radius*; I read it as *the mechanism is Lab
  buckets* and choose the expansion rule, because a fixed radius is correct only for the corpus
  it was measured on. Criterion 3 says "the full corpus"; with `content/` empty I read it as
  *the full set of records the index was built from*. Both readings go in the code's doc
  comments so a reviewer can disagree explicitly.
- **F-073 remains owed and is not discharged here.** D5 avoids the edge; it does not build the
  rule.

---

## Out of scope

- **Corpus entries — F-012.** Not one colour.
- **The repo-wide claims copy lint — F-025.** Criterion 4's enforcement half, recorded attested.
- **Serving naming over HTTP — F-016.** **The Lens and all user-facing copy — F-022**, including
  how the percentage is displayed and the "closest digital reference" sentence itself.
- **Contextual filters** (family, era, classification) described in `color-engine.md` §8. One
  constraint recorded for whoever adds them: a filter must be applied by building the index over
  a filtered record set, or by testing the predicate **inside** the candidate loop before a
  record enters the heap — filtering the *result* after the search silently breaks the stopping
  rule's guarantee.
- **Text search and the phrase→region lexicon (F-047)**; **duplicate detection (F-049)**.
- **Any SQL bucket column or Postgres narrowing.** Recorded in E-015's note as F-047's obligation.
- **Serialising the index as a build artefact.** O(n) build, small corpus, no measured need.
- **Benchmarks and the `perf` gate — F-038.**
- **Moving `SIMILARITY_HALF_LIFE_DELTA_E` into versioned content — F-029.**
- **Naming against palettes.** FR-7 says corpus entries.
- **Making `verify-engine-purity.mjs` follow `@irodora/*` edges — F-073.** Avoided, not solved.
- **Correcting `separation.ts`'s JND rationale.** A real finding in another package; recorded as
  a proposed follow-up, not repaired under this number.
