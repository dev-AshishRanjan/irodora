# Product Requirements Document

## 1. Product Definition

### Working product name

**IRO** — placeholder name.

Possible eventual positioning:

> **IRO — See color. Understand color. Wear color.**

The product is a unisex color intelligence and wardrobe coordination platform focused on:

- Japanese traditional colors
- Japanese contemporary color aesthetics
- curated fashion color harmony
- personal color palettes
- garment color identification
- outfit color coordination
- color accessibility
- color-blind assistance
- wardrobe intelligence

The product is explicitly **non-AI-first**.

Its primary intelligence comes from:

1. color science
2. deterministic algorithms
3. curated Japanese color datasets
4. fashion color rules
5. human editorial curation
6. user preferences
7. deterministic ranking

AI is not required for the core product.

---

# 2. Problem

Users routinely encounter questions such as:

> What color is this shirt?

> What pants work with this shirt?

> Does this color suit my complexion?

> What shoes should I wear?

> Is this navy actually navy, indigo, or blue-black?

> What Japanese colors are close to this garment?

> Which colors make my wardrobe easier to combine?

> Which colors work for me if I have color-vision deficiency?

Existing products solve these problems separately.

Personal-color applications focus on complexion and seasonal palettes.

Wardrobe applications focus on organizing clothes.

Color-picker applications identify colors.

Japanese color applications expose historical palettes.

Wada-color applications expose curated combinations.

The product opportunity is to combine these capabilities into a coherent **color intelligence system for real-world clothing**.

---

# 3. Product Vision

Create the world's most useful consumer color tool for clothing:

> **A color operating system for your wardrobe.**

The application should be able to take:

```text
Person
+
Garment
+
Color
+
Wardrobe
+
Occasion
+
Preference
```

and deterministically answer:

```text
Which colors work?
Why?
How strongly do they work?
What alternatives exist?
Which Japanese-inspired palette does it belong to?
How accessible is the combination?
```

---

# 4. Core Product Pillars

## Pillar A — Color Lens

Point the camera at a garment.

The system identifies:

- dominant color
- secondary colors
- approximate color family
- Japanese color equivalents
- nearest curated colors
- HEX
- RGB
- HSL
- OKLCH
- CIELAB
- LCh
- perceived brightness
- chroma
- confidence
- measurement conditions

Example:

```text
Detected

深縹 / Fukamidori-inspired navy family

HEX       #263B3C
RGB       38 / 59 / 60
OKLCH     ...
L*a*b*    ...

Confidence
87%

Condition
Indoor / warm lighting

Closest palette colors
1. ...
2. ...
3. ...
```

The app must never present an ordinary camera estimate as laboratory truth.

---

# 5. Color Lens Modes

### Mode 1 — Live Pick

A crosshair follows the camera.

Show:

```text
COLOR
Deep Indigo

#263B3C

L 22
C 0.03
H 195°
```

### Mode 2 — Garment Scan

The user photographs the whole garment.

The application asks the user to select the fabric region if necessary.

Output:

- dominant garment color
- secondary color
- pattern detection
- approximate palette
- confidence
- recommendations

### Mode 3 — Precision Pick

The user places a sampling target over a relatively flat fabric area.

The engine averages multiple pixels instead of using one pixel.

Use robust statistics:

- median
- trimmed mean
- spatial sampling
- outlier rejection

This substantially reduces noise from fabric texture.

### Mode 4 — Calibrated Scan

Optional physical color-reference card.

Workflow:

```text
Show reference card
        ↓
Camera captures card
        ↓
Detect known reference patches
        ↓
Estimate color correction
        ↓
Capture garment
        ↓
Correct camera measurements
        ↓
Calculate garment color
```

This is the mode that can justify terminology like:

**“calibrated measurement.”**

---

# 6. Personal Color Profile

Do not make personal color analysis dependent entirely on a selfie.

Instead create a **Personal Color Profile**.

It can contain:

```text
Personal Palette
├── Lightness preference
├── Warm / neutral / cool tendency
├── Chroma tolerance
├── Contrast preference
├── Favorite neutrals
├── Accent colors
├── Avoid / difficult colors
└── Confidence
```

