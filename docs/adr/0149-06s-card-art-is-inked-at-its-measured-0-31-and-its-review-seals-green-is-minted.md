# ADR-0149: 06's card art is inked at its measured 0.31, and its review seal's green is minted

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Builds on** | F-229's art measurement (R9 §5), [ADR-0110](0110-the-multicoloured-icons-are-followed-as-drawn-over-a-silhouette-that-reads-in-one-ink.md), E-159's mint pattern |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`06` draws two inks the manifest does not yet carry:

- its provenance card's plum branch, at about twice the backdrop opacity the manifest declares (0.15);
- the green seal on its review line, which the manifest already lists as a colour exception owed by
  F-247 (`mintedBy: "F-247"`).

## Decision

- **D1.** `opacity.artCard` is 0.31: F-229's `inkP90` reading of `06.provenance.art`, on gamma-encoded
  luma as `opacity.art` is. It is read through `Illustration tone="card"`. `15`'s 0.33 is F-262's.
- **D2.** `glyph.seal` is `#4B9D61` in every palette: `usage: nonText`, paired with nothing, because the
  words beside it carry the status (ADR-0110 §3; rule 13). The element exception is retired and
  replaced by a token group carrying `06.provenance.review`.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| The 0.15 backdrop | Half the drawn ink |
| `foreground.3` at full strength | About 0.58: twice the drawn ink |
| `status.ok` for the seal | A verdict colour: "pass" |
| No green | Departs from ADR-0110 |

## Evidence, and its limits

- **It rests on:** R9 §5 and the manifest's opacity note; C10's census row.
- **The limits:** a JPEG reading carries ΔE00 ≈ 2; the person's comparison judges it.

## Consequences

- The manifest gains `opacity.artCard` and `glyph.seal`; `Illustration` gains `tone="card"`.
- `c10-exceptions.test` retires the element exception and checks the token group.

## Revisit when

- `15`'s art is built (F-262) and reads the same opacity.
- The person's comparison finds either ink wrong.
