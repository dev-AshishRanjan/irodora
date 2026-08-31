# Plan: F-045 — Outfit builder

| | |
|---|---|
| **Feature** | F-045 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-33 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-31 |
| **Blockers** | F-031 (done) · F-043 (done) |

---

## Intent

Three slots — top, trouser, shoe — filled from the wardrobe. Lock the ones you have decided
about, regenerate the rest, and get the same answer every time from the same locks.

"Done" to a user: they lock the jacket they are actually wearing, tap regenerate, and see
trousers and shoes chosen against it — with the six component scores F-031 produces, not a
number on its own.

## The problem this feature has to solve, and where it must not solve it

`recommendOutfit(input, candidates, profile, rules)` takes **one** anchor garment and fills
every other slot. FR-33 wants **N locked slots** constraining generation, and there is no
engine call for that.

The tempting fix is to score candidates against each locked garment in the app and combine the
results. **That is new colour arithmetic in the app, and E-008 forbids it** — a second
implementation makes the same outfit rank differently on two surfaces, both pass their own
tests, and nothing runs both.

**`scoreOutfit(pieces, reference, profile, rules, weights)` already takes the whole composed
outfit.** So generation is: for each unlocked slot, for each wardrobe garment that could fill
it, compose `locks + candidate`, ask the **engine** what that outfit scores, and rank by its
answer. Every judgement is the engine's; the app supplies combinations and sorts a list.

That is the whole design, and it is why this feature is `service: mobile` rather than a change
to `packages/recommendation`.

## Determinism — criterion 2, and what actually threatens it

*"The same locked set and versions always regenerate the same candidates."*

The engine is pure, so the risk is entirely in the app:

- **No `Math.random`.** There is no shuffle and no tie-break by chance.
- **No `Date.now` in the generation path.** A time-seeded anything would satisfy every test
  written on one afternoon.
- **A total ordering.** Sorting by score alone is *not* deterministic when two candidates tie —
  `Array.prototype.sort` is stable in V8 and Hermes, but the input order is the wardrobe's,
  which changes when a garment is added. So ties break on **garment id**, which is a UUIDv7 and
  therefore stable and unique.
- **The versions are part of the answer.** The engine, corpus and rule versions are read and
  returned with the result, so "the same versions" is a fact the caller can check rather than
  an assumption. This is F-031's reproducibility envelope applied at the surface.

The test for this is **not** "call it twice and compare" — that passes for an implementation
that caches. It is: build the same locked set from a **differently ordered wardrobe** and
require the same candidates, which is what catches the tie-break and the input-order
dependency together.

## Approach

**Reused:** `OUTFIT_SLOTS`, `scoreOutfit`, `outfitWeights`, `OutfitPiece` from
`@irodora/recommendation`; `WardrobeStore.listGarments` and `colorFor` from F-042/F-043; the
narrow-port and injected-store pattern; `ruleSet()` and the corpus bundle for the versions.

**New:**

- `src/outfit/builder.ts` — the draft (slot → garment, locked or not), `regenerate`, and the
  ordering. No colour maths; the only arithmetic is a comparison.
- `src/screens/OutfitBuilder.tsx` and `app/outfit.tsx`.
- i18n for both locales.

**Increments:**

1. The draft model, `regenerate`, and the determinism tests. No screen.
2. The screen and its route; register it in the conformance suite.
3. i18n, both locales.

## Files to touch

```
apps/mobile/src/outfit/builder.ts        — NEW: draft, lock, regenerate, ordering
apps/mobile/src/screens/OutfitBuilder.tsx— NEW
apps/mobile/app/outfit.tsx               — NEW: route, supplies the device repository
apps/mobile/src/i18n/{en,ja}.ts          — the copy
apps/mobile/test/outfit-builder.test.ts  — NEW
apps/mobile/test/screens.test.tsx        — registry entries
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| A new screen | contrast, a11y, i18n, status adjacency | `gate:a11y` / `gate:contrast` — `screens.test.tsx` runs them over **every** registered screen |
| A new route | Metro resolution | `gate:lint` (`verify-app-imports.mjs`) |
| New i18n keys | the en/ja parity type; the used-key check | `gate:typecheck` and `gate:test` — a key nobody renders fails, which is what forced the right order in F-043 |
| Reads `outfitWeights` | the published rule version | `gate:content` — the weights are content and `outfitWeights` **throws** naming the version rather than substituting numbers nobody published |

**No new effect link is expected.** This composes existing engine calls and adds no shared
contract. If the ordering turns out to need a rule the engine does not provide, that is the
moment a link is owed — and it would mean the design above was wrong.

## Test plan

- **Locking constrains:** a locked slot's garment is present in every regenerated result, and
  regeneration never proposes an alternative for it.
- **Determinism, the version that can fail:** the same locks over a **shuffled wardrobe**
  produce the same candidates in the same order. A naive "call it twice" test passes for an
  implementation that is order-dependent, which is the defect.
- **Ties break on id, not on arrival:** two garments with the same colour — therefore the same
  score — come back in id order regardless of wardrobe order.
- **All locked:** nothing to generate, and the result is the outfit itself rather than an empty
  list or a throw.
- **Empty wardrobe:** no candidates, no crash, and the screen says so.
- **The score is never presented without its components** — F-031's criterion 2, at the
  surface this time.
- **Screens suite:** contrast, a11y, status adjacency, both locales.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y && pnpm test:contrast && pnpm test:content
```

Gate commands read from [`gates.json`](../verification/gates.json) rather than typed —
four mis-invocations in this session were a plausible name instead of the real one.

Not applicable: `color-golden` (no engine maths changes), `cvd` (the CVD component is inside
`scoreOutfit`, unchanged here), `perf`, `security`, `artifact`. **`e2e` applies and cannot
run** — gate 7 is pending on F-091.

## Risks and open questions

- **Cost.** Generation is `unlocked slots × wardrobe size` calls to `scoreOutfit`. For a real
  wardrobe that is small; if it stops being small the answer is a bound with a stated reason,
  not a cache that makes results depend on what was asked before.
- No `OQ-*` bears on this.

## Out of scope

- **Persisting an outfit.** `outfit` and `outfit_item` are in the data-model sketch and in no
  migration; no criterion here asks for a saved outfit, and adding a table nothing reads would
  be the shape F-041 deliberately avoided with `change_log`.
- **Occasion weighting (FR-34)** and **CVD outfit mode (FR-35)** — separate requirements, not
  claimed by this feature.
- Swapping a *colour* independently of a garment: FR-33 says "swap colours", and in a wardrobe
  a colour arrives attached to a garment. Swapping the garment is how a colour changes here,
  and the alternative — recolouring a jumper you own — is not a thing.
