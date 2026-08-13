# High-Level Design

## 1. Architecture

```text
                         ┌───────────────────────┐
                         │       Web App         │
                         │ Next.js + TypeScript  │
                         └───────────┬───────────┘
                                     │
                         ┌───────────▼───────────┐
                         │      API Gateway      │
                         │       HTTPS/TLS       │
                         └───────────┬───────────┘
                                     │
              ┌──────────────────────┴──────────────────────┐
              │                                             │
┌─────────────▼──────────────┐              ┌───────────────▼──────────────┐
│       Mobile App           │              │      Node.js API             │
│ React Native + Expo + TS   │              │ Fastify + TypeScript         │
└─────────────┬──────────────┘              └───────────────┬──────────────┘
              │                                             │
              │                                    ┌────────┴─────────┐
              │                                    │                  │
              │                              ┌─────▼─────┐     ┌────▼────┐
              │                              │ PostgreSQL │     │  Redis  │
              │                              └───────────┘     └─────────┘
              │
              │
     ┌────────▼────────────────────────────────────┐
     │         Shared TypeScript Engine             │
     │                                              │
     │ color-core                                  │
     │ color-spaces                                │
     │ harmony                                     │
     │ japanese-colors                             │
     │ personal-palette                            │
     │ CVD                                         │
     │ recommendation                              │
     └──────────────────────────────────────────────┘
```

---

# 2. Repository Strategy

Use a monorepo.

Recommended:

```text
apps/
  web/
  mobile/
  api/
  admin/

packages/
  color-core/
  color-spaces/
  color-conversion/
  color-difference/
  color-harmony/
  cvd-engine/
  japanese-colors/
  fashion-rules/
  recommendation-engine/
  shared-types/
  validation/
  design-tokens/
  telemetry/

infra/
  aws/
  terraform-or-cdk/

content/
  palettes/
  colors/
  rules/
  localizations/
```

Use Turborepo or Nx.

---

# 3. Color Engine

The Color Engine is the technical heart of the product.

```text
Input
  │
  ├── RGB
  ├── Display P3
  ├── HEX
  ├── image pixels
  └── measured Lab
  │
  ▼
Normalize
  │
  ▼
Linear RGB
  │
  ▼
XYZ
  │
  ├─────────────┐
  ▼             ▼
CIELAB        OKLab
  │             │
  ▼             ▼
LCh           OKLCH
  │             │
  └──────┬──────┘
         ▼
Color engine
```

---

# 4. Color Sampling Pipeline

For camera input:

```text
Camera Frame
    ↓
Color-space metadata
    ↓
Exposure / white-balance assessment
    ↓
Sampling region
    ↓
Spatial pixel sampling
    ↓
Outlier removal
    ↓
Robust averaging
    ↓
Color-space conversion
    ↓
Canonical color
    ↓
Color-name lookup
    ↓
Japanese palette matching
    ↓
Recommendation engine
```

The web platform also supports explicit sRGB and Display-P3 canvas/image-data color spaces, which is useful for a color-sensitive web application.

---

# 5. Fabric Sampling

A fabric should not be represented by one pixel.

Use a sampling region:

```text
┌─────────────────┐
│ • • • • • • • • │
│ • • • • • • • • │
│ • • TARGET • • • │
│ • • • • • • • • │
└─────────────────┘
```

Sample hundreds/thousands of pixels.

Discard:

- highlights
- extreme shadows
- specular reflections
- transparent pixels
- background pixels
- obvious texture outliers

Return:

```text
median color
mean color
variance
confidence
```

---

# 6. Garment Region Selection

Initial implementation:

**user-selected region**

Later:

```text
automatic segmentation
```

can be implemented with classical computer vision techniques where feasible.

Do not make garment segmentation dependent on an AI vision model.

Possible techniques:

- edge detection
- graph-based segmentation
- color clustering
- connected regions
- foreground masks
- user-assisted polygon selection

---

# 7. Color Naming Engine

Pipeline:

```text
input color
   ↓
CIELAB / OKLCH
   ↓
nearest named-color candidates
   ↓
CIEDE2000 ranking
   ↓
contextual filtering
   ↓
human-readable naming
```

Example:

