# An exemption can name the feature that widens it

**Effect:** [E-071](../../state/effects.json) · `apps/mobile/src/screens/Lens.tsx` →
`unreached-tokens.json` · **medium**

## What happened

The Lens showed its capture instruction as `Status kind="warn"`. It was the **only** `Status`
anywhere in the product.

F-149's criterion 2 asks for illumination, quality and confidence to read as *one calm readout
rather than three warnings*. An amber banner was the loudest thing on a screen whose only bright
element is meant to be the reticle, so the instruction moved **inside** the readout — under "To
improve it", beside the quality word that produced it. That is nearer to what FR-18 asks for than
a banner detached from its cause.

Removing one component from one screen left an entire design subsystem with no reader.

## The part that is genuinely surprising

The exemption it landed in read **"two of three"** and named **F-149 itself** as the feature that
would close it — written when F-097 added that one reader.

So the entry predicted this feature would finish the job, and this feature undid it.

That is only visible because the gate refuses a `closedBy` pointing at a feature that is done. And
the first replacement owner was wrong too, caught by the same check: the entry claimed outfit
scoring (F-031) would be the first surface to show a status, and **F-031 is done without having
shown one** — the exact shape [ADR-0088](../../../docs/adr/0088-an-unreached-design-token-is-unfinished-work-not-a-declared-exemption.md)
describes, an exemption pointing at work that shipped without doing what the entry claimed.

## The distinction that was missing, now written down

> A **status** says something is GOOD or BAD.
> A **readout** says what the conditions WERE.

The Lens describes; it does not judge. That is why it stopped reaching for a status at all, and
why the surfaces that *do* judge are the ones that will reach these tokens. The owner is now F-152
— specifically its criterion 2, *"every screen has a designed empty, loading and error state"*.
An error state **is** a `bad` status; that is what ADR-0044 built the three channels for.

## What to carry forward

**A `closedBy` is a prediction, and predictions about design decisions go stale in both
directions.** The usual failure is a feature that ships without closing its entry. This is the
other one: a feature that ships and makes the entry *bigger*, for a good reason.

Neither is caught by writing the entry more carefully. Both are caught by a gate that refuses a
closer which is already done — so the value of that rule is not tidiness, it is that **it forces
a re-derivation at exactly the moment the original reasoning stopped applying.**

Related: [[an-unreached-token-is-unfinished-work]],
[[a-line-over-a-camera-image-has-the-swatch-keyline-problem]]
