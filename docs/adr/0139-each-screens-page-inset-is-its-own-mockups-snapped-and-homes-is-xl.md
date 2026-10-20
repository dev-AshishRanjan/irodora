# ADR-0139 — Each screen's page inset is its own mockup's, snapped; Home's is `xl`

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-20 |
| **Feature** | F-242 |
| **Closes** | OQ-14 |
| **Builds on** | [ADR-0103](0103-the-scales-are-the-mockups-and-a-shadow-exists-only-where-one-is-drawn.md) (the spacing scale); [ADR-0117](0117-the-tab-bar-is-01s-drawn-by-our-own-component-and-its-words-return.md) (the tab bar's measured side inset); [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) D2 (intervals and the snap) |
| **Applies** | R9-MOCKUP-FIDELITY §2 (the snap; siblings; the tie takes the smaller), §3 P1; golden rule 14 |
| **Decided on** | The delegation of 2026-09-24 (*"a measured size, an inset"*) as widened on 2026-10-05: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

- `01` insets its content 36.5–37 dp: the lockup, the tagline and the three cards start at x
  36.5–37, and the cards' right edges are 37 dp from the frame.
- Most other screens measure 18–20 dp.
- The spacing scale is 4, 8, 16, 24, 32 and 48. `Screen`'s default is `lg` (24).
- OQ-14 asked whether `01`'s inset is deliberate. Its R9 row names F-227, which is done without
  having answered it, so F-242, the first screen to need it, closes it.

## Decision

- **P1.** A screen's primary mockup governs its layout, including its page inset.
- **The snap.** The measured inset snaps to the scale like every interval (§2):
  - `01`'s 36.5 → **`xl` (32)**: 4.5 away, against 11.5 to 48;
  - 18 → `md`;
  - 20 → `md`: equidistant from 16 and 24, so the smaller.
- **Home** sets `Screen padding="xl"`. Its lockup's ink sits on that inset (F-230).
- **Every other screen** takes its own inset when its surface feature rebuilds it. `Screen`'s
  default is not changed here, because changing it would move every unrebuilt screen at once
  without its mockup being read.
- **The tab bar keeps its 37.3 dp.** That is component geometry pitched by glyph centres
  (ADR-0117), not a page interval.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **One inset everywhere** (16 or 24) | It contradicts `01`, the most-seen screen, which is drawn wider; Home's cards would be 25–40 dp wider than drawn |
| **36.5 as a named constant** | It bypasses the spacing scale through a constant `verify-spacing-scale` cannot read (it reads literals) — a loophole in the rule F-227 made |
| **`xl` + `xs` = 36, composed** | Two intervals where the drawing has one. ADR-0128 composed an inset only where two distinct intervals exist |

## Evidence, and its limits

- **Measured from `01.json`'s boxes** at 2 px per dp.
- **The snap costs 4.5 dp a side.** Content is 320 dp wide at 384 against the drawn 310.5–311
  (3 %), and the lockup's ink sits 4.5 dp left of `01`'s.
- **F-267's comparison judges it by eye.**

## Consequences

- Home's inset is `xl`.
- R9 §11 and PRD §10 close OQ-14.
- Each R9 surface feature reads its own mockup's inset.
