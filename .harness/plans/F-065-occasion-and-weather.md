# Plan: F-065 — Occasion and weather context

| | |
|---|---|
| **Feature** | F-065 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-34 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages` — `@irodora/recommendation`, plus published content |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

The same wardrobe, on a cold wet morning, should not be scored the way it is on a dry warm one —
and saying so must not change a single answer for anybody who never mentions the weather.

Done, to a user: an optional *"it is cold and wet"* shifts what the outfit score emphasises, in a
way somebody can read the reasoning for. Done, to this repository: **omitting it produces
byte-identical output to today**, asserted rather than assumed.

## What already exists, and what is actually left

**Occasion is done.** F-029 built it: `OCCASIONS`, `ruleSetFor(content, occasion)`, and five
published profiles in `content/rules/weights.2026.08.2.json` with a rationale on every weight.
Criterion 1's first half is already true.

**Weather does not exist anywhere** — the word appears in this feature's acceptance and in no
requirement, no content file and no source file. So this feature is weather, and the shape it
must take is constrained by something already written down.

## The constraint the content itself imposes

The published weights' own provenance says:

> *"The occasion profiles move weight between factors and **never introduce a fifth**: FR-34 asks
> for deterministic weighting profiles, so an occasion is **a different set of the same numbers
> rather than a modifier applied afterwards**."*

That rules out the obvious design. Weather as a multiplier on the occasion's four factor weights
is exactly the "modifier applied afterwards" the editor rejected, and adding it would make the
content contradict its own stated rule. Publishing every *(occasion × weather)* pair instead is a
combinatorial explosion of editorial content — five occasions by four weathers is twenty profiles
nobody can keep coherent.

**So weather goes where it does not collide: the outfit component weights.**

The content already carries two independent weight groups, and they answer different questions:

| Group | Weights | Question |
|---|---|---|
| `occasions[].factors` | temperature, lightness, chroma, contrast | *does this colour suit this person* |
| `outfit` | harmony, personalFit, contrast, corpusAffinity, versatility, cvdAccessibility | *how good is this outfit* |

Occasion owns the first. **Weather owns the second**, published as full sets of the same six
numbers — a different set of the same numbers, exactly as the editor's rule requires — so the two
dimensions compose by being about different things rather than by fighting over one array.

It is also the more defensible claim. Whether rain should make a colour read as warmer is an
assertion nobody can support; whether a wet day should weight **versatility** and **contrast**
differently in an outfit score is a preference an editor can state and a reader can argue with.

## Approach

**Reused:**

| Piece | Where |
|---|---|
| `outfitWeights(content)` — resolving the six component weights | `@irodora/recommendation/weights.ts` |
| `parseWeightContent`, `RuleError`, the rationale requirement (ADR-0011 §4) | same file |
| The optional-argument identity pattern | `scoreOutfit`'s `preferences` (F-046) — *"absent means unchanged… the arithmetic is identity rather than approximately identity. A test asserts that rather than trusting it"* |
| Version immutability | ADR-0046, FR-10 — a published version is never edited |

**New:**

- `content/rules/weights.2026.08.3.json` — supersedes `2026.08.2`, **changes nothing that was in
  it**, and adds a `weather` block. Every occasion, factor, weight, rationale and the whole
  `outfit` block byte-identical; a new version rather than an edit, because a published version
  is immutable and this is the second time that machinery is used for its purpose.
- `WEATHERS`, `outfitWeightsFor(content, weather?)` in `weights.ts`.

Four decisions:

1. **Absent weather returns the object `outfitWeights` returns today, by the same code path.**
   Not a neutral profile applied and renormalised — that is *approximately* identity, and F-046
   already established that approximately is not good enough. The test asserts equality against
   `outfitWeights(content)` directly.
2. **A weather the content does not carry throws, and does not fall back to the default.**
   `ruleSetFor` already refuses an unpublished occasion for the stated reason — *"falling back to
   default would report a ranking under a context nobody published"* — and this is the same rule.
3. **The weather names are few and concrete.** `mild`, `hot`, `cold`, `wet`. Not a temperature in
   degrees and not a forecast code: this is a weighting profile chosen by a person, and four
   states are what an editor can write distinct, defensible rationales for.
4. **No location, no network, no forecast.** Weather is a value the caller states.
   `apps/mobile/AGENTS.md` — *"Location is never requested"* — and ADR-0051: there is no server to
   ask. That is not a limitation to work around; it is why the input is optional.

**Increments:**

| # | Step | Verified by |
|---|---|---|
| 1 | `WEATHERS` + `outfitWeightsFor`, with the identity guarantee | `test` |
| 2 | The published `2026.08.3` content, with a rationale per weight | `test:content`, `state` |
| 3 | The parse-level refusals: an unpublished weather, a missing rationale | `test` |

## Files to touch

```
packages/recommendation/src/weights.ts     — WEATHERS, outfitWeightsFor, the parse
packages/recommendation/src/index.ts       — exports
packages/recommendation/test/weights.test.ts — identity, refusals, the decoys
content/rules/weights.2026.08.3.json       — NEW published version
content/rules/index.json                   — its row and checksum
.harness/state/feature_list.json           — status, notes
.harness/state/progress.md                 — the entry
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-009** `content/rules` → the engine, the app bundle, gate `content` | A **new published weights version**. `verify-content.mjs` parses every published weight set through the engine's own `parseRuleSet` and checks the ledger digest | **`gate:content`** — and the index row's checksum must be the file's, or the gate fails |
| **E-026** `content/rules` → gate content + gate security | Same file, and `verify-no-key-material.mjs` runs over it | **`gate:content` + `gate:security`** |
| `apps/mobile/src/rules/generated/weights.ts` | The app embeds the published weights as generated text. A new version means the bundle regenerates, or the app keeps reading 2026.08.2 | **`generate-rules-bundle.mjs --check`**, inside `pnpm test:content` |
| `outfitWeights`'s signature | **Unchanged.** `outfitWeightsFor` is added beside it rather than replacing it, so no existing caller moves | `typecheck`, `build` |

