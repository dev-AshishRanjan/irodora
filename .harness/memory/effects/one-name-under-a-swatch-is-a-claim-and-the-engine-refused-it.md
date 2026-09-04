# One name under a swatch is a claim, and the engine refused it

**Effect:** [E-082](../../state/effects.json) · `apps/mobile/src/screens/Lens.tsx` →
`packages/color-naming` · **high**

## What happened

F-160 gave the Lens a live readout — FR-13's continuous pick, a swatch and a value updating
several times a second. FR-13 asks it to show *"name, hex and OKLCH live"*, so I wrote:

```ts
export const LENS_LIVE_NAME_LIMIT = 1;
```

with a reason I still think is correct: **three names reordering themselves fifteen times a
second is unreadable**, and a live strip wants one line, not a list.

`nameColor` threw:

> *limit must be an integer of at least 3; got 1. A single answer is an identification, and this
> product does not assert that a colour IS a corpus entry (FR-7, ADR-0031) — it offers the
> closest digital references and lets the reader judge. **The floor is not clamped because a
> caller asking for one answer has a misunderstanding worth surfacing.***

## The part worth keeping

**A correct premise reached a forbidden conclusion, and nothing about the code looked wrong.**
There is no lint for it. `1` is a perfectly good integer, the call type-checks, the strip renders,
and the screen would have shipped a swatch with the sentence *this is Ai* under it — the one
sentence this product exists not to say.

Claims discipline is usually discussed as **copy**: NFR-21's lint over the word "measured",
ADR-0031's banned language. This was not copy. **It was a `limit` argument**, three layers away
from anything a person reads, chosen for a layout reason by someone thinking about legibility
rather than about epistemics.

So the rule to carry: **a claim can enter through a parameter.** Cardinality is a claim. One
result is an identification; three are a comparison; the difference is not presentational.

## And the guard was in the right place

`packages/color-naming` knows nothing about screens, has no idea a live readout exists, and
caught this anyway — because the constraint is expressed where the constraint *lives*, at the
function that produces the answer, rather than at the surfaces that consume it. A UI-side rule
would have had to be written for each surface, and the one written last would have been the one
that shipped.

`assertLimit` deliberately **throws rather than clamping**, and the message says why. A clamp
would have quietly returned three names, the strip would have looked wrong, and I would have
gone looking in the layout for a bug that was in my reasoning.

## The layout problem was real, and had a better answer

Three names on three lines is what I was avoiding. Three names on **one** line — `藍 Ai · 紺 Kon
· 縹 Hanada` — is a set at a glance, which is what *"the closest references, judge for yourself"*
actually looks like. The refusal did not cost the design anything. It found the better version.

## A second one from the same feature, same family

`Viewfinder` now samples under a **demand** — `off`, `live` or `capture` — and the demand travels
with the sample from the frame thread rather than being read when the sample lands:

```ts
scheduleOnRN(deliver, outcome.sample, want);   // not: read the current mode in `deliver`
```

A frame is in flight for a few milliseconds. Reading the mode at delivery would occasionally
label a live frame as a deliberate capture — and under
[ADR-0091](../../../docs/adr/0091-a-deliberate-capture-is-fr-15s-precision-pick.md) those carry
different confidence ceilings. That is not a cosmetic mix-up; it is **a claim about a reading,
decided by a race**. Provenance has to be attached where the fact is created, never looked up
where it arrives.

## A third, smaller, and free

Two sentences of Japanese copy failed gate 11 on three codepoints — 届, 試, 止 — none of them in
the committed font subset. That is ADR-0057 working exactly as designed: **adding copy is
changing the font**, and the gate said so, named the characters, and named the fix. Worth
remembering only as a step: new `ja` copy means
`node scripts/generate-font-subset.mjs` before the gate is asked.

Related: [[a-second-technology-a-second-blind-spot]] ·
[[an-unreached-token-is-unfinished-work]]
