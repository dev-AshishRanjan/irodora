# ADR-0082 — The investment signal is two numbers from your own wardrobe, and no verdict

## Status

**Accepted**

## Date

2026-09-02

## Context

**FR-52** lists four things the shopping check does: *outfits unlocked, personal compatibility,
duplicate warning, investment signal.* F-052 built the first three. **The fourth is used once in
the PRD and defined nowhere else in the repository** — the only other occurrence is an archived
brainstorm about "recommended size of wardrobe investment", which is a different idea. So
building it means deciding what it means, and F-123 was filed rather than absorbed for that
reason.

**The obvious implementation is the trap, and it is one line of code.** Cost per wear exists as
of F-051, so the tempting signal is a projection:

> *"At 30 wears this would be £1.52 each."*

**The 30 is invented.** Nobody chose it, nothing measured it, and it is the number the whole
sentence rests on. FR-46's own words are *"absent data yields unknown, never an invented
estimate"*, and a projection whose denominator came from nowhere is that estimate wearing a
conditional. [ADR-0031](0031-measurement-claims-policy.md) governs the same instinct on the
capture side.

There is a second constraint that is not a colour-science one. **A signal that told somebody
whether to spend their money would be advice about their finances**, delivered by an app that
knows their wardrobe and nothing else about their circumstances. "Good investment" is not a
sentence this product is in a position to write.

And a third, from [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md):
there is no server, so there is no market data, no resale index and no population of other
people's wardrobes. **The only evidence available is the person's own recorded garments** —
which is a constraint and also the answer.

## Decision

The investment signal is **two integers computed from the person's own wardrobe**, presented
together, with **no verdict attached**.

For a candidate of type *T* with a price in currency *C*, consider the garments the person owns
whose type matches *T* (trimmed, case-folded — the same normalisation `findDuplicates` uses),
whose price is in *C*, and for which `costPerWear` returns a known rate. Call these the
**comparables**. Then:

| | |
|---|---|
| **`breakEvenWears`** | the candidate's price ÷ the **median** cost-per-wear of the comparables |
| **`typicalWears`** | the **median** wear count of those same comparables |

Rendered as: *"56 wears to cost what your coats cost you. Your coats average 35."*

**Four refusals**, as a discriminated union in the shape `costPerWear` established:

| reason | when |
|---|---|
| `noPrice` | the candidate has no price, or no currency for it |
| `noComparable` | nothing of that type, in that currency, has a known cost per wear |
| `tooFew` | fewer than `MINIMUM_COMPARABLES` (**3**) — and the refusal **carries the count**, so the screen can say *"you have 1"* rather than *"no"* |

`neverWorn` is deliberately **not** a reason here: `costPerWear` already refuses a garment with
no wears, so an unworn garment simply is not a comparable, and the zero-division trap is handled
by code that is already tested for it.

**No rounding in the value.** `breakEvenWears` is returned exact; the screen rounds, and it
rounds **up**, because 65.4 wears is not reached at 65.

## Consequences

**Good** — every number shown came from something the person recorded, and the sentence says
whose numbers they are. The signal cannot be wrong about the future because **it does not
describe the future**: it restates the person's own established cost per wear against a price,
and leaves the judgement where it belongs. It needs no market data, which is fortunate, because
there is none. And it reuses `costPerWear` per garment, so the four absences F-051 enumerated
are handled by tested code rather than re-derived.

**Bad** — **it will refuse often, and it will refuse most for new users.** Three garments of one
type, each with a recorded price and at least one wear, is a real bar: a wardrobe of twenty
garments entered without prices produces `noComparable` every time. That is the honest failure
and it is still a failure — the feature is least available exactly when somebody is building
their wardrobe and shopping most. The `tooFew` count is the mitigation, not a fix: it turns a
dead end into an instruction, and an instruction is still not an answer.

A median over three values is also **a weak statistic**, and calling it "your coats" dignifies
it. It is defensible only because the alternative is an invented constant, and because the
number is presented beside its own basis rather than alone.

**Neutral** — this is arithmetic over the wardrobe, not colour science, so it stays in
`apps/mobile` rather than becoming an engine change (E-008). It is a fourth field on
`ShoppingCheck` and changes nothing about the three answers F-052 built.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Projected cost per wear at an assumed wear count** — *"at 30 wears, £1.52 each"* | The most legible output of the four, and the one people already understand from magazines. It is also the one FR-46 forbids: the denominator is invented, and the number moves with it. At 15 wears the same coat is £3.04 and the sentence reads just as confidently. |
| **Projected cost per wear at the person's own median wears** — *"£4.80 each, if you wear it like your other coats"* | Grounded, and it was the first design here. But it is still a **forecast**: it predicts a wear count for a garment nobody has worn yet, and dresses the prediction as a price. The chosen form contains exactly the same two facts and asserts nothing about what will happen — which is the same move the naming surface makes when it offers candidates instead of an identification. |
| **A price comparison** — *"your coats cost £60 to £140"* | Honest, needs no wear data at all, and would refuse far less often. It answers *"is this expensive for me"* rather than *"is this an investment"*, and the requirement asks the second question. Worth revisiting as a fallback when the comparables are too few — see below. |
| **A rank** — *"this would be your most expensive coat"* | Robust, cheap, and works with two garments. Almost no information: it is true of any sufficiently expensive thing and says nothing about use. |
| **A verdict** — *"good investment" / "think again"* | The one thing that would actually feel like a signal. It is advice about somebody's money, from a system that knows their wardrobe and nothing about their income, their circumstances or why they want it. It is also unfalsifiable. Refused on the same grounds as `ADR-0031`'s language rules, one domain along. |
| **A `shopping_check` table recording the signal** | Would let the signal improve over time against what somebody actually bought. The garment has not been bought — it has no id and no row — and F-052 already refused to persist a decision nobody has taken. |

## Revisit when

**When the `tooFew` refusal is what most wardrobes see.** The `have` count is carried on the
refusal precisely so this is measurable rather than a matter of opinion: if real wardrobes
routinely reach one or two comparables and stop, the price comparison above becomes the right
fallback for that band, and this ADR gets a successor rather than a widened threshold.

**When wear counts are recorded automatically rather than tapped.** The median wear count is
only as good as somebody's diligence with a button, and if wears ever arrive from something
other than a deliberate tap, both numbers here get much stronger and `MINIMUM_COMPARABLES` is
worth revisiting on the evidence.
