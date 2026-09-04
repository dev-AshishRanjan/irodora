# ADR-0088 — An unreached design token is unfinished work, not a declared exemption

## Status

**Accepted.**

## Date

2026-09-03

## Context

[ADR-0071](0071-a-token-with-no-reader-is-a-decision-nobody-applied.md) established the
principle: a token nothing reads is a decision nobody applied.
[ADR-0074](0074-the-spacing-scale-is-a-four-point-grid-and-the-step-that-was-not-goes.md)
applied it to the spacing scale and removed the step that belonged to no grid.

Both were right, and both left the same door open. `verify-token-reach.mjs` grew
[`unreached-tokens.json`](../../.harness/verification/unreached-tokens.json) so that a
legitimately-not-yet-painted value could be **declared with a reason** rather than deleted —
which was correct, because deleting `chart.3` for want of a chart would mean re-deciding a
near-achromatic data ramp under deadline, and that is how a rainbow palette gets shipped.

**The declaration then became the way to pass while unfinished.** The file now holds eleven
entries. Read as a list rather than one at a time, it is an itemised description of a product
that was never designed:

| declared unreached | the reason given |
|---|---|
| `display.1`, `display.2` — 72px and 34px | *"no screen leads with a display size; every one of them opens at `title`"* |
| spacing `xl2`..`xl5` — 28, 40, 56, 96 | *"RHYTHM FOR A LAYOUT TIER THAT DOES NOT EXIST, KEPT ON PURPOSE"* |
| every motion duration and easing | *"Nothing in the product animates. There is no `Animated`, no `withTiming` and no transition anywhere in the reader zone"* |
| `backdrop` | *"there is no dialog, bottom sheet or modal anywhere in the app yet — every screen in `apps/mobile/src/screens` is a full route"* |
| `chart.1`..`chart.5` | *"There is no chart in the product"* |
| radius `xs`, `lg`, `xl` | *"only these three steps have found no surface"* |

Every one of those sentences is true, well-argued, and was accepted by a green gate.

**The measurement that makes this decisive.** The manifest specifies a type scale running
72px to 10px, and the product renders 22px to 10px — `display.1` and `display.2` are used
zero times across every screen. The spacing scale's top four steps are used zero times; the
largest step any screen uses is `xl` (20), twice — while **36 of the design system’s 80
names are declared unreached**, which is 45 % of it. `verify-spacing-scale.mjs:263` reports
unused steps in yellow and passes.

A second, weaker finding sits underneath: 147 padding, gap and margin values in the screens
are written as numeric **literals** rather than through `nativeSpacing`. The gate confirms
every one of them lands on the scale, so the values are not wrong — but they agree with the
scale by inspection rather than by reference, and nothing stops the next one drifting. That is
the same shape ADR-0074 named, one scale over.

So the gate was not wrong about any individual token. It was answering *"is this declared?"*
when the question that mattered was *"is this built?"* — and a check that cannot tell the
difference between a decision deferred and a decision abandoned is
[[a-gate-that-errors-is-failing-open]] one level up: it fails open on **scope**.

## Decision

**An exemption must name the feature that will close it, and expires with that feature.**

Concretely, in `unreached-tokens.json`:

1. Every entry carries a `closedBy` field naming a feature id that exists in
   `feature_list.json` and is **not `done`**. An exemption pointing at a completed feature is
   a gate failure — the same rule the retired-surface and taxonomy registers already carry
   (E-021, E-028), because a dead exemption is how a live gap hides.
2. `verify-token-reach.mjs` and `verify-spacing-scale.mjs` **fail** on an unreached step in
   the editorial tier rather than reporting it. Yellow was the wrong colour for "the design
   system specifies a product we did not build".
3. `why` stays required and keeps doing its real job: explaining why the token is *kept*
   rather than deleted. `closedBy` answers the different question of *when it stops being
   exempt*.

NFR-25 records this in the PRD, so it is a requirement with coverage rather than a convention
in a script.

## Consequences

**A scale can no longer be aspirational without an owner.** The four editorial spacing steps
and the two display steps become F-140's acceptance criteria instead of six standing
declarations. This is the whole point and it is also the whole cost: R6 cannot be declared
done with them unreached.

**Some exemptions are legitimately long-lived, and this makes them louder.** The web-target
bindings exist because four targets from one manifest is what stops web and mobile drifting
(ADR-0051), and no feature will ever "close" them — they are exempt by architecture, not by
schedule. Those take `closedBy: null` **plus** an ADR reference, which is deliberately more
friction than a sentence: a permanent exemption should be a decision somebody recorded, not a
line somebody wrote.

**The honest limit.** This catches a token the manifest defines and nothing paints. It cannot
catch a token that is painted *badly* — `display.1` used once on a screen that is otherwise
unchanged would satisfy every check here while changing nothing a person would notice. Reach
is a floor, not a design review. The pre-flight in
[`visual-taste`](../../.harness/skills/visual-taste/SKILL.md) is still the thing that has to
be run by somebody, and this ADR does not pretend to replace it.

## Alternatives considered

**Delete every unreached token.** ADR-0071's instinct, and wrong here for the reason the
`chart.*` entry gives: the near-achromatic ramp exists so a data series stays distinguishable
without hue (golden rule 13), and re-deriving that when the first chart is due means deciding
it under deadline. Deletion optimises for a clean ledger over a correct one.

**Leave the warning and rely on review.** This is what was in place. Five separate
prose-reading checks have already failed in this repository, and a yellow line in a passing
gate is the weakest form of prose there is.

**Require every token to be reached before it may be added to the manifest.** Inverts the
problem: the manifest would then only ever describe what already exists, which removes its
value as a design artefact. A design system that cannot get ahead of the implementation is
just a changelog.
