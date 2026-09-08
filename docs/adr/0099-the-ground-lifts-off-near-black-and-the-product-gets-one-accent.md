# ADR-0099 — The ground lifts off near-black, and the product gets one accent

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-08 |
| **Feature** | F-175 |
| **Amends** | the chroma ceiling rule stated in [ADR-0044](0044-status-tokens-corrected-and-status-colour-is-text.md) and restated in [ADR-0096](0096-a-theme-is-a-hue-on-the-chrome-and-never-touches-the-ground-a-colour-is-judged-against.md) — the ceiling stands, and the exception list grows by two |

---

## Context

Two reports, made together, about the same palette.

**The dark themes were near-black.** `background` sat at OKLCh L 0.135 — `#090807` — which is
four steps below the charcoal every mature dark interface uses, and reads on a phone as a hole
rather than as a surface.

**The product had no accent.** Not a weak one: none. `link` is defined as *identical* to
`foreground`, with a role string saying so outright — *"the underline is the channel, not the
colour"* — and `ring` is described in the manifest as "the only chromatic token in the
PERSISTENT chrome". So every emphasis in the application was made of weight and grey, and the
primary button was a near-white plate.

Both are downstream of a rule this repository states clearly and means:

> The interface is near-achromatic **by rule** so that the garment colour is the only chroma
> competing for the eye.

That rule is right, and it is why this ADR amends it rather than deleting it.

## Decision

### 1. The dark ramp lifts, and it **compresses** rather than translating

| token | L before | L after | before | after |
|---|---|---|---|---|
| `background` | 0.135 | **0.175** | `#090807` | `#12100F` |
| `surface.1` | 0.175 | **0.210** | `#12100F` | `#191816` |
| `surface.2` | 0.212 | **0.240** | `#1A1817` | `#201F1D` |
| `surface.3` | 0.248 | **0.265** | `#22211F` | `#262523` |
| `swatch.well` | 0.285 | **0.290** | `#2B2A28` | `#2D2B29` |
| `inverse.foreground` | 0.150 | **0.190** | `#0C0B09` | `#151312` |

Hue and chroma are untouched everywhere. Only lightness moves, and only on the grounds.

**The compression is the interesting part, and it was found by the gate rather than by
design.** The first attempt translated the whole ramp by +0.040, which put `swatch.well` at
0.325 — and gate 9 immediately reported `border.strong` at 2.88:1 and `status.ok` at 4.39:1
against it, both below their floors. The well is a **ground**: lifting it does not lift what
sits on it, it eats the contrast of everything that does.

Scanning the well's lightness against every token that declares a pairing with it gives a hard
ceiling:

| well L | `border.strong` | `status.ok` | `status.warn` | `status.bad` |
|---|---|---|---|---|
| 0.285 *(was)* | 3.32 | 5.07 | 5.23 | 7.90 |
| **0.290** *(is)* | **3.27** | **4.98** | **5.14** | **7.77** |
| 0.310 | 3.05 | 4.64 | 4.80 | 7.24 |
| 0.315 | **2.99** ✗ | 4.56 | 4.71 | 7.11 |
| 0.320 | 2.94 ✗ | **4.48** ✗ | 4.62 | 6.98 |

So the floor rises by 0.040 where the report was about — the big black field — and the lift
tapers to 0.005 at the top, where there is no room. The elevation steps go from 40/37/36/37 to
35/30/25/25: **the ramp is measurably less separated at the top than it was**, and that is the
price of raising the floor without breaking the ground a colour is judged against. It is
recorded here because a later feature tempted to lift the ramp again needs to know the ceiling
is already close.

`swatch.hairline` and `swatch.hairline.inverse` **do not move.** F-068 proved the two-tone
keyline by scanning the sRGB gamut against those exact tones; moving a value a proof was run
against invalidates the proof rather than the value.

### 2. Three accent tokens, and the ceiling gets two more exceptions

| | dark | light |
|---|---|---|
| `accent` | L 0.920 · C 0.110 · h 92 → `#FFE38D` | L 0.385 · C 0.079 · h 98 → `#4F4301` |
| `accent.foreground` | L 0.175 · C 0.004 · h 70 → `#12100F` | L 0.985 · C 0.004 · h 85 → `#FBFAF7` |
| `accent.muted` | L 0.270 · C 0.030 · h 92 → `#2C2615` | L 0.930 · C 0.025 · h 98 → `#ECE8D6` |

Every hex is what `derivedSrgb` produces from the OKLCh beside it (ADR-0043). Measured against
the four grounds each declares:

| | background | surface.1 | surface.2 | surface.3 |
|---|---|---|---|---|
| dark `accent` | 14.99:1 | 14.01:1 | 13.01:1 | 12.10:1 |
| light `accent` | 9.50:1 | 9.78:1 | 9.02:1 | 8.45:1 |

