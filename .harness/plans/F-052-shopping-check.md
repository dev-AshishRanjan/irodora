# Plan: F-052 — Shopping check

| | |
|---|---|
| **Feature** | F-052 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-52 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

You are holding something you do not own. The question is not *"is this a nice colour"* — it
is **"what does this do to what I already have"**: how many outfits it unlocks, whether it
suits you, and whether you own it already.

Done, to a user: choose a colour and say what the garment is, and get three answers computed
from their own wardrobe, on a device with no network, with the measurement behind each one
shown rather than a verdict.

## Approach

**Every one of the three answers already exists as an engine call.** This feature composes
them and does no arithmetic of its own beyond one subtraction — which is the same discipline
F-045 applied and the reason it stayed a mobile feature (E-008: a second implementation makes
the same garment score differently on two surfaces, both suites pass, and nothing runs both).

**Reused:**

| Answer | The call that already gives it | Where |
|---|---|---|
| Outfits unlocked | `coverage()` then `applyChange(prev, …, { kind: 'added' })`, and subtract | `@irodora/optimization` (F-048) |
| Personal compatibility | `scoreColor(profile, color, rules)` → `CompatibilityScore` with four `FactorContribution`s | `@irodora/recommendation` (F-026) |
| Duplicate warning | `findDuplicates(items)` → pairs with the measured ΔE00 | `@irodora/optimization` (F-049) |
| Which slot a type fills | `slotFor` | `apps/mobile/src/outfit/builder.ts` (F-045) |
| Colour of a corpus entry | `colorFor(entry)` | `apps/mobile/src/corpus` |
| Colour of a stored garment | `colorOf(row)` | `apps/mobile/src/wardrobe.ts` |
| Screen-side profile | `activeProfile`, `toWorking` | `apps/mobile/src/profile/store.ts` |

**New:**

`apps/mobile/src/wardrobe/shopping.ts` — one module, no React, no store:

```ts
export interface ShoppingCandidate { readonly type: string; readonly color: Color; readonly family?: string }
export interface ShoppingCheck {
  readonly slot: OutfitSlot | null;          // null → this type fills no slot
  readonly outfits: { readonly now: number; readonly unlocked: number; readonly threshold: number } | null;
  readonly compatibility: CompatibilityScore;
  readonly duplicates: readonly DuplicatePair[];
}
export function shoppingCheck(candidate, wardrobe, context): ShoppingCheck;
```

Four decisions inside it:

1. **A type that fills no slot returns `outfits: null`, never `unlocked: 0`.** A scarf is not a
   garment that unlocks nothing; it is a garment this engine cannot place. `0` is an answer and
   `null` is a refusal, and `slotFor` was written to return `null` for exactly this reason —
   *"a garment silently proposed as a shirt is worse than one the builder does not offer"*.
   The other two answers still stand: a scarf can still suit you and can still be a duplicate.
2. **`now` and `threshold` travel with `unlocked`.** *"Three more outfits"* means nothing
   without *"out of nine, counted at 60"*. `COVERAGE_THRESHOLD` is exported by F-048 precisely
   so a caller cannot report the count without it.
3. **The candidate is scored against a wardrobe it is not in.** `applyChange` is given the
   wardrobe *including* the candidate, which is what its `added` branch expects; the candidate
   is never written to the store, because the whole premise is that it has not been bought.
4. **Duplicates are filtered to pairs involving the candidate.** *"You already own two similar
   jumpers"* is a different feature (FR-44, and it has one). The question here is whether **this**
   is a duplicate of something.

**Increments** — each leaves typecheck, lint and test green:

