# ADR-0126 — The icon is 14's tile, full-bleed; its corner and its rim are the platform's

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-07 |
| **Feature** | F-231 |
| **Amends** | [ADR-0122](0122-the-mark-is-14s-blossom-in-one-ink-everywhere-its-cuts-drawn-as-holes.md) decision 6 (the tile it left to F-231) |
| **Applies** | R9-MOCKUP-FIDELITY §2 (strict, measured), §5 (tokens), §6 C4; golden rules 12 and 14; FR-69 |
| **Decided on** | the readings of `14.icon.tile` and `14.icon.tile.mark` (F-231 increment 1); where the drawing leaves something open, the delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

Until F-231 the icon was the mark on the flat dark ground (ADR-0122 decision 6). `14` draws more: a
dark tile, lighter towards one corner, its corners rounded, a light line along its edge, and the
silver blossom at a share of it. F-220 recorded the tile as 186 × 161 px with two measured colours and
called the 161 px its *visible* height.

F-231 re-read it (`measure.ps1`-style scans and a plane fit over the decoded image; the inventory
holds every number):

- **It is a square**, 184.7 px between the outer half-maxima of its edge on all four sides. The 161 px
  stopped where the gradient nears the ground; the edge closes the square at y 763.
- **Its edge is a 1.6 px rim of light**, brightest along the top (luma 88) and dimmest along the foot
  (54), against an interior of about 48 and a ground of 25.