`accent.foreground` on `accent`: 14.99:1 dark, 9.37:1 light. `foreground` / `foreground.2` on
`accent.muted`: 13.73 / 5.96 dark, 14.92 / 5.57 light.

**The ceiling is not waived — its reasoning is preserved and the exception is recorded.** The
rule exists so the interface does not compete with the sample. The accent is therefore refused
on everything that appears beside one: `swatch.well`, both keyline tones, `status.*` and
`chart.*` are unchanged and the accent declares no pairing with any of them. It is spent on
navigation and on the primary action, which are never adjacent to a colour reading.

### 3. The accent joins `NEUTRAL_IN_EVERY_THEME`, and that was forced

`deriveTheme` clamps every tinted token to the chroma ceiling of 0.01. An accent left tintable
would be **flattened to grey in all four derived families** — the gold would exist only in
`base`, and choosing a theme would silently delete the accent.

It is also the right reading independently: a theme tints the chrome, and this is a signal. A
signal that changes colour with the decoration has to be relearned. `ring` is on that list for
exactly this reason.

## Why the light accent is an olive-gold and the dark one is a gold

**On a light theme, "golden yellow" and "warning amber" are the same region of colour space.
That is a measurement, not a preference.**

An accent that clears 4.5:1 on `#FFFFFF` must be dark. A dark gold is a bronze. And
`status.warn` on light *is* a bronze, at h 70 (`#905B06`) — a value approved by a person against
ADR-0098's measurements. The first candidate this feature drew, `#845A00`, measured **ΔE00 5.6**
from it. That is not "similar". That is one colour with two meanings, one of which is *something
is wrong*.

Scanning OKLCh for a light accent that clears contrast on all four grounds **and** stays ΔE00
≥ 18 from every signal and both foregrounds leaves 202 candidates, all of them at h 98–105 and
L 0.38–0.41. `#4F4301` is the warmest of them. On dark there is no squeeze at all: gold sits at
L 0.92, far above every signal, with 23.1 ΔE00 of clearance from `status.warn` and CVD
separation of 97.

### What was NOT required, and why saying so matters

The accent is **not** added to `cvdPairs`. Requiring 60 separation between it and every status
colour would be inventing a bar this system has never applied anywhere: `ring` and `status.ok`
measure **43.3 (dark)** and **32.7 (light)** today, are not in `cvdPairs`, and nobody considers
that a defect — because `statusPairing` guarantees every status carries an icon *and* a text
label, so colour is never the channel. Imposing the new bar on the new token alone, while that
pair sits at 32.7, would be incoherent.

What *is* required is that the accent be a different colour from a signal **to ordinary
vision**, and ΔE00 18 is the floor — derived from this system's own numbers rather than chosen:
`ring`/`border.strong`, an actual `cvdPairs` entry, measures 20.6.

## Alternatives taken seriously

**Move `status.warn` off h 70.** This would free the light accent to be a true gold. Rejected:
those values were approved by a person seven days ago against ADR-0098's measurements, the
salience rank depends on them, and moving a *signal* to make room for *decoration* is the wrong
way round. If the light accent is judged wrong by eye, this is the change to reconsider — and
it needs its own ADR and its own approval.

**Give the light theme no accent.** Rejected: the report asked for both themes, and a product
whose emphasis exists in one appearance and not the other is worse than one with a compromise
in both.

**Accept ΔE00 ≈ 6 from `status.warn`.** Rejected outright. See above.

**Make the accent the focus ring too, so there is exactly one chromatic token.** Deferred, not
rejected. `ring` is blue and in a `cvdPairs` entry; folding it into the accent changes a checked
pair and conflates focus with emphasis, which are different states. F-176 decides whether
*selection* moves from `ring` to `accent`; focus stays where it is.

## Consequences

**Good.** The dark app reads as charcoal. The product has an emphasis colour for the first time,
and it is the same one in all eight palettes. The primary button and the active tab now say
"this one" in a way weight alone could not.

**Bad, and stated rather than discovered later.**

- **The elevation ramp is compressed.** 25 points of L between the top two surfaces where there
  were 37. Tonal elevation is this system's only depth mechanism — shadows and blur are refused
  at parse time — so it has less to work with than it did.
- **`border.strong` on `surface.3` moves from 3.51:1 to 3.65:1** (it improves, because
  `surface.3` moved down), but on `swatch.well` it is 3.27:1 against a floor of 3.0. Thin.
- **The chroma-exception count goes from four to six.** The manifest's own note says the
  exception count should be the real count; it is, and it is now half again as long.
- **The light accent is not the colour that was asked for.** It is the closest colour to it that
  is not the warning colour.
- **Nobody has looked at any of it.** The arithmetic is proven and the perception is not. This
  is the third consecutive feature in this area to end that way (F-161, F-165), which is itself
  the finding: this repository can prove a palette correct and cannot tell whether it is good.
  Both accents and the lifted ground are recorded as an attested criterion against F-175.
