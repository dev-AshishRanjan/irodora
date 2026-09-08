# Plan: F-191 — Illustration: the empty states, and what a drawing may not do

| | |
|---|---|
| **Feature** | F-191 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9 |
| **Package** | `@irodora/ui` · `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

*"Use some animated art/illustions/vector arts in the app, to make it lively."*

Twelve empty states across six screens, every one a sentence and sometimes a button.

## Approach

**Three drawings, not twelve.** The twelve emptinesses are three: nothing collected, nothing
measured, nothing put together. Twelve bespoke pictures is twelve things to keep in a style and
twelve chances for one to drift.

**Drawn from the product's own vocabulary** — a sample outline, a reticle, a pair. Not a mascot,
not a magnifying glass. And they draw the **absence**: three outlines and a dashed fourth says
*there is room for another*; four solid outlines says *here are four things*, which is the
opposite.

**`art` is required on `EmptyState`**, for the reason `resolvedHere` is: this component's whole
design is that the careless version should be *unbuildable*. A drawing that could be omitted
would be omitted, twelve times, exactly as the button was before F-139.

**They do not loop.** The report asked for animated art; these are still, deliberately. An empty
state is read once and left, and a looping animation on a screen saying *"there is nothing
here"* draws the eye back to the absence. The motion is on arrival — `Screen` enters and they
enter with it (F-188).

## Files to touch

```
packages/ui/src/Illustration.tsx        — new. Three drawings, one grid, one registry.
packages/ui/src/EmptyState.tsx          — `art` required
packages/ui/src/index.ts                — export
packages/ui/test/conformance.test.tsx   — one subject per drawing
packages/ui/test/components.test.tsx    — the type refuses an undrawn empty state
apps/mobile/src/screens/*.tsx           — twelve call sites
.harness/skills/illustration/           — new skill; .claude mirrors it
```

## Test plan

- **One conformance subject per drawing.** Three separate SVGs; a subject rendering only one
  would leave two outside every contrast run.
- **`@ts-expect-error` on an `EmptyState` with no `art`**, beside the two that already hold the
  resolution union — an unused expect-error fails, so each is an assertion in both directions.
- **`cvd` is run**, unlike most of this wave: these are new marks on the screen and CVD
  separation is measured over the tokens they take.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · cvd · motion · build`.
Not run: `color-golden`, `content` — no colour maths, no corpus record.

## Risks

- **Nobody has looked at them.** Whether three outlines and a dashed fourth reads as *room for
  another* or as *a rendering bug* is exactly the judgement no gate here can make. Attested.
- **The stroke is 1.5 on a 48 grid**, chosen to sit between the icon set's weight and the
  sample keyline's. Nothing derives it, and nothing has seen it.