- **Its fill is a linear gradient** in the encoded channels: a plane fitted to 12,645 pixels clear of
  the rim and the mark leaves 1.4 levels rms, a vertical-only fit 2.2–2.5, and the residual by 12 px
  band stays within ±0.6 levels (so it is not eased). Its axis runs 15.2° clockwise from vertical,
  lightest at the top-left corner (#2E3239), darkest at the bottom-right (#15171C).
- **The mark is 0.611 of the tile** (its grid, 2 × reach, over the side), and its **ink box** is
  centred on the tile (1.27 px off), while its **grid** sits 4.83 px below the tile's centre.

## Decisions

### 1. The asset is full-bleed; the corner is the platform's

The icon is a square, opaque PNG, gradient to its edges. iOS applies its own rounded-rectangle mask
to a square icon and refuses one with an alpha channel; Apple's guidance is a 1024 × 1024 square with
no corners drawn into it. A corner drawn into the asset would be masked a second time. `14.icon.tile`
already recorded this (*"the asset is the platform's square, and the OS applies the corner mask the
render shows"*); this decision keeps it.

### 2. The rim is the platform's too

The light along the tile's edge is drawn **on the mask**, and an asset does not know where the mask
is: iOS's is fixed by the system, Android's is chosen by each launcher. A line drawn into a square
asset would be cut wherever the mask leaves the square, which is everywhere except the middle of each
side.

And the platform draws one. **iOS 26 lays its Liquid Glass material over existing third-party icons
of this kind** — a simple glyph on a plain ground — giving them edge highlights
([MacStories, *iOS and iPadOS 26: The MacStories Review*, "The Home Screen and App Icons"](https://www.macstories.net/stories/ios-and-ipados-26-the-macstories-review/4)),
and **iOS 27 places those highlights at the top and bottom** of the icon, no longer moving with the
device ([MacRumors, 2026-06-16, *iOS 27 Revamps App Icons*](https://macrumors.com/2026/06/16/ios-27-revamps-app-icons)).
That is the line `14` draws: brightest along the top, present along the foot. An asset that drew it
would double it on the platforms that draw it, and misplace it on the ones that do not.

So the rim is recorded in `14`'s inventory as `presentation` — what the OS draws and no surface of the
app does — beside the home screen and plum branch the icon is shown on. It is not a departure: like
the corner, it is part of how a platform presents an icon, and the asset supplies what is under it.
Android launchers draw no rim; that difference is the platforms', and F-267 compares the icon on both.

### 3. The fill is 14's gradient, between two surface tokens

The fill is the measured plane, bound to tokens (P4; the inventory's `measured` field is what the
render showed, the token is what the build uses):

| end | read | token | ΔE00 |
|---|---|---|---|
| top-left (lightest) | #2E3239 | dark `surface.2` (`level2`) #282C35 | 2.29 |
| bottom-right (darkest) | #15171C | dark `background` (`ground`) #15171B | 0.73 |

Both are inside the instrument's error: a colour read off a render carries ΔE00 ≈ 2, and this image
renders its declared ground #15171B as #17191E (`mockups/tools/README.md`, §2). The next-nearest
surface token for the top-left is `surface.3` (2.72); `border` (1.70) is nearer but is not a surface.
No token is minted.

The gradient is interpolated in the **encoded** channels, as the drawing's plane is and as a drawing
tool interpolates, along the measured axis (15.2° clockwise from vertical), each end's token exactly
at its corner, each channel rounded, nothing dithered — so the same inputs give the same bytes. The
icon is **dark only**: `14` draws one icon, no mockup draws a light one, and FR-69 asks for one icon.
iOS 18's dark and tinted icon appearances, and iOS 26's layered `.icon` format, are capabilities no
mockup draws; they are recorded as F-320 rather than designed here (golden rule 14).

Golden rule 12 is not engaged: these are chrome tokens with the manifest's provenance, not colour
data the product reports.

### 4. The mark is 14's share of the tile, centred by its ink

The mark's grid is **0.611** of the tile in `14`. On the 1024 px icon that is 625.9 px; the grid must
be a whole number of units (the generator's rule: a fractional unit puts the shapes out of proportion
with each other), and the nearest is **624** (unit 26, 0.609).

A five-petal blossom with its first petal straight up reaches further above its centre (orbit +
petal) than below it (its lowest petals' edges), so centring its **grid** leaves its **ink** riding
high. `14` centres the ink: its ink box is 1.27 px from the tile's centre, its grid 4.83 px. The
generator moves the grid down by half the difference — `inkCentreDy`, from the geometry, 0.72 of a
unit — rounded to a whole pixel (19 px at 624), and the drawn ink box lands 0.5 px from the centre.

The ink stays ADR-0122's: dark `foreground.2` (`14`'s `text.secondary`), one ink.

### 5. One table of drawings, generated and proven

`scripts/generate-brand-assets.mjs` holds one table — each drawing's file, canvas, grid, offset, ink
and ground — and everything reads it: the assets, `--prove`, `apps/mobile/assets/brand/brand-assets.json`
(the geometry, for what cannot import the script) and gate 16 (`verify-apk.mjs`, `signatureOf`). The
tile's ends, its axis and the mark's share are **read from `mockups/inventory/14.json`**, so a re-read
of the image moves the asset and `--check` fails until it is regenerated.

`--prove` reads each claim back out of the bytes, with a decoy for each:

- **the tile** (`carriesTile`, `scripts/brand-checks.mjs`): a plane fitted to every opaque pixel clear
  of the mark gives the axis and each corner's colour, held to the tokens — at 1024 px and at a
  launcher's 192, 96 and 48. Refused: a flat tile (F-230's interim icon), a reversed one, a vertical
  one, one between other tokens on the right axis, a light one.
- **the share**: the grid is the nearest whole unit to 14's; 768 (the splash's grid, the icon's before
  F-231) and one unit larger are refused.
- **the centring**: the ink rows read from `icon.png` centre on it; the same mark centred by its grid
  rides 18.5 px high and is refused; and the record agrees (14's ink box sits nearer the centre than
  its grid).
- **one ink** (ADR-0122), now with each pixel's own ground: every pixel lies on the line from the
  tile's colour at that pixel to the ink; the two-ink decoy is refused on the tile.

## Consequences

- The home-screen icon is `14`'s tile on iOS and on any launcher that shows the legacy icon; the corner
  and the rim come from the platform.
- `carriesTile` and the drawings table are what the prebuild check and gate 16 read (F-231 increments
  8 and 9), so a placeholder icon, a flat one or a stale one fails in the artefact as in the source.
- **Recorded for F-267:** the icon beside `14`'s left frame on iOS 26/27 (with the system's rim) and on
  Android launchers (without one); gradient banding at launcher sizes (none is expected: the span is
  19–26 levels per channel over the side).

## Alternatives considered

- **Draw the rim into the asset.** Rejected: it would be cut by every mask that is not the square,
  and doubled where iOS draws its own (decision 2).
- **A vertical gradient between `measured` values.** Rejected: the plane fits the drawing better
  (1.4 against 2.2–2.5 levels), and a measured value is not a token (P4).
- **Mint `icon.tile.top` / `icon.tile.bottom` tokens.** Rejected: both ends are within the
  instrument's error of existing surface tokens; a new token would be a second name for a colour the
  palette already has.
- **Centre the grid.** Rejected: `14` centres the ink, and the decoy shows the difference is 18.5 px
  at 1024 — visible on a home screen.
