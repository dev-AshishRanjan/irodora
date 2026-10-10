# E-194 — The preview is never stored or exported

**Link:** `apps/mobile/src/vision.tsx` (held in memory at the root) → the store, the export writers,
the app's store and export adapters, `cardSvg`
**Guard:** `vision.test` (no write, with a decoy) · `export-screen.test` (bytes identical across
modes) · `add-garment-offer.test` (the stored row identical) · `card.test` ·
`verify-preview-boundary` in `lint` **Severity:** high **Feature:** F-240

---

## Why B changes when A does

F-240's second criterion: the mode never changes a stored value or an exported file. The mode lives
in `useState` at the root, so every launch starts in Standard and nothing is written. Every writer
takes declared colours. A writer that read the theme would store a simulation as the value, and the
record's provenance (golden rule 12) would be false.

## The two halves of the guard

The tests hold the outputs: each export format's bytes, a saved garment's row, and the card's
document, in every mode, against Standard. The boundary scan holds the code paths, so a new writer
that reached for `useTheme` or the preview's API is named before any test has a fixture for it.
