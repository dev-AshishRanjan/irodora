# ADR-0144: The sweep reads an element a conflict replaces as declared, against the inventory's own record

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Amends** | [ADR-0134](0134-fidelity-is-captured-from-the-running-app-beside-its-mockup-and-the-device-run-is-a-persons.md) D7 (the inventory sweep) |
| **Applies** | R9-MOCKUP-FIDELITY §6 C1, §12; golden rule 14 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

The sweep finds every element of an enrolled surface by what it draws. `05`'s four-item tab bar is replaced by `01`'s five (C1), and its inventory says so in `conflicts`.

- Five of its seven tab elements have a counterpart on `01`'s bar: the bar, the indicator, the Atlas and Profile glyphs, and the Atlas label.
- Two do not: *compass* and *search*.
- Worse, `05.tabs.search.icon` would be "found" as the search field's own glyph.

`02 09 11 15 18 21` meet the same.

## Decision

**D1:** An enrolled surface may declare elements **superseded**, each naming the §6 conflict that replaces it.

**D2:** A declaration counts only if the element is listed under that conflict in the surface's own inventory `conflicts`; anything else is a finding. A superseded element is not counted.

**D3:** What replaces it is still asserted, by the surface's other elements: `05.tabs` as `TabBar`, plus the indicator and the counterpart glyphs and label.

**D4:** For 05: `05.tabs.compass.icon` and `05.tabs.search.icon`, by C1.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Map compass and search onto two of 01's tabs** | Invents a correspondence the conflict never made |
| **Render 05's own bar for the sweep** | Draws something the product does not ship |
| **Leave them unlocated** | The sweep fails, or the surface is never enrolled (E-203) |

## Evidence, and its limits

- **It rests on:** `05.json`'s `conflicts`; F-228's rule that a superseded element never sets a shape.
- **The limit:** the person's capture judges the tab bar against 01, not 05.

## Consequences

- `apps/mobile/test/inventory.ts` gains `supersededFindings`.
- E-211.
- The C1 surfaces' features get a note.