```text
Closest color

Ai-nezu
藍鼠

Similarity:
94%

Alternatives:
Kachi-iro
Nando-iro
Kon
```

Never claim an arbitrary color is historically identical to a named color.

Use:

> “Closest digital reference”

rather than:

> “Exact traditional color.”

---

# 8. Japanese Color Database

Suggested entities:

```text
JapaneseColor

id
canonical_name
kanji
kana
romanization
english_name

hex
rgb
lab_l
lab_a
lab_b
oklch_l
oklch_c
oklch_h

family
temperature
lightness
chroma

historical_period
material
season

source
license
provenance
editorial_status

created_at
updated_at
version
```

---

# 9. Palette Database

```text
Palette

id
name
description
category
period
aesthetic
source
license
version
```

Relations:

```text
Palette
 └── PaletteColor
       ├── role
       ├── rank
       └── weight
```

Example:

```text
Palette:
Quiet Indigo

Colors:

deep indigo   → anchor
fog gray      → neutral
ecru          → light
moss          → accent
```

---

# 10. Harmony Engine

Input:

```text
base_color
context
personal_profile
```

Candidate generation:

```text
monochromatic
analogous
complementary
split
triadic
tonal
neutral
editorial
Japanese
```

Then calculate score.

---

# 11. Recommendation Score

Example:

```text
score =
    0.30 * colorHarmony
  + 0.25 * personalCompatibility
  + 0.15 * lightnessBalance
  + 0.10 * chromaBalance
  + 0.10 * japaneseEditorialFit
  + 0.05 * preferenceFit
  + 0.05 * cvdSeparation
```

Weights are configuration.

They should not be hard-coded into clients.

---

# 12. Personal Compatibility Engine

Input:

```text
personalProfile
garmentColor
```

Transform garment into:

```text
L
C
H
temperature
contrast
```

Compare with profile ranges.

Example:

```text
profile.chroma = low_to_medium

garment.chroma = medium

compatibility = 87
```

Return explanations:

```text
High value compatibility
Good chroma compatibility
Moderate temperature compatibility
```

---

# 13. Outfit Engine

Represent an outfit as:

```text
Outfit
 ├── top
 ├── bottom
 ├── shoes
 ├── outerwear
 └── accessories
```

Each garment points to:

```text
GarmentColor
GarmentType
Material
Formality
Season
```

The engine creates combinations through constrained search.

---

# 14. Wardrobe Optimization

Suppose:

```text
Tops = 15
Pants = 8
Shoes = 5
```

Potential combinations:

```text
15 × 8 × 5 = 600
```

Filter:

```text
invalid
poor harmony
low personal compatibility
wrong occasion
poor CVD separation
duplicate combinations
```

Return high-value combinations.

This does not require ML.

---

# 15. Capsule Optimization

This can be formulated as a combinatorial optimization problem.

Objective:

```text
maximize outfit coverage
while minimizing wardrobe size
```

Possible formulation:

```text
maximize validOutfits(items)
subject to
itemCount <= N
```

Use integer programming / branch-and-bound / heuristic optimization depending on scale.

This could become one of the product's strongest advanced features.

---

# 16. Color Blind Engine

```text
canonical color
      ↓
CVD transform
      ↓
simulated appearance
      ↓
color separation calculation
```

For any outfit:

```text
Red
+
Green

↓ CVD analysis

Potential confusion
```

Then recommend:

```text
Rust
+
Navy
```

---

# 17. Accessibility Metadata

Every color object should expose:

```text
name
shortName
hex
rgb
lab
oklch
luminance
contrast
cvdVariants
```

UI components should consume semantic color objects rather than arbitrary hex values.

---

# 18. Web Application

### Next.js

Recommended:

```text
Next.js
TypeScript
React
Tailwind CSS
Radix/shadcn where appropriate
Framer Motion sparingly
```

Pages:

```text
/
 /lens
 /colors
 /colors/[slug]
 /palettes
 /palettes/[slug]
 /outfit
 /wardrobe
 /accessibility
 /professionals
 /account
```

---

# 19. Mobile Application

React Native:

```text
Expo
TypeScript
Expo Camera
native file access
local SQLite
SecureStore
```

Core algorithms run locally.

For heavier computations:

