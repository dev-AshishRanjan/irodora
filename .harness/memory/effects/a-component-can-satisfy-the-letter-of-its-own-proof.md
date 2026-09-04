# A component can satisfy the letter of its own proof

**Effect:** [E-079](../../state/effects.json) · `packages/ui/src/Swatch.tsx` →
`swatch-edge.test.ts` · **medium**

## What happened

`swatch-edge.test.ts` scans the sRGB gamut with `worstCase([tone, inverse])` — it takes **the
better of the two** keyline tones against each sample and asserts the worst such best clears the
non-text floor.

So the guarantee has always been: *for any sample, at least one of these two contrasts.*

**The component drew them in a fixed order.** `swatch.hairline` always touched the sample;
`swatch.hairline.inverse` always sat outside it. Every assertion passed — one of the two *was*
adjacent, and against roughly half of all samples it happened to be the good one.

On the dark theme `swatch.hairline` is `#F6F5F3`. So **every pale sample was ringed in white**,
and it was reported as *"a white border/outline … around colors. This looks unprofessional."*

## The fix needed no new measurement

Put the better tone against the sample every time — which is what the proof had been assuming all
along. Strictly stronger than what was proved, using the same evidence.

The other tone stays one pixel further out, doing the job it always did: guaranteeing an edge
against the **well**, which is a known colour and therefore the easy half. F-068 is untouched.

## The general shape

**A proof can be about a property the implementation never claimed to have.**

- *"One of these two works"* — true of the component.
- *"The one that works is the one you see"* — true only of the test.

The gap between those two sentences was invisible for five months, because every assertion was
green and the component was doing something defensible. Nothing was broken; something was merely
weaker than the evidence allowed.

**When a test computes a best case, ask whether the implementation reaches it.** `worstCase` over
`[a, b]` is a strong claim about a *pair*. It says nothing about which member of the pair the user
actually sees, and that distinction is invisible in the assertion.

## A smaller thing worth keeping

One test asserts **both tones are still drawn**. Choosing which one is adjacent must not quietly
become choosing to draw one — the second tone is the entire reason a single hairline was rejected,
and an optimisation that dropped it would pass every contrast assertion against the sample while
losing the edge against the well.

Related: [[a-rule-can-be-right-about-the-thing-and-wrong-about-the-value]]
