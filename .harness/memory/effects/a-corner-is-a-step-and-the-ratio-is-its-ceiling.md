# A corner is a step, and the ratio is its ceiling

**Effect:** [E-131](../../state/effects.json) · `manifest.radius` → `swatchCorner` → every sample in
the product, and the inventories' per-element `sm`/`md` binding · gates 4 and 2 · **high**

## Why the link exists

A swatch corner was a RATIO of its side (ADR-0090), bounded by what stays straight (ADR-0094). F-220
measured what the mockups draw and they are lengths: 4 to 11.5 dp across 28 images, `sm` or `md` per
element. ADR-0103 makes the corner the step and keeps the ratio as the ceiling —
`min(step, floor(0.25 × side))` — so a sample too small for its step still rounds by a quarter of its
side.

**It reaches every sample at once**, and nothing else in the system would notice: the contrast gate
reads colours, the conformance suite reads structure, and neither has a geometry.

## What holds it

- `swatch-corners.test.tsx`: the step at every drawn size, the ceiling below about 24 px, the keyline
  one pixel out and the well one inset beyond it, at ten sizes — each with a decoy, so a component
  returning its step unconditionally fails the ceiling case and one returning the ceiling fails the
  step case.
- `manifest.test.ts`: ADR-0094's bound itself, with a decoy inside it.
- `typecheck`: a radius step that no longer exists stops compiling at every call site.

## What it does not hold

That a surface takes the step ITS mockup binds. The default is `sm` — 42 of the 67 swatch bindings in
the inventories — and a surface built to a mockup that binds `md` has to pass `corner="md"`. F-242
onward set it per element; until then a drawn `md` renders as `sm` and no check says so.
