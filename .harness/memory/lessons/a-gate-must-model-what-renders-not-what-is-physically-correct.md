---
kind: lesson
title: A gate must model what renders, not what is physically correct
created: 2026-08-15
feature: F-003
severity: high
scope: [packages/design-tokens, apps/mobile, .harness/verification]
links: [[averaging-non-linear-srgb-reads-too-dark]], [[a-gate-that-errors-is-failing-open]]
---

# A gate must model what renders, not what is physically correct

The contrast gate composited translucent tokens in **linear light**, with a comment citing
the engine rule that averaging happens in linear light, and a claim that this was the
stricter reading for a light overlay on a dark ground.

Both halves were wrong.

**The measurement.** For `dark.border.strong` over `background`, linear gives 3.66:1 and
encoded gives **1.41:1** — linear is 2.2× *more permissive*, in the direction that hides a
failure. In the light theme the ordering flips: `light.border.strong` over `surface.3` is
1.17:1 linear against 1.41:1 encoded. **Neither model is uniformly stricter**, so picking one
is not a conservative choice in either direction.

**The concept.** The "average in linear light" rule
[[averaging-non-linear-srgb-reads-too-dark]] is about *combining measurements* — you are
modelling a mixture of light, and encoded arithmetic gets the physics wrong. Alpha
compositing in a gate is a different thing: it is a **prediction of what the platform will
draw**, and CSS and React Native both composite in the encoded space. The physically correct
answer is not the one on the user's screen.

A gate that certifies the physically-correct value while the user sees a different one is
certifying a colour that never renders. That is not a stricter check; it is a check of
something else.

## The rule

**Ask what the gate is a proxy for.** If it stands in for a physical quantity, model the
physics. If it stands in for what a user will perceive on a real platform, model the
platform — including where the platform is wrong.

When the two disagree and neither dominates, compute both and take the worse. It is one
extra function, it removes the need to be right about which model is conservative, and the
result is defensible under either reading.

## The same shape elsewhere

- **Which CVD model.** The design system asserted "separable at severity 1.0" through
  Machado's extrapolation to its endpoint, while the architecture assigns *total dichromacy*
  to Brettel–Viénot. Under Viénot one pair scored 59.6 against a declared minimum of 60 —
  the claim was true of the model that was run and false of the model that was meant. Same
  remedy: run both, take the worse.
- **Three luminance definitions** already coexist deliberately here
  [[reproducing-a-standard-is-not-the-same-as-being-accurate]]. That precedent is the same
  question answered once already: the standard's definition, not the accurate one, because
  the deliverable is conformance.
