# E-193 — `colors` is painted; a derivation reads `source`

**Link:** `ui/theme.tsx#ThemeValue` (`colors` painted, `source`, `paint`, `vision`) → every
`useTheme()` reader, `sampleInk`, `sampleEdge`, `elevation`, the colour card's display
**Guard:** both preview sweeps and their decoys · `vision.test` (Standard is the identity) ·
`typecheck` **Severity:** high **Feature:** F-240

---

## Why B changes when A does

Since F-240, `colors` is the palette as it paints, which in a preview mode is simulated. Anything
computed FROM a colour (a sample's ink, its edge, a shadow, the card's document) must be computed on
`source`, the declared palette, and painted through `paint`. Computed on the painted palette it
would pick inks for the simulated colours and show a corrected app, not a simulated one.

## How the sweeps see it

Each sweep renders a subject in Standard and in each mode and walks the trees together. Every painted
value must be `simulatePaint` of the Standard one, and nothing else may change. A derivation from
the painted palette gives a value that is not the simulation of the Standard one, and is named. Ids a
render makes anew (`useId`) are compared by where they point, and React elements passed as props are
compared where they render.

## In Standard

`colors === source` and `paint` is the identity, object for object, so nothing that predates the
preview changed.
