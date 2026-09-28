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
| `serif-match.ps1` | renders a word in each candidate serif and scores it against a crop by mask overlap; `-fontDir` adds font FILES, loaded without being installed | naming the face a wordmark or tagline is drawn in (§5, OQ-29) |
| `tint.ps1` | the mean colour of only the saturated pixels in a box — an icon's tint without its ground | reading the drawn icon colours ADR-0110 declares (OQ-15, OQ-37) |
| `derive-theme.mjs` | whether a derived theme ramp passes gates 9 and 10, using the gate code itself | the two themes `15` draws as one swatch each (OQ-36, `F-289`) |
| `slate-status-search.mjs` | whether any lightness-only move settles Slate's status triple, exhaustively over a stated grid | ADR-0111 §5 (`F-225`) |
| `stem.ps1` | how heavy a line of drawn type is: the integral of ink coverage across horizontal bands, over the word's ink height, which blur and JPEG bloom leave alone; `-render` sets a word from a font file and measures that instead | the weight a serif role is drawn at (`F-226`, ADR-0112) |
| `serif-weight.mjs` | the same number computed exactly from a font's outlines at every `wght`, solved against `stem.ps1`'s reading; `--calibrate` is the known-answer run | the weight and tracking of each serif role, and the mincho (`F-226`) |

## Naming the serif (§5, OQ-29)

The wordmark is drawn *Irodora* on `00`, `01` and `14`, and *IRODORA* on `25` — so the word passed
has to be the one drawn. All-caps against a mixed-case target scores every face at about 0.23 and
ranks them by weight rather than shape — the whole field collapses to 0.06–0.29 — which is what
F-275's first run did until the crop was looked at rather than assumed.

```
# the control: installed faces only, which reproduces F-220's numbers
powershell -File mockups/tools/serif-match.ps1 -img mockups/01_home_screen.jpg -x 170 -y 93 -w 212 -h 51 -word Irodora -polarity light

# the four F-275 measured, with candidates fetched into a directory (-top prints the whole field)
powershell -File mockups/tools/serif-match.ps1 -img mockups/01_home_screen.jpg              -x 170 -y 93  -w 212 -h 51 -word Irodora -polarity light -fontDir <dir> -top 109
powershell -File mockups/tools/serif-match.ps1 -img mockups/00_component_design_system.jpg  -x 189 -y 109 -w 222 -h 56 -word Irodora -polarity light -fontDir <dir> -top 109
powershell -File mockups/tools/serif-match.ps1 -img mockups/14_app_icon_and_splash.jpg      -x 485 -y 665 -w 147 -h 35 -word Irodora -polarity light -fontDir <dir> -top 109
powershell -File mockups/tools/serif-match.ps1 -img mockups/25_home_light_mode.jpg          -x 182 -y 197 -w 229 -h 38 -word IRODORA -polarity dark  -fontDir <dir> -top 109

# the five ADR-0106 added (2026-09-24): 00's type samples, and 01's tagline one line at a time
# (line bounds from `measure.ps1 edges ... 73 195 269 125 16181C 150`: rows 201-225, 244-274, 287-310)
powershell -File mockups/tools/serif-match.ps1 -img mockups/00_component_design_system.jpg  -x 52  -y 276 -w 206 -h 60 -word "Display 1"            -polarity light -fontDir <dir> -top 109
powershell -File mockups/tools/serif-match.ps1 -img mockups/00_component_design_system.jpg  -x 52  -y 345 -w 66  -h 32 -word "Title"                -polarity light -fontDir <dir> -top 109
powershell -File mockups/tools/serif-match.ps1 -img mockups/01_home_screen.jpg              -x 70  -y 198 -w 275 -h 30 -word "What colour is this." -polarity light -fontDir <dir> -top 109
powershell -File mockups/tools/serif-match.ps1 -img mockups/01_home_screen.jpg              -x 70  -y 241 -w 275 -h 36 -word "What goes with it."   -polarity light -fontDir <dir> -top 109
powershell -File mockups/tools/serif-match.ps1 -img mockups/01_home_screen.jpg              -x 70  -y 284 -w 275 -h 30 -word "Does it suit me."     -polarity light -fontDir <dir> -top 109
```

The eight lower-case crops (the three wordmarks and these five) are what ADR-0106 averages. `25` is
left out of the mean because its whole field is low (§5).

Which files to put in `<dir>`, and where they came from:
[`serif-candidates.json`](serif-candidates.json) — family, file, size, sha256, URL and the
`google/fonts` commit they were read at. The binaries are not committed (F-275 measures; F-226 ships).

The crops are the inventories' own wordmark boxes; `25` is cropped to its Latin part (w 229 of 301,
the rest being 彩度). A variable font loads as its named instances, so each weight is scored
separately — which is what says *which weight* matches rather than only which family. A file GDI+
refuses is printed as `COULD NOT MEASURE`, because a candidate missing from the table would read as
one that scored badly.

**The script is ASCII on purpose.** Windows PowerShell reads a `.ps1` without a BOM as ANSI, so an em
dash in a string is a parse error rather than a character — which is how F-275 broke it once.

## The weight of each serif role (F-226, ADR-0112)

Mask overlap (`serif-match.ps1`) names the FACE, and it is the wrong instrument for the weight: a
threshold on a bloomed JPEG thickens every stroke. So the weight is read as a quantity that
survives the blur: the width of ink a horizontal band crosses, integrated rather than thresholded,
over the word's ink height. `stem.ps1` reads it off the crop. `serif-weight.mjs` computes it exactly
from Gelasio's outlines along `wght` 400-700, with no rasteriser involved, and solves for the weight
and the tracking.

```
# fetch the two sources first (scripts/font-sources.json pins them), then:
node mockups/tools/serif-weight.mjs              # every crop, solved
node mockups/tools/serif-weight.mjs --calibrate  # known weights, set at each crop's size, recovered

# the mincho candidates on 20's card (mincho-candidates.json pins them; -codepoints keeps this ASCII)
powershell -File mockups/tools/serif-match.ps1 -img mockups/20_colour_card_shareable.jpg -x 143 -y 697 -w 116 -h 58 -codepoints 85CD,9F20 -polarity light -fontDir <dir> -noInstalled -top 20
```

The calibration is the tool's decoy. A reading counts only where the instrument recovers the known
weights at that crop's size, and it is read in ENCODED sRGB, the space the calibration recovers.

## From readings to the record

`inventory-data/NN.mjs` holds one image's readings, and its header says which boxes were derived
rather than read and why. `generate-inventory.mjs` turns it into `mockups/inventory/NN.json` — dp from
each box and its screen, the reading order of §2 — and checks the result with the same
`inventoryProblems()` the gate runs, so it cannot write a record the gate refuses:

```
node mockups/tools/generate-inventory.mjs 01 14      # then: pnpm exec prettier --write mockups/inventory
```

Change a reading in the data file and regenerate; never edit an inventory by hand. Type sizes follow
§2: the em is estimated from the line box by glyph class and snapped to the nearest §5 step, a tie
takes the smaller, and **siblings drawn alike take one step** — the one most of them snap to — with
`raw.emDp` keeping each element's own estimate.

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
