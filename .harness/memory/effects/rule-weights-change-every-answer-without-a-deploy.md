---
kind: effect
id: E-009
title: Rule weights change every answer without a code change — the capability and the risk are the same thing
severity: high
guard: gate:content
feature: F-029
confidence: 0.95
created: 2026-08-13
updated: 2026-08-26
scope: [content, packages/recommendation]
links: [[corpus-version-pins-caches-and-envelopes]], [[the-source-register-is-a-markdown-table-that-125-records-depend-on]], [[generating-an-artefact-is-not-checking-it]]
---

# Rule weights change every answer without a code change

**Closed by F-029 on 2026-08-26.** This link carried `guard: "none"` from 2026-08-13 — the
longest-standing owed check in the graph — and the gate kept asking until it was built.

## The capability

Weights live in `content/rules` as versioned, immutable content
([ADR-0011](../../../docs/adr/0011-recommendation-rules-are-versioned-content.md)). A domain
expert changes a weight, publishes, and every ranking changes — **no engineer, no code change**.

That is the point. It is also the sharpest edge in the system.

> **On the wording.** ADR-0011 and the original of this note both said *"no deployment"*. They
> were written before [ADR-0051](../../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
> removed the server tier and the admin application. In a local-first app new content ships in a
> new build, so "no deployment" is not a claim this product can make. **FR-67's own wording is
> the one that survives**: *without a code change*. The distinction matters because the first is
> false and the second is exactly what the guard checks.

## The three risks, and where each is now caught

**A weight set that does not normalise fails silently.** If the weights do not sum to 1, scores
stop being comparable across contexts. Nothing errors. The rankings are quietly wrong in a way
that looks like a tuning disagreement.

*Caught by gate 11*, which loads the **built** `@irodora/recommendation` and calls
`parseWeightContent` — which wraps the engine's own `parseRuleSet`. The rule is decided by the
code that scores with it rather than by a copy in a script that would agree on the day it was
written [[the-entry-schema-is-a-contract-with-every-authored-file]].

**A weight without a rationale cannot be evaluated.** The next person cannot tell whether 0.30
was reasoned or inherited, so they cannot safely change it.

*Caught by gate 11*: required, non-empty, and with a floor under the length so a blank field
cannot wear the name of a reason.

**Content is a trust boundary.** Whoever can write here changes what every user is told without
touching a line of code.

*Partly caught.* The ledger digest makes an edit to a published file fail — proven by changing a
**single word in a rationale**, which still parses perfectly and still goes red. What passes is
an edit made **together with** a matching ledger update: a two-file diff, caught by review and by
nothing else. ADR-0051 removed the publish path that would have been the other control, and the
gate prints that limitation on every run rather than leaving it to be discovered.

## What made the guard real rather than configured

**It was watched failing on the real file, in both halves**, and restored byte-exactly
afterwards — proven by the digest passing again, which is a stronger check than a diff.

**Five fixtures run on every pass**: four spoilings required to fail — a weight that does not
normalise, a missing rationale, a missing occasion, a factor named twice — and **the unspoiled
original required to pass in the same block**. Without that last one every spoiling is equally
satisfied by a parser that rejects everything [[a-decoy-that-is-not-broken-proves-nothing]].

**The counts are printed.** Twenty rationales across five occasions. A green gate over a weight
file that failed to load and a green gate over twenty checked rationales read identically
otherwise.

## Why the answer was never "downgrade the severity"

It would have been easy to call this `medium` and remove the obligation. That is precisely the
erosion the guard requirement exists to prevent — the honest move was to name the feature that
would build the guard and let the gate keep asking for thirteen days until it did.
