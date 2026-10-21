# ADR-0141: The chosen season pill on 05 carries its leading dot

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Closes** | OQ-43 |
| **Builds on** | F-232's pill treatment (`pillTone`, `SelectionDot`); [ADR-0131](0131-the-cvd-preview-is-machado-at-full-severity-on-every-token-and-sample-and-is-never-stored.md) §6 (15's pills as one radio group) |
| **Applies** | Golden rules 13 and 14; ACCESSIBILITY §2 A2 and §4; R9-MOCKUP-FIDELITY §4 E3; WCAG 2.2 SC 1.4.1, 4.1.2 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

- **What `05` draws.** The chosen season pill (*All*) is a fill swap: white, with dark text, where the others are outlined. There is no mark.
- **What the rest of the product draws.** `12`, `15` and `17` mark a chosen pill with a filled dot before its label. F-232 made that the product's one pill treatment, after a person reported *"follow one single pattern everywhere"*.
- **The conformance rule `selection-treatment`** (part of the blocking a11y gate) reports a pill whose chosen state is a fill alone (`pill-selection.test`).
- **WCAG.** Understanding SC 1.4.1 lets an inversion pass (*"if content is distinguished by inverting an element's foreground and background colors, this would pass"*), and counts a 3:1 lightness difference as an additional distinction. So WCAG alone would not force a mark.
- **ACCESSIBILITY §4 is stricter, and binding.** *"The rule is total"*; a highlighted selection is a highlight **and** a mark, and a stated state.

## Decision

**D1: The season row is one radio group** (`ChoiceGroup`, pill form), so it announces its name, the choice and its position.

**D2: The chosen pill is drawn as `05` draws it, plus the dot.**
- Fill: `accent` (05's white primary).
- Ink: `accent.foreground`.
- Mark: a `SelectionDot` in that ink, leading the label.
- Resting pills: outlined in `border`.

**D3: The same treatment holds wherever this screen offers a single choice** (the overflow sheet's facets).

**D4: The departure is recorded as E3** on `05.filters.season.all`. A blocking gate and rule 13 force it, not a taste.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **The fill swap alone, as drawn** | Passes WCAG 1.4.1 by its inversion note, but fails the product's own standard (ACCESSIBILITY §4, a binding A2 commitment) and the blocking `selection-treatment` rule; one more pattern for "chosen" after F-232 removed them |
| **A tick (✓) or a corner badge** | Not drawn on any pill in the set; F-232 removed both from pills |
| **Change the rule to accept a fill alone on 05** | Lowers a blocking gate for one screen, which E3 forbids |

## Evidence, and its limits

- **It rests on:** WCAG 2.2 Understanding 1.4.1 (read 2026-10-21); ACCESSIBILITY §2 and §4; F-232's measurements of 12, 15 and 17; `pill-selection.test`.
- **The cost:** the chosen pill is about 10.5 dp wider than drawn (dot 6.5, gap 4). The row still fits 384 dp in English. In Japanese or at 200 % it wraps (E3).
- **It was not tested with people.**

## Consequences

- `ChoiceGroup`'s pill form takes `selectedFill`, `selectedEdge`, `size` and `gap`; 15 is unchanged.
- `pill-selection.test`'s decoy note no longer names 05.
- R9 §4 E3 gains the row; R9 §11 and PRD §10 close OQ-43.

## Revisit when

- A mockup draws a chosen pill without a mark *and* the product's accessibility standard changes.
- A person reports the dot misread.
