# E-190 — The working card says the engine's white

**Link:** `lens/pipeline.ts` (`captureSteps`, `pipelineProgress`, `stepText`, `D65_CCT_K`) →
`WorkingState`, the Lens, F-243, F-266
**Guard:** `lens-pipeline.test` (McCamy within 2 K of 6504; 27's 5500 K and D55 as decoys) ·
`progress-ring.test` **Severity:** medium **Feature:** F-236

---

## Why B changes when A does

27 draws *extracting reflectance spectra* and *5500K*, claims the product cannot make (E2). (claims-ok: quotes the drawn construction this link refuses)
The card says the step the engine takes, the conversion to OKLCh, and the engine's own white,
`CANONICAL_ILLUMINANT` at 6504 K, composed in code so no translation can print another. F-243 places
the card in 02. F-266 animates the ring, whose value this module gives.

## F-236's review (2026-10-09): only the camera waits (B1)

The card showed while the photo picker was open, announcing *Analysing Fabric Colour…*,
*Decoding the photo…* and a conversion that was not happening. A photo's point is read at once.
So the card is the camera's alone, the photo step is gone, and the Open-photo button's loading
state covers the picker, as it did before F-236. The conversion's separator is each script's own:
a full-width colon in Japanese (M5).

## F-266: the ring moves only when its value does

Its fill is an `ArcFill`. On the camera path the value is 0 for the card's whole life, and no
spinner is drawn for a value nobody computed (ADR-0133 §5).
