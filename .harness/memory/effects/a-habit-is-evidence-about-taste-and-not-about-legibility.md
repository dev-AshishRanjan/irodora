# A habit is evidence about taste, and not about legibility

**E-043** · from `packages/recommendation/src/outfit-score.ts#preferenceMultiplier` · guard
`gate:test` (per-component, asserted)

## What depends on what

`scoreOutfit` returns six components. Preference feedback (FR-37) multiplies **exactly one** of
them — `harmony`, the component about how colours sit together, which is what *"repeated
selection of a pairing"* is evidence about.

The other five depend on **not** being reachable from it:

| component | why preference must not touch it |
|---|---|
| `cvdAccessibility` | whether two colours separate for a deutan is a fact about vision, not about what somebody keeps picking |
| `contrast` | a legibility floor is not negotiable by habit |
| `personalFit` | the profile is what the person said about themselves; preference is what they did. Letting one write the other would make the profile unfalsifiable |
| `corpusAffinity` | a measured ΔE00 to a published entry |
| `versatility` | a property of the colour, not of this wardrobe |

## The failure this prevents, stated plainly

If preference reached `cvdAccessibility`, somebody who repeatedly chose a pairing that a
deutan cannot separate would gradually stop being told so. **The product would learn to agree
with them about an accessibility finding**, which is golden rule 13 — *never make colour the
only channel* — defeated from an unexpected direction: not by removing the channel, but by
teaching the system to stop using it.

The same shape applies to `contrast`. A floor that erodes with use is not a floor.

## Why a bound is part of the same guarantee

The multiplier is clamped to ±25% around exactly 1. That is not tuning — it is what keeps
preference **nudging the order the engine produced** rather than overruling it. An unbounded
multiplier eventually promotes a pairing the engine scored badly, and at that point the six
component scores are decoration: the answer is the person's habit wearing the engine's clothes.

FR-11 promises a decomposition a person can argue with. They cannot argue with a number that
is mostly their own past behaviour reflected back.

## The guard

`outfit-score.test.ts` asserts it **per component**, in a loop over `OUTFIT_COMPONENTS` with
`harmony` skipped — not by checking that the overall moved. *"The overall moved"* passes for an
implementation that moved the wrong component, which is the entire failure.

Watched failing: applying the multiplier to `contrast` as well turns exactly that one test red
and leaves the other 120 green.

## The other half, which is a different link's shape

Preference must also never reach the **published rule content**. That is not about components —
the weights are `content/rules/weights.*.json`, immutable at a version with a digest — and the
mechanism that prevents it is that preference lives in a device table the content pipeline
cannot see. Asserted separately: the serialised `RuleSet` is byte-identical after scoring with
a preference, and the store test shows recording one touches no other table.

## Related

[[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]] is the
opposite risk on the same surface — there a value reached nobody; here the danger is one
reaching further than it should. The question that finds both is the same: *what can this
touch, and did anybody choose that?*
