# E-181 — The overlay continues the native frame, in the phone's appearance

**Link:** the launch's hand-over contract — `LaunchHost`'s system `ThemeProvider`, the travelling mark
starting at the native grid and place, the lockup withholding its mark until the travelling one arrives
(`Wordmark`'s `markHidden`, `onGeometry`), the glow mask as the overlay's one bitmap → `app/_layout.tsx`,
`src/launch.tsx`, `packages/ui/src/brand.tsx`, `verify-app-glyphs.mjs`'s exemption
**Guard:** `launch.test` (26: the first frame, the composition in Sumi and Washi and Japanese, the layout
against 14's boxes, the blossom shown once, the phone over an in-app Slate with the host-less decoy, the
order); `brand.test` for the two props; `verify-app-glyphs --prove` for the mask import
**Severity:** high **Feature:** F-231

---

## Why B changes when A does

The native splash can follow only the phone's light or dark, so the overlay that continues it must too:
moving the overlay into the person's theme would flip polarity at the hand-over C17 exists to make
seamless. And the blossom must be drawn once — the lockup's own mark stays hidden until the travelling one
reaches it. A change to `Wordmark`'s splash form, to the root layout's provider order, or to the overlay's
sequence can break either without any colour or size changing.

## The one bitmap

The glow is a mask the generator blurs from the mark's geometry, tinted with `foreground`. Its import is the
one image `verify-app-glyphs` allows in app source, by default binding, in `src/launch.tsx` alone; any other
image there, or this one anywhere else, is refused.