### Three setup methods

### A. Guided manual setup

User compares swatches.

Example:

```text
Which looks better?

Warm beige     Cool beige

Which blue feels more harmonious?

Muted blue     Clear blue

Which contrast do you prefer?

Low            High
```

This produces a deterministic profile.

### B. Photo-assisted setup

Camera estimates skin characteristics and provides an initial profile.

The user can correct it.

### C. Professional mode

Users can directly enter:

- Lab values
- RGB values
- colorimeter measurement
- custom palette

This makes the platform useful beyond consumers.

---

# 7. Do not frame this as “skin = one exact color”

Human skin has:

- multiple spatial tones
- highlights
- shadows
- blood-flow variation
- lighting dependence
- camera-dependent rendering

Therefore the profile should primarily represent:

```text
undertone tendency
+
lightness range
+
contrast
+
chroma tolerance
```

rather than pretending one RGB value completely defines the user.

---

# 8. Personal Color Recommendation Engine

Given:

```text
User Profile
+
Garment Color
```

calculate:

```text
Suitability
```

based on deterministic factors.

Example:

```text
Garment
Muted Indigo

Personal compatibility
92 / 100

Why:
✓ compatible temperature
✓ compatible chroma
✓ strong value relationship
✓ good contrast

Best pairings:
• Charcoal
• Warm gray
• Ecru
• Taupe
• Deep olive
```

The explanation is generated from rules, not an LLM.

---

# 9. Outfit Color Engine

Given:

```text
T-shirt:
#6E7C75
```

generate recommendations for:

### Pants

```text
Primary
Ecru

Alternative
Charcoal

Alternative
Deep Navy

Japanese-inspired
Sage Gray
```

### Shoes

```text
Off-white
Dark brown
Black
Muted olive
```

### Optional accessories

```text
Watch
Bag
Belt
Hat
Socks
Jewelry
```

---

# 10. Outfit Scoring

Every proposed outfit receives multiple scores.

```text
Color Harmony       91
Personal Fit        87
Contrast            84
Japanese Aesthetic  95
Versatility         92
CVD Accessibility   93
Overall              91
```

Do not collapse everything immediately into a single black-box score.

Users should be able to understand the components.

---

# 11. Harmony Engine

Support standard deterministic harmony models:

- monochromatic
- tonal
- analogous
- complementary
- split complementary
- triadic
- tetradic
- neutral
- near-neutral
- warm/cool contrast
- value contrast
- chroma contrast

But traditional mathematical harmony should not be the only engine.

Add:

### Japanese Editorial Harmony

A curated rule system derived from:

- Japanese traditional color references
- Sanzo Wada combinations
- natural-material palettes
- textile traditions
- contemporary Japanese fashion palettes
- seasonal combinations
- editorial fashion research

Sanzo Wada's work is particularly useful because the historical collection contains 348 combinations across 159 colors, and modern applications have already demonstrated demand for camera matching and wardrobe integration.

Important:

**Do not simply copy third-party datasets into the product.**

Build a licensed/owned color-content pipeline and verify copyright/licensing for every external dataset.

---

# 12. Japanese Color Atlas

Create a major product area:

## Japanese Color Atlas

Each color receives:

```text
Japanese name
Kanji / Kana
Romanization
English description
HEX
RGB
Lab
LCh
OKLCH
Color family
Historical context
Season
Related colors
Complementary colors
Fashion use
Traditional references
Contemporary interpretation
```

Traditional Japanese colors have deep historical roots, with color names often derived from plants, flowers, animals, dyes and materials.

The product should distinguish:

```text
Historical color
Japanese traditional color
Modern Japanese palette
Japanese-inspired palette
Editorial fashion palette
```

Do not treat all of these as historically equivalent.

---

# 13. Japanese Contemporary Palette System

This should become one of the strongest proprietary parts of the product.

Instead of claiming:

> “This is the Japanese color of 2026.”

create curated systems such as:

### Quiet Neutrals

```text
Rice
Washi
Warm stone
Ash
Charcoal
Sumi
```

