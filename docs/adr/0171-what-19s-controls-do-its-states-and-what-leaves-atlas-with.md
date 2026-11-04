# ADR-0171: What 19's controls do, its states, and what leaves `/atlas/with/[slug]`

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-04 · **Feature** F-252 |
| **Supersedes in part, on this route only** | F-194 c1–c3, F-196's card form, F-195's *Wear it* button, F-198 c1–c2, F-200's companion path (with ADR-0168 and ADR-0169); each stands on 24's routes until F-259 |
| **Applies** | FR-73, FR-31, FR-71; ADR-0118, ADR-0128 §6, ADR-0129, ADR-0141, ADR-0143, ADR-0147 (amendment), ADR-0150, ADR-0152 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
19 draws a back control, a filter glyph, a *Wear* on every row and *Build Complete 4-Piece Outfit →*.
Its `19.json` once recorded Build as going to the wardrobe's outfit route. The old screen at this route
(`Combinations.tsx`) also serves 24's two routes.

## Decision
- **D1. Route.** `/atlas/with/[slug]` renders a new screen, `GoesWith`, with `headerShown: false`. It
  reads no profile and no store: 19 lists nothing a person writes, so nothing is re-read on focus.
  `Combinations.tsx` keeps 24's two routes, unchanged.
- **D2. Back** → `router.navigate('/atlas')`, as 06 and 09 do (ADR-0147's amendment). It returns to the
  Atlas where it is in the stack, and opens it where it is not.
- **D3. A row's Wear** → `/atlas/wear/‹anchor›?with=‹row›`.
  - 07 opens with the anchor as the top (*Anchor Garment: Top*) and the row's colour in the trousers,
    07's slot in hand at rest. It is locked, so an occasion change cannot move it.
  - 07's route gains an optional `with`, read by a pure `wear.ts#startWith` into `Wear`'s existing
    `initial`. An unknown slug, or the anchor's own, is ignored, and 07 opens as drawn.
  - This is the founding question the old screen quotes: what could the trousers be, if the shirt is
    this colour.
- **D4. Build** → `/atlas/wear/‹anchor›`. 07 is the surface that builds a complete four-piece outfit
  around a colour today, as 06's *Wear It (Build Outfit)* does (ADR-0147 D3). The Lab (13) builds from
  owned garments in three slots until F-257, and draws nothing without a profile.
- **D5. The filter (E4: 19 draws the glyph and nothing behind it).**
  - It opens 03's floating sheet holding one choice in 05's pill form (ADR-0143's *More filters*): *All*,
    then each relationship the list holds, in the list's order; *Curated* where curated rows exist.
  - No choice that would empty the list is offered. The chosen pill carries its leading dot (ADR-0141).
  - While a relationship is chosen, *Showing n / N* and *Clear* sit at the trailing end of the rows
    heading's line (05's line, ADR-0143). The state is said in words, never only by colour (rule 13).
  - The screen opens in the drawn state: every row, no filter.
- **D6. States.** `STATES = { absent: 'empty' }`, with two witnesses:
  - **Not in this corpus:** the app bar's back above 00's caption (ADR-0128 §6, `detail.notFound`).
  - **No geometric row:** the anchor card stands, and 00's caption takes the rows' place, `resolvedHere`,
    because Build on the same screen still answers.
    - Below the floor: *This colour is close to grey, so no hue stands in a relationship with it.*
    - Otherwise: *No colour in this corpus lies in these hue relationships to it.*
    - The hint, both cases: *Build Complete 4-Piece Outfit ranks what goes with it.*
- **D7. What leaves this route, and where each now lives:**

  | leaves | its home now |
  |---|---|
  | the twelve relationship cards and their generated companions (F-194 c1) | 19's rows realise the five hue relationships in corpus colours (ADR-0168); all twelve stay on 24's routes |
  | *Generated* per card (F-194 c3) | the relationship's name (ADR-0169) |
  | the gamut-cost line per card (F-194 c2) | each record's own cost; the one non-zero shown (ADR-0169) |
  | the CVD separation per card (F-198 c1) | 07 prints the worn set's separation with its model, one tap away |
  | the profile weighting and `combos.personalNone` (F-198 c2) | 07's fit figure (ADR-0150) |
  | arming a generated companion as the target (F-200's path here) | corpus colours arm from 06's *Hold* (F-200 c1 still holds) |
  | the curated cards (F-196's form) | curated members as rows, first (ADR-0168) |
  | *Wear it* (F-195) | each row's *Wear*, and *Build* |
  | `combos.what` | nothing on 19 advises; the claims lint holds both catalogues (FR-73, NFR-21) |
  | the platform header | 19's own bar |

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Wear → 07 for the row's colour | The row becomes the top, against *Anchor Garment: Top* |
| Build → the Lab, `offerCombination({ top: anchor })` | *Complete 4-Piece* untrue there today; disabled without a profile; ⇄ the person's |
| Rebuild `Combinations.tsx` for 19 | 24's routes change before F-259 |
| No filter action | A drawn control that does nothing |

## Evidence, and its limits
Device behaviour — the `with` push, back from a route pushed over Home, TalkBack — is unverified here and
is attested by the person at the capture.