| # | Step | Verified by |
|---|---|---|
| 1 | Widen `slotFor` to `Pick<StoredGarment, 'type'>` — strictly more permissive, every call site unaffected | `typecheck`, existing `outfit-builder.test.ts` |
| 2 | `shopping.ts` + `apps/mobile/test/shopping.test.ts` | `test` |
| 3 | The twelve `explain.<factor>.<direction>` keys in both catalogues, plus the guard test that the engine cannot emit a key the app cannot render | `typecheck` (E-016), `test`, `test:content` (E-017) |
| 4 | `Shopping.tsx`, `app/shopping.tsx`, a Home entry, registry subjects | `test`, `a11y`, `contrast` |

## Files to touch

```
apps/mobile/src/wardrobe/shopping.ts     — NEW. The composition, and the three refusals
apps/mobile/test/shopping.test.ts        — NEW. Every branch, with decoys
apps/mobile/src/screens/Shopping.tsx     — NEW. The surface
apps/mobile/app/shopping.tsx             — NEW. The route: repository, profile, rules, corpus
apps/mobile/src/outfit/builder.ts        — slotFor's parameter widened
apps/mobile/src/screens/Home.tsx         — one entry
apps/mobile/src/i18n/en.ts               — 12 explain keys + the screen's copy
apps/mobile/src/i18n/ja.ts               — the same keys, in Japanese script
apps/mobile/test/i18n.test.ts            — E-053's guard
apps/mobile/test/screens.test.tsx        — registry subjects for the screen's branches
apps/mobile/assets/fonts/*               — regenerated if step 3 introduces a new kanji
.harness/state/effects.json              — E-053
.harness/memory/effects/*.md             — its note
.harness/state/feature_list.json         — status, notes, and three filings
docs/REQUIREMENTS-COVERAGE.md            — FR-52's row names both features
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-053** (NEW) `packages/recommendation/src/score.ts#MESSAGE_KEYS` → `apps/mobile/src/i18n/en.ts` | This is the **first consumer of `scoreColor` in the app**, and none of its twelve keys is in the catalogue. The engine emits keys and holds no catalogue by design (FR-11); nothing has ever checked that the app can render what it emits | **A new test.** There is no guard today, and the protocol is explicit that building it is a task inside this feature |
| **E-016** `i18n/en.ts` → `ja.ts`, every render site | Adds keys; `ja.ts` is `Record<MessageKey, string>` | **`gate:typecheck`**, plus `i18n.test.ts` asserting Japanese script in prose values |
| **E-017** Japanese copy → bundled font subset | New ja strings; F-051 hit this an hour ago with ten codepoints | **`script:verify-font-coverage.mjs`**. Regenerate in step 3, before any gate is declared |
| **E-037** `apps/mobile/src/lens/handoff.ts` | **Not touched.** See *Out of scope* — the Lens path is deliberately not built | n/a |
| `slotFor`'s signature | Widened, not narrowed. Every existing argument still satisfies `Pick<StoredGarment, 'type'>` | **`gate:typecheck`** |

## Test plan

- **Unit:** `shoppingCheck` over a fixture wardrobe with known coverage.
  - unlocked is the difference and not the total;
  - a type that fills no slot returns `outfits: null` while still returning a compatibility
    score and duplicate pairs;
  - `threshold` is carried and equals what the count was produced at;
  - duplicates contain only pairs involving the candidate;
  - the candidate is never added to the wardrobe the caller passed in.
- **Negative, with decoys:**
  - **The decoy for "unlocked is really the total":** a wardrobe where `now` is non-zero. An
    implementation returning `after.valid` passes every test built on an empty wardrobe.
  - **The decoy for the null-slot branch:** the same candidate with type `jumper` must return
    a number. A function that returned `null` for everything satisfies the refusal test.
  - **The decoy for the duplicate filter:** the fixture contains a pair of garments that are
    duplicates *of each other* and not of the candidate. Without it, "returns only the
    candidate's pairs" passes against a function that returns everything.
  - A candidate identical to a garment already owned is reported, **with its ΔE00**, and one
    far from everything is not.
