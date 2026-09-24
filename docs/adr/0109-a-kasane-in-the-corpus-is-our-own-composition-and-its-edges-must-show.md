# ADR-0109 — A kasane in the corpus is our own composition, layered outermost first, and its edges must show

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-24 |
| **Feature** | F-224 |
| **Relates to** | ADR-0007 (our curation is never historical), F-196's combinations rule, FR-44 |

---

## Context

Mockups `10` and `23` draw *kasane* palettes, and the corpus had none (C14). *Kasane no irome*, the
colour combinations of layered Heian robes, is a historical system with documented combinations,
and every accessible table of them is somebody's digitisation. content/AGENTS.md §2 forbids ingesting
one, and §3 forbids labelling our curation historical. F-224 composes eight kasane from our own
entries. The record that holds them had to be decided. F-224's review noted that the decision lived
only in code comments and effect notes.

## Decision

1. **A kasane is a palette with `category: "kasane"`**, not a new record type. Its members are
   layers, and **`rank` is layer order, outermost first**: rank 1 is the *omote*, the layer that
   shows most.
2. **A kasane is our own curation, whatever its `sourceType`.** The parser refuses a kasane
   classified `historical`, `traditional` or `modern-japanese`, even with a publication source that
   would let an ordinary palette carry those labels. This is F-196's rule for combinations, made
   unconditional for the same reason. Composing *in the manner of* the system is not the system.
3. **A kasane has at least two layers**, and **every adjacent pair is more than ΔE00 5 apart**. That
   is the distance below which the product calls two items the same (FR-44). Gate 11 recomputes each
   edge under the current engine on every run (`kasaneEdges`), and no record types the figure.

## Consequences

**Good.**
- The historical system and our compositions cannot be confused by any consumer: a palette tagged
  `kasane` is ours by construction, and the UI never has to decide.
- The layering claim a kasane makes, that each robe's edge shows, is measured, not asserted.

**Bad.**
- **This category can never hold a documented historical kasane.** If the product ever licenses or
  measures a real combination, with a dated source and dyed cloth, it needs a different record, or a
  superseding decision. That is deliberate, and it is a real limit.
- The ΔE00 5 floor is borrowed from FR-44 (duplicate garments), not derived for layered cloth. A
  graded layering (*nioi*) steps in small increments by design. The closest edge shipped is 花匂's
  pinks, just over the floor, so the rule constrains the gradations the set can hold.

**Neutral.** The five older palettes are unaffected. `category` gains a value, and `contemporary.ts`
still selects only its own.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| A new record type, as combinations are | A vocabulary of its own (outer/inner) | A kasane needs exactly the palette's anchor, ranks and weights; a second type would duplicate the schema, the digest chain and every consumer for a difference that is one field |
| Allow `traditional` with a publication source | Room for a real historical kasane later | The easiest way to present our composition as the canon is a grander source line; the refusal is only worth having if it is unconditional |
| No separation floor | Freedom to compose any gradation | A kasane whose layers cannot be told apart makes a claim the eye refutes, and nothing would say so |

## Revisit when

- The product obtains a documented kasane with a dated source it may publish; or
- a person reviewing the eight finds the ΔE00 5 floor wrong for layered cloth, too coarse for a
  *nioi* gradation or too fine to read on a phone.
