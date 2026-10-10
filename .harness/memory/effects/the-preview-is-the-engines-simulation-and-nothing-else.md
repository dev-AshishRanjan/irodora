# E-192 — The preview is the engine's simulation, and nothing else

**Link:** `cvd-engine#simulateAnomalous` → `design-tokens/preview.ts` (`simulatePaint`,
`simulatePalette`) → `ThemeProvider`, the strip's words, the census, ADR-0131
**Guard:** `preview.test` (the engine for every token; Chrome's oracle; the commutation property
with a Viénot decoy) · `verify-preview-boundary` in `lint` · `color-golden`
**Severity:** high **Feature:** F-240

---

## Why B changes when A does

The preview repaints every token and sample through Machado at severity 1, the same model the scoring
uses (ADR-0131 D1). The strip names that model and severity, the census pins what it does to the
declared pairings, and the ADR quotes its limits. Change the model and all of them move.

## Why Machado, and why it must stay one copy

Machado's matrices commute with alpha compositing on encoded sRGB, so simulating each token and then
blending gives the same pixel as blending and then simulating. Viénot's do not: 46.5 % of the test
blends land elsewhere, and that test is the decoy. A second copy of the matrices anywhere outside
`packages/cvd-engine/src` would agree until one of them changed. The boundary scan reads the
coefficients from the engine and looks for them everywhere else.

## The tritan refusal stands

`simulateDichromacy('tritan')` throws, and the preview never reaches it: tritan is Machado's, at
severity 1, and the strip says it is approximate. Brettel's tritan is F-008's decision, and even a
verified Brettel would not commute (D1d).
