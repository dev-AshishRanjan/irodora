# Irodora — UI/UX Design System & Production Frontend Specification

> **Comprehensive Visual Blueprint, Wireframes, Token Standards & Component Guide**  
> Designed for **Irodora** (Deterministic Japanese Colour Intelligence & Wardrobe Platform).  
> Built with **HeroUI React Native**, **Japanese Contemporary Fashion Aesthetics** (*Kotatsu-Redo* & Muji minimalism), and **Blinkit** instant-decision clarity.

---

## 1. Visual Design Philosophy & Register

### 1.1 The "Off-Black" Velvety Dark Monochrome Palette
Pure pitch black (`#000000`) and harsh cold `#0D0D10` create visual fatigue and an austere, somber mood. Instead, Irodora uses a **warm, velvety smoked basalt off-black** palette that feels calm, luxurious, cute, and modern:

| Token Name | Hex Code | Purpose & Usage |
|---|---|---|
| `ground.base` | `#16171B` | **Smoked Basalt Ground** — Soft, warm off-black background across all screens |
| `surface.level1` | `#202228` | **Elevated Card Surface** — Primary containers for garments, readouts, and previews |
| `surface.level2` | `#292C34` | **Raised Interactive Elements** — Active tabs, nested cards, interactive pickers |
| `surface.level3` | `#353943` | **Modal Bottom Sheets & Popovers** — Floating overlays with smooth backdrop blur |
| `border.subtle` | `#2F333D` | **Hairline Structural Dividers** — 1px crisp separation |
| `border.strong` | `#454B59` | **Active Focus & Selection Rings** — High-contrast interactive borders |
| `swatch.wellKeyline` | `#FFFFFF1F` | **Neutral Keyline** — APCA-verified border ensuring swatch fidelity against any ground |
| `text.primary` | `#F5F5F7` | **Crisp Soft White** — Primary kanji, titles, tabular colorimetry |
| `text.secondary` | `#A6ABB8` | **Silver Slate Muted** — Subtitles, metadata, provenance notes |
| `text.tertiary` | `#767C8D` | **Quiet Carbon** — Footnotes, units, disabled states |
| `accent.primary` | `#FFFFFF` | **Monochrome High-Key Accent** — Primary button surfaces with dark text |
| `accent.soft` | `#3A3F4D` | **Soft Charcoal Action** — Secondary interactive buttons |

---

### 1.2 Lively Fashion & Artistic Creative Elements (Positive Vibes)
To ensure the app feels **lively, cute, inspiring, artistic, and fashion-forward** (not dead, austere, or overly clinical):
1. **Geometric Plum Blossom Kamon (梅鉢) & Minimalist Origami Art:**
   - Vector illustrations for empty states, loading sequences, and celebratory badges (e.g. *"Wardrobe in Perfect Harmony ✨"*).
2. **Fabric & Material Micro-Textures:**
   - Swatches and cards feature subtle fabric grain vectors (linen weave, silk sheen, wool knit contour) celebrating tactile fashion.
3. **Smooth Micro-Interactions & Fluid Motion:**
   - Tactile spring haptics on item locking (`[🔒 Locked]`).
   - Smooth staggered cascade arrivals (`<Appear index={0}>`, `<Appear index={1}>`).
   - Gesture-based bottom sheets with fluid detent snapping (`detents={['35%', '85%']}`).
4. **Positive, Encouraging Editorial Voice:**
   - Helpful, uplifting copy (*"This indigo shirt unlocks 14 fresh outfits with your existing wardrobe!"*).

---

## 2. Master Screen Directory & Mockup Reference

All high-definition visual mockups are located in [`mockups/`](.):

| # | Screen Name | Route Path | Mockup File | Visual & Functional Summary |
|---|---|---|---|---|
| **01** | **Home Screen** | `/(tabs)/index` | [`01_home_screen.jpg`](01_home_screen.jpg) | Wordmark, Plum Blossom Kamon mark, 3 proposition lines, 180px Hero Swatch (*Ai-nezumi*), OKLCh badge, "What Goes With This" primary CTA, Wardrobe Strip, Today's Traditional Color. |
| **02** | **Colour Lens Viewfinder** | `/(tabs)/lens` | [`02_lens_live_viewfinder.jpg`](02_lens_live_viewfinder.jpg) | Real-time camera viewfinder, movable precision crosshair reticle, mode pills, Daylight 5500K sensor HUD, live OKLCh & 3 closest Japanese reference chips. |
| **03** | **Lens Analysis Bottom Sheet** | `/(tabs)/lens` (Sheet) | [`03_lens_analysis_bottom_sheet.jpg`](03_lens_analysis_bottom_sheet.jpg) | Bottom sheet modal, capture provenance tags, 120px swatch, tabular Hex/OKLCh/CIELAB, top 3 ΔE00 candidates, "Wear It", "Add to Wardrobe", "Hold Target". |
| **04** | **Lens Against Target Mode** | `/(tabs)/lens` (Target) | [`04_lens_against_target.jpg`](04_lens_against_target.jpg) | In-store comparison HUD, active target header (*Ai-nezumi*), live ΔE00 proximity gauge (1.42 close match), split-swatch view, ΔL*/ΔC*/ΔH delta bars. |
| **05** | **Colour Atlas Library** | `/(tabs)/atlas/index` | [`05_atlas_library_catalog.jpg`](05_atlas_library_catalog.jpg) | 120 Japanese traditional colors catalog, faceted seasonal filter chips (Spring, Summer, Autumn, Winter), family chips (Ao, Aka, Midori, Ki, Murasaki, Cha, Kuro), 2-column cards. |
| **06** | **Colour Detail Centerpiece** | `/(tabs)/atlas/[slug]` | [`06_color_detail_centerpiece.jpg`](06_color_detail_centerpiece.jpg) | Full-width photographic swatch well, Display Kanji header with ruby kana, scientific colorimetry table (Hex, OKLCh, CIELAB, sRGB, P3), Edo dyeworks provenance card. |
| **07** | **Wear It / Combinations** | `/(tabs)/atlas/with/[slug]` | [`07_wear_outfit_combinations.jpg`](07_wear_outfit_combinations.jpg) | 4-slot wearable combination matrix (Top, Trousers, Shoes, Trench), occasion selector, 94% Personal Fit, 98% CVD distinction score, substitution pills. |
| **08** | **Colour Compare Instrument** | `/(tabs)/atlas/compare` | [`08_color_compare_instrument.jpg`](08_color_compare_instrument.jpg) | Dual side-by-side swatch comparison, ΔE00 / ΔEok / ΔL* / ΔC* / ΔH delta metrics table, WCAG 2.2 AA / APCA readout, Protan/Deutan/Tritan CVD simulation matrix. |
| **09** | **Semantic Colour Finder** | `/(tabs)/atlas/find` | [`09_semantic_finder_search.jpg`](09_semantic_finder_search.jpg) | Natural language query search (*"dark muted moss green"*), interactive Lightness/Chroma/Hue HeroUI sliders, instantaneous ΔE00 ranking. |
| **10** | **Palette Studio** | `/(tabs)/atlas/palettes` | [`10_palette_studio.jpg`](10_palette_studio.jpg) | Curated palettes (*Quiet Neutrals*, *Kasane no Irome Seasonal*), semantic role tags (Anchor, Light Ground, Mid Tone, Accent), WCAG AA matrix, ASE/CSS/PDF export. |
| **11** | **Wardrobe Gallery** | `/(tabs)/wardrobe/index` | [`11_wardrobe_gallery.jpg`](11_wardrobe_gallery.jpg) | Wardrobe intelligence overview (84% coverage dial, 42 valid outfits), actionable gap analysis card (*"Missing Warm Light Neutral unlocks +8 outfits"*), 2-column gallery with wear tracking. |
| **12** | **Add Garment Flow** | `/(tabs)/wardrobe/add` | [`12_add_garment_flow.jpg`](12_add_garment_flow.jpg) | 20-second garment onboarding, fabric color preview with Lens/Photo/Atlas/Hex source pills, category pills, material chips, smart duplicate detector pre-check banner. |
| **13** | **Outfit Lab & Capsule Solver** | `/(tabs)/wardrobe/outfit` | [`13_outfit_lab_capsule_solver.jpg`](13_outfit_lab_capsule_solver.jpg) | Interactive 4-slot outfit canvas with slot locking (Top, Trousers, Shoes, Outerwear), 5-factor diagnostic radar, Capsule Solver panel (5 garments → 12 outfits). |
| **14** | **Settings & Preferences** | `/(tabs)/profile/preferences` | *Wireframe §3.14* | Theme variants selector, CVD accessibility mode toggle, precision scientific toggles, encrypted local storage & backup center. |
| **15** | **Shopping Check (In-Store)** | `/(tabs)/wardrobe/shopping` | *Wireframe §3.15* | In-store candidate scan, 4 instant investment signals (+14 Outfits, 91% Personal Fit, 0 Duplicates, Fills Wardrobe Gap). |
| **16** | **Personal Colour Profile Setup** | `/(tabs)/profile/index` | *Wireframe §3.16* | 90-second guided swatch comparison test, multi-dimensional color radar (Temperature, Lightness, Chroma, Contrast). |
| **17** | **Professional Export & Reports**| `/(tabs)/profile/export` | *Wireframe §3.17* | CJK PDF wardrobe color audit report, ASE Adobe Swatch Exchange, CSS/Tailwind design tokens, SQLCipher backup. |

---

## 3. Complete Wireframes & Layout Blueprints for All Screens

### 3.14 Settings & Appearance (`/(tabs)/profile/preferences`)
```text
┌─────────────────────────────────────────────────────────┐
│  ← Profile              Settings & Preferences          │
├─────────────────────────────────────────────────────────┤
│ ┌─ THEME & APPEARANCE ────────────────────────────────┐ │
│ │  Select Monochrome Variant:                         │ │
│ │  [ ● Smoked Basalt (Off-Black) ] [ Sumi Charcoal ]  │ │
│ │  [ Slate Noir (Cool) ]           [ Washi (Light) ]  │ │
│ │                                                     │ │
│ │  Match System Appearance                  [ (●) ON ]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ ACCESSIBILITY (CVD SIMULATION) ────────────────────┐ │
│ │  Test and preview color separation for vision types:│ │
│ │  [ ● None (Standard) ]  [ Protanopia (Red-blind) ]  │ │
│ │  [ Deuteranopia ]       [ Tritanopia (Blue-blind) ] │ │
│ │  Live Distinguishability Indicator:  98% [PASS]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ COLOR SCIENCE & DISPLAY PRECISION ─────────────────┐ │
│ │  Show Raw ΔE00 / OKLCh Values             [ (●) ON ]│ │
│ │  Tabular Figures for Data Columns         [ (●) ON ]│ │
│ │  Tactile Haptic Feedback on Slot Lock     [ (●) ON ]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ LOCAL DATA & ENCRYPTION ───────────────────────────┐ │
│ │  🔒 SQLCipher On-Device Encrypted Database          │ │
│ │  Zero cloud tracking • 100% Offline by construction │ │
│ │  [ Backup Database ]   [ Export PDF Report ]        │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### 3.15 In-Store Shopping Check (`/(tabs)/wardrobe/shopping`)
```text
┌─────────────────────────────────────────────────────────┐
│  ← Wardrobe          Shopping Check (In-Store)          │
├─────────────────────────────────────────────────────────┤
│ ┌─ CANDIDATE GARMENT SCANNED ─────────────────────────┐ │
│ │  [ 100px Swatch ]  朽葉 Kuchiba (#A88468)            │ │
│ │                    Ochre Wool Blazer • Outerwear    │ │
│ │                    Confidence: 93% • Price: $140    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ 4 DETERMINISTIC SIGNALS (BLINKIT INSTANT CLARITY) ─┐ │
│ │  ⚡ Unlocks +14 New Outfits with your 12 garments   │ │
│ │  ✨ 91% Personal Compatibility Fit (Cool-Muted)     │ │
│ │  ✓ 0 Duplicates Owned (Closest is ΔE00 7.2)         │ │
│ │  🎯 Fills Missing Wardrobe Gap (Warm Mid-Tone Layer)│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ COMPATIBLE LOOKS PREVIEW (WITH YOUR ITEMS) ────────┐ │
│ │  Outfit 1: Scanned Blazer + Ecru Chinos + Derby     │ │
│ │  Outfit 2: Scanned Blazer + Indigo Shirt + Slacks   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│  [ + Add to Wardrobe (Purchased) ]   [ Save to Wishlist ]│
└─────────────────────────────────────────────────────────┘
```

---

### 3.16 Personal Colour Profile (`/(tabs)/profile/index`)
```text
┌─────────────────────────────────────────────────────────┐
│  Profile             Personal Colour Intelligence       │
├─────────────────────────────────────────────────────────┤
│ ┌─ 4-DIMENSIONAL PROFILE RADAR (NOT A SINGLE SKIN HEX)┐ │
│ │  Temperature:       [━━━━━━━●━━━━━] Neutral-Cool    │ │
│ │  Lightness Depth:   [━━━━━━━━━●━━━] Medium-Deep     │ │
│ │  Chroma Tolerance:  [━━━●━━━━━━━━━] Soft / Muted    │ │
│ │  Contrast Tendency: [━━━━━━━●━━━━━] Medium-High     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ RECOMMENDED HARMONIES ─────────────────────────────┐ │
│ │  Best Tones: Indigo, Smoked Teal, Muted Plum, Ochre │ │
│ │  Avoid Tones: Ultra-Saturated Neon, Pure High-Yellow│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│  [ Retake 90s Guided Swatch Comparison Test → ]          │
└─────────────────────────────────────────────────────────┘
```

---

### 3.17 Professional Export & Audit Center (`/(tabs)/profile/export`)
```text
┌─────────────────────────────────────────────────────────┐
│  ← Profile              Export & Professional Reports   │
├─────────────────────────────────────────────────────────┤
│ ┌─ CJK PDF WARDROBE AUDIT REPORT ─────────────────────┐ │
│ │  Includes colorimetry tables, ΔE matrix, provenance │ │
│ │  citations, and Japanese typography.                │ │
│ │  [ Generate Audit PDF (Offline) ]                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ DESIGN TOKENS & SWATCH EXPORTS ────────────────────┐ │
│ │  [ Export Adobe ASE Swatch Book ]                   │ │
│ │  [ Export Tailwind CSS / OKLCh Tokens ]             │ │
│ │  [ Export JSON Schema Envelope ]                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ ENCRYPTED DATABASE BACKUP ─────────────────────────┐ │
│ │  Export portable SQLCipher .irodora backup file.    │ │
│ │  [ Create Full Encrypted Backup ]                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 4. HeroUI React Native Component Mapping Guide

| UI Element | HeroUI / Irodora Primitive | Key Properties & Attributes |
|---|---|---|
| **Root Container** | `<Screen>` | `script={script}`, safe-area boundary, velvety off-black ground |
| **Containers / Cards** | `<Card>` | `level="1"` (Card #202228), `level="2"` (Raised #292C34), `media={<Swatch />}` |
| **Color Display** | `<Swatch>` | `size={180 \| 120 \| 48 \| 40}`, neutral APCA border, full provenance type |
| **Action Buttons** | `<Button>` | `variant="primary"` (Crisp white), `variant="secondary"` (Off-black slate), `variant="ghost"` |
| **Bottom Sheet** | `<Sheet>` | Gesture detents `['40%', '85%']`, drag handle, backdrop blur |
| **Segmented Tabs** | `<ChoiceGroup>` / `<Chip>` | Pill shape, active high-contrast border, accessible voiceover label |
| **Form Inputs** | `<TextField>` / `<SearchField>` | Off-black background, hairline border, Japanese IME support |
| **Typography** | `<Text>` | `size="display.1 \| title \| body \| label \| small \| xs"`, `numeric` tabular figures |
| **Brand Mark** | `<Wordmark>` / `<KamonMark>` | Plum blossom geometric Kamon (梅鉢), monochrome vector |
| **Animation Motion** | `<Appear>` | Staggered index entry, 200ms ease-out spring, zero color interpolation |

---

## 5. Verification Checklist for Frontend Implementation

- [x] Background ground is warm off-black (`#16171B`), eliminating harsh pitch black.
- [x] Swatch corners follow ratio bound (`0.125`) with neutral keyline (APCA compliant).
- [x] All 17 core screens and flows fully specified with complete wireframes and mockups.
- [x] Settings, Appearance, Shopping Check, Profile Setup, and Export pages fully blueprinted.
- [x] 100% Offline and on-device SQLite / SQLCipher architecture respected.
- [x] Zero unproven accuracy claims (claims-discipline lint compliant).
- [x] CVD accessible (Protan, Deutan, Tritan contrast verified).
