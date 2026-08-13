# Architecture Decision Records

## ADR-001 — Non-AI Core Architecture

### Status
Accepted

### Decision

The core product intelligence will be deterministic and non-AI.

### Rationale

Color conversion, harmony, similarity, contrast, CVD simulation, compatibility scoring and wardrobe optimization are well-suited to deterministic algorithms.

A deterministic engine provides:

- reproducibility
- explainability
- offline capability
- low operating cost
- privacy
- predictable latency
- easier QA
- easier regulatory/audit reasoning

AI may be introduced later as an optional experience layer, but it must never be required for core functionality.

---

## ADR-002 — Mobile-First With Web Companion

### Status
Accepted

### Decision

Develop:

```text
Native-capable mobile application
+
full web application
```

using TypeScript.

Recommended:

```text
React Native + Expo
Next.js
TypeScript
```

### Rationale

Camera usage is central to the product.

Web camera APIs are capable of accessing camera streams through `getUserMedia()` with user permission.

However, native applications provide better control over:

- camera configuration
- image capture
- color-space handling
- permissions
- device-specific behavior
- performance
- offline execution

Apple exposes camera color-space information and supported devices can capture using P3, while Android has explicit color-space APIs.

Therefore mobile should be primary for Color Lens.

---

## ADR-003 — Shared TypeScript Color Engine

### Status
Accepted

### Decision

Create a platform-independent package:

```text
@iro/color-core
```

used by:

```text
Web
React Native
Node.js
Workers
CLI
```

### Responsibilities

- RGB conversion
- XYZ conversion
- Lab
- LCh
- OKLab
- OKLCH
- HSV/HSL
- Delta E
- CIEDE2000
- contrast calculations
- gamut conversion
- color naming
- harmony generation
- CVD transforms

The underlying color math should not be duplicated across platforms.

---

## ADR-004 — Use Multiple Color Spaces

### Status
Accepted

### Decision

Do not make RGB or HEX the application's internal canonical representation.

Internal representations should include:

```text
XYZ
CIELAB
LCh
OKLab
OKLCH
```

with sRGB / Display-P3 as presentation/capture-related spaces.

### Rationale

RGB/HEX is useful for UI and interoperability but is not perceptually uniform.

OKLCH is particularly useful for manipulating lightness/chroma/hue and has been standardized in modern CSS color specifications.

CIELAB and CIEDE2000 should be maintained for professional color comparison.

---

## ADR-005 — Japanese Color Content Must Be Provenanced

### Status
Accepted

### Decision

Every Japanese color entry will include provenance.

Schema:

```text
source
source_type
historical_period
source_license
verified
editorial_notes
```

### Rationale

There are numerous online representations of Japanese traditional colors, but hex/RGB representations are not automatically equivalent to owning the underlying cultural/content data.

The company must verify rights for:

- Wada-derived datasets
- commercial color systems
- historical publications
- third-party databases
- translations

The product should use licensed or independently compiled datasets.

---

## ADR-006 — Wada Is Inspiration, Not the Entire Product

### Status
Accepted

### Decision

Build an original color-intelligence layer around Japanese color traditions and curated combinations.

Do not make Wada the sole recommendation engine.

### Rationale

Modern apps already expose Wada's 159 colors and 348 combinations, including camera matching and wardrobe capabilities.

Simply recreating those capabilities would create a commodity.

The proprietary product should instead combine:

```text
Japanese history
+
color science
+
fashion harmony
+
personal color
+
wardrobe optimization
+
accessibility
```

---

## ADR-007 — Camera Color Is an Estimate by Default

### Status
Accepted

### Decision

Camera measurements shall be classified:

```text
Estimated
Calibrated
```

Never simply:

```text
Exact
```

### Rationale

Camera sensors and illumination influence recorded color. Research on camera color correction continues to address nonlinear sensor responses and complex LED illuminants, demonstrating why arbitrary smartphone camera measurements cannot be treated as absolute physical color truth.

---

## ADR-008 — Calibration Card for Professional Accuracy

### Status
Accepted

### Decision

Introduce an optional physical reference card.

Architecture:

```text
Known color patches
        ↓
Captured by camera
        ↓
Estimate device/illumination correction
        ↓
Transform observed RGB
        ↓
Canonical color
```

Potential future products:

```text
IRO Reference Card
IRO Pro Reference Kit
IRO Textile Kit
```

This creates a path from consumer color detection to professional color measurement.

---

## ADR-009 — Personal Color Is a Profile, Not a Single Skin RGB Value

### Status
Accepted

### Decision

Store a multidimensional personal color profile.

Example:

```text
lightness
warmth
chroma
contrast
preferred neutrals
accent preferences
```

### Rationale

Skin color varies across lighting and spatial regions. A single RGB sample would create false precision.

The product may provide camera-assisted estimation but should allow user correction.

---

## ADR-010 — Color-Blind Accessibility Is a First-Class Architecture Feature

### Status
Accepted

### Decision

CVD transformations are part of the shared color engine rather than a UI add-on.

### Rationale

The product explicitly serves users with color-vision deficiency.

All critical semantics will have:

```text
color
+
text
+
shape/icon
+
optional pattern
```

WCAG 2.2 explicitly addresses use of color and contrast requirements.

