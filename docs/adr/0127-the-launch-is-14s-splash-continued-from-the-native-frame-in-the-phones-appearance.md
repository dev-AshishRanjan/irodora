# ADR-0127 — The launch is 14's splash, continued from the native frame, in the phone's appearance

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-08 |
| **Feature** | F-231 |
| **Builds on** | [ADR-0122](0122-the-mark-is-14s-blossom-in-one-ink-everywhere-its-cuts-drawn-as-holes.md) (the mark), [ADR-0123](0123-a-lockup-is-one-figure-its-intervals-ratios-of-the-names-em-outside-the-spacing-snap.md) (the splash lockup), [ADR-0126](0126-the-icon-is-14s-tile-full-bleed-its-corner-and-its-rim-the-platforms.md) (a lone mark is centred by its ink) |
| **Applies** | R9-MOCKUP-FIDELITY §2, §4 E1 and E4, §6 C4 and C17, §8; golden rules 13 and 14; FR-69, FR-70 |
| **Decided on** | the readings of `14.splash.*` (F-231 increment 1); where the drawing leaves something open, the delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

`14`'s right frame is the launch: the blossom with a glow, *Irodora* and 彩り・色の知性 in one lockup,
a subline, a silk wave and a progress line, on the dark ground. Before F-231 the product had a native
splash (the mark on the ground) and an overlay that drew the mark alone, then faded into the app
(F-190). F-230 found that the two did not agree: the native image drew its mark on a 120 dp grid and
the overlay on a 160 dp one, so the mark grew by a third at the hand-over.

## Decisions

### 1. The native splash draws 14's mark at 14's size

The native splash is an image Expo centres on the phone's `background` at `imageWidth` points; its
mark sits on a grid inside it. That grid, at that width, must be the splash lockup's
(`lockupGeometry('splash').mark`, 154.49 dp at the default text size).

Expo centres the image on a 288·k canvas at an offset of (288 − imageWidth)·k / 2, so at hdpi
(k = 1.5) a width that is not a multiple of 4 lands half a pixel off — sharp refuses it, Jimp rounds
it. The image's grid must also be a whole number of units. The nearest pair is **a 648 px grid (unit
27) on the 1024 canvas, shown at 244 pt: 154.41 dp, 0.08 from the lockup's.** The old 768 grid's
205.99 pt rounds to neither 204 nor 208 within 1.5 dp.

The mark is centred in the image by its ink, as the icon's is (ADR-0126). Android 12 shows the
splash icon through a 192 dp circle; the farthest ink is 81.7 dp from the centre at every density
(`--prove`, and the real prebuild output). The width lives in the generator's drawings table and
reaches `app.config.ts` and the overlay through `brand-assets.json`, so the native frame and the
overlay are drawn from one set of numbers; `launch.test` holds them to the lockup within 0.1 dp.

### 2. The overlay follows the phone's appearance

A native launch screen can follow only the phone's light or dark: iOS's launch storyboard and
Android's `values-night` resources know nothing of a theme chosen in an app. So the overlay is drawn
in the phone's appearance too (`LaunchHost`: a `ThemeProvider` at `system`) — Sumi or Washi, `14`'s
composition in `25`'s palette when light (C17). A theme chosen in the app appears as the overlay
leaves. Following the app's choice instead would flip polarity at exactly the hand-over C17 exists
to make seamless. Recorded in R9 §4 E4; letting Android 13's native splash follow an in-app theme
(`setSplashScreenTheme`) is F-321.

### 3. The hand-over: the native frame, a rise, 14, the app

1. **The first frame is the native frame**: the mark at the native grid, where the image puts it,
   on the same ground, and nothing else. Only then is the native splash hidden (F-190's order).
2. **Over the motion system's `view` step** the mark rises — a translation and a scale, never a
   colour (`motion.animatable`) — to the lockup's mark, while `14`'s composition fades in around it.
   The lockup withholds its own mark's ink meanwhile (`Wordmark`'s `markHidden`), so the blossom is
   never drawn twice.
3. **On arrival** the travelling mark goes and the lockup's is shown: the same component, ink and
   size in the same place, so the swap cannot be seen.
4. **A beat** (`view`), then the overlay fades into the app over `view`.

The rise is about 69 dp at `14`'s frame; Android cannot draw the mark off-centre in its native splash
(69 + 81.7 dp would leave the 96 dp circle), so the movement has to happen in the overlay. Under
reduced motion every step is zero: the composition is at rest at once and the overlay leaves on the
next tick. The ambient motion — the wave's drift, the glow, the line moving between its steps — is
F-266's; it may animate transforms and opacities only.

### 4. The composition is laid out by its ink, and the rest snaps

The lockup's box is its ink (ADR-0123). **The lockup and the subline are one group, centred in the
window**: `14` draws the group's centre 3 dp from the frame's (the lockup alone sits 15 dp above it,
which the test keeps as a decoy). The rest snaps to the R9 scale (§2):

| what | `14` (dp) | built |
|---|---:|---:|
| subline: lockup's ink to the caption's line box (its ink gap 22.9, less the caption's ~4 dp to its cap top) | 18.9 | 16 |
| the line's ends, in from the screen's sides | 27.4 · 28.0 | 24 |
| the line's foot, up from the screen's | 47.7 | 48 |
| the line's thickness | 4.2 | 4 |
| the wave's lines to the line | 16.6 | 16 |

The wave is `silk-wave` across the screen at its own 4:1 box, placed by where its lines end (20.4 of
its 24 units, read back out of the drawing by the test). The subline is set in the platform's sans
(ADR-0057 §6), whose cap top sits about 4 dp into a caption line on both platforms (SF Pro's and
Roboto's metrics give 4.1 and 3.9); that estimate is F-267's to confirm on a device.

### 5. The glow is the mark blurred — a mask the generator computes

`14`'s glow is the mark's own ink blurred behind it (`glow-fit.mjs`: sigma 0.157 of the grid, opacity
0.602; the best radial profile fits worse, because the glow is brighter in the notches). A radial
gradient would not draw it, and **react-native-svg's `FeGaussianBlur` would not draw it the same on
both platforms**: on Android it is RenderScript, which doubles the deviation and caps the radius at
25 px — at a 154 dp mark on a 3× screen, sigma is 73 px.

So the generator blurs the mark's geometry exactly, once, into **`launch-glow.png`: white, its alpha
the blurred ink times 0.602**, and the overlay draws it tinted with the mark's own token
(`foreground`). It is the overlay's only bitmap, and not a picture of the mark: it is computed from
the same geometry, `--check` byte-compares it, and `--prove` refuses a radial glow and one too wide for
its canvas. In Washi the same token makes it a soft dark halo — C17 is ⇄, and F-267 compares it.

### 6. The progress line says how far the launch has got

`14` draws a progress line (`engine:launch.progress`). Nothing loads after the first frame — every
face loads behind the native splash, and the stored choices are read synchronously — so a loading
percentage would be a number nobody computed. The line is `launchProgress`: how much of the rise and
the hold has elapsed, at each step it reaches — 0 at the first frame, 0.5 on arrival, 1 as it leaves.
`14`'s ~80 % is sample content (E1). F-266 moves it between the steps. Recorded in R9 §8.

### 7. Japanese text declaring its language is not decided here

The overlay is hidden from the accessibility tree, so its tagline is never announced and F-231 has
nothing to declare. The product-wide question — WCAG 2.2 SC 3.1.2 (Language of Parts), where React
Native exposes `accessibilityLanguage` on iOS only and TalkBack reads a `LocaleSpan` React Native does
not expose — touches every Japanese text node in both locales. It is F-319's.

## Consequences

- A cold start is one picture: the native mark, the same mark in the overlay's first frame, `14`'s
  splash, the app. In light mode it is Washi throughout.
- About 780 ms of overlay (three `view` steps) sits over an app already mounted beneath it; F-268
  measures cold start with it.
- `Wordmark`'s splash form gains `markHidden` and `onGeometry`; `@irodora/ui` gains `ProgressBar` and
  exports `SYSTEM_APPEARANCE`.
- **Attested, not tested here:** the hand-over on iOS and Android in both appearances; the light
  glow; the subline's cap top; reduced motion on a device.

## Alternatives considered

- **Cross-fade from the lone mark to the composition.** Rejected: the blossom would show in two
  places at once, which is the jump this exists to remove.
- **Draw the lockup in the native splash.** Rejected: Android 12's splash shows one centred icon
  through a 192 dp circle, and the lockup is 199 × 263 dp.
- **Follow the in-app theme.** Rejected: a dark native splash under a Washi app would flip twice.
- **An SVG blur.** Rejected for Android's RenderScript cap (decision 5).
- **A radial gradient for the glow.** Rejected: the reading says the glow follows the petals.
