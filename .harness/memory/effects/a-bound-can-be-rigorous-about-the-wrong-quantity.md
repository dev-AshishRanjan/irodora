# A bound can be rigorous about the wrong quantity, and then no value inside it is any good

**Effect:** [E-087](../../state/effects.json) · `docs/design/design-system.manifest.json` →
`packages/design-tokens/src/manifest.ts`, `packages/ui/src/Swatch.tsx` · **medium**

## What happened

Reported twice: *"the main color container of color is still rectangular."*

[ADR-0090](../../../docs/adr/0090-a-swatch-corner-is-bounded-by-the-area-it-removes-not-fixed-at-zero.md)
had already done the hard part — it reversed `radius.swatch: 0` and made the corner a **ratio**,
which is right and survives. It then bounded that ratio by `_maxSampledAreaLoss: 0.02`, enforced
at parse time so nobody could quietly raise it.

A rounded square loses `(4 − π)r²`, so the lost fraction is `0.8584 · ratio²`. That ceiling caps
the ratio at about **0.153** — which leaves a 44 px swatch with a 5.5 px corner.

**There was no value inside the bound that would have looked any different.** So the question was
never which number to pick.

## The part worth keeping

**Area was the wrong measure.**

The area effect on colour appearance is real — larger samples read lighter and more colourful —
and it needs an **order-of-magnitude** change to matter. The difference between a swatch losing
1.3 % of itself and losing 5.4 % is not perceptible to anyone, in any condition. The bound was
rigorous, enforced at parse time, impossible to fudge, and about a quantity that does not carry
the risk.

That is a specific and recurring failure: **a constraint can be perfectly well engineered and
still be measuring something adjacent to what it is protecting.** It looks exactly like a good
constraint from the inside — it has a formula, a citation, a refusal, a decoy — and the only
symptom is that everything it permits is wrong.

**What actually degrades a sample** is the corner growing until the shape stops being a *field*.
At `ratio = 0.5` a square is a circle, and a circle is a worse container for judging a colour:
proportionally more of it is edge, and edge is where simultaneous contrast acts — the physics
`swatch.well` exists for.

So the bound is the straight run left on each edge:

```
side − 2r ≥ side · f      →      ratio ≤ (1 − f) / 2      →      f = 0.5 gives ratio 0.25
```

**And 0.25 is a consequence rather than a target.** That is the whole difference between this and
raising the old ceiling until 0.25 fit through it — which was available, would have taken one
line, and would have left a bound that still measured the wrong thing.

## Two smaller things this turned up

**A pure ratio is right in the middle of the range and wrong at the top.** At 0.25 the hero takes
an 85 px corner, which is a curve, at exactly the size where the flat field matters most. Capped
at `radius.xl` — the largest corner the system draws — so the cap is not a new number but the top
of the existing scale.

**The measurement came before the change**, because the feature note demanded it, and it moved
the target: every `Surface` already read as rounded, and the hero already had a 42 px corner.
**Only the 32–56 px samples were rectangles** — which are what fill the Atlas, the wardrobe grid
and every readout. Had I gone straight to "make things rounder" I would have changed the cards
and left the actual complaint in place.

## And the gate caught the consequence going the other way

`radius.xl` was declared unreached in `unreached-tokens.json`. The cap gave it its first reader,
and gate 8's **dead-exemption** direction refused the now-stale declaration:

> `radius step xl is declared unreached, and is read by packages/ui/src/Swatch.tsx`
> Remove the declaration. A dead exemption is how a live one gets waved through later.

A feature about roundness closed half of a token exemption, and the check that noticed was the
one looking for exemptions that had outlived their reason.

Related: [[an-unreached-token-is-unfinished-work]] ·
[[a-derived-check-catches-the-change-a-written-down-one-waves-through]]
