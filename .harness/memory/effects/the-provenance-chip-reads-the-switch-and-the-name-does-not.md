# E-162 — The provenance chip reads the switch, and the name does not

**Link:** `provenanceBadges` (15's switch) → `ProvenanceChip` → the surfaces that draw one (F-243,
F-244, F-256, F-259) and F-284 **Guard:** `provenance-chip.test.tsx`; the hidden-chip conformance
subject **Severity:** medium **Feature:** F-233

---

## Why B changes when A does

15 draws *Show Provenance Badges on Swatches*, and until F-233 the badge it names did not exist.
`ProvenanceChip` is its only reader. It takes the `Sample`, so its words are that sample's
provenance, from copy exhaustive over `MeasurementSource`; it draws nothing when the switch is off.

The provenance is still SAID with the switch off: the sample's own accessible name carries source
and confidence (ADR-0005), and the chip sits outside that node. The switch changes what a person
sees and never what a screen reader hears.

## For the surfaces

Place this component, not a `Chip` with the words typed in: a hand-written chip ignores the switch
and can name a source the sample does not carry. 03 draws it outlined at 16.5 dp, 12 filled at
18.5, 24 filled at 25 with the camera glyph. The copy keys land with the first surface.

Related: [[a-colour-drawn-against-a-sample-moves-per-sample]].
