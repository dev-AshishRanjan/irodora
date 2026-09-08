# Plan: F-194 — The harmony engine reaches the product

| | |
|---|---|
| **Feature** | F-194 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-6, FR-73, NFR-26 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

This is the feature the release is for.

`@irodora/color-harmony` shipped complete in **F-014**: twelve relationships generated in OKLCh,
every returned colour gamut-mapped, every one carrying the ΔE00 the mapping cost, covered by
gate 5 and by property tests. **It is imported by nothing** — F-183's gate says so by name, and
`packages/color-core` declares a dependency on it that no source backs.

Reported as *"By contemporay colours I meant, if shirt is a color, then what color could pants
should be… that was the whole point of this app."*

## Approach

**Nothing in the engine changes.** `generateHarmony(source, kind)` already returns exactly what
a screen needs, including the two things that make this product's version of the feature
different from every other one: `wasGamutMapped` and `gamutDeltaE00`.

**A pure module first.** `src/combinations.ts` takes an OKLCh and returns the harmonies, so
every decision about *which* relationships to offer and *in what order* is reachable by a test
that renders nothing — the convention `contemporary.ts`, `compare.ts` and `home.ts` all follow.

**Twelve is too many to show at once, and choosing is the feature.** The engine generates
twelve; a screen that listed all twelve would be a menu rather than an answer. The module ranks
them and the ranking is stated: relationships that change **hue** first, because that is what
somebody asking *what goes with this* means; then the ones that change lightness or chroma,
which are variations on the colour rather than companions to it.

**The gamut cost is shown, not hidden.** Criterion 2, and it is the honesty rule applied to a
recommendation: *"less vivid"* is a disclaimer, `ΔE00 1.8` is a measurement. A colour the
display cannot show is still offered — with the number saying how far the shown one is from the
asked-for one.

**It is labelled generated, and it is never a rule.** Criterion 3, and NFR-21's lint is binding:
this proposes relationships, it does not say what anybody should wear.

## Files to touch

```
apps/mobile/src/combinations.ts            — new. Pure: which relationships, in what order.
apps/mobile/src/screens/Combinations.tsx   — new
apps/mobile/app/(tabs)/atlas/with/[slug].tsx — new route
apps/mobile/src/screens/ColourDetail.tsx   — the way in
apps/mobile/src/i18n/{en,ja}.ts            — twelve relationship names, and the screen's copy
apps/mobile/test/combinations.test.ts      — the module
apps/mobile/test/screens.test.tsx          — the subject
.harness/verification/unused-packages.json — @irodora/color-harmony's entry retires
```

## Scope, stated so it is not claimed twice

Criterion 1 says *"reachable for any colour a person can hold — scanned, chosen from the Atlas,
or a garment"*, and **F-197's criterion says the same thing**. That is an overlap in the backlog,
not two features' worth of work.

**This feature gives the engine one way in — a corpus colour** — and F-197 adds the reading and
the garment and settles the naming against `Contemporary`. Doing all three here would leave
F-197 with nothing but a rename, and the criterion is amended to say so.

## Test plan

- **Unit, rendering nothing:** the ranking puts hue relationships first; every returned colour
  carries its gamut cost; a colour already in gamut reports `0` rather than being omitted.
- **Negative, with a decoy:** a source at extreme chroma must produce mapped colours with a
  **non-zero** cost — otherwise the criterion is satisfied by a field nobody ever populates.
- **Conformance:** the screen in both themes, with a colour whose harmonies include a mapped one.
- **Reachability and dead-exports:** the new route must be reachable, and `@irodora/color-harmony`
  must be reported as *"declared unused and IS imported"* until its declaration is removed.

## Verification

`state · typecheck · lint · format · test · color-golden · a11y · contrast · build`.
`color-golden` **is** run: this reaches the engine, and a screen that reads it should not be the
first thing to notice a golden drift.

## Risks

- **Nobody has looked at a generated combination.** Whether five relationships read as useful or
  as a colour-theory lesson is the judgement, and it is the one that decides whether this
  feature is the product or a curiosity. Attested.
- **The ranking is a decision with no evidence behind it.** Hue-first is defensible and it is not
  measured; it is stated in the module so somebody can disagree with it.

## Out of scope

The wearable set (F-195), the curated combinations (F-196), the other entry points and the
renaming (F-197), CVD and profile weighting (F-198), and the hand-off onward (F-199).
