---
name: design-review
description: Review a design or an implemented surface against the hard constraints, the brand, and the one test that matters for a colour product.
---

# Skill: design-review

Inputs: [`DESIGN-BRIEF.md`](../../../docs/design/DESIGN-BRIEF.md) ·
[`BRAND.md`](../../../docs/design/BRAND.md) ·
[`ACCESSIBILITY.md`](../../../docs/design/ACCESSIBILITY.md).

Review in this order. A failure at level 1 stops the review.

---

## 1. Hard constraints — a violation is a blocker

| | |
|---|---|
| **C1** | The interface does not decorate with colour. Chrome is near-neutral |
| **C2** | Colour is never the only channel |
| **C3** | WCAG 2.2 AA, zero axe violations |
| **C4** | Every swatch has a visible name and its numeric value |
| **C5** | Provenance is visible with every measured colour, not behind a tap |
| **C6** | No gradient, glow or shadow on or near a swatch |
| **C7** | Motion never changes a colour mid-transition |
| **C8** | Works in English and Japanese, at both text lengths |
| **C9** | Numbers are tabular and aligned |
| **C10** | Keyboard completes every journey |
| **C11** | No claim the product cannot support |
| **C12** | No body imagery, attractiveness framing, or gendered defaults |

## 2. Brand

Does it read as **precise, honest, calm, editorial, accessible, unisex**?

Does it avoid everything in [`BRAND.md` §4](../../../docs/design/BRAND.md#4-what-the-brand-is-not)
— stereotyped Japanese motifs, kawaii register, SaaS gradients, "AI magic" language,
influencer fashion, body imagery?

**The hardest discipline: a colour product must not decorate with colour.** Every colour in
the chrome competes with the colour being examined. The brand shows confidence by holding
back.

## 3. Usability

**Hierarchy** — is the most important thing the most prominent? On a colour detail page,
that is the colour and its name, not the navigation.

**Density** — the product asks people to look carefully. Density prevents that. 間 (*ma*) is
a design element, not leftover room.

**Consistency** — same component, same behaviour, everywhere.

**States** — empty, loading, error are designed, not left as blanks.

## 4. The three flows

- **A — First value in 60 seconds.** Are confidence and lighting condition understood
  *before* the colour value is read? A user who reads the hex first has formed a belief the
  next line then has to fight.
- **B — Guided profile setup.** Does it feel like looking at fabric, or like a quiz? Are
  low-confidence dimensions visibly less certain without being alarming?
- **C — CVD outfit check.** Does it read as a capable instrument, or as a diagnosis? The
  user is being told something about the *outfit*, not about themselves.

## 5. The test that matters

> **Put a real garment colour on screen, surrounded by this interface. Can you judge the
> colour accurately?**

If the chrome interferes — a tinted background, an adjacent accent, a shadow, a gradient —
the design has failed at the one thing this product exists to do, regardless of how good it
looks.

---

## Writing the review

**Lead with blockers.** Then significant issues, then polish. Say which is which — a review
that mixes a contrast failure with a spacing preference gets both treated as preferences.

**Be specific.** "The confidence badge sits below the hex value; it should precede it, so
the reading is framed before it is read" beats "confidence should be more prominent".

**Say what works.** A review that only lists problems gives no signal about what to
preserve, and the next iteration loses the good parts.