- **Catalogue guard:** every key in `@irodora/recommendation`'s `MESSAGE_KEYS` exists in `en`.
  The known gap — `OUTFIT_MESSAGE_KEYS`, which no screen renders — is asserted as an explicit
  declared set rather than excluded silently, so a *new* unrenderable key still fails.
- **Screens:** the registry covers the empty state, an answer with a duplicate, and the
  no-slot refusal — three visually disjoint branches, the same reasoning the two `OutfitBuilder`
  subjects already carry.
- **Golden / color-golden / cvd:** not applicable. Every judgement here is an imported call;
  the only arithmetic is a subtraction.
- **E2E:** in this feature's verification list and **cannot run** — gate 7 is pending on F-091.
  Recorded, not worked around.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm test:content          # E-017, because ja.ts changes
pnpm test:a11y && pnpm test:contrast
pnpm build
```

Evidence: the state gate's check count, mobile test count before and after, and each decoy
observed failing the mutation it was written for.

**Will not run:** `e2e` (gate 7, F-091), `perf`, `color-golden`, `cvd`, `artifact`.

## Risks and open questions

- **No `OQ-*` is attached to F-052.**
- **`coverage()` is `t × r × s` engine calls, computed on this screen.** For a 40-garment
  wardrobe that is on the order of two thousand `scoreOutfit` calls. There is no `perf` gate on
  this feature and no budget claimed, but the baseline is memoised on the wardrobe so that
  changing the *candidate* costs only `applyChange`'s cross-product of the other two slots —
  which is the saving F-048 built and the reason it exists.
- **`scoreColor` has never had a caller in this app.** Its twelve message keys have never been
  in the catalogue, so this is the first time anything renders them. If a key's wording turns
  out wrong, it is wrong for the first time here rather than regressing.
- **A profile is required.** `scoreColor` takes one, and there is no honest default — the outfit
  route already sends people to set one up rather than inventing it, and this route does the
  same.

## Revisions

**2026-09-01, during increment 2 — one anticipated effect was missing, and the compiler found
it.** `@irodora/optimization` was not a dependency of `apps/mobile`; the plan named the package
five times and never noticed that importing it changes a workspace manifest. That is **E-032**:
every `package.json` is an input to `pnpm-lock.yaml`, CI installs with `--frozen-lockfile`, and
install is step nine of seventeen — so a missing lockfile entry reads as a total build outage,
which has happened here before (F-020, 9ce0926). The dependency was added, `pnpm install` was
run on the pinned toolchain, and the lockfile is part of this change. Gate 0's section 7b is the
guard and it is already blocking.

Two things worth recording about that install, because `progress.md` warned about both: it was
the first real `pnpm install` in this working tree, and `packages/corpus` — reached through a
hand-made junction from `packages/store` — **survived it intact** (17 files in `src`, checked
before and after).

## Out of scope

- **The investment signal.** FR-52's table row names four things; this feature's acceptance
  list names three. *"Investment signal"* is used **once in the PRD and defined nowhere** — so
  building it means inventing what it means, which is a product decision and takes an ADR, and
  the obvious implementation (a projected cost per wear at some assumed number of wears) picks
  that number out of the air. **Filed as its own feature**, and `REQUIREMENTS-COVERAGE.md`'s
  FR-52 row is updated to name both, so the requirement is not recorded as delivered by work
  that did not deliver it — the defect F-122 exists for.
- **The Lens path into this screen.** `READING_DESTINATIONS` gains nothing here. Two reasons:
  the criterion does not ask for it, and **`offerReading` is only ever called with `'profile'`**
  — the `'wardrobe'` destination already has no producer, so building a third one would be a
  second dead route. Filed.
- **Storing the check.** Nothing is written. The premise is that the garment has not been
  bought, and a `shopping_check` table would be state for a decision nobody has taken yet.
- **Ranking or advising.** No "buy it" / "do not buy it". Three measurements, shown with what
  they were measured against. The verdict is the person's.
