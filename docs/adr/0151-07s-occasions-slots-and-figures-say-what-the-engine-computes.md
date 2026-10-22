# ADR-0151: 07's occasions, slots and figures say what the engine computes

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-22 |
| **Feature** | F-248 |
| **Applies** | R9 §4 E1/E2, §8; FR-3, FR-5, FR-6, FR-23, FR-29, FR-31, FR-32, FR-34; [ADR-0124](0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md); [ADR-0148](0148-wearable-combinations-are-the-persons-own-garments-the-engine-ranks-best-with-this-colour-as-a-top.md) |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`07` draws an occasion control (*Casual · Minimalist Office · Japanese Classic · Evening*), four
slots (*Top - Anchor, Trousers, Shoes, Outerwear*), and a card of four figures: a harmony name, a
personal fit, a CVD separation and a contrast. The engine publishes FR-34's occasions (`casual`,
`office`, `minimal`, `japanese-inspired`, `formal`, `date` and four more) and no *evening* or
*classic*. It has three outfit slots (`top`, `trouser`, `shoe`), and the builder files coats
under `top`. It names no geometric relationship for a set of colours.

## Decision

- **D1. Occasions.** *Casual · Office · Japanese-inspired · Formal* map to FR-34's `casual`,
  `office`, `japanese-inspired` and `formal`. The control rests on Office, as drawn. Each word
  names its weighting:
  - *Minimalist Office*: `office` and `minimal` are two published profiles;
  - *Japanese Classic*: no "classic" weighting exists, and FR-23 applies;
  - *Evening*: no evening weighting is published (E2).
- **D2. Slots.**
  - The colour is the top.
  - Trousers and shoes are FR-31's rankings.
  - Outerwear is ranked by `recommendForSlot` as a top, since the builder files coats under top.
  - `OUTFIT_SLOTS`, coverage, the Lab and the lookbook keep three. A fourth engine slot would count
    zero valid outfits for any wardrobe without a coat; it is F-257's question.
- **D3. Names.**
  - Slot 1 is `‹Romaji› ‹English›`; slots 2–4 are `‹Romaji› (‹English›)`, as drawn.
  - The anchor is `‹kanji› ‹Romaji› (‹hex›)`, with the slot word.
  - Garment and material words (*Linen Shirt*, *Wool Slacks*, *Derby*, *Trench*) are E1.
- **D4. The card's values.**
  - **Harmony:** the warm–cool relation the outfit's harmony component measures: *Shared Warmth*,
    *Mixed Warmth* or *Warm Against Cool*. A geometric name needs a classifier the engine lacks
    (F-349).
  - **Fit:** ADR-0150.
  - **CVD:** `cvdAccessibility`'s worst-pair separation, with *Protan/Deutan/Tritan · Machado 2009*.
  - **Contrast:** the WCAG ratio and the smaller |Lc| between the top and the trousers (the outfit's
    two largest areas), from `compare()`. APCA has no ratio.
- **D5. Copy.** *Harmony:* and the card's title drop the component words *Badge* and *Card* (§2), and
  *Colour* is en-GB. The back word is the colour's romaji, named *Back to ‹Romaji›*.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| The drawn occasion words, mapped silently | A weighting nobody published is named on screen (`ruleSetFor`'s refusal) |
| An engine fourth slot | Zero valid outfits for any wardrobe without a coat; Home, shopping and the Lab move |
| A geometric relationship name | No engine classifier exists (ADR-0124); F-349 builds one |
| Contrast on the worst pair | Mostly the shoe, a small area; the drawn figure reads as the outfit's top against its bottom |

## Evidence, and its limits

- **It rests on:** `weights.2026.08.4.json`'s rationales; `slots.ts`; `coverage.ts`; the builder's
  `SLOT_WORDS`; `outfit-score.ts`.
- **The limit:** the harmony row says less than the drawing until F-349 lands.

## Consequences

- R9 §4 E1/E2 and §8 carry `07`'s rows; F-349 is filed.

## Revisit when

- F-349 lands, or a weights publish adds an evening or classic profile.
