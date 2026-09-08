# Plan: F-195 — Wear it: a colour becomes a top, and the engine ranks the rest

| | |
|---|---|
| **Feature** | F-195 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-31, FR-73 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

F-194 answered *what colour goes with this colour*. This answers the question the user actually
asked: **"if shirt is a color, then what color could pants should be"** — a garment, in a slot,
and what fills the other slots.

`recommendForSlot` and `recommendOutfit` have been exported from `@irodora/recommendation` and
**called by nothing since F-030**. This is the surface they never had. Same defect as F-194,
one package along.

## Approach

**`recommendOutfit`, not `recommendForSlot` twice.** The engine already refuses to recommend a
second top — *"a second top is not what 'what goes with this' means, and returning one would be
the kind of answer that is technically responsive"*, in its own words. Calling it once fills
every slot except the one in hand, which is criterion 1 exactly, and it closes both uncalled
exports rather than one.

**The slot is chosen, not assumed.** Criterion 1 says *"a colour resolves into a slot"*. A
colour is a top **by default** and the choice is a `ChoiceGroup` (F-186) — so choosing `trouser`
asks for tops and shoes instead. Without the control, "resolves into a slot" would mean "we
picked one for you", which is the assumption the criterion is written against.

**Nothing here scores.** Criterion 2. `src/wear.ts` builds the candidate pool and hands it over;
every number on the screen comes from `recommendOutfit`. The 50/50 personal/pairing blend, the
shortlist bound, the tie-break on id and the alternatives are all the engine's and stay there.

### No profile: the engine already has the answer, and it is not a fabrication

Criterion 3 is the interesting half. `recommendOutfit` requires a `PersonalProfile` and half the
blend is *does this suit me* — which is unanswerable for somebody who has not built a profile.

The engine already represents this state exactly. `scoreColor` returns `NO_EVIDENCE_SCORE` (50,
`confidence: 0`, all four factors `neutral`) when no dimension carries confidence, and its
docblock names this case: *"a profile nobody has filled in is zero across the board"*. F-027
made it reachable rather than theoretical.

So the app supplies a **`NO_EVIDENCE_PROFILE`** — full-range intervals, no temperature bias,
confidence 0 on every factor — and the personal half contributes nothing to any score. The
ranking is then driven entirely by pairing, which is the answer that does not need a profile.

**Two things this must not do, and the reasons are different:**

1. **It must not present the blended number.** With personal pinned at 50, every score is pulled
   toward the middle — the *order* is right and the *magnitude* is an artefact. The screen shows
   the **pairing** figure when there is no profile, and the blend only when there is one.
2. **It must not show the personal explanation.** Full-range intervals make `intervalFit` return
   1 on every axis, so the explanation object would report a perfect fit on four axes nobody has
   measured. `wear.ts` returns `personalKnown: false` **as a value** rather than letting the
   screen infer it from a confidence field it might forget to read.

And it says which one is missing, with a way to the profile — criterion 3's second clause. The
pattern is `shopping.ts`'s, verbatim: *"The other answers stand — which is why this returns them
rather than refusing wholesale."*

## Files to touch

```
apps/mobile/src/wear.ts                      — new. Pool, slot, the no-evidence profile. No scoring.
apps/mobile/src/screens/Wear.tsx             — new
apps/mobile/app/(tabs)/atlas/wear/[slug].tsx — new route
apps/mobile/src/screens/Combinations.tsx     — the way in
apps/mobile/src/i18n/{en,ja}.ts              — the slots, the reasons already exist (explain.*)
apps/mobile/test/wear.test.ts                — the module
apps/mobile/test/screens.test.tsx            — the subjects, including the no-profile branch
```

## Test plan

- **Unit, rendering nothing:** the source slot is never recommended back; trouser and shoe both
  come back for a top; the pool excludes the source colour itself.
- **FR-31's counts:** ≥5 trouser and ≥4 shoe candidates, asserted against the shipped corpus.
- **No profile, with a decoy:** with `NO_EVIDENCE_PROFILE` every `personal.score` is 50 and every
  `confidence` is 0 — and the ranking must **still differ between two different source colours**,
  or "pairing drives it" is a claim the test never checked. A pairing-blind implementation would
  return the same order for every input and pass everything else here.
- **`personalKnown` is a value, not an inference:** true with a profile, false without, and the
  screen's tree must differ between them.
- **Conformance:** both branches — with a profile and without — in both themes.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · build`.

## Risks

- **Nobody has looked at a slot recommendation.** Whether a ranked list of trouser colours reads
  as useful is the judgement this cannot discharge. Attested.
- **The corpus is the pool.** These are historical Japanese colours, not garments anybody sells.
  That is what the product has, and the screen must not imply otherwise — F-199 is where a
  combination goes somewhere.

## Out of scope

The curated corpus combinations (F-196), the naming and the other entry points (F-197), CVD and
profile weighting of combinations (F-198), and the hand-off onward (F-199).
