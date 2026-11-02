# ADR-0162: A catalogue shows a palette and a pair is judged — 10's band and 16's slots are drawn at their drawn size

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-02 |
| **Feature** | F-251 |
| **Answers** | OQ-45 for `10` (and the same question for `16`'s slot samples). Its seam half, and `04` and `23`, stay with F-245 and F-260, which apply this rule or revisit it |
| **Supersedes in part** | F-151 c1 for `10` and `16`; screens.test's "draws the strip at the judgeable height" |
| **Applies** | Golden rules 11 and 14; ADR-0095 (its own scope line: "a list ranks, a pair judges"); ADR-0154; R9 §1, §10 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): "For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade." |

## Context
`10` draws a palette as one band 60 dp tall; `Strip` raises it to ADR-0095's 77 dp. `16` draws slot samples 35 dp
tall. ADR-0095 classified the old Studio as a judging surface.

## Research, and what it shows
- ADR-0095's floor applies to the **smaller** dimension. The corpus's five systems hold 7–8 members, so on `10`'s band
  the binding dimension is a segment's width: about 34 dp (0.9°) at the record's weights. A 77 dp band does not reach
  2° on `10`, so keeping the floor buys 17 dp of height without the guarantee. [census figures per palette]
- The CIE gives the 2° observer's domain as 1°–4° (secondary sources). 60 dp is 1.56° at 350 mm, inside it.
- Small-field tritanopia is a central-foveal effect, with zones up to about 1° in some observers (Williams et al.
  1981; Davies & Morland).
- CIEDE2000 was fit on hairline pairs over more than 4° (ADR-0154). Neither 60 nor 77 dp is that condition.

## Decision
- **D1. The rule.** The floor binds a sample presented for a person to judge a colour difference by eye beside the
  figure that measures it (`08`, `Pair`, and `04` by this rule). It does not bind a sample that shows a palette for
  choosing or building, whose figures are computed from the values and name their quantity and model.
- **D2.** `10`'s band is drawn at `BAND_HEIGHT` (60) through `Strip judged={false}`. `16`'s slot samples are drawn at
  35. `Strip`'s default keeps the floor, and an opt-out is listed by ADR (E-235).
- **D3. No threshold moves.** `size.judgeable` stays 77, derived. Compare's ≥-floor assertion stands.
- **D4.** Whether ADR-0095's 2° is stricter than the standard requires is recorded, not acted on. `observerDegrees` is
  a person's.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Keep the floor on `10` (⇄, the person may flip) | 17 dp per card that nothing forces; still under 2° in width |
| Keep it wherever any figure is beside the band | `10`'s badges are palette summaries computed from values, not a difference judged by eye; the floor would still miss its purpose in width |
| Equal-width segments | Loses the weight reading (F-151's "order is proportion"); raises the narrowest segment only to 1.0° at 384 |
| Raise `16`'s slots to 77 | About 42 dp per slot row, a departure nothing forces |

## Evidence, and its limits
Secondary sources for the CIE domain; studies of printed and lab stimuli, not phones. The 350 mm viewing distance is
ADR-0095's assumption.

## Revisit when
A mockup draws a judging pair on these screens; the person flips it; or `observerDegrees` is reconsidered.
