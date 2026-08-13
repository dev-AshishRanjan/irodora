---
name: cvd-audit
description: Verify that a colour decision — in the product or in our own interface — works for people with colour-vision deficiency.
---

# Skill: cvd-audit

[ADR-0009](../../../docs/adr/0009-cvd-is-an-engine-concern-not-a-ui-filter.md) ·
[`ACCESSIBILITY.md`](../../../docs/design/ACCESSIBILITY.md).

CVD is not a display mode here. It is a persona (PRD §3), a journey (J4), and a scored
factor in every recommendation.

## When

- Any change to `packages/cvd-engine` or to recommendation scoring.
- Any new semantic colour pair in the design system.
- Any new UI where colour distinguishes states.
- Any new palette entering the corpus.

## The two questions

**1. Can these be distinguished?** Separation score under protan, deutan and tritan.

**2. Does anything depend on distinguishing them?** If yes, and separation is low, there
must be a non-colour channel — text, icon, shape, pattern, position.

Question 2 is the one that gets skipped, and it is the one that matters. A low-separation
pair is fine if nothing depends on telling them apart.

## Auditing a product colour decision

```bash
pnpm test:cvd
```

Asserts that recommended outfits maintain minimum separation under each deficiency.

Manually, for a specific pair:

1. Simulate under protanopia, deuteranopia, tritanopia at severity 1.0.
2. Compute post-simulation ΔE00 **and** lightness difference.
3. Below threshold → is anything relying on the distinction?
4. If so → propose an alternative and report the **measured** improvement (FR-35).

**Lightness difference is part of separation.** Two colours a dichromat cannot separate by
hue may be perfectly separable by value — flagging that as a failure is its own accessibility
failure.

## Auditing our own interface

`cvdPairs` in
[`design-system.manifest.json`](../../../docs/design/design-system.manifest.json) declares
the semantic pairs that must remain distinguishable. The `cvd` gate asserts them.

Adding a semantic colour pair means adding it to `cvdPairs`.

**Success and error must be separable at severity 1.0, for every deficiency type.** Our own
interface is held to the standard the product applies to outfits — an interface that fails
its own accessibility engine is an argument against the product.

## Auditing a new UI

- [ ] Every meaning carried by colour is **also** carried by text, icon, shape or pattern.
- [ ] Every swatch has an accessible name and its numeric value. *A swatch without a name
      is an empty box.*
- [ ] Simulate the whole screen under each deficiency — can the task still be completed?
- [ ] Charts: direct labels and distinct markers, never colour-coded legends alone.
- [ ] Status: colour **plus** icon **plus** text.

## Beyond the automated check

Automated tools catch roughly half of real accessibility problems, and none of the ones
about whether someone can complete the task.

**Real CVD users test before every major release** (A10). Simulation tells you two colours
are close; it does not tell you the interface is usable.

## Never

- Treat CVD as a display filter.
- Paywall a CVD feature ([ADR-0027](../../../docs/adr/0027-monetisation-tiers.md)).
- Ship a colour-only status indicator.
- Assume "it looks fine to me" transfers.