### Indigo Studies

```text
Ai
Deep indigo
Washed indigo
Blue-gray
Navy
```

### Forest / Mineral

```text
Moss
Pine
Mizumatsu
Moss gray
Stone
```

### Earth / Clay

```text
Clay
Terracotta
Bark
Tea
Ochre
```

### Seasonal

```text
Spring
Summer
Autumn
Winter
```

Each palette should have editorial provenance rather than arbitrary generated colors.

---

# 14. Color Finder

Search:

```text
"dark muted green"

"Japanese blue"

"warm off white"

"indigo"

"#263B3C"
```

Return semantic and numeric results.

---

# 15. Color Compare

Compare two colors.

Display:

```text
Color A
Color B

ΔE00
Lightness difference
Chroma difference
Hue difference
OKLCH difference
CVD separation
Contrast
```

CIEDE2000 should be supported as a color-difference metric; it generally tracks perceived differences better than basic CIELAB ΔE for many comparisons.

---

# 16. Color Blind Mode

This should not be a gimmick.

The entire product should be designed for people with color-vision deficiency.

Every color should have:

```text
Name
HEX
Visual swatch
Lightness
Chroma
Hue
Icon
Pattern where useful
```

Never rely on color alone to communicate meaning.

WCAG 2.2 explicitly requires that color not be the sole visual mechanism for conveying information, and its contrast criteria account for reduced color perception among other visual limitations.

Support:

- protanopia simulation
- deuteranopia simulation
- tritanopia simulation
- anomalous variants
- grayscale
- high contrast
- pattern overlays
- labels
- audio color naming
- haptic feedback for selection/confirmation

---

# 17. CVD Outfit Mode

A particularly strong differentiator.

Example:

```text
Your outfit:

Red shirt
Olive pants
Brown shoes
```

CVD analysis:

```text
Potential issue:
Red / green distinction is reduced.

Recommended alternative:
Rust shirt
Dark navy pants
Brown shoes

Separation improvement:
+37%
```

This makes the product genuinely assistive rather than merely aesthetically oriented.

Research also demonstrates the feasibility of computational color transformations as assistive technology for color-vision deficiency.

---

# 18. Wardrobe

Users can build a digital wardrobe.

Categories:

```text
Tops
Bottoms
Outerwear
Dresses
One-piece
Shoes
Bags
Accessories
Jewelry
Scarves
Hats
```

Every item stores:

```text
Color
Color family
Primary color
Secondary colors
Pattern
Garment type
Season
Formality
Material
Brand
Size
Purchase date
Cost
```

Color is the primary intelligence layer.

---

# 19. Add Clothing

Methods:

### Camera

Photograph item.

### Color Lens

Scan color.

### Manual

Select color.

### Import

Upload image.

### Shopping URL

Eventually allow product URL ingestion.

Do not require users to fill 15 fields.

Progressively enrich the item.

---

# 20. Outfit Builder

Canvas:

```text
        TOP

  ┌──────────────┐

        PANTS

  ┌──────────────┐

        SHOES

  ┌──────────────┐
```

Swap colors.

Lock items.

Generate deterministic combinations.

Examples:

```text
Keep shirt
→ change pants

Keep pants
→ find compatible shirts

Keep shoes
→ construct outfit
```

---

# 21. “What Goes With This?”

The single most important utility.

User scans:

```text
T-shirt
```

System returns:

### Best pants

```text
01 Ecru
02 Charcoal
03 Washed navy
04 Olive gray
05 Warm taupe
```

### Best shoes

```text
01 Off-white
02 Dark brown
03 Black
04 Suede taupe
```

### Japanese combinations

```text
Traditional
Contemporary
Minimal
Urban
Earth
Indigo
Monochrome
```

---

# 22. “Does This Work With Me?”

User points camera at clothing.

The app evaluates:

```text
Color:
Deep Moss

Personal compatibility:
88%

Recommended:
✓ Excellent

Reason:
Your profile supports muted, medium-depth
colors with moderate warmth.
```

---

# 23. Outfit Scanner

Point the phone at yourself.