---

## ADR-011 — On-Device Color Processing

### Status
Accepted

### Decision

Normal color detection occurs locally.

Backend receives:

```text
color values
metadata
optional user-selected garment information
```

rather than raw camera photos.

### Benefits

- privacy
- reduced bandwidth
- lower cost
- offline functionality
- lower latency
- better trust

---

## ADR-012 — Backend Technology

### Status
Accepted

### Decision

Use:

```text
Node.js
TypeScript
Fastify
PostgreSQL
Redis
S3-compatible object storage
```

### Rationale

The application is heavily read-oriented and computationally deterministic.

Fastify provides an efficient Node.js HTTP layer while TypeScript creates strong shared contracts with the clients.

Express could work, but Fastify is the preferred greenfield backend choice for this platform.

---

## ADR-013 — PostgreSQL as System of Record

### Status
Accepted

Use PostgreSQL for:

- users
- profiles
- wardrobes
- garments
- colors
- palettes
- outfit definitions
- recommendations
- preferences
- subscriptions
- audit records
- content provenance

Do not introduce a separate database merely because the product has “color data.”

The color catalog is relational and highly structured.

---

## ADR-014 — Offline-First Color Engine

### Status
Accepted

The mobile app should ship with:

```text
core color math
CVD transforms
core palettes
basic harmony engine
basic Japanese color catalog
```

This enables:

```text
Airplane mode
No account
No network
Low latency
Privacy mode
```

---

## ADR-015 — Recommendation Engine Is Rule-Based

### Status
Accepted

Represent recommendations using explicit rules.

Example:

```text
IF
temperature_difference <= threshold
AND
lightness_distance in preferred_range
AND
chroma compatibility is high
THEN
increase score
```

Then apply editorial weights.

Example:

```text
Color Science       35%
Japanese Harmony    25%
Personal Profile    25%
Preference           10%
CVD separation        5%
```

All weights should be configurable in the content system.

---

## ADR-016 — Configuration Over Hard-Coding

### Status
Accepted

Harmony rules, palette associations and recommendation weights should be data-driven.

Example:

```json
{
  "rule": "muted-indigo-to-ecru",
  "score": 0.92,
  "context": ["casual", "minimal", "japanese-contemporary"],
  "source": "editorial-v3"
}
```

This allows the content team to evolve recommendations without shipping application code.

---

## ADR-017 — No Server-Side Image Processing for Basic Scan

### Status
Accepted

Basic scan:

```text
camera
→ local processing
→ result
```

Server processing is required only when users explicitly request cloud features such as:

- wardrobe synchronization
- cloud backup
- professional reports
- sharing
- cross-device image persistence

---

## ADR-018 — API-First Architecture

### Status
Accepted

The platform will expose a versioned API:

```text
/api/v1
```

Eventually:

```text
Color API
Palette API
Recommendation API
Wardrobe API
Professional API
```

This creates a future B2B business without redesigning the architecture.

---

## ADR-019 — Observability

### Status
Accepted

Production observability:

```text
OpenTelemetry
structured JSON logs
metrics
distributed traces
error tracking
audit events
```

Measure:

- API latency
- scan latency
- recommendation latency
- failed scans
- image-processing failures
- database latency
- cache hit rate
- sync conflicts
- app crashes

Do not log raw camera frames or sensitive user imagery.

---

## ADR-020 — Security

### Status
Accepted

Use:

```text
OIDC/OAuth2
short-lived access tokens
refresh token rotation
TLS
encryption at rest
KMS-managed secrets
least privilege IAM
RBAC
rate limiting
input validation
request signing where needed
audit logs
```

All backend input validated with a schema system such as Zod.

---

## ADR-021 — Multi-Tenant Readiness

### Status
Accepted

Even though the consumer application is initially single-brand, database/API architecture should support:

```text
tenant
organization
workspace
user
```

This enables future:

- stylist accounts
- fashion houses
- retailers
- professional teams
- enterprise customers

---

## ADR-022 — No Microservices Initially

### Status
Accepted

Start with a modular monolith.

```text
API
├── Auth
├── Users
├── Colors
├── Palettes
├── Wardrobe
├── Recommendations
├── Content
└── Billing
```

Separate services only when:

- scaling characteristics differ materially
- deployment independence becomes valuable
- domain ownership requires it

Do not create ten microservices on day one.

---

## ADR-023 — Search

### Status
Accepted

PostgreSQL full-text search is sufficient initially.

Later introduce:

```text
Postgres + pg_trgm
```

and potentially a dedicated search engine only if catalog/search volume requires it.

Do not introduce Elasticsearch/OpenSearch prematurely.

---

## ADR-024 — Asset Storage

### Status
Accepted

Use object storage:

```text
S3
```

for:

- wardrobe images
- user exports
- palette cards
- professional reports

Use signed URLs and lifecycle policies.

Default retention should be minimized.

---

## ADR-025 — Design for Deterministic Reproducibility

### Status
Accepted

Every recommendation should be reproducible from:

```text
engine_version
palette_version
rule_version
profile_version
input_color
context
```

Example:

```text
recommendation_id
engine = 1.4.2
rules = 2026.08
palette = JP-CONTEMPORARY-03
```

This is important for debugging and professional trust.