# Irodora — Complete 28-Screen UI/UX Design System & Mockup Blueprint

> **Production-Grade Visual Blueprint & Comprehensive Frontend Specification**  
> Built for **Irodora** with **HeroUI React Native**, Japanese Contemporary Minimalism (*Kotatsu-Redo* & Muji aesthetic), **Blinkit** instant-decision clarity, and **Warm Off-Black Monochrome Theme (`#15171B`)**.

---

## 1. Design System Foundation & 8 Guiding Tenets

1. **Warm Off-Black Monochrome Base (`#15171B`):**
   - Eliminates harsh pitch black in favor of a warm, refined graphite charcoal (`#15171B` ground, `#20232A` elevated cards, `#282C35` raised interactive surfaces, `#2E333D` hairline dividers, and `#F7F8FA` crisp off-white typography).
   - Preserves optical fidelity so adjacent chrome never creates simultaneous contrast against fabric samples.
2. **Lively Japanese Fashion Vector Line-Art:**
   - Incorporates delicate line-art illustrations (kimono drape contours, botanical plum blossom motifs, woven textile wave curves, and empty-state drawings) to give an artistic, calm, modern, and positive vibe.
3. **Hero Swatch Dominance (180px / 120px):**
   - Garment and corpus colors are celebrated at large scale with APCA-verified neutral keylines (`swatch.well`).
4. **Deterministic Color Intelligence (No AI Hype / 100% Checkable):**
   - Precise numbers: **ΔE00 (CIEDE2000)**, **OKLCh**, **CIELAB**, **WCAG 2.2 AA / APCA Lc**, and **CVD Distinction Percentages** (Protanopia, Deuteranopia, Tritanopia).
5. **Instant Decision Clarity (Blinkit-Style Signals):**
   - Fast 1-second signals: *"+14 New Outfits Unlocked"*, *"0 Duplicates Owned"*, *"Missing Warm Light Neutral"*, and *ΔE00 1.28*.
6. **Full Lifecycle Screen & Route Coverage:**
   - All 28 screens covering onboarding, live measurement, catalog search, wardrobe tracking, outfit lab, custom palette builder, personal profile test, settings, light mode, Japanese localization, and core UI error/empty states.
7. **HeroUI React Native Component Primitives:**
   - Tonal card elevation (`level="1"`, `level="2"`, `level="3"`), gesture-driven bottom sheets with detents, segmented choice pills, rounded badges, and fluid layout transitions.
8. **100% Offline & Local-First Platform:**
   - No server, no account, no network sync required; data encrypted locally with SQLCipher.

---

## 2. Directory of All 28 Mockups in [`mockups/`](.)

| # | Screen / Surface | Route | File Name | Key Highlights & Components |
|---|---|---|---|---|
| **00** | **Design System & Component Kit** | `Design System Spec` | [`00_component_design_system.jpg`](00_component_design_system.jpg) | Comprehensive HeroUI React Native component board, typography scale (72px to 14px), brand lockup, swatch wells, buttons, switches, chips, elevated cards, and vector art empty states. |
| **01** | **Home Screen (The Front Door)** | `/(tabs)/index` | [`01_home_screen.jpg`](01_home_screen.jpg) | Wordmark, Plum Blossom Kamon mark (梅鉢), 3 proposition lines, 180px Hero Swatch (*Ai-nezumi*), OKLCh badge, "What Goes With This" CTA, Wardrobe Strip preview with fabric weave indicators. |
| **02** | **Colour Lens Viewfinder** | `/(tabs)/lens` | [`02_lens_live_viewfinder.jpg`](02_lens_live_viewfinder.jpg) | Real-time camera viewfinder, movable precision crosshair reticle with Japanese corner accents, mode pills (Live Pick / Garment Scan / Against Target / Calibrated), Daylight 5500K sensor HUD, live OKLCh & 3 closest Japanese reference chips. |
| **03** | **Lens Analysis Bottom Sheet** | `/(tabs)/lens` (Sheet) | [`03_lens_analysis_bottom_sheet.jpg`](03_lens_analysis_bottom_sheet.jpg) | HeroUI bottom sheet modal, capture provenance tags, 120px swatch, tabular Hex/OKLCh/CIELAB, top 3 ΔE00 candidates, vector kimono line-art, "Wear It", "Add to Wardrobe", "Hold Target". |
| **04** | **Lens Against Target Mode** | `/(tabs)/lens` (Target) | [`04_lens_against_target.jpg`](04_lens_against_target.jpg) | In-store comparison HUD, active target header (*Ai-nezumi*), live ΔE00 proximity gauge (1.42 close match), split-swatch view, ΔL*/ΔC*/ΔH delta bars. |
| **05** | **Colour Atlas Library** | `/(tabs)/atlas/index` | [`05_atlas_library_catalog.jpg`](05_atlas_library_catalog.jpg) | 120 Japanese traditional colors catalog, faceted seasonal filter chips (Spring, Summer, Autumn, Winter), family chips (Ao, Aka, Midori, Ki, Murasaki, Cha, Kuro), 2-column cards. |
| **06** | **Colour Detail Centerpiece** | `/(tabs)/atlas/[slug]` | [`06_color_detail_centerpiece.jpg`](06_color_detail_centerpiece.jpg) | Full-width photographic swatch well, Display Kanji header with ruby kana, scientific colorimetry table (Hex, OKLCh, CIELAB, sRGB, P3), Edo dyeworks provenance card with botanical vector art. |
| **07** | **Wear It / Combinations** | `/(tabs)/atlas/wear/[slug]` | [`07_wear_outfit_combinations.jpg`](07_wear_outfit_combinations.jpg) | 4-slot wearable combination matrix (Top, Trousers, Shoes, Trench), occasion selector, 94% Personal Fit, 98% CVD distinction score, substitution pills. |
| **08** | **Colour Compare Instrument** | `/(tabs)/atlas/compare` | [`08_color_compare_instrument.jpg`](08_color_compare_instrument.jpg) | Dual side-by-side swatch comparison, ΔE00 / ΔEok / ΔL* / ΔC* / ΔH delta metrics table, WCAG 2.2 AA / APCA readout, Protan/Deutan/Tritan CVD simulation matrix. |
| **09** | **Semantic Colour Finder** | `/(tabs)/atlas/find` | [`09_semantic_finder_search.jpg`](09_semantic_finder_search.jpg) | Natural language query search (*"dark muted moss green"*), interactive Lightness/Chroma/Hue HeroUI sliders, instantaneous ΔE00 ranking. |
| **10** | **Palette Studio Catalog** | `/(tabs)/atlas/palettes` | [`10_palette_studio.jpg`](10_palette_studio.jpg) | Curated palettes (*Quiet Neutrals*, *Kasane no Irome Seasonal*), semantic role tags (Anchor, Light Ground, Mid Tone, Accent), WCAG AA matrix, ASE/CSS/PDF export. |
| **11** | **Wardrobe Gallery** | `/(tabs)/wardrobe/index` | [`11_wardrobe_gallery.jpg`](11_wardrobe_gallery.jpg) | Wardrobe intelligence overview (84% coverage dial, 42 valid outfits), actionable gap analysis card (*"Missing Warm Light Neutral unlocks +8 outfits"*), 2-column gallery with wear tracking. |
| **12** | **Add Garment Flow** | `/(tabs)/wardrobe/add` | [`12_add_garment_flow.jpg`](12_add_garment_flow.jpg) | 20-second garment onboarding, fabric color preview with Lens/Photo/Atlas/Hex source pills, category pills, material chips, smart duplicate detector pre-check banner. |
| **13** | **Outfit Lab & Capsule Solver** | `/(tabs)/wardrobe/outfit` | [`13_outfit_lab_capsule_solver.jpg`](13_outfit_lab_capsule_solver.jpg) | Interactive 4-slot outfit canvas with slot locking (Top, Trousers, Shoes, Outerwear), 5-factor diagnostic radar, Capsule Solver panel (5 garments → 12 outfits). |
| **14** | **App Icon & Launch Splash** | `App Icon & Splash` | [`14_app_icon_and_splash.jpg`](14_app_icon_and_splash.jpg) | Squircle mobile app icon with Plum Blossom Kamon mark (梅鉢) and botanical vector line-art + Animated launch splash screen with wave line-art loader. |
| **15** | **Settings & System Preferences** | `/(tabs)/profile/preferences` | [`15_settings_preferences.jpg`](15_settings_preferences.jpg) | Appearance theme selector (Sumi Charcoal, Slate Graphite, Obsidian Noir, Washi Minimal), CVD simulation mode selector, tabular figures switch, haptic switch, preference weights reset, on-device security badge. |
| **16** | **Create Custom Palette Studio** | `/(tabs)/atlas/palettes` (Draft) | [`16_palette_builder_custom.jpg`](16_palette_builder_custom.jpg) | Interactive custom palette builder with 4 semantic role slots (Anchor, Light Ground, Mid Tone, Accent), live contrast engine matrix (11.4:1 AAA), and corpus drawer. |
| **17** | **Personal Profile & Swatch Test** | `/(tabs)/profile/setup` | [`17_profile_setup_swatch_test.jpg`](17_profile_setup_swatch_test.jpg) | Guided 90s swatch comparison draping test (Warm vs Cool), live 4-dimensional radar chart (Temperature, Depth, Chroma Tolerance, Contrast Preference), recommended palette preview. |
| **18** | **Export & PDF Audit Center** | `/(tabs)/profile/export` | [`18_export_center_reports.jpg`](18_export_center_reports.jpg) | CJK PDF Wardrobe Color Audit report preview with version envelopes, Adobe ASE Swatch export, OKLCh Design Tokens export, encrypted offline SQLite backup & restore. |
| **19** | **What Goes With This** | `/(tabs)/atlas/with/[slug]` | [`19_what_goes_with_this.jpg`](19_what_goes_with_this.jpg) | Anchor corpus colour with ranked harmony rows (Complementary, Analogous, Split-Complementary, Triadic). Each row includes swatch sample, Kanji/Kana/Romaji, and exact ΔE00 score. |
| **20** | **Shareable Colour Card** | `/(tabs)/atlas/card/[slug]` | [`20_colour_card_shareable.jpg`](20_colour_card_shareable.jpg) | High-resolution shareable export card: large central swatch, Kanji/Kana/Romaji, OKLCh values, corpus version (v1.2), "Save as PDF" and "Share" CTAs. |
| **21** | **Nearest in Corpus** | `/(tabs)/atlas/nearby/[slug]` | [`21_nearest_in_corpus.jpg`](21_nearest_in_corpus.jpg) | Anchor colour accompanied by ranked list of closest corpus colours sorted strictly by CIEDE2000 ΔE00 distance with colorimetric delta readouts. |
| **22** | **Shopping Check (In-Store)** | `/(tabs)/wardrobe/shopping` | [`22_shopping_check.jpg`](22_shopping_check.jpg) | Evaluation of a prospective garment against own wardrobe with 4 plain numbers (+14 Outfits Unlocked, 8 Pairings, 0 Duplicates, 1 Gap Addressed). Strictly no "Buy" verdict or arbitrary scores. |
| **23** | **Finished Personal Profile** | `/(tabs)/profile/index` | [`23_profile_finished.jpg`](23_profile_finished.jpg) | Finished personal colour profile with 4 dimension sliders (Temperature, Depth, Chroma Tolerance, Contrast Preference), confidence notes per dimension, Kasane recommendations, and PDF export. |
| **24** | **Combinations from a Garment** | `/(tabs)/wardrobe/with/[id]` | [`24_garment_combinations.jpg`](24_garment_combinations.jpg) | Harmonic combinations originating from an owned wardrobe item, with an explicit "Estimated from a capture · D65 Daylight" provenance badge on source colour. |
| **25** | **Home Screen (Light Mode)** | `/(tabs)/index` (Light) | [`25_home_light_mode.jpg`](25_home_light_mode.jpg) | Full Light Mode translation on warm off-white Washi background (`#F6F5F2`), `#FFFFFF` elevated cards, `#1A1B1E` sumi ink typography, and neutral APCA keyline. |
| **26** | **Colour Detail (Japanese Locale)** | `/(tabs)/atlas/[slug]` (`ja`) | [`26_color_detail_japanese.jpg`](26_color_detail_japanese.jpg) | Native Japanese localization of Colour Detail centerpiece screen (`伝統色の詳細`, `測色値と表色系`, `着こなしの配色調和`, `襲の色目`, `コーパス典拠と査読`). |
| **27** | **Core UI States Board** | `App States` (Landscape 16:9) | [`27_states_board.jpg`](27_states_board.jpg) | 4-panel landscape board illustrating key edge states in HeroUI warm off-black: Empty State, Loading & Calibrating State, Refused Measurement (Glare/Shadow), and Permission Denied. |