The application estimates the colors of:

- shirt
- trousers
- shoes
- outerwear
- accessories

Then produces:

```text
Color harmony
Personal compatibility
Contrast
Balance
Japanese aesthetic match
CVD separation
```

This does not require generative AI.

---

# 24. Pattern / Multi-color Garments

Eventually support:

```text
stripes
checks
plaids
florals
color blocks
prints
gradient garments
```

Extract:

```text
primary
secondary
accent
```

Then recommend complementary wardrobe components.

---

# 25. Material Awareness

Do not treat:

```text
cotton
linen
wool
silk
denim
leather
suede
```

as the same visual surface.

Material affects perceived color.

Later versions can add material-aware recommendations:

```text
Ecru cotton
≠
Ecru linen
≠
Ecru wool
```

---

# 26. Lighting Awareness

Camera mode should explicitly detect / ask:

```text
Daylight
Warm indoor
Cool indoor
Mixed
Low light
Unknown
```

Then display:

> Color accuracy is reduced under mixed lighting.

Avoid silently pretending accuracy.

---

# 27. Color Quality Indicator

Every camera result should have:

```text
Accuracy / Confidence

████████░░ 81%

Good
```

and reasons:

```text
✓ Stable exposure
✓ Large color region
✓ Low texture
⚠ Warm indoor light
```

This is much more professional than pretending every camera result is exact.

---

# 28. Professional Color Mode

Introduce eventually:

**IRO Pro**

For:

- fashion designers
- stylists
- photographers
- textile designers
- retailers
- merchandisers
- visual merchandisers
- color researchers
- accessibility professionals

Features:

- Lab/LCh
- CIEDE2000
- ICC-aware workflows
- reference cards
- calibration
- color libraries
- palette export
- CSV
- JSON
- CSS
- ASE
- design-token export
- PDF reports
- API

---

# 29. Accessibility

Target:

**WCAG 2.2 AA minimum.**

Use:

- semantic labels
- keyboard navigation
- screen-reader support
- visible focus
- non-color indicators
- high contrast
- reduced motion
- dynamic type
- voice announcements
- color names
- numeric color values

The UI itself should never make color the only semantic channel.

---

# 30. Privacy

Default philosophy:

> Camera data stays on the device unless the user explicitly chooses otherwise.

Whenever possible:

```text
Camera
  ↓
On-device processing
  ↓
Color result
  ↓
Image discarded
```

Do not upload photographs for ordinary color detection.

For wardrobe synchronization:

```text
User chooses:
Local-only
or
Cloud sync
```

---

# 31. Core User Journey

## First run

```text
Welcome
  ↓
Choose preferences
  ↓
Create Personal Color Profile
  ↓
Try Color Lens
  ↓
Scan a garment
  ↓
Get color identity
  ↓
Get pants recommendations
  ↓
Get shoe recommendations
  ↓
Save garment
```

The first “aha moment” should happen within approximately one minute.

---

# 32. Main Navigation

Mobile:

```text
Home
Lens
Wardrobe
Palette
Explore
Profile
```

Web:

```text
Color Lens
Color Atlas
Palette Studio
Outfit Lab
Wardrobe
Accessibility Lab
Professional
```

---

# 33. Home

Personalized but deterministic:

```text
Good afternoon

Your color today

Current palette
[colors]

Continue wardrobe

Recently scanned
[items]

Quick actions

Scan Color
Build Outfit
Find Pairing
Explore Japan
```

---

# 34. Explore

Explore:

```text
Japanese Colors
Wada-inspired combinations*
Contemporary Japan
Seasonal colors
Color stories
Fashion palettes
Neutrals
Indigo
Earth tones
Muted colors
```

Asterisk: only use external historical material according to verified licensing/content rights.

---

# 35. Search

Global search should search:

```text
colors
color codes
garments
palettes
outfits
Japanese names
English names
romanization
```

---

# 36. Shareable Color Cards

Example:

```text
AIRO / 034

藍鼠
Ai-Nezumi

Muted indigo-gray

#526A6B

Japanese Color Atlas
```

Share to:

- Instagram
- Pinterest
- WhatsApp
- X
- Messages

---

# 37. Advanced Features

## Color Journey

Track favorite colors over time.

## Color Memory

Remember colors frequently scanned.

## Shopping Check

User scans a garment in a store.

```text
Works with your wardrobe:
8 outfits

Personal compatibility:
92%

Recommended size of wardrobe investment:
High
```

## Missing Color Analysis

```text
Your wardrobe has:

14 dark neutrals
9 blues
6 earth tones
1 light neutral

Missing:
Warm light neutral
```

## Capsule Builder

Create:

```text
5 tops
3 pants
2 shoes
1 jacket
```

with maximum combination coverage.

## Wardrobe Coverage Score

Example:

```text
Your 24 garments create
63 high-confidence outfits.
```

## Cost-per-wear

Inspired by capabilities already found in wardrobe products such as Stylebook.

## Duplicate Detection

Warn:

> You already own three very similar muted navy tops.

## Color Shopping Guard

> This color adds little new capability to your wardrobe.

---

# 38. Outfit Optimization

Eventually solve:

```text
Maximize:
number of valid outfits

Minimize:
number of garments
```

This can become a mathematical optimization problem rather than an AI problem.

For example:

```text
Given 18 garments,

find the smallest subset producing
at least 50 valid outfits.
```

This is a genuinely useful product feature.

---

# 39. Calendar / Occasion

Optional:

```text
Office
Casual
Date
Wedding
Travel
Interview
Formal
Minimal
Street
Japanese-inspired
```

These become deterministic weighting profiles.

---

# 40. Weather

Future integration:

```text
Temperature
Rain
Season
```

and combine with wardrobe:

```text
28°C
Office
Rain

Recommended outfit:
linen shirt
dark trousers
water-resistant shoes
```

This is another non-AI utility layer.

---

# 41. Product Philosophy

The product should feel:

- Japanese-inspired
- editorial
- calm
- precise
- premium
- technical
- understated
- gender-neutral

Avoid:

- generic fashion influencer aesthetics
- excessive pink/purple gradients
- “AI magic” language
- fake precision
- stereotypical Japanese visual motifs
- unnecessary anime aesthetics

---

# 42. MVP

MVP should include:

### Color

- camera color picker
- photo color picker
- color names
- HEX/RGB
- Lab/LCh
- OKLCH
- color comparison
- color harmony

### Japanese

- Japanese color atlas
- curated contemporary Japanese palettes
- curated combinations

### Personal

- personal palette
- manual profile
- garment suitability

### Fashion

- shirt → pants
- shirt → shoes
- outfit builder
- wardrobe

### Accessibility

- CVD modes
- color labels
- contrast
- non-color indicators

### Platform

- iOS
- Android
- web

---

# 43. Post-MVP

Phase 2:

- calibrated scanning
- advanced wardrobe analytics
- capsule optimizer
- outfit scanner
- pattern analysis
- shopping assistant
- color history
- palette sharing

Phase 3:

- professional mode
- API
- fashion designer tools
- retailer integrations
- advanced calibration
- textile workflows
- B2B platform

---

# 44. Success Metrics

### Activation

% of users completing first color scan.

### Core value

% of users generating an outfit after scanning.

### Accuracy

Mean ΔE against controlled references.

### Recommendation quality

User “works / does not work” feedback.

### Accessibility

Successful color identification for CVD users.

### Retention

Weekly:

```text
scan
+
recommend
+
wardrobe interaction
```

### Wardrobe efficiency

Number of usable outfits generated per garment.

---

# 45. Non-Goals

Initially avoid:

- AI stylist chatbot
- virtual try-on
- face recognition
- body-shape judgment
- attractiveness scoring
- medical/dermatological claims
- fashion social network
- marketplace
- scraping every fashion retailer

Those can distract from the fundamental advantage:

**color intelligence.**

# 46. Fundamental Differentiator

The product is not:

> “AI tells you what to wear.”

It is:

> **“A scientifically grounded color engine + Japanese color knowledge + your personal palette + your actual wardrobe.”**

That distinction should remain central to the brand.