# Plan: F-231 — The app icon, the adaptive and themed icons, and the splash are mockup 14

| | |
|---|---|
| **Feature** | F-231 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69 — [`docs/PRD.md`](../../docs/PRD.md) (*the icon and splash are declared in `app.config.ts` and asserted present in the built artefact, so a placeholder cannot ship*), under NFR-8 (a11y, contrast) and NFR-10 (cvd) |
| **Service / package** | `scripts/` (`generate-brand-assets.mjs`, `png.mjs`, `verify-apk.mjs`, new `brand-checks.mjs`, new `verify-native-assets.mjs`) · `apps/mobile` (`app.config.ts`, `src/launch.tsx`, `app/_layout.tsx`, `assets/brand/`, i18n) · `@irodora/ui` (new `ProgressBar`) · `mockups/` (14's inventory, one tool) · `.github/workflows` |
| **Author** | The planner subagent, adopted with the amendments below by the implementing session |
| **Date** | 2026-10-07 |

---

## Findings in the tree that shape criterion 5

The planner read the current tree before planning, and four findings change what criterion 5 asks
for:

1. **Gate 16 would refuse the real splash logo.** `expo-splash-screen` 57 composites the splash image,
   sized to `imageWidth`, onto a transparent 288·k canvas
   (`expo-splash-screen/plugin/build/withAndroidSplashImages.js:100-122`). So `splashscreen_logo.png`
   draws the mark at (imageWidth / 288) · 0.75 of its width, which is 0.417 today. But
   `verify-apk.mjs:88-92` (`signaturesFor`) checks it against the icon's 768/1024 = 0.75 signature. The
   prebuild output (`android/app/src/main/res/drawable-night-xxhdpi/splashscreen_logo.png`: an 864 px
   canvas, the mark about 41 % wide) confirms it, so the next release build fails gate 16.
2. **Gate 16 has never read a launcher icon.** Expo writes the launcher layers as **PNG bytes in
   `.webp`-named files** (`@expo/image-utils/build/Image.js:82,118`;
   `@expo/prebuild-config/…/withAndroidIcons.js:78-82`). `verify-apk.mjs:632` filters by the `.png`
   extension, so it skips every one, and only the splash logo is ever decoded. In a release build with
   shortened paths, aapt2 badging resolves to the anydpi XML, so nothing is read and the gate prints a
   note. F-230's third attestation assumed coverage that does not exist.
3. **A release build may break the decoder.** aapt2 crunches `.png` resources and may emit palette
   PNGs (colour type 3), which `decodePng` refuses (`png.mjs:128-130`). The first CI artefact must
   confirm it.
4. **The iOS prebuild cannot run on this workstation.** `@expo/cli` drops iOS from prebuild on win32
   (`resolveOptions.js:208-214`), so the iOS project-output check runs only in CI (ubuntu). Gate 16,
   its `--prove`, and anything that needs a device or Xcode cannot run here either.

## Intent

What a person sees when this is done:

1. **The home-screen icon is 14's tile.** It is a dark tile, lighter at the top, that sinks into the
   ground at its foot. The silver blossom sits at 14's proportion, and the corner is the one the phone
   itself cuts. iOS and Android show the same picture, and Android does so under every launcher shape.
2. **With Android 13 themed icons on, the icon is the blossom alone**, tinted by the phone.
3. **Launch is one continuous picture.** The native splash shows the blossom on 14's ground at exactly
   the size 14 draws it. Our first frame is that same frame. The blossom then rises into 14's full
   composition — its glow, "Irodora" and 彩り・色の知性, the subline, the silk wave and the progress
   line — and fades into the app. The mark no longer grows by a third at the hand-over.
4. **On a light phone, the same launch is drawn in Washi (25's palette)**, with no dark frame before it.
5. **A build carrying a default or stale icon or splash fails a check**: on Android from the APK, and
   on iOS from the project Xcode compiles.

**Readings chosen where the criteria are ambiguous.** Each is stated so the one review can contest it.

- **(a) "the tagline" in criterion 3 is `14.splash.subline`** ("Deterministic Colour Engine • 100%
  On-Device & Offline"). The feature's notes call it the tagline; 彩り・色の知性 is named separately in
  the same criterion.
- **(b) The "squircle" is the platform's mask, not pixels we draw.** `14.icon.tile.raw` already says
  so: *the asset is the platform's square, and the OS applies the corner mask the render shows*. So the
  icon asset is full-bleed. Apple's guidance asks for a square, unmasked icon, and pre-rounded corners
  would show black on iOS, which flattens alpha.
- **(c) "inside the 66 dp safe zone on every launcher mask"** is proven by computation over AOSP's
  circle, squircle, rounded-square and teardrop paths, plus the 66 dp circle every mask must contain.
  Real launchers are a device attestation.
- **(d) "without a gap" means no blank frame and no jump.** The overlay's first frame equals the native
  frame: the same mark, size, position and ground. The move into the composition is opacity and
  transform only. Under reduced motion it is a cut, which is what reduced motion asks for.
- **(e) "Light appearance" is the phone's light appearance.** It is the only appearance a native launch
  screen can follow. The overlay follows it too, so the hand-over never flips polarity.
- **(f) "the iOS build is asserted" means the iOS project that `expo prebuild` generates**: the asset
  catalog, the colour sets and the storyboard, which is what Xcode compiles. It is asserted in CI on
  Linux. The compiled IPA is attested, because no CI job here has macOS.
- **(g) The progress line is a figure, so its fill is a defined computation** (mockups rule 2). 14's
  roughly 80 % fill is sample content (E1).

## Approach

**Reused (verified in the tree):**

| What | Where | Used for |
|---|---|---|
| `markGeometry`, `coversGrid`, `render` (supersampled, integer unit), `expectedSignature`, `oneInk`, `--check`, `--prove`, `palette()` | `scripts/generate-brand-assets.mjs` | every asset, the proofs, the byte-compare |
| `encodePng`, `decodePng`, `carriesMark` (two tiers), `downscale` | `scripts/png.mjs` | the assets and the artefact reading |
| The ZIP/AXML reader, the aapt2 oracle, the `--prove` scaffolding | `scripts/verify-apk.mjs` | gate 16 |
| The "config half on every PR" pattern, run after gate 6 | `scripts/verify-manifest-permissions.mjs`, `.github/workflows/ci.yml` | the prebuild-half check |
| `Mark`, `Wordmark form="splash"`, `lockupGeometry`, `LOCKUP_SPLASH`, `markInkBox` | `packages/ui/src/brand.tsx` | the lockup and the hand-over mark |
| `Illustration name="silk-wave"` (box 96 × 24) | `packages/ui/src/Illustration.tsx:557` | the wave |
| `ThemeProvider`, `SYSTEM_APPEARANCE`, `resolveThemeName` | `packages/ui/src/theme.tsx` | the overlay follows the phone, as the native splash does |
| `useMotion` (`duration`, `timing`, `reduced`), the motion tokens (`view`, `out`) | `packages/ui/src/motion.tsx`; the manifest's `motion` | the hand-over |
| `useMessages` | `apps/mobile/src/i18n/useMessages.ts` | the overlay's copy |
| `IDENTICAL_BY_DESIGN` (cap 3, empty today) | `apps/mobile/src/i18n/ja.ts`, `test/i18n.test.ts` | 彩り・色の知性, identical in both locales |
| The `SURFACE` / `textToken` role mapping | `packages/design-tokens/test/inventory-roles.ts` | inventory roles → manifest tokens |
| The E-157 recompute-from-inventory pattern | `packages/ui/test/slider.test.tsx` et al. | `PROGRESS_TRACK`, `LAUNCH_GLOW`, the icon proportion |
| `measure.ps1`, `mark.ps1`, `mark-fit.mjs --box`, `corner.ps1`, `art-measure.ps1`, `generate-inventory.mjs` | `mockups/tools/` | increment 1 |
| `@irodora/color-difference` ΔE00, and `@irodora/color-core` if a gradient is fitted in OKLab | the built `dist`, imported as `generate-design-tokens.mjs` does | binding the tile to tokens — **never a second conversion in `scripts/`** |

**New:**

- `scripts/brand-checks.mjs`: the per-layer verdicts the gate and the prebuild check share —
  `checksFor(resourceName)`, `carriesTile`, `splashSignature`, the launcher-mask set and `insidePath`,
  and Expo's transforms as data (48·k cover, 108·k cover, the round mask, the 288·k splash canvas).
- `scripts/verify-native-assets.mjs` (+ `--prove`): the prebuild half of criterion 5.
- Generated: `apps/mobile/assets/brand/adaptive-background.png`, and
  `apps/mobile/assets/brand/brand-assets.json` — the drawings table (each asset's canvas, grid, ink and
  ground, plus `splash.imageWidth`).
- `packages/ui/src/ProgressBar.tsx`: `ProgressBar` and `PROGRESS_TRACK` (the inventory's
  `new:ProgressBar`).
- In `apps/mobile/src/launch.tsx`: `LaunchHost`, `launchLayout()`, `launchProgress()`, `LaunchGlow`,
  `LAUNCH_GLOW`, `SPLASH_MARK`.
- `mockups/tools/glow-fit.mjs` (+ a README row), and the inventory element `14.splash.glow`.
- **ADR-0126** (the icon) and **ADR-0127** (the launch). Effect links from **E-178**. Backlog features
  from **F-319**.

### Decision 1 — The tile (criterion 1)

- **Colours are tokens, not readings** (P4; `inventory.schema.json`'s `measured`: *the token above is
  what the build uses*). Re-read the tile's gradient in increment 1 and bind each end to the nearest
  dark surface token when it is within the instrument's error (ΔE00 ≈ 2, `mockups/tools/README.md`,
  plus this image's own ground offset — §2: the declared ground `#15171B` reads `#181B20`).
  - Expected: **top = `surface.2` `#282C35`** (from the raw `#2B2F34`, ΔE00 ≈ 2.4 — computed with
    `@irodora/color-difference` in increment 1); **foot = `background` `#15171B`**, since the inventory
    says the gradient *reaches the ground by y ≈ 748*.
  - Recorded in `14.icon.tile.tokens` as `{ bgTop: 'level2', bgBottom: 'ground' }`, keeping `measured`.
  - If an end is not within error, mint `icon.tile.top` / `icon.tile.bottom` (usage `surface`, pairs
    with `foreground.2`) in ADR-0126, under the 0.026 chroma ceiling, so no C10 exception is needed.
  - Golden rule 12 is not engaged: these are chrome tokens with the manifest's provenance, not colour
    data.
- **Profile.** Vertical (the left and right columns must agree band by band), from the top token at
  row 0 to the foot token at the measured fraction (about 0.91 of the square), then flat. Fit linear in
  encoded sRGB against OKLab L: a plain 8-bit lerp if encoded sRGB fits, otherwise convert through
  `@irodora/color-core`. Each pixel row is computed and rounded with no dithering, so the output is
  deterministic.
- **Full-bleed and opaque.** `icon.png` is 1024², the gradient edge to edge (iOS rejects alpha). The
  corner is the OS's.
- **The mark's proportion is 14's on every platform.** 14 draws the grid at 2 · 56.44 / 186 = **0.607
  of the tile**. iOS and legacy launchers: grid **624/1024** (unit 26, 0.609, +0.4 %). The ink stays
  `foreground.2` (14's `text.secondary`).
- **Centring.** 14 reads ink-box-centred 1.0 px off and grid-centred 2.4 px off, on a tile whose foot
  edge is invisible — not decisive. Keep grid-centred unless the sub-pixel re-read separates the two by
  more than 1 px; if it does, a `dy` enters the drawings table and `expectedSignature`.
- **`oneInk` takes a per-row ground.** A tile pixel must lie on the line from its row's tile colour to
  the ink. The two-ink decoy must still be refused.

### Decision 2 — The adaptive and themed layers (criterion 2)

- **Layer geometry.** Android shows the central **72 of 108 dp** and guarantees the central **66 dp
  circle**. F-230's `ADAPTIVE_GRID` 624/1024 fills the safe circle, which makes the mark **0.914 of the
  visible tile**, against 14's 0.607. Re-derive it from 14: adaptive canvas **1188** (108 dp × 11 px),
  grid **480** (unit 20) — 480 / 792 visible = **0.606 of the tile** (−0.13 %); the reach, 240 px, is
  inside the 363 px safe radius.
- **The background layer.** A new `adaptive-background.png` (1188², opaque) carries the same gradient
  over the visible band (y = C/6 to C/6 + 0.91 · 2C/3), clamped outside it so parallax shows no edge.
  `app.config.ts`'s `adaptiveIcon` gains `backgroundImage`, and Expo writes `ic_launcher_background`.
- **The themed layer.** The mark alone, on the same 480/1188 grid, transparent and one ink. The
  launcher tints it.
- **Every mask, proven** in `--prove`: compose background + foreground at 108 dp, apply the circle,
  squircle, rounded-square and teardrop masks (AOSP's paths, pinned by URL and commit, in a 100-unit
  box mapped to the 72 dp viewport), and assert that each mask contains the 66 dp circle (a
  transcription check) and that every ink pixel is inside each mask and the safe circle. Decoy: a
  768/1024-grid mark is cut by the circle. Cite `developer.android.com/develop/ui/views/launch/icon_design_adaptive`.

### Decision 3 — The native splash at 14's size, from one number (criterion 3, the defect)

- 14's splash grid is `lockupGeometry('splash').mark` = 2.508 × 59.7 × 24 / 23.2602 = **154.49 dp**.
- Expo needs `imageWidth × {1, 1.5, 2, 3, 4}` to be whole. With the splash grid kept at 768/1024
  (0.75), **`SPLASH_IMAGE_WIDTH = 206`** gives **154.5 dp** (0.01 dp from the lockup).
- **Android 12+ circle.** The splash icon is 288 dp, masked to a 192 dp circle (radius 96). The reach
  is 77.25 dp, so it fits. Proof decoy: width 260 gives 97.5 > 96. Baking 14's off-centre position
  into the image is impossible on Android (69 + 77 dp > 96), which is why the overlay animates the rise.
- **One home for the number.** The generator owns the asset geometry and writes `brand-assets.json`.
  `app.config.ts` re-exports `SPLASH_IMAGE_WIDTH` from it; `launch.tsx` derives
  `SPLASH_MARK = imageWidth × grid / canvas`; `launch.test` requires
  `|SPLASH_MARK − lockupGeometry('splash').mark| ≤ 0.05 dp`, with the old 160 (a 120 dp grid) as the
  decoy. `turbo.json` `globalDependencies` gains the JSON, beside `mark-geometry.json`.

### Decision 4 — The overlay: palette, composition, hand-over (criteria 3 and 4)

- **The overlay follows the phone, as the native splash does.** The native launch screen can only
  follow the system appearance, so `LaunchHost` wraps `Launch` in
  `<ThemeProvider appearance={SYSTEM_APPEARANCE}>`, which resolves to Sumi or Washi — the same two
  backgrounds the config gives the native splash. An in-app theme (Slate, Obsidian, device, or a manual
  Washi on a dark phone) appears as the overlay fades. Recorded as a new R9 §4 E4 bullet (the splash in
  a theme no mockup draws); Android 13's `setSplashScreenTheme` route is a backlog feature.
  `_layout.tsx` renders `LaunchHost` in place of `Launch`, still inside `FontGate` and the display
  provider.
- **Layout** (`launchLayout(window, scale)`: pure, absolute positions, from `useWindowDimensions`):
  - **The lockup and the subline as one group, centred in the window.** In 14 the group's ink centre is
    2.5 dp from the frame's centre, so the rule reproduces 14 within the reading with no magic offset.
  - **The subline** sits under the lockup's ink at 14's 20 dp, snapped by §2 (a tie takes the smaller
    step) to **16**: centred, may wrap (A7), `caption`, sans, `foreground.2`.
  - **The bottom group:** the progress line's foot at 14's 45.5 dp above the frame's foot → **48**;
    side insets 27 → **24**; the wave above it at full width, aspect 4:1, placed by its re-read ink box
    (F-229 found its box contaminated by the bar). 48 dp clears every bottom inset current phones
    report, so the overlay reads no safe-area insets.
- **The glow.** A `RadialGradient` on the mark's grid centre: `stopColor = colors.foreground` (the
  mark's ink, a token), stop opacities from the measured profile, behind the lockup so the cuts show it
  (ADR-0122 §3). `LAUNCH_GLOW` (peak, radius) is recomputed by `launch.test` from `14.splash.glow.raw`.
  No new colour, so no C10 exception. In light (C17) the same token gives a soft ink halo on Washi —
  recorded in ADR-0127 and named for F-267 (C17 is ⇄). It is static here; F-266 animates it.
- **The hand-over** (opacity and transform only — the manifest's `motion.animatable`):
  1. **First frame = native frame.** A hand-over `<Mark size={SPLASH_MARK} color="foreground">`
     centred in the window on `background`, with the composition at opacity 0. Then `onShown()`.
  2. Over `view`: the hand-over mark translates (and scales, if text is enlarged) to the lockup mark's
     computed position, and the composition fades in.
  3. The hand-over mark leaves once it coincides with the lockup's mark (the same component, ink and
     size, so the swap is invisible).
  4. Hold `view`, then leave over `view` (the existing fade).
  - **Reduced motion:** the composition at rest at once, then through (`duration` is 0) — today's rule.
  - F-266 owns only the ambient motion: the wave's drift, the glow, the progress interpolation.
- **Progress** is `launchProgress(phase)`: the hand-over's elapsed fraction of arrive + hold. Nothing
  loads after the first frame (the fonts finish behind the native splash and the store reads are
  synchronous), so a loading percentage would be invented. F-231 renders the true value at each phase
  boundary — 0 at the first frame (invisible), **0.5** at rest, **1** at leave; reduced motion gives 1 —
  and F-266 interpolates. Recorded in ADR-0127 and R9 §8.
- **Copy.** `brand.taglineJa` = `彩り・色の知性` in **both** catalogues, added to
  `IDENTICAL_BY_DESIGN` with a comment naming `14.splash.tagline` (`copy.script: japanese`).
  `brand.splashSubline`: English exactly as drawn; Japanese a factual translation. `pnpm test:content`
  re-subsets the gothic face if the Japanese subline adds kanji, and E-174's font test re-reads GOTHIC.

### Decision 5 — The artefact assertions (criterion 5)

- **Shared verdicts** in `brand-checks.mjs`, routed by resource name:

| resource | check |
|---|---|
| `ic_launcher_foreground`, `ic_launcher_monochrome` | the adaptive signature (480/1188); the monochrome also one ink with alpha |
| `ic_launcher`, `ic_launcher_round` | the icon signature (624/1024) + `carriesTile` (the round one inside its circle only) |
| `ic_launcher_background` | `carriesTile` and **no mark**: rows uniform, column monotone, ends at the tile's tokens |
| `splashscreen_logo` (and `-night`) | `splashSignature` = (imageWidth / 288) · 0.75 + one ink, light/dark `foreground` |
| a shortened path | any of the above |

- **`png.mjs`** decodes colour type 3 (PLTE + tRNS, depths 1/2/4/8), with a hand-assembled palette PNG
  round-trip proof and a wrong tRNS as the decoy.
- **`verify-native-assets.mjs`** runs here after `pnpm build` (which runs `expo prebuild --clean`) and
  in CI after gate 6:
  - **Android:** every `mipmap-*/ic_launcher*.webp` and `drawable-*/splashscreen_logo.png` at Expo's
    sizes (48·k, 108·k, 288·k), decoded by **magic bytes**; `mipmap-anydpi-v26/ic_launcher.xml` names
    background, foreground and monochrome; `values/colors.xml` and `values-night/colors.xml`
    `splashscreen_background` are the light and dark `background`; `styles.xml` names
    `windowSplashScreenAnimatedIcon`.
  - **iOS** (only when `ios/` exists; CI passes `--require-ios`): the AppIcon 1024 PNG (opaque, tile +
    icon signature); `SplashScreenLogo.imageset` light and dark at 206·k px with the 0.75 grid; the
    `SplashScreenBackground` colour set, light and dark; the storyboard's image width, 206.
  - On win32 it prints **iOS: NOT RUN (prebuild skips iOS on win32)** and never claims a pass.
- **`verify-apk.mjs`:** decode by PNG signature whatever the extension; a launcher layer that cannot be
  read (real RIFF/WEBP, or nothing resolvable) is a **failure**, not a note; when aapt2 is present, map
  every file to its resource name with `aapt2 dump resources`, so shortened release paths route
  correctly, and read `color/splashscreen_background` (default and night) and `color/iconBackground`;
  `--prove` gains aapt2-built fixtures with `res/`.
- **Workflows.** `ci.yml` runs the prebuild-half check and its proof after gate 6. `android-build.yml`
  and `release.yml` run `verify-apk.mjs --prove` before gate 16 (nothing runs it today).

### Decision 6 — Japanese text declaring its language: not in F-231, recorded

The overlay is hidden from the accessibility tree (`launch.tsx:127-128`), so the tagline is never
announced and F-231 has nothing to declare. The product-wide question is real — **WCAG 2.2 SC 3.1.2
Language of Parts (AA)**, inside NFR-8 — but React Native exposes `accessibilityLanguage` on iOS only
(VoiceOver's voice choice); Android has no prop, and TalkBack reads a `LocaleSpan` React Native does
not expose. The seam is `Text` when `script === 'japanese'`, which touches every Japanese node in both
locales. That breadth is a feature of its own: **record it as backlog F-319**, with this analysis, the
iOS/Android asymmetry and a conformance assertion (golden rule 2).

### Increments (each ends green, one commit each)

0. **Claim and plan.** F-231 `in_progress` with a `plan` field; this file; `verify-state`.
1. **Re-read 14 (the specification record).** The tile's profile (4 px bands every 6 px over
   y 582–760, columns x 124–150 and 272–298, with `measure.ps1 mean`; the ground beside the tile at
   x 75–95, y 600–700); the tile's edges and the mark's ink box (`measure.ps1 edges`,
   `mark-fit.mjs --box`); the glow (a new `glow-fit.mjs` over a `mark.ps1` dump of x 455–662,
   y 505–672, with `--calibrate` through JPEG q85 as `mark-fit` does — the radial excess over the
   ground beyond the petals and in the cuts, as a fraction of `foreground`'s luma); the wave
   (`art-measure.ps1` on y 835–897, above the bar); the progress line (its thickness at half maximum and
   its ends). Update `inventory-data/14.mjs` (the tile's `tokens` and `raw`, a new `14.splash.glow`, the
   wave's box, the progress `raw`) and regenerate 14.json. Gates: state, lint, test, format.
2. **The tile and the icon (criterion 1).** The `DRAWINGS` table, the gradient ground in `render`,
   `icon.png` at 624, the per-row `oneInk`, `brand-assets.json`; `--prove` cases (the proportion
   recomputed from 14.json, with 768/1024 and F-230's 0.914 as decoys; flat, reversed and light tiles;
   launcher densities at 48·k). ADR-0126 started. Gates: lint (`--check`, `--prove`), test, state.
3. **The adaptive and themed layers (criterion 2).** The 1188/480 foreground and monochrome,
   `adaptive-background.png`, `backgroundImage`; the mask proofs (AOSP paths pinned) and the safe
   circle; the adaptive densities at 108·k. ADR-0126 finished. Gates: lint, typecheck, build, test.
4. **The native splash at 14's size.** `SPLASH_IMAGE_WIDTH` = 206 via the JSON; the Android 12 circle
   proof; the interim `Launch` draws `<Mark size={SPLASH_MARK}>`, which alone fixes the 120-vs-160
   defect; `launch.test` gets the agreement assertion and the 160 decoy. Gates: typecheck, lint, test,
   build.
5. **`ProgressBar` in `@irodora/ui`.** Track `border`, fill `foreground`, pill radius;
   `PROGRESS_TRACK` recomputed from `14.splash.progress.raw`; the fill is a `scaleX` transform from the
   leading edge, **never `width`**, so F-266 can animate it; decorative unless `label` is given (then
   `accessibilityRole="progressbar"` and an `accessibilityValue`). Exported and registered in the
   conformance suite. Gates: typecheck, lint, test, a11y, contrast.
6. **Catalogue copy.** `brand.taglineJa`, `brand.splashSubline` (en, ja), the `IDENTICAL_BY_DESIGN`
   entry, a font re-subset if needed. Gates: test, `test:content`, lint (claims).
7. **The composition and the hand-over (criteria 3 and 4).** `LaunchHost`, `launchLayout`,
   `LaunchGlow`, the lockup, subline, wave and progress line, the sequence and reduced motion;
   `_layout.tsx`; `launch.test` rewritten; ADR-0127 and R9 §4 E4, §6 C4/C17 and §8. Gates: typecheck,
   lint, test, a11y, contrast, cvd, build.
8. **The shared checks and the prebuild half (criterion 5, part 1).** `brand-checks.mjs` (the routing,
   `splashSignature` with the F-230 defect as its regression decoy, `carriesTile`); palette decoding in
   `png.mjs`; `verify-native-assets.mjs` with `--prove` (on a temp copy under `.cache/`, never planting
   in the tree); the `ci.yml` steps. Gates: lint, build, then the new check and its proof here (the
   Android half).
9. **The artefact (criterion 5, part 2).** `verify-apk.mjs`: magic bytes, routing, failing when
   unreadable, aapt2 resource mapping, splash colours, `--prove` fixtures; the workflow steps; the
   gates.json `artifact` description. `verify-apk --prove` **cannot run here** and is recorded as not
   run.
10. **Close-out.** Effects (new and updated) with their memory notes; `attested` entries; backlog
    F-319–F-321; notes on F-266, F-267, F-268, F-269 and F-221; BRAND.md if it describes the icon;
    `progress.md`. Then the evaluator, **once**: fix or record its findings, re-run the gates, done.

## Mockup fidelity

- **Governing mockup:** `14`. Variants: `25`'s palette for light (C17, P2); `26` governs the Japanese
  subline's register (P2). No `27` state.
- **Inventory → build** (dp at 1.3521 dp/px; the frame is 384 × 804.5):

| element | component | token: dark / light | 14's size and place | built as |
|---|---|---|---|---|
| `14.icon.tile` | `app:AppIcon` | `bgTop` level2 → `surface.2`; `bgBottom` ground → `background` (measured `#2B2F34` / `#1B2024`). No light icon | square; the gradient reaches the ground at ≈ 0.91 of its height; the corner is the OS's (`raw.cornerPx` 34 is the mask's) | `icon.png` 1024 · `adaptive-background.png` 1188 (792 visible) |
| `14.icon.tile.mark` | `ui:Mark` | `text.secondary` → `foreground.2` | grid 0.607 of the tile | 624/1024 · 480/792 visible · the monochrome on the same grid |
| `14.splash.lockup` | `ui:Wordmark` | — | ink 199 × 262.5; the group with the subline centred in the window | `Wordmark form="splash"` |
| `14.splash.mark` | `ui:Mark` | `text.primary` → `foreground` | grid 154.5 (ink 150 × 146) | the lockup's member; the native splash and the hand-over mark at 206 × 0.75 |
| `14.splash.glow` (new) | `app:LaunchGlow` | `text.primary` → `foreground` at `LAUNCH_GLOW`'s opacities | from `glow-fit` | a radial gradient behind the lockup |
| `14.splash.wordmark` | `ui:Text` serif `wordmarkSplash` 400 | `foreground` | em 59.7 | a lockup member (ADR-0123: no snap inside) |
| `14.splash.tagline` | `ui:Text` gothic `title` 400 | `foreground` | em 22 | a lockup member; `static:brand.taglineJa` |
| `14.splash.subline` | `ui:Text` sans `caption` 400 | `text.secondary` → `foreground.2` | 339.5 × 16; 20 under the lockup's ink → **16** (§2) | `static:brand.splashSubline` |
| `14.splash.wave` | `ui:Illustration` `silk-wave` | `text.tertiary` → `foreground.3` | full width, 4:1, the box re-read above the bar | `Illustration` |
| `14.splash.progress` | `new:ProgressBar` | track `border.subtle` → `border`; fill `foreground`; radius `pill` | 330 × 7; foot 45.5 → **48**, insets 27 → **24** (§2); thickness re-read | `ProgressBar`, `engine:launch.progress` = `launchProgress` |

- **Bindings (§8):** a row for `14` — the progress line → `launchProgress` (ADR-0127), F-231. The copy
  comes from the catalogue. No mockup content ships: the ~80 % fill is E1.
- **Departures:** none from 14 is expected. The corner mask is the platform's, by 14's own record. The
  splash in Slate, Obsidian or device, and an in-app theme that differs from the phone, become a **new
  §4 E4 bullet** (a capability no mockup draws). **If the re-read finds something unbuildable** (for
  example a rim highlight on the tile's edge, which a full-bleed asset cannot place under an OS mask,
  or a non-vertical gradient), **stop**: it is an open question, decided by research under the
  2026-10-05 delegation with an ADR, not a plan item.

## Files to touch

```
mockups/tools/inventory-data/14.mjs, mockups/inventory/14.json   — the re-reads; 14.splash.glow; tile tokens
mockups/tools/glow-fit.mjs (+ README.md row)                      — the glow instrument, with --calibrate
scripts/generate-brand-assets.mjs                                 — DRAWINGS, gradient ground, 624 / 1188·480, background layer, brand-assets.json, proofs
scripts/brand-checks.mjs (new)                                    — per-layer verdicts, masks, Expo's transforms
scripts/png.mjs                                                   — palette (type 3) decoding
scripts/verify-native-assets.mjs (new)                            — the prebuild half, Android + iOS
scripts/verify-apk.mjs                                            — routing, magic bytes, fail-closed, aapt2 resources, splash colours, --prove fixtures
apps/mobile/assets/brand/*.png, brand-assets.json                 — regenerated
apps/mobile/app.config.ts                                         — SPLASH_IMAGE_WIDTH from the JSON (206); adaptiveIcon.backgroundImage
apps/mobile/src/launch.tsx, apps/mobile/app/_layout.tsx           — LaunchHost, the composition, the hand-over
apps/mobile/src/i18n/en.ts, ja.ts                                 — brand.taglineJa, brand.splashSubline; IDENTICAL_BY_DESIGN
apps/mobile/assets/fonts/* (if re-subset)                         — via generate-font-subset.mjs
packages/ui/src/ProgressBar.tsx, index.ts                         — new:ProgressBar
packages/ui/test/progress-bar.test.tsx, conformance               — tests, the registry
apps/mobile/test/launch.test.tsx                                  — rewritten
turbo.json                                                        — globalDependencies += brand-assets.json
.github/workflows/ci.yml, android-build.yml, release.yml          — the prebuild half + proof; verify-apk --prove
.harness/verification/gates.json                                  — the artifact description
docs/adr/0126-…, 0127-…                                           — new
docs/design/R9-MOCKUP-FIDELITY.md                                 — §4 E4, §6 C4/C17, §8
.harness/state/{effects.json,feature_list.json,progress.md}, .harness/memory/effects/*
```

## Anticipated effects

| id | from → to | guard |
|---|---|---|
| **E-178** | `brand-assets.json` (generator-owned geometry and `imageWidth`) → `app.config.ts`, `launch.tsx`, `brand-checks.mjs`, `verify-apk.mjs`, `verify-native-assets.mjs`, `launch.test` | `--check`; `launch.test`'s native-vs-lockup ≤ 0.05 dp (decoy 160); the prebuild-half check against Expo's real output |
| **E-179** | the tile's tokens → `icon.png`, `adaptive-background.png`, `carriesTile` | `--check`; the `--prove` tile cases with decoys; gate 9 if tokens are minted |
| **E-180** | Expo's native transforms (the 288·k splash canvas and `imageWidth`; 48·k / 108·k cover; the round mask; PNG in `.webp`; iOS AppIcon / SplashScreenLogo / colour set / storyboard) → `brand-checks.mjs`, `verify-native-assets.mjs`, `verify-apk.mjs` | the prebuild-half check reads the actual prebuild output, so an Expo upgrade that changes a transform fails it |
| **E-181** | the launch hand-over contract (the system appearance; the native grid and centre = the overlay's first frame) → `_layout.tsx`, `launch.tsx`, `launch.test` | `launch.test`: first-frame identity, order, `LaunchHost` ignoring an in-app `slate` (decoy), the Washi render carrying no Sumi token (decoy) |
| **E-182** | `mockups/inventory/14.json` (the tile, glow, wave and progress readings) → the generator's `--prove`, `LAUNCH_GLOW`, `PROGRESS_TRACK`, `launchLayout`, `brand.test` | the recompute tests with decoys; `verify-mockups` |
| **E-183** | `ProgressBar` (value → `scaleX`) → `launch.tsx`, F-266 | `progress-bar.test` (no `width` keyed to the value); `verify-motion` |
| **E-184** | `brand.taglineJa` / `brand.splashSubline` → the font subset (E-174), the claims lint, i18n | `test:content`, `i18n.test` (`IDENTICAL_BY_DESIGN`), `verify-claims` |

Updates: **E-085** (`signaturesFor` → `checksFor`; the splash signature defect; magic bytes;
fail-closed), **E-116** (`Launch` renders the lockup; the hand-over mark; still no bitmap), **E-060**
(`backgroundImage`; the tile's tokens), **E-115** (the themed layer on 480/1188), **E-173** (F-231 calls
the stack), **E-174** (the copy ships; any re-subset), and the F-226 font-gate link (the overlay is now
in a system `ThemeProvider` inside `FontGate`). Each keeps its paired note in `memory/effects/` in
step.

## Test plan

- **Unit / property:** `launchLayout` at 14's frame reproduces every `14.splash` box within 2 px
  (2.7 dp), with "no rise" (about 69 dp off) as the decoy; `launchProgress` 0 / 0.5 / 1, and 1 under
  reduced motion; `SPLASH_MARK` = the lockup's mark ± 0.05; `LAUNCH_GLOW` and `PROGRESS_TRACK`
  recomputed from 14's raw readings, each with a decoy; the tile's ends equal the bound tokens; the
  icon proportion recomputed from 14.json; the palette `decodePng` round-trip.
- **Golden:** none. No colour-engine value moves; the measurements are inventory readings with their
  calibrations.
- **Conformance:** `ProgressBar` in the registry, four palettes, decorative and labelled. `launch.test`
  asserts every `14.splash.*` element (the glow included) is present with its bound token, in Sumi and
  Washi, en and ja. The generic inventory sweep is F-221's, and blocked.
- **E2E:** none runnable here; the journey is the device attestation.
- **Negative — every proof has a decoy, not an empty fixture:**

| proof | decoys |
|---|---|
| generator | the 768/1024 icon; F-230's adaptive at 0.914 of the tile; flat, reversed and light tiles; a two-ink tile; a mark cut by the circle mask; splash width 260 outside the 96 dp circle; F-230's splash read with the icon signature (refused); Expo's default / a solid disc at every density |
| `verify-native-assets --prove` | the foreground replaced by a solid disc; a flat background; the splash at 160; a wrong `splashscreen_background`; the monochrome missing; real RIFF/WEBP bytes; the baseline green before and after |
| `verify-apk --prove` (CI only) | the same, as aapt2-built APKs; release-shortened names resolved |
| `launch.test` | `onDone` before the hold; a bitmap in the overlay; the old `<Mark size={160}>`; an in-app `slate` reaching the overlay; reduced motion that still animates |
| `i18n` | the existing copy-paste check over the new keys |

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck · pnpm lint · pnpm format:check · pnpm test · pnpm build
pnpm test:a11y · pnpm test:contrast · pnpm test:cvd · pnpm test:content
node scripts/generate-brand-assets.mjs --check · --prove
node scripts/verify-native-assets.mjs · --prove        (after pnpm build; the iOS half prints NOT RUN on win32)
node scripts/verify-motion.mjs · node scripts/verify-viewport.mjs --prove · node scripts/verify-mockups.mjs --prove
```

**Cannot run on this workstation**, recorded as not run: there is no JDK, no Android SDK build-tools,
no Xcode, no device and no `gh` — so gate `artifact` (`verify-apk.mjs --apk …` and its `--prove`), the
iOS prebuild half, and anything on a device. The evidence comes from `android-build.yml` dispatched by a
person, the CI ubuntu job (`--require-ios`), and these attestations, each quoting its criterion
verbatim, `blocks: "release"`, `status: "outstanding"`:

1. **"The icon is 14’s dark squircle tile with the silver mark, generated by
   scripts/generate-brand-assets.mjs, and --check byte-compares it in CI"** — on an iPhone (iOS 18 and
   26), the home-screen icon beside 14's left frame: lighter at the top and reaching the ground at its
   foot, the mark at 14's proportion, the corner the system's. The same on a Pixel and a Samsung
   launcher.
2. **"The Android adaptive icon keeps the mark inside the 66 dp safe zone on every launcher mask; the
   Android 13 themed icon is the mark alone"** — on Android 13+ (at least a Pixel circle and a One UI
   squircle), the mark inside each mask with the tile around it; with themed icons on, the tinted mark
   alone.
3. **"The native splash is the mark on 14’s ground; the launch overlay continues it without a gap into
   14’s full composition — mark with its glow, “Irodora”, 彩り・色の知性, the tagline, the wave
   line-art and the progress line — and hands over to the app"** — a cold start on iOS and Android in
   both appearances: the native mark and the overlay's first frame coincide (no size or position jump,
   no blank frame), the mark rises into the composition, the app takes over; with reduced motion on,
   the composition at once, then the app.
4. **"Light appearance takes 14’s composition in 25’s palette (C17, ⇄)"** — a light-mode phone on both
   platforms: the native splash and the overlay in Washi, with no dark frame between them.
5. **"The built APK and the iOS build are asserted to carry the new icon and splash (FR-69), so a
   placeholder cannot ship"** — gate 16 green on an `android-build.yml` APK from this commit, every
   launcher layer and both splash logos read and matched, the colours read from the resource table; the
   CI prebuild-half check green on the generated iOS asset catalog and storyboard; the icon and splash
   seen on an iPhone from an Xcode build.

## Risks and open questions

- **JPEG readings** (the gradient, the glow) carry ΔE00 ≈ 2 and about 0.3 px. Binding to tokens absorbs
  the colour; the glow fit is calibrated. A person compares at F-267.
- **aapt2's output is unconfirmed** (palette crunching, resource-table formats come from its
  documentation, not observation). The first CI artefact confirms them; until then gate 16 fails closed.
- **Edge-to-edge centring.** The hand-over assumes the overlay and the native splash both centre in the
  full window; a device that insets the root would show a jump of about half the status bar. It is in
  the attestation.
- **The light glow** reads as a shadow on Washi. C17 is ⇄; the person decides at F-267.
- **200 % text on short screens** may let the lockup crowd the wave. The splash is transient; F-267's
  200 % check covers it.
- **Cold start.** The overlay is about 780 ms of motion; F-268 measures it.
- **Open questions:** none block F-231. Anything the re-read surfaces is decided under the 2026-10-05
  delegation with an ADR. Golden rules 11–14 are not open.

## Out of scope

- **Ambient motion** — the wave's drift, the glow's breathing, the progress interpolation — is F-266's.
- **Product-wide `accessibilityLanguage`** (WCAG 3.1.2) → **F-319**.
- **iOS 18 dark/tinted icon variants and iOS 26 `.icon`**: no mockup draws them → **F-320**.
- **Android 13 `setSplashScreenTheme`**, so the native splash follows an in-app theme → **F-321**.
- The Play Store 512 icon; the generic inventory sweep (F-221); a face that fails to load (F-302 /
  OQ-42).

## Notes for downstream

- **F-266:** animate only `LaunchGlow`'s opacity and scale, the wave's transform, and `ProgressBar`'s
  `value` (a `scaleX`). The hand-over's rise and fades already exist — do not duplicate them. Never
  animate a colour; everything stops under reduced motion.
- **F-267:** compare the icon under each launcher mask; gradient banding; the light glow; the hand-over
  on both platforms and in both appearances; an in-app theme that differs from the phone (§4 E4); the
  snapped insets (24, 48, 16) against 14's 27 / 45.5 / 20.
- **F-268:** measure cold start with the overlay's sequence.
- **F-269:** remove anything that still assumes 160, the flat-ground icon, or F-230's 624/1024 adaptive
  grid.
- **F-221:** when the generic sweep lands, include the launch overlay and drop `launch.test`'s local
  copy of it.

## Amendments on adoption (the implementing session)

1. **Adopted as written**, including readings (a)–(g), so the one review can contest them. The
   planner's four findings were spot-checked before adoption: Expo's 288·k composite
   (`withAndroidSplashImages.js:100-122`) and `signaturesFor` reading the splash logo with the icon's
   signature (`verify-apk.mjs:88-92`), and the `.png`-only filter (`verify-apk.mjs:632`), are as
   stated.
2. **The rise is F-231's, the ambience F-266's.** F-266's criterion names *the splash wave, glow and
   progress*; it does not name the hand-over. Criterion 3's *continues it without a gap* is what forces
   the rise, so it is built here.
3. **Increment 0 does not write `progress.md`**; the history records finished work.
4. **One review, then fix or record** (AGENTS.md loop step 5), after increment 10.
5. **Ids confirmed free:** ADR-0126 and ADR-0127 (the index ends at 0125), E-178 onwards (the graph
   ends at E-177), F-319 onwards (the list ends at F-318).
6. **A measured reading that contradicts this plan stops the increment**, not the plan's numbers: if
   the re-read in increment 1 moves a value (the tile's ends, the 0.91 fraction, the glow), the later
   increments take the reading, and the change is recorded in the Status row.

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | this commit | Claimed; this plan (the planner subagent's, adopted with six amendments). |
| 1 | this commit | **14 re-read; six readings move the plan (amendment 6).** (1) **The tile is a 184.7 px square with a 1.6 px rim on every edge**, brightest at the top (luma 88 against 54 at the foot) — F-220's 161 px stopped where the gradient nears the ground. The rim is the PLATFORM'S: iOS 26 lays its glass over an icon of a simple glyph on a plain ground, its highlights at the top and bottom since iOS 27 (MacStories' iOS 26 review; MacRumors, 2026-06-16), and an asset cannot place a line on a mask it does not draw. Recorded as a `presentation` notDesign row; ADR-0126 (increment 2) carries the decision. (2) **The gradient is linear and diagonal**: a plane fitted to 12,645 pixels, rms 1.4 levels against 2.2–2.5 for a vertical-only fit, its axis 15.2° clockwise from vertical, lightest at the top-left — not the vertical gradient the plan assumed. Its ends bind as expected: top-left #2E3239 → `level2` (ΔE00 2.29), bottom-right #15171C → `ground` (0.73). (3) **The mark is 0.611 of the tile, centred by its INK**: its grid centre sits 4.83 px below the tile's centre and its ink box 1.27 px — so the drawings take a dy, as the plan's contingency allowed. The adaptive layer becomes 1296/528 (0.6111 of its 864 px visible), not 1188/480. (4) **The glow is the mark blurred, not a radial gradient**: `glow-fit.mjs` (new; calibrated through JPEG q85, alpha and sigma within 5 %, a radial decoy read as radial) reads sigma 18.09 px = 0.157 of the grid and alpha 0.602; the two-parameter model leaves rms 0.006, the best radial profile 0.009, and the model matches 14 within 2–3 levels in the notches a radial gradient misses. react-native-svg's `FeGaussianBlur` is RenderScript on Android, doubling the deviation and capping the radius at 25 px, so increment 7 draws the glow as an alpha mask the generator computes from the geometry, tinted by the token. (5) **The subline sits 24 dp under the lockup's ink**, not 16: its ink starts 16.93 px (22.9 dp) under the tagline's. (6) **The progress line** is 3.1 px thick (4 dp), its ends 20.3 and 20.7 px in from the screen (27.7 dp → 24) and its foot 35.3 px up (47.7 dp → 48); **the wave's ink** is rows 835–889, which `silk-wave` drawn across the screen at its 4:1 box reproduces. The glow joins C17's elements. Gates: state, format, lint (incl. `verify-mockups` and its `--prove`, 62 plants), test (35/35, every task re-run). |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| review | | |
