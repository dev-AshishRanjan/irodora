# ADR-0103 — The radius and spacing scales are the mockups', a swatch corner is a step under the ratio ceiling, and a shadow exists only where a mockup draws one

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-15 |
| **Feature** | F-227 |
| **Amends** | [ADR-0074](0074-the-spacing-scale-is-a-four-point-grid-and-the-step-that-was-not-goes.md) (the values; its four-point rule and named steps stand) · [ADR-0090](0090-a-swatch-corner-is-bounded-by-the-area-it-removes-not-fixed-at-zero.md) and [ADR-0094](0094-a-swatch-corner-is-bounded-by-what-stays-straight.md) (a corner is a scale step; the ratio becomes its ceiling) · [ADR-0044](0044-status-tokens-corrected-and-status-colour-is-text.md)'s *depth is tint, never shadow* (one drawn exception) |

---

## Context

R9 builds every surface to `mockups/` (golden rule 14). The README declares the scales the mockups are
drawn with — radius `sm 6 · md 10 · lg 16 · pill`, spacing `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48`
— and the product carries its own: radius `xs 6 · sm 10 · md 14 · lg 20 · xl 28 · pill`, spacing
`4 · 8 · 12 · 16 · 20 · 28 · 40 · 56 · 96` (ADR-0074). F-220 measured every drawn swatch corner and
bound each drawn element to a radius step in the inventories; the corners span `sm` and `md`
(R9-MOCKUP-FIDELITY §5).

Three things make this more than a table swap:

- **The names collide.** Spacing `md` is 12 today and 16 in the README; `lg` is 16 and 24; radius `sm` is
  10 and 6. A reference that keeps its name keeps compiling and silently changes its number — the
  failure F-103 found one level down, when a positional scale was renumbered under five readers.
- **A swatch corner is a ratio** (ADR-0090), bounded by the straight run left on each edge (ADR-0094,
  ratio ≤ 0.25) and capped at the top radius. The mockups draw small, fixed-looking corners — 4 to
  11.5 dp across the set, 6.75 on `01`'s hero — which no ratio produces at every size.
- **`25` draws a shadow.** Its white cards on the washi ground fall off over about 10 px below the card
  and 5–7 px at the sides, darkest by about 9 % and 3 % against the ground; the README's light token
  table says the same in words (*"Elevated card surface with subtle shadow"*). The manifest refuses any
  shadow at parse time, because depth by tint cannot tint what it surrounds.

## Decision

1. **The scales are the README's.** Radius `sm 6 · md 10 · lg 16 · pill 9999`; spacing
   `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48`. Still a four-point grid with named steps (ADR-0074).
2. **Every existing reference is moved explicitly, by the contract's own snap rule.** R9-MOCKUP-FIDELITY
   §2, in full: *"A measured value snaps to the nearest step of the R9 scale (§5); where two steps
   are equally near, the smaller is taken (F-220): text set a step smaller still fits the box the
   mockup draws, and text set a step larger may not."* Applied to the product's own values: spacing
   12 → 8, 20 → 16, 28 → 24, 40 → 32, 56 and 96 → 48; radius 14, 20 and 28 → 16. No reference keeps a
   name whose meaning moved; each is rewritten, and every rewrite is checked to equal the snap of
   what it replaced.

   **The tie-break is extended past its stated justification, and that is worth saying plainly.**
   The reason §2 gives for taking the smaller is about TYPE fitting a drawn box, and four of the
   values moved here — 12, 20, 28 and 40 — are ties it decides in places where nothing is being
   fitted into a box. What carries over is the direction rather than the argument: a gap set a step
   smaller leaves a layout that still fits the screen it was built for, and a step larger may not.
   Where that is the wrong call it is visible at once and cheap to change, because these screens are
   rebuilt to their mockups by F-242 onward and removed by F-269.
3. **A swatch corner is a scale step, held under the ratio ceiling.** `min(step, ⌊0.25 × side⌋)`, with
   `sm` by default — the step most drawn swatches carry in the inventories — and `md` where a surface's
   inventory binds it. ADR-0094's bound stays exactly as written, now as the ceiling that keeps a small
   sample a field rather than the formula for every sample. The keyline and the well stay concentric
   around it.
4. **A shadow exists exactly where a mockup draws one: light theme, elevation level 1.** Its ink is the
   `foreground` token at a declared opacity, its offset and blur are read from `25`'s pixels and
   recorded as derived. The parser keeps refusing a shadow on any other theme or level. The dark
   themes stay depth by tint.

## Consequences

**Good.** Every gap and corner comes from numbers the mockups use; the rebuilt surfaces (F-232 onward)
take their per-element steps straight from the inventories. The name collision is closed by rewriting
every reference rather than trusting that the old names still mean something.

**Bad.** Today's (pre-R9) screens change visibly — the commonest spacing step, 12, becomes 8 in every
place it was used, and large swatches lose their proportional corners. Those screens are rebuilt to
their mockups by F-242 onward and removed by F-269; the change is recorded, not hidden. The light
shadow's numbers are read from a JPEG and carry that uncertainty; F-221's side-by-side comparison is
where a person refines them. A shadow now exists in a product that refused them, and the refusal's
reason — a shadow tints what it surrounds — still holds wherever a sample sits on the ground beside a
light card.

**Neutral.** The web target's CSS and Tailwind variables follow the manifest by name, as before.
