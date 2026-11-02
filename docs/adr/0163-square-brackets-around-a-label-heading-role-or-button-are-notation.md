# ADR-0163: Square brackets around a label, heading, role or button are notation

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-02 · **Feature** F-251 |
| **Answers** | OQ-23 |
| **Applies** | ADR-0142 D3 (06's names), ADR-0155 D5, ADR-0159 D4; R9 §2 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Decision
- **D1.** A bracket around words in any mockup marks a label slot. It is notation, not copy.
  - 06's bracketed names were already read this way.
  - No platform convention brackets a label.
  - The documentation convention found brackets UI labels inside prose to mark them as labels.
- **D2. On `16`:**
  - *Slot n: ‹role›*, joined by the colon *Role: Anchor* already uses;
  - *Role: ‹role›*;
  - *Replace* and its glyph;
  - *• Locked*, whose dot is the on-state mark.
- **D3. On `10`:** the column role words, unbracketed.
- **D4.** F-257, F-260 and F-263 apply D1 to `13`, `17` and `18`, and record any bracket read as copy, with the reason.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Brackets as copy | Debug-looking text on every slot; no platform precedent; disagrees with four ADRs |
| Drop the separator in headings | "Slot 1 Anchor / Dark Base" runs two labels together |
| " • " as the separator | A joiner 16 does not use in this element; the colon is its own |

## Evidence, and its limits
Search results only. There is no published wireframe standard for brackets.
