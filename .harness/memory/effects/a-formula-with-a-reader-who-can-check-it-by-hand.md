---
kind: effect
id: E-048
title: A formula nobody saw became a formula somebody reads beside its own inputs
severity: medium
created: 2026-09-01
scope: [packages/recommendation, apps/mobile]
links: [[nine-symbols-became-public-api-by-crossing-a-package-boundary]], [[a-token-with-no-reader-is-a-decision-nobody-applied]]
---

# E-048 — a formula with a reader who can check it by hand

`preferenceWeight` had **one caller**, inside the engine, where the number fed a ranking and
nobody ever saw it. F-109 added a second with a different need: the screen renders the number
**and the inputs it came from**, because FR-37 says a person can *see* their preference weights.

## What changes about changing the formula

| before | after |
|---|---|
| altering the curve changed a ranking | it changes a number somebody is looking at |
| observable only as different recommendations | observable beside the counts it is derived from |
| defensible as tuning | it has to stay explicable |

F-046 chose *"linear to saturation, then flat"* over a sigmoid **for exactly this reason**, and
said so in its own header: *"each of the first eight nets moves it one eighth of the way"* is a
sentence a person can check by hand.

**That property was worth nothing until there was a screen.** Now there is one, and the property
is load-bearing rather than aspirational — the same shape as
[[a-token-with-no-reader-is-a-decision-nobody-applied]], where a scale nobody read was a scale
nobody could be wrong about.

## The screen never recomputes

It imports `preferenceWeight` rather than reimplementing the curve, and the test recomputes the
expected value **with the same function** instead of asserting literals. A private copy in the
app therefore fails rather than agreeing today and drifting later — E-008's shape, applied to a
formula rather than to colour maths.

Watched: replacing the call with `accepted / (accepted + rejected)` — the shape somebody would
reach for — failed *"shows the weight the ENGINE computes, not one the screen invented"* and
nothing else.

## The gap the guard does not cover

The screen also renders `PREFERENCE_SATURATION` and **a sentence explaining what it means**, in
English and Japanese.

- Change the **constant** and the number on screen follows automatically.
- Change the **shape of the curve** and the sentence becomes false while every test stays green.

Nothing ties prose to the behaviour it describes. That is the same class of problem as the
claims lint, and it is not solved here — stated so the guard is not read as wider than it is.

## Guard

`gate:test` (the screen suite recomputes with the engine's own function) and `gate:typecheck`
(the signature). Neither reaches the prose.