```text
TypeScript
→ WASM where useful
```

Native modules should only be introduced when camera/color performance requires them.

---

# 20. Local Storage

Mobile:

```text
SQLite
```

Store:

```text
profile
garments
colors
recent scans
favorites
offline palette data
```

SecureStore:

```text
tokens
encryption keys
sensitive credentials
```

---

# 21. Synchronization

Use offline-first synchronization.

Example:

```text
Local DB
   ↓
Outbox
   ↓
Sync API
   ↓
Server
```

Changes contain:

```text
entity_id
operation
version
timestamp
device_id
```

Conflict policy:

```text
last-write-wins
```

for simple metadata.

Use specialized merge logic for:

- wardrobe edits
- outfits
- user preferences

---

# 22. Backend Modules

```text
AuthModule
UserModule
ProfileModule
ColorModule
PaletteModule
GarmentModule
WardrobeModule
RecommendationModule
OutfitModule
ContentModule
AccessibilityModule
SubscriptionModule
AnalyticsModule
```

---

# 23. Database

Core schema:

```text
users
profiles
personal_color_profiles

colors
japanese_colors
palettes
palette_colors
harmony_rules
fashion_rules

garments
garment_colors
wardrobes
outfits
outfit_items

recommendations
recommendation_feedback

favorites
saved_palettes

subscriptions

content_versions
content_sources
audit_events
```

---

# 24. API

Example:

```http
GET /api/v1/colors
GET /api/v1/colors/:id

GET /api/v1/palettes
GET /api/v1/palettes/:id

POST /api/v1/color/match
POST /api/v1/color/compare

POST /api/v1/recommendations/pants
POST /api/v1/recommendations/shoes
POST /api/v1/recommendations/outfit

GET /api/v1/wardrobe
POST /api/v1/wardrobe/items

POST /api/v1/outfits/evaluate
POST /api/v1/outfits/generate
```

---

# 25. API Example

```json
{
  "inputColor": {
    "space": "oklch",
    "l": 0.58,
    "c": 0.06,
    "h": 155
  },
  "profileId": "profile_123",
  "context": {
    "occasion": "casual",
    "aesthetic": "japanese-contemporary"
  }
}
```

Response:

```json
{
  "baseColor": {
    "name": "Muted Sage",
    "hex": "#718477"
  },
  "recommendations": {
    "pants": [
      {
        "name": "Ecru",
        "hex": "#E8DFCF",
        "score": 93
      },
      {
        "name": "Charcoal",
        "hex": "#343536",
        "score": 90
      }
    ],
    "shoes": [
      {
        "name": "Dark Brown",
        "hex": "#49352A",
        "score": 88
      }
    ]
  }
}
```

---

# 26. Authentication

Use standards-based authentication.

Recommended:

```text
OIDC
OAuth
Passkeys
Apple
Google
Email magic link
```

Avoid implementing password authentication primitives from scratch.

---

# 27. Privacy Architecture

For Color Lens:

```text
Camera
 ↓
Local frame
 ↓
Local processing
 ↓
Color result
 ↓
Frame discarded
```

For wardrobe:

```text
Photo
 ↓
Encrypted local storage
 ↓
Optional cloud sync
 ↓
S3 encrypted object
```

Use:

- encryption at rest
- KMS
- TLS
- signed URLs
- least privilege
- retention policies
- delete/export functionality

---

# 28. Cloud Architecture

AWS is a strong deployment choice.

Example:

```text
CloudFront
    ↓
WAF
    ↓
ALB/API
    ↓
ECS/Fargate
    │
    ├── API
    └── background workers
         │
         ├── PostgreSQL/Aurora
         ├── ElastiCache
         └── S3
```

Alternative later:

```text
CloudFront
→ API Gateway
→ ECS/Lambda
```

Do not use Lambda for every computational component automatically.

---

# 29. Compute Strategy

### Client

```text
camera processing
color conversion
basic harmony
CVD
basic recommendation
```

### Backend

```text
account
sync
content
analytics
professional reports
long-running jobs
billing
```

### Worker

```text
image preprocessing where cloud-selected
report generation
bulk content processing
analytics jobs
catalog updates
```

---

# 30. Caching

Cache heavily:

```text
Japanese colors
palettes
harmony rules
popular recommendations
color-name lookups
```

The color catalog is mostly immutable.

Use:

```text
CDN
HTTP cache
Redis
client cache
```

---

# 31. CDN

Static content:

```text
palette images
color cards
fonts
public catalog content
generated reports
```

served through CloudFront.

---

# 32. Performance Targets

Target:

### Color picker

```text
<50 ms perceived response
```

### Local color analysis

```text
<200 ms typical
```

### Backend recommendation

```text
p95 < 200 ms
```

### API

```text
p95 < 300 ms
```

### First app interaction

Keep startup and onboarding lightweight.

---

# 33. Reliability

Target:

```text
99.9%+
```

for core backend APIs.

Implement:

- retries
- exponential backoff
- idempotency
- circuit breakers where required
- rate limiting
- health checks
- graceful degradation
- offline mode

---

# 34. Content Management

Create an internal admin application.

Admin users can manage:

```text
colors
Japanese names
translations
palettes
harmony rules
fashion rules
sources
licenses
versions
```

Every content change produces:

```text
content_version
```

This is extremely important because the recommendation engine is content-driven.

---

# 35. Rule Versioning

Example:

```text
Color Engine
v1.6.1

Japanese Palette
v2026.08

Fashion Rules
v2026.08.04

Personal Profile Engine
v1.2
```

Store these with recommendations.

This lets engineering reproduce historical results.

---

# 36. Analytics

Track product events, not raw images.

Examples:

```text
color_scanned
color_saved
recommendation_viewed
outfit_created
outfit_saved
wardrobe_item_added
palette_opened
cvd_mode_enabled
recommendation_accepted
recommendation_rejected
```

These become valuable product signals without requiring AI.

---

# 37. Feedback Loop Without AI

When user repeatedly selects:

```text
olive + ecru
```

over:

```text
olive + black
```

update preference weights.

This is still deterministic personalization.

Example:

```text
preferred_neutral:
ecru +0.18
black -0.04
```

No machine-learning model is required.

---

# 38. Recommendation Explainability

Every recommendation must have an explanation object.

Example:

```json
{
  "score": 91,
  "reasons": [
    "Strong lightness contrast",
    "Compatible chroma",
    "Warm-neutral relationship",
    "Matches selected contemporary Japanese palette"
  ]
}
```

This makes the system explainable and testable.

---

# 39. Testing Strategy

### Unit tests

Color formulas:

```text
RGB → XYZ
XYZ → Lab
Lab → LCh
RGB → OKLCH
CIEDE2000
```

Golden datasets should be used.

### Property testing

Examples:

```text
round-trip conversions
symmetry of ΔE
bounds
monotonicity where applicable
```

### Snapshot tests

Japanese color database.

### Visual regression

Color rendering.

### Device testing

Large camera/device matrix.

---

# 40. Color Measurement Test Lab

For production quality, establish a test suite with:

```text
known color cards
known fabrics
multiple lighting environments
multiple phones
multiple cameras
```

Measure:

```text
reference color
camera result
ΔE00
```

Then produce:

```text
iPhone accuracy
Pixel accuracy
Samsung accuracy
Safari accuracy
Chrome accuracy
```

This is much more valuable than claiming “95% accurate” without controlled testing.

---

# 41. Camera Quality Classification

Example:

```text
Excellent
Good
Fair
Poor
```

determined from:

```text
exposure
blur
illumination uniformity
sampling area
color variance
white balance stability
```

If poor:

> Move closer to the fabric and avoid mixed lighting.

---

# 42. Professional Measurement Roadmap

Version 1:

```text
consumer estimate
```

Version 2:

```text
reference-card calibration
```

Version 3:

```text
hardware integration
```

Potential future:

```text
Bluetooth spectrocolorimeter
        ↓
IRO
```

This could turn the product into a serious professional color platform.

---

# 43. Security Threat Model

Protect against:

```text
account takeover
token theft
IDOR
malicious uploads
image payload attacks
API abuse
content tampering
recommendation manipulation
rate-limit bypass
subscription abuse
```

Use:

```text
schema validation
content-type verification
file-size limits
image decoding sandboxing
rate limits
WAF
CSP
CSRF protection where relevant
secure cookies
token rotation
RBAC
audit logs
```

---

# 44. Abuse Prevention

Rate-limit:

```text
camera-related APIs
professional APIs
exports
share endpoints
auth
passwordless login
```

Prefer local processing for basic scanning so the biggest resource-consuming feature is naturally protected.

---

# 45. Observability Architecture

```text
Mobile/Web
   │
   └── OpenTelemetry
          ↓
      API telemetry
          ↓
 ┌────────┼─────────┐
 │        │         │
traces  metrics    logs
 │        │         │
 └────────┼─────────┘
          ↓
 observability platform
```

Dashboard:

```text
API latency
scan latency
recommendation latency
5xx
DB latency
cache hit rate
sync failures
mobile crash rate
camera failures
```

---

# 46. Deployment

Use:

```text
GitHub/GitLab
        ↓
CI
        ↓
lint
typecheck
unit tests
integration tests
security scan
build
        ↓
container
        ↓
registry
        ↓
staging
        ↓
automated verification
        ↓
production
```

Use:

```text
Terraform
```

or:

```text
AWS CDK
```

for infrastructure-as-code.

---

# 47. Environments

At minimum:

```text
development
staging
production
```

Potential:

```text
preview
```

for web.

Never share production secrets across environments.

---

# 48. Architecture Evolution

### Stage 1

```text
Modular monolith
+
Postgres
+
Redis
```

### Stage 2

Separate:

```text
background processing
content service
professional API
```

### Stage 3

Only when justified:

```text
recommendation service
color computation service
catalog service
```

The system should not begin as microservices.

---

# 49. Why This Can Be a Serious Product

There is already evidence of demand across the individual categories:

- Dressika combines personal color analysis, wardrobe and seasonal palettes.
- My Best Colors provides personal palettes and custom palette management.
- Stylebook offers a mature virtual closet with extensive wardrobe management tooling.
- Whering focuses on wardrobe organization and outfit creation at very large user scale.
- ACloset combines wardrobe organization and automated fashion recommendations.
- Color Grab demonstrates that camera-based color recognition is an established consumer use case, including features specifically aimed at color-blind users.
- Wada-based applications are already combining Japanese color combinations with camera color matching and wardrobe functionality.

The opportunity is therefore **not** to claim that scanning clothing or Japanese color palettes are novel individually.

The novel product should be the combination:

```text
          Japanese Color Knowledge
                    │
                    ▼
Color Science ──→ COLOR ENGINE ←── Personal Palette
                    │
                    ▼
              Garment Scanner
                    │
                    ▼
             Fashion Harmony
                    │
                    ▼
                Wardrobe
                    │
            ┌───────┴────────┐
            ▼                ▼
       Accessibility      Optimization
            │                │
            └───────┬────────┘
                    ▼
               Outfit System
```

# 50. The Most Important Strategic Decision

Do **not** position this as:

> “Japanese fashion AI.”

Position it as:

> **A color intelligence platform for what you wear.**

Japanese color culture becomes the product's distinctive aesthetic and content foundation.

That gives the product room to eventually support:

```text
Japanese fashion
+
general fashion
+
professional styling
+
wardrobe management
+
shopping
+
accessibility
+
textiles
+
design
```

without trapping it inside one aesthetic.

# 51. Recommended Product Evolution

### Stage 1 — Color Lens

```text
Scan
Identify
Name
Measure
Compare
```

### Stage 2 — Color Styling

```text
Garment
→ pants
→ shoes
→ accessories
```

### Stage 3 — Personal Color

```text
Your profile
→ colors for you
```

### Stage 4 — Wardrobe

```text
Your clothes
→ outfits
```

### Stage 5 — Japanese Color Intelligence

```text
Traditional
Contemporary
Wada-inspired/licensed
Seasonal
Editorial
```

### Stage 6 — Accessibility

```text
CVD-aware color system
```

### Stage 7 — Optimization

```text
capsule wardrobe
outfit coverage
shopping gaps
```

### Stage 8 — Professional Platform

```text
stylists
fashion designers
retail
textiles
APIs
calibration
hardware
```

That progression gives you a real product platform rather than a one-feature camera utility.