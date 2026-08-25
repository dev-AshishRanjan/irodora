---
kind: effect
title: A declared pair of slugs is a claim about published values, and only the data can check it
category: contract
confidence: 0.9
created: 2026-08-25
scope: [apps/mobile]
links: [[the-app-pins-a-corpus-version-and-a-publish-can-leave-it-behind]], [[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]], [[prose-in-a-state-file-rots-and-no-schema-can-see-it]]
---

# E-030 — twelve constants name corpus slugs, and what they mean lives in the bundle

**`apps/mobile/src/corpus/generated/bundle.ts` → `profile/trials.ts` · `profile/derive.ts` ·
`screens/ProfileSetup.tsx`**

## The claim that is not in the type system

`TRIALS` is twelve entries of the shape *"this trial is about temperature, and these two slugs
are the two ends of it"*. What makes that true is not the declaration. It is a property of the
**published values**:

| A trial about | separates on | must hold constant |
|---|---|---|
| temperature | hue class (`taxonomy.temperature`) | OKLCh L and C |
| lightness | OKLCh L | hue, C, temperature |
| chroma | OKLCh C | L, hue, temperature |
| contrast | ΔL *within* each option's pair | — |

TypeScript can check that a slug is a string. It cannot check that `ame-doro` and `shimo-yo`
are 0.006 apart in L, and that is the whole content of the claim.

## The failure, and why nothing else would report it

A corpus publish moves one entry 0.05 in lightness. The temperature trial it belongs to is now
partly a lightness question. The person answers it. The tally counts it as a temperature
answer, because the *declaration* says it is one.

**Every gate stays green.** The slug still exists, so no lookup fails. The screen still renders
two swatches, so no conformance finding appears. The derivation still returns seven dimensions
with confidences, so no assertion about shape breaks. What changed is what the answer *means*,
and the output is a personal profile that F-028 will weight recommendations by.

This is [[the-app-pins-a-corpus-version-and-a-publish-can-leave-it-behind]] aimed one step
further along: **E-022 asks whether the bundle is the one that was published. This asks whether
a constant describing the bundle's contents still describes them.**

## The guard, and the part of it that is easy to get wrong

`apps/mobile/test/profile.test.ts` checks every trial against the bundle's own `derived.oklch`,
one test per trial, naming the trial in the title so a failure says which question stopped being
about what it claimed.

The part that matters: **the thresholds have a decoy.** "Every lightness trial clears
`SEPARATED_L`" is equally true of a `SEPARATED_L` of zero, and a suite that only ever asserts
clearance cannot tell a healthy corpus from a collapsed one
[[a-decoy-that-is-not-broken-proves-nothing]]. Two off-whites 0.018 apart are asserted to *fail*
the same bound, in the same file.

## What the check does not reach

Whether twelve forced choices measure anything about a person. They do not, in any validated
sense — that is why `CONFIDENCE_UNANIMOUS` is 0.75 and not 1, and why F-037's bias validation is
a separate feature rather than a paragraph here. This link is about the questions being the
questions they say they are, which is a prerequisite for that conversation rather than a
substitute for it.
