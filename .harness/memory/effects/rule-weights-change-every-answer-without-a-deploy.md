---
kind: effect
id: E-009
title: Rule weights change every answer without a deployment — the capability and the risk are the same thing
severity: high
guard: none
feature: F-029
confidence: 0.95
created: 2026-08-13
scope: [content, packages/recommendation, apps/api]
links: [[corpus-version-pins-caches-and-envelopes]]
---

# Rule weights change every answer without a deploy

**This link currently has `guard: "none"`, and that is recorded rather than hidden.** The
guard arrives with F-029, which builds the rule content system and its publish-time
validation. Until then, the graph carries a check we owe.

## The capability

Weights and harmony rules live in `content/rules` as versioned, immutable content
([ADR-0011](../../../docs/adr/0011-recommendation-rules-are-versioned-content.md)). A
domain expert changes a weight, publishes, and every ranking changes — no engineer, no
deployment.

That is the point. It is also the sharpest edge in the system.

## The three risks

**Content is a trust boundary.** Whoever can write here changes what every user is told
without touching a line of code. Silent, product-wide, and invisible to conventional
monitoring — which is why a corpus checksum mismatch is a SEV1 with no grace period.

**A weight set that does not normalise fails silently.** If the weights do not sum to 1.0,
scores stop being comparable across contexts. Nothing errors. The rankings are just quietly
wrong in a way that looks like a tuning disagreement. The publish-time normalisation check
is the guard F-029 must build.

**A weight without a rationale cannot be evaluated.** The next person cannot tell whether
0.30 was reasoned or inherited, so they cannot safely change it. `rationale` is required for
that reason, not for documentation's sake.

## What must happen on a weight change

1. Publish a **new immutable `rule_version`**. Never edit a published one.
2. Validate that weights sum to 1.0.
3. Confirm every rule carries a rationale.
4. Recommendations record `envelope.rules` as its own indexed column, so "which
   recommendations used 2026.08.4?" stays a query rather than a scan.
5. Audit-log the publish with actor and diff.

## Why the answer is not "downgrade the severity"

It would be easy to call this `medium` and remove the obligation. That is precisely the
erosion the guard requirement exists to prevent — the honest move is to name the feature
that will build the guard and let the gate keep asking until it does.
