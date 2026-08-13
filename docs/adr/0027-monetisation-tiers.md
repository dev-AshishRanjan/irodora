# ADR-0027 — Four tiers, and accessibility is never behind any of them

## Status

Accepted

## Date

2026-08-13

## Context

The brainstorm had no monetisation model at all, which means it had no answer to two
questions that shape the product: what is free, and what is worth paying for.

The answer has to respect a constraint that is unusual here. Irodora is explicitly built
for people with colour-vision deficiency. Charging a disabled user for the feature that
addresses their disability would contradict the product's stated purpose in a way no
revenue justifies.

There is a second constraint from the architecture. Colour detection runs on-device and
costs us nothing per use ([ADR-0026](0026-privacy-on-device-by-default.md)). Metering it
would be charging for something with no marginal cost — which is both unjustifiable and
strategically backwards, because the free engine is what proves the product publicly.

What *does* cost us money: storage, sync, compute-heavy optimisation, report generation,
support, and the corpus's editorial work.

## Decision

**Four tiers. The pricing line follows our actual costs, not our leverage.**

| Tier | Who | Contains |
|---|---|---|
| **Free** | Everyday dresser, CVD user, enthusiast | The full colour engine · Atlas · Compare · Harmony · Palette Studio · Colour Lens · **all CVD features** · local wardrobe to a soft cap |
| **Pro** | Deliberate dresser | Unlimited wardrobe · cross-device sync · coverage and gap analysis · capsule optimiser · shopping check · exports |
| **Studio** | Stylists, designers, retailers | Team workspaces · shared palette libraries · calibration workflow · PDF reports · priority support |
| **API** | Developers, platforms | Colour, palette and recommendation APIs, metered |

1. **Accessibility is permanently free.** CVD simulation, separation scoring, CVD outfit
   mode, colour naming and every non-colour indicator. This is not a launch promotion; it
   is a product commitment recorded in an ADR so that changing it requires superseding this
   document.
2. **The engine is free.** It costs us nothing per use and it is the public proof of the
   product.
3. **Pro charges for what costs us money** — storage, sync, and compute-heavy optimisation.
4. **Entitlements are enforced server-side** (FR-60). A client cannot unlock a tier, and a
   test asserts it.
5. **The free tier is genuinely useful, not a trial.** Journeys J1, J2 and J4 complete end
   to end with no account. A free tier that cannot complete a journey is a demo.
6. **No advertising. No data sale. Ever.** Both would compromise recommendation neutrality,
   which is the thing users are trusting.
7. **Provider choice is OQ-2**, open until R4 — multi-currency and India support are the
   deciding constraints.

## Consequences

**Good.** The free tier is a real product, so word of mouth has something to carry. The
accessibility commitment is credible because it is structural rather than promotional.
Pricing follows cost, which makes it defensible to users and stable over time. Studio and
API create B2B revenue without compromising the consumer product.

**Bad.** Free-tier costs are real — CDN, catalog serving, and the editorial investment in
the corpus that free users benefit from most. Conversion pressure is lower when the free
tier is genuinely good, which is a deliberate trade and not a free one. Four tiers is more
entitlement surface to build and test than two.

**Neutral.** The soft wardrobe cap on Free is a storage limit, not a feature limit — the
capability is identical.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Freemium with CVD features in Pro** | The obvious revenue move — the feature is differentiated and the audience is motivated. Charging disabled users for accessibility contradicts the product's purpose. Rejected on principle, and the principle is written here so it cannot erode quietly |
| **One-time purchase** | Simple, no subscription fatigue, users like it. Does not fund ongoing corpus curation, sync infrastructure or support, all of which are recurring costs |
| **Ad-supported free tier** | Would fund a genuinely free product. An advertiser with an interest in what colours we recommend destroys recommendation neutrality, which is the product's core asset |
| **Everything free, B2B only** | Cleanest consumer story. Consumer storage and sync costs would be unfunded, and B2B revenue at this stage is speculative |
| **Metered colour scans** | Aligns revenue with usage. Scans cost us nothing (they run on-device), so it would be charging for air — and it would suppress the exact behaviour that makes the product valuable |

## Revisit when

- Free-tier infrastructure cost exceeds what Pro and Studio fund — at which point the soft
  caps move, never the accessibility commitment.
- OQ-2 closes with a billing provider decision (before R4).