**No new effect link is warranted.** The weather block is content read through the same path
E-009 already covers, and nothing new depends on it.

## Test plan

- **The identity guarantee, first and hardest:** `outfitWeightsFor(content)` with no weather
  `toEqual` `outfitWeights(content)` — and the **decoy** is `outfitWeightsFor(content, 'wet')`,
  which must differ. Without it, an implementation returning the default for everything passes.
- **Every published weather resolves**, and each of the six components is present in each.
- **A weather the content does not carry throws** rather than falling back — decoy: a published
  one does not throw.
- **The weights differ between weathers measurably**, not decoratively: at least one component
  differs by more than a stated epsilon between `hot` and `cold`. FR-34's own criterion is
  *"occasion changes ranking measurably"*, and the same standard applies here.
- **Every weather weight carries a non-empty rationale**, asserted over the parsed content, so a
  block added later without reasons fails (ADR-0011 §4).
- **The published content is byte-identical to 2026.08.2 outside the new block** — a test that
  reads both files and compares every occasion, factor, weight, rationale and the `outfit` block.
  This is what makes "supersedes and changes nothing that was in it" a checked claim rather than
  a sentence in the provenance.
- **Golden:** not applicable — no colour maths. These are published weights, and gate `content`
  is what checks them.

## Verification

```
node scripts/verify-state.mjs
pnpm --filter @irodora/recommendation test
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:content && pnpm build
```

**Will not run:** `e2e`, `a11y`, `contrast` (no screens), `color-golden`, `cvd`, `perf`.

## Risks and open questions

- **No `OQ-*`, but this is editorial content and the honesty bar applies.** The existing
  provenance says *"NO WEIGHT HERE IS SUPPORTED BY A STUDY. The rationales say what the reasoning
  was, not what was observed, and a rationale that read like a measurement would be worse than
  none."* The weather rationales must hold that line — they are preferences stated plainly, and
  none of them will claim an observation.
- **One editor, self-reviewed.** ADR-0060 and OQ-5: `reviewIndependence` is `self`, declared
  rather than hidden, and the editorial note will name what a second editor would most likely
  argue with.
- **FR-34 names nine occasions and the content publishes five.** date, interview, travel, street
  and minimal are absent. That is F-029's gap rather than this feature's, and it will be **filed**
  rather than quietly fixed here — adding four occasion profiles is editorial work against a
  requirement this feature does not claim.

## Out of scope

- **Any surface.** `service` is `packages`; no `a11y`, no `e2e` in the verification list.
- **A forecast, a location, or a network call.** There is no server (ADR-0051) and location is
  never requested. Weather is stated, not fetched.
- **Weather affecting the four colour factors.** That is the modifier design the content's own
  provenance rejects, and the claim it would rest on is one nobody can support.
- **The four missing occasions.** Filed.
