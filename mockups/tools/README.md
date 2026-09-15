# Measurement helpers — how the inventories were read

`mockups/inventory/NN.json` records, for every element an image draws, a box read off the image at
the pixel (§2 of [R9-MOCKUP-FIDELITY](../../docs/design/R9-MOCKUP-FIDELITY.md)). These helpers are
how the boxes were read, kept so that a second person can repeat a reading. **No gate runs them** —
`scripts/verify-mockups.mjs` checks the record, never the picture.

They need **Windows PowerShell 5.1** (they decode the image with .NET's `System.Drawing`).

| helper | reads | use it on |
|---|---|---|
| `measure.ps1 blobs` | bounding boxes of regions that differ from a background colour | the app's flat surfaces |
| `measure.ps1 edges` | runs of rows or columns that differ from a background | card and frame edges, row splits |
| `measure.ps1 mean` / `px` | the average colour of a box / one pixel | a fill, before scanning against it |
| `mask.ps1` | boxes of pixels by absolute brightness (`bright` / `dark`) | elements drawn over a photograph |
| `corner.ps1` | a corner radius, fitted after subtracting the straight-side baseline | swatches, cards, chips |

## Known failures, and what to do instead

- **A difference mask fails on a photograph** — the photo differs from its own mean everywhere, so
  the whole region comes back as one blob. Use `mask.ps1`, or `edges` against a control's own
  uniform fill.
- **A blob that starts exactly at the scan region's edge is contaminated** by whatever lies there
  (a card's ring, a frame border). Start the region a few pixels inside and read again.
- **A corner fit of ≈ 0 px is a failed fit**, not a square corner — the local background did not
  match. Leave the radius unrecorded rather than guess.
- **A colour read from a render carries ΔE00 ≈ 2** (validated against the two theme tiles mockup 15
  prints its hex on). The README token is the declared value (P4); a measurement fills only a value
  the README leaves open.