---

## 3. Design Tokens (Warm Off-Black Monochrome `#15171B` & Washi Light `#F6F5F2`)

```typescript
export const darkMonochromeTokens = {
  background: {
    ground: '#15171B',    // Warm graphite charcoal (Off-black base)
    level1: '#20232A',    // Elevated HeroUI card surface
    level2: '#282C35',    // Raised interactive container
    level3: '#323742',    // Sheet & modal overlay surface
  },
  border: {
    subtle: '#2E333D',    // Hairline structural division
    strong: '#464D5B',    // Active border & focus ring
    neutralKeyline: '#FFFFFF22', // Swatch border APCA safe
  },
  typography: {
    primary: '#F7F8FA',   // High contrast crisp off-white
    secondary: '#A6B0BC', // Soft slate-silver muted text
    tertiary: '#768290',  // Quiet captions & metadata
  },
  accent: {
    primary: '#FFFFFF',   // Crisp white primary action
    secondary: '#2A2E38', // Dark grey button background
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    pill: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  }
};

export const lightWashiTokens = {
  background: {
    ground: '#F6F5F2',    // Warm off-white Washi paper base
    level1: '#FFFFFF',    // Elevated card surface with subtle shadow
    level2: '#EEEDE8',    // Interactive container surface
    level3: '#E5E3DE',    // Sheet & modal overlay surface
  },
  border: {
    subtle: '#E5E3DE',    // Hairline border
    strong: '#1A1B1E',    // Active border
    neutralKeyline: '#1A1B1E18', // Swatch border APCA safe
  },
  typography: {
    primary: '#1A1B1E',   // Sumi ink black
    secondary: '#5C6470', // Muted slate gray
    tertiary: '#8C96A5',  // Quiet captions
  }
};
```
