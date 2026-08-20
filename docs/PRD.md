# Irodora — Product Requirements Document

| | |
|---|---|
| **Status** | Approved — baseline for R0 |
| **Version** | 1.0 |
| **Date** | 2026-08-13 |
| **Supersedes** | [`docs/archive/brainstorm/`](archive/brainstorm/) |
| **Traceability** | [`REQUIREMENTS-COVERAGE.md`](REQUIREMENTS-COVERAGE.md) · [`.harness/state/feature_list.json`](../.harness/state/feature_list.json) |

Every requirement in this document carries an ID, a testable acceptance condition, and a
release. Nothing may be built that is not traceable to an ID here, and no ID may exist
without a feature that claims it — the `state` gate enforces both directions.

---

## 1. Product

**Irodora** — from 彩り *irodori*, "the arrangement of colours."

> A colour intelligence platform for what you wear.

Irodora combines colour science, a provenanced Japanese colour corpus, a personal colour
profile and a real wardrobe into one system that can answer — deterministically, with an
explanation, and offline — what colour something is, what goes with it, whether it suits
you, and whether everyone can tell it apart.

### 1.1 What makes it defensible

Every component of this product exists somewhere. Personal-colour apps exist. Wardrobe
apps exist. Camera colour pickers exist. Japanese colour references exist. Wada-derived
palette apps exist.

None of them is a **colour engine with provenance** that all of the above plug into. The
product is the combination and the rigour, not any single feature:

```
        Japanese colour corpus (provenanced)
                      │
Colour science ──→ COLOUR ENGINE ←── Personal colour profile
                      │
                 Garment capture
                      │
                Fashion harmony
                      │
                   Wardrobe
              ┌───────┴────────┐
        Accessibility     Optimisation
              └───────┬────────┘
                Outfit system
```

### 1.2 The three commitments the product is built on

1. **Deterministic.** The core is colour science and explicit rules. Identical inputs and
   versions produce byte-identical outputs, on any device, offline, forever. See
   [ADR-0002](adr/0002-deterministic-core-tiered-capability-policy.md).
2. **Honest about accuracy.** A phone camera under a warm bulb is not a spectrophotometer.
   Every colour value carries its provenance and confidence as *data*, not as a footnote.
   See [ADR-0005](adr/0005-measurement-provenance-is-a-type.md).
3. **Accessible by construction.** Colour-vision deficiency is modelled in the engine and
   scored in every recommendation. Colour is never the only channel carrying meaning,
   anywhere in the product.

### 1.3 Positioning

Irodora is **not** "Japanese fashion AI." It is a colour intelligence platform in which
Japanese colour culture is the distinctive content foundation. That framing keeps the
door open to general fashion, professional styling, textiles and design without trapping
the product inside one aesthetic.

---

## 2. Problem

People ask small, concrete colour questions constantly and get no reliable answer:

> *What colour is this shirt, actually? Is this navy, indigo, or blue-black? What trousers
> work with it? Does this suit my complexion? Which of these two greys did I already buy?
> Can my colour-blind friend tell my shirt and my jacket apart?*

The existing market splits these across product categories, and each category answers its
own question while discarding the information the others need. A wardrobe app knows you
own the shirt but not what colour it is to within ΔE. A colour picker knows the hex but
not that you own six near-identical ones. A personal-colour app knows your season but
cannot look at the garment in your hand.

The unifying primitive nobody has built properly is a **trustworthy colour value with
provenance**, shared across all of those questions.

---

## 3. Users

| Persona | Who | Primary need | Success looks like |
|---|---|---|---|
| **Everyday dresser** | Owns clothes, not a colour vocabulary | "What goes with this?" in under a minute | Leaves with two trouser colours and a reason |
| **Colour-vision-deficient user** | ~1 in 12 men, ~1 in 200 women | Independent confidence that an outfit reads correctly | Names a colour without asking anyone |
| **Deliberate dresser** | Builds a considered, small wardrobe | Coherence and gap analysis | Buys one item that unlocks eight outfits |
| **Japanese colour enthusiast** | Design, textile, cultural interest | Accurate, sourced colour knowledge | Trusts an entry enough to cite it |
| **Professional** (stylist, designer, merchandiser) | Works with colour for a living | Lab/LCh, ΔE00, exports, reproducibility | Replaces a spreadsheet and a swatch book |
| **Content editor** (internal) | Curates the corpus | Provenance-safe authoring with review | Ships a palette without a licensing risk |

**Not a user, deliberately:** anyone seeking a body-shape, attractiveness or
dermatological judgement. See [§9 Non-goals](#9-non-goals) and NFR-22.

---

## 4. Core journeys

**J1 — First value, under 60 seconds from first launch.** Open the app → point it at
something → see the colour named, measured, placed in the Japanese atlas, with pairings.
No sign-up, no onboarding wall, no permission request beyond the camera, and nothing
transmitted.

> **This journey changed shape.** It used to begin on the web, with no install, and that
> was the product's acquisition channel. Mobile-only means the install now happens *before*
> first value rather than after it — the 60 seconds start at first launch, not at a link.
> Discovery is an app-store and marketing problem, and it does not have an engineering
> answer in this document ([ADR-0051](adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)).

**J2 — What goes with this (mobile).** Open Lens → precision-pick the fabric → colour
identity with confidence and lighting condition → ranked trousers, shoes, accessories,
each with reasons → save the garment.

**J3 — Does this work for me.** Build a personal profile from swatch comparisons (~90 s)
→ point at any garment → compatibility score with the specific reasons behind it →
correct the profile if it is wrong.

**J4 — Can everyone see this.** Enable CVD mode → an outfit is flagged for reduced
separation → an alternative is proposed with the measured separation improvement.

**J5 — Wardrobe intelligence.** Add garments → coverage score → "your wardrobe has one
light neutral" → capsule proposal maximising outfits per garment.

**J6 — Shopping check (in store).** Scan a candidate garment → how many new outfits it
creates, personal compatibility, and whether you already own something within ΔE00 < 5.

**J7 — Professional.** Enter measured Lab → compare against a corpus with ΔE00 → export
a palette as CSS, JSON, ASE and a PDF report carrying the engine and content versions.

---

## 5. Functional requirements

Release column: **R0** foundation · **R1** engine + corpus · **R2** the app ·
**R3** personal + outfit · **R4** wardrobe · **R5** depth.

Requirements withdrawn by [ADR-0051](adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
are listed in [§12](#12-withdrawn-requirements) with the reason for each. Their IDs are
retired, not reused.

### 5.1 Colour engine

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-1** | Convert between sRGB, Display-P3, linear RGB, CIE XYZ (D65), CIELAB, CIELCh, OKLab, OKLCH | Every pair in the conversion graph round-trips within ΔE00 ≤ 0.01 across 10 000 sampled colours; every conversion matches the golden reference set within NFR-1 tolerance | R1 |
| **FR-2** | Colour difference: ΔE76, ΔE94, ΔE00 (CIEDE2000), ΔEok | ΔE00 reproduces all 34 Sharma–Wu–Dalal test-pair values to 4 decimal places; ΔE is symmetric and zero for identical inputs (property-tested) | R1 |
| **FR-3** | Contrast: WCAG 2.x ratio and APCA Lc | WCAG ratios match the specification's worked examples exactly; both reported for every foreground/background pair the UI produces | R1 |
| **FR-4** | Simulate protanopia, deuteranopia, tritanopia and anomalous variants at configurable severity | Brettel/Viénot and Machado models implemented and selectable; dichromat simulation of a confusion-line pair yields ΔE00 < 2 (i.e. correctly predicts confusion) | R1 |
| **FR-5** | Score colour separation under each CVD type | A separation score in [0,100] derived from post-simulation ΔE00 and lightness difference, defined in one place and reused by UI and recommendation alike | R1 |
| **FR-6** | Generate harmonies: monochromatic, tonal, analogous, complementary, split, triadic, tetradic, neutral, near-neutral, warm/cool, value-contrast, chroma-contrast | Each generator returns colours within the requested relationship to a stated tolerance; all output stays in the target gamut after FR-8 | R1 |
| **FR-7** | Name a colour: nearest corpus entries ranked by ΔE00, with similarity and alternatives | Returns ≥ 3 ranked candidates with ΔE00 and a similarity percentage; never asserts identity — copy is "closest reference", enforced by a copy lint | R1 |
| **FR-8** | Gamut mapping to sRGB and Display-P3 | Out-of-gamut colours map by OKLCh chroma reduction preserving lightness and hue within stated bounds; mapping is idempotent | R1 |
| **FR-9** | Every colour value carries `{space, source, confidence, conditions}` where source ∈ estimated \| calibrated \| declared \| reference | The type system makes an unclassified colour unrepresentable; a UI component cannot render a colour without also having its provenance | R1 |
| **FR-10** | Every derived result carries its reproducibility envelope: engine, corpus, rules, profile versions | Re-running a stored envelope against the same inputs reproduces the result byte-identically; asserted in a regression test | R1 |
| **FR-11** | Every score carries a structured explanation of the factors that produced it | Explanation objects are data (factor, direction, magnitude), rendered by the UI and asserted in tests — never free text generated at display time | R3 |
| **FR-12** | The full engine runs offline, client-side, with no network | Web and mobile execute Lens, harmony, naming, CVD and compatibility with the network disabled; asserted in e2e | R2 |

### 5.2 Colour capture — the Lens

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-13** | **Live pick** — continuous colour under a crosshair | Sustains ≥ 15 updates/sec on the reference device set; shows name, hex and OKLCH live | R1 web · R3 mobile |
| **FR-14** | **Garment scan** — capture a garment, user selects the fabric region | Region selection is required before a result is shown when automatic region confidence is below threshold | R1 web · R3 mobile |
| **FR-15** | **Precision pick** — robust statistics over a sampling region, not one pixel | Samples ≥ 1 000 pixels; rejects specular highlights, extreme shadows, transparent and background pixels; returns median, trimmed mean, variance and confidence | R1 web · R3 mobile |
| **FR-16** | **Calibrated scan** — correction from a physical reference card | With a supported card in frame, mean ΔE00 against reference patches improves by ≥ 50 % versus uncalibrated on the device test matrix; result is labelled `calibrated` | R5 |
| **FR-17** | Assess illumination: daylight, warm indoor, cool indoor, mixed, low light, unknown | Classification is shown before the result and reduces reported confidence in mixed and low-light conditions | R2 |
| **FR-18** | Classify capture quality (excellent/good/fair/poor) from exposure, blur, illumination uniformity, sample area and colour variance | Poor quality blocks a confident claim and returns a specific, actionable instruction ("move closer; avoid mixed lighting") | R2 |
| **FR-19** | Extract primary, secondary and accent colours from patterned garments | Returns a ranked palette with area proportions for stripes, checks, colour blocks and prints in the pattern test corpus | R5 |

### 5.3 Japanese colour content

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-20** | **Colour Atlas** — browse, filter and search the corpus by family, season, temperature, lightness, chroma and era | Every corpus entry is reachable in ≤ 3 interactions from the atlas root; served from the signed in-app corpus bundle with no network access | R1 |
| **FR-21** | A colour record carries name (kanji, kana, romaji, English), hex, RGB, Lab, LCh, OKLCH, family, temperature, era, material, season, related and complementary colours, and fashion use | Every field present or explicitly `null` with a reason; no silent blanks | R1 |
| **FR-22** | Curated contemporary palette systems (Quiet Neutrals, Indigo Studies, Forest/Mineral, Earth/Clay, Seasonal) | Each palette has editorial provenance and named roles (anchor, neutral, light, accent); no algorithmically generated palette ships without editorial sign-off | R1 |
| **FR-23** | Distinguish historical Japanese colour · traditional colour · modern Japanese palette · Japanese-inspired palette · editorial palette | The classification is a required, displayed field; the UI never presents an inspired palette as historical | R1 |
| **FR-24** | Display provenance for every entry: source, source type, licence, era, verification status | Provenance is visible on the colour detail surface, not buried in a legal page | R1 |
| **FR-25** | The corpus is versioned; a recommendation records which version it used | Corpus version is immutable once published and appears in every reproducibility envelope | R1 |

### 5.4 Personal colour

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-26** | **Guided setup** — build a profile from swatch comparisons, no camera | Completes in ≤ 90 s median; produces lightness range, temperature tendency, chroma tolerance, contrast preference, neutrals, accents, avoid-list, and a confidence per dimension | R3 |
| **FR-27** | **Photo-assisted setup** — camera provides an initial estimate the user corrects | Every derived dimension is presented as editable with its confidence; the profile is never finalised without user confirmation | R3 |
| **FR-28** | **Professional entry** — enter measured Lab/LCh or import a custom palette | Accepts colorimeter values and marks the resulting profile `reference` | R5 |
| **FR-29** | Score garment-to-person compatibility in [0,100] with per-factor explanation | Score is a pure function of profile and colour given the rule version; explanation names temperature, lightness, chroma and contrast contributions | R3 |
| **FR-30** | A profile is a multidimensional range with confidence, never a single skin RGB | The data model has no single "skin colour" field; camera estimates populate ranges, not points | R3 |

### 5.5 Outfit and recommendation

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-31** | **"What goes with this"** — given a garment colour and slot, return ranked colours for other slots | Returns ≥ 5 ranked trouser and ≥ 4 ranked shoe candidates with score and reasons, in ≤ NFR-4 latency | R3 |
| **FR-32** | Score an outfit across colour harmony, personal fit, contrast, Japanese aesthetic, versatility and CVD accessibility, plus an overall | All component scores are shown; the overall never replaces them in the UI | R3 |
| **FR-33** | **Outfit builder** — compose slots, lock items, swap colours, regenerate | Locking a slot constrains generation; the same locked set and versions always regenerate the same candidates | R4 |
| **FR-34** | Occasion context (office, casual, date, formal, interview, travel, street, minimal, Japanese-inspired) as deterministic weighting profiles | Occasion changes ranking measurably; weights are content, not code, and are versioned | R3 |
| **FR-35** | **CVD outfit mode** — flag reduced separation and propose alternatives with the measured improvement | Improvement is stated as a percentage derived from FR-5, reproducible from the stored envelope | R3 |
| **FR-36** | **Outfit scanner** — estimate the colours of a worn outfit and score it | Returns per-garment colours with confidence and the FR-32 score set | R5 |
| **FR-37** | Preference feedback adjusts weights deterministically | Repeated selection of a pairing shifts a stored, inspectable preference weight; the user can see and reset it; no model training is involved | R4 |
| **FR-38** | Alternatives: every recommendation offers substitutions across a stated dimension (warmer, cooler, lighter, higher contrast) | At least three alternatives per recommendation, each labelled with the dimension it moves along | R3 |

### 5.6 Wardrobe

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-39** | Wardrobe item model: colour(s), family, pattern, garment type, season, formality, material, brand, size, purchase date, cost | Only colour and type are required at creation; every other field is progressively enriched | R4 |
| **FR-40** | Add an item via camera, Lens scan, manual colour, image upload, or (later) product URL | Median time to add an item ≤ 20 s; never more than two required fields | R4 |
| **FR-41** | Browse, filter and group the wardrobe by colour, family, type, season and formality | Colour grouping uses perceptual distance, not hex string sorting | R4 |
| **FR-42** | **Coverage score** — how many valid outfits the wardrobe produces | Reports valid outfit count and outfits-per-garment; recomputes incrementally on change | R4 |
| **FR-43** | **Gap analysis** — identify missing colour capability | Names the gap in product language ("no warm light neutral") with the outfits it would unlock | R4 |
| **FR-44** | **Duplicate detection** — warn on near-identical items | Flags items within ΔE00 < 5 in the same category, with the measured difference shown | R4 |
| **FR-45** | **Capsule optimisation** — smallest subset producing the most valid outfits | Solves "≥ N outfits from ≤ M garments" for a 40-item wardrobe within NFR-4; solution is deterministic and reproducible | R4 |
| **FR-46** | Cost-per-wear tracking | Computed from cost and recorded wears; absent data yields "unknown", never an invented estimate | R5 |

### 5.7 Tools, search and sharing

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-47** | **Colour finder** — search by natural phrase ("dark muted green"), Japanese name, romaji, English name, or hex | A hex query returns its nearest entries; a phrase query maps to a lightness/chroma/hue region deterministically | R2 |
| **FR-48** | **Colour compare** — two colours with ΔE00, per-axis differences, OKLCH delta, CVD separation and contrast | All metrics shown with their units and the space they were computed in | R2 |
| **FR-49** | **Palette Studio** — build, edit, reorder and save palettes with roles | Palettes validate against the same schema as corpus palettes | R2 |
| **FR-50** | **Shareable colour cards** — a rendered card with name, kanji, hex and attribution | The same entry at the same corpus version renders the same card on both platforms; includes corpus version | R2 |
| **FR-51** | Export: CSV, JSON, CSS custom properties, ASE, design tokens, PDF report | Every export embeds engine and corpus versions; ASE round-trips through Adobe tooling | R5 |
| **FR-52** | **Shopping check** — outfits unlocked, personal compatibility, duplicate warning, investment signal | Runs against the local wardrobe offline | R5 |

### 5.8 The device is the platform

There is no account, no server and no sync ([ADR-0051](adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)).
Nine requirements that described those things are withdrawn — see [§12](#12-withdrawn-requirements).

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-55** | **Local-only is the only mode** — full product value with no account and no network | Every journey completes with the device in airplane mode, from a cold start, on a device that has never been online; asserted in e2e | R2 |
| **FR-56** | On-device SQLite is the system of record, encrypted at rest | Writes survive a cold restart and a force-quit mid-transaction; the database is SQLCipher-encrypted with the key in the platform keystore, never in the bundle or an environment variable; no read path can block on a network | R2 |
| **FR-58** | **Backup, export and import** — the user's data is portable and erasable by them | An export contains every record and re-imports to a byte-identical database, asserted in e2e; erasure is immediate and local, verified by a re-query returning nothing; the app prompts for an export before any destructive action. **With no server, this is the entire durability story** — a lost device is lost data, and the product says so plainly rather than implying a safety net it does not have | R2 |

### 5.9 Professional surfaces

There is no public API and no team tier ([§12](#12-withdrawn-requirements)). The
professional *capability* survives, and is **free**: the engine already computes every
number, so withholding it would have been a pricing decision rather than an engineering
one, and there is no longer any pricing to serve.

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-61** | **Professional surfaces**: Lab/LCh readouts, ΔE00 tables, reference libraries, batch compare | Numeric values are shown by default rather than only swatches, with the space each was computed in named beside it; available to every user, behind no entitlement check, because none exists | R5 |
| **FR-65** | PDF reports carrying colour values, ΔE tables and version envelope | The report is reproducible from its envelope, and is generated **on the device** — no image or colour value is uploaded to produce it | R5 |

### 5.10 Content operations

The corpus is authored **in this repository**, reviewed in pull requests, and shipped inside
the app as an immutable bundle. There is no admin application and no production database to
edit ([§12](#12-withdrawn-requirements)) — which means the editorial guarantees below are
enforced by a build gate rather than by an application's permissions, and are therefore
checked on every commit rather than only in production.

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **FR-67** | Recommendation weights and harmony rules are editable content, not code | Changing a weight changes rankings without a code change; every change creates a version | R3 |
| **FR-68** | Editorial review workflow: draft → review → verified → published, with reviewer identity | An entry cannot reach `published` without a recorded reviewer and complete provenance. Enforced by the `content` gate, which compares **roster ids** rather than names — a free-text comparison passes "A. Ranjan" against "Ashish Ranjan" and launders an unreviewed entry ([ADR-0047](adr/0047-editorial-identity-is-a-roster-id-not-a-name.md)) | R1 |

---

## 6. Non-functional requirements

| ID | Requirement | Accepts when | R |
|---|---|---|---|
| **NFR-1** | **Engine accuracy.** Conversions and ΔE match published reference values | Max ΔE00 deviation ≤ 0.01 and max absolute Lab deviation ≤ 0.02 against the golden set; enforced by the `color-golden` gate | R1 |
| **NFR-2** | **Capture accuracy is measured, never claimed.** Per-mode, per-device accuracy is published from a controlled test matrix | A results table exists for the reference device set with mean and p95 ΔE00 per mode and lighting condition; no marketing accuracy number exists without a row behind it | R5 |
| **NFR-3** | **Determinism.** Same inputs + same versions → identical outputs on every platform | A cross-platform test computes the same 10 000 results in Node, browser and React Native and asserts bitwise equality of the serialised output | R1 |
| **NFR-4** | **Latency, all of it on-device.** Live pick ≤ 50 ms perceived · local analysis p95 ≤ 200 ms · recommendation p95 ≤ 200 ms · capsule solve (40 items) p95 ≤ 3 s | Asserted against absolute thresholds in the `perf` gate, never against a moving baseline, and measured on the slowest device in the support matrix rather than the fastest. There is no API budget because there is no API | R3 |
| **NFR-7** | **Scale is a device question now.** 100 k corpus entries and 10 k wardrobe items, responsive on a four-year-old mid-range Android | Meets NFR-4 at those volumes on the slowest supported device. Corpus search is SQLite FTS5 for candidate narrowing with perceptual ranking in the engine — ΔE00 is not a metric and cannot be indexed, so the two-stage shortlist is what makes naming fast. Throughput in requests-per-second is not a property this product has | R2 |
| **NFR-8** | **Accessibility.** WCAG 2.2 AA contrast and sizing, expressed through the platform accessibility APIs | Zero violations on every screen in the `a11y` gate — roles, labels, states and focus order, not warnings; completion of J2–J4 with a screen reader is asserted in e2e | R0 |
| **NFR-9** | **Colour is never the sole channel.** Every meaning carried by colour is also carried by text, shape, icon or pattern | A UI review check plus an automated scan for colour-only status indicators; a violation fails the `contrast` gate | R0 |
| **NFR-10** | **CVD usability.** A CVD user can complete J1–J4 unaided | Simulated-CVD e2e run of every critical path; every colour swatch has an accessible name and numeric value | R1 |
| **NFR-11** | **Internationalisation.** English and Japanese from first release; no hard-coded user-facing string | An enumerated message catalogue with a completeness check; Japanese typography (vertical-capable fonts, correct line breaking) verified visually | R2 |
| **NFR-12** | **Privacy by default.** Ordinary colour detection never transmits an image | A network assertion in e2e proves no image bytes leave the device during a Lens scan | R2 |
| **NFR-13** | **Data protection at rest.** The database and any stored imagery are encrypted with SQLCipher; the key is generated on-device and held in the iOS Keychain / Android Keystore | Key generation, storage and rotation are exercised in a test; the key never appears in the bundle, in an environment variable, or in a log. **There is no transit to protect** — nothing is transmitted — and the documentation says exactly that rather than implying end-to-end encryption, which requires two ends | R4 |
| **NFR-14** | **Security baseline.** Schema validation at every trust boundary — SQLite rows, imported backups, the corpus bundle, native-module output — and no secret in the app bundle | Threat-model controls are each mapped to a test or a gate; the `security` gate blocks on Critical/High advisories. Rate limiting, CSP, cookies, tokens and IAM are gone with the surfaces that needed them; what replaced them is a smaller list that is actually enforced | R0 |
| **NFR-17** | **Offline capability.** Core value works in airplane mode with no account | Asserted in e2e with the network disabled | R2 |
| **NFR-19** | **Testability.** Golden datasets, property-based tests, storage conformance suites, e2e, and a device colour lab | Colour packages ≥ 95 % line coverage; the storage layer has a conformance suite containing at least one case verified to fail against a deliberately broken implementation — a conformance case that cannot fail launders every implementation through it | R0 |
| **NFR-20** | **Content provenance completeness.** No corpus entry ships without source, type, licence, reviewer and date | The `content` gate fails the build on a single incomplete entry | R1 |
| **NFR-21** | **Claims discipline.** No user-facing copy asserts accuracy the system cannot demonstrate | A copy lint blocks banned constructions ("exact colour", "100 % accurate", "AI-powered") outside an approved allowlist; see [ADR-0031](adr/0031-measurement-claims-policy.md) | R1 |
| **NFR-22** | **Ethical guardrails.** No dermatological claim, no ethnic or racial classification, no attractiveness or body judgement | Absent from the data model and the copy; a schema check prevents such a field from being added | R3 |
| **NFR-23** | **Bias testing.** The personal-colour engine is validated across the full skin-tone range | A held-out validation set stratified by ITA° covers every band with a stated minimum sample; per-band accuracy is published internally and a band that underperforms blocks release of that feature | R3 |
| **NFR-24** | **Maintainability.** Module and package boundaries are machine-enforced | A cross-boundary import fails `lint`; the colour engine cannot import a platform API | R0 |

---

## 7. Monetisation

**There is none, and that is a decision rather than an omission.**

The first release is free in full: the engine, the atlas, the Lens, compare, harmony,
palettes, the wardrobe, the optimiser, the professional numeric surfaces, the exports. No
tier, no cap, no entitlement check anywhere in the codebase.

Four tiers were specified — Free, Pro, Studio, API. Three of them required a server to
enforce, and FR-60's own acceptance condition said so out loud: *"entitlements are checked
server-side; a client cannot unlock a tier feature."* With no server, the honest options
were to withdraw the tiers or to ship an entitlement check that any determined user could
defeat. Shipping a lock that does not lock is worse than shipping no lock, because it
misrepresents the product to the people paying for it.

So the pricing question is **deferred until there is usage to price against**, not answered
badly now. Reopening it is an ADR, and the realistic shapes are a one-time purchase or a
store subscription with local receipt validation — both of which are decisions about the
store relationship, not about the architecture.

**What has not changed: accessibility is never paywalled.** CVD simulation, separation
scoring, colour naming and non-colour indicators stay free under any future pricing. A
product that charges disabled users for access is not the product described in §1.2. That
commitment was load-bearing when there were tiers; it is a promise about the future now.

---

## 8. Success metrics

| Metric | Definition | Target |
|---|---|---|
| **Activation** | New users completing a first colour scan | ≥ 60 % |
| **Core value** | Users generating a recommendation after a scan | ≥ 70 % of scanners |
| **Time to first value** | Landing → first named colour with pairings | p50 ≤ 60 s |
| **Engine accuracy** | Max ΔE00 vs golden reference set | ≤ 0.01 (gate) |
| **Capture accuracy** | Mean ΔE00 vs reference card, precision mode, daylight | ≤ 4.0; ≤ 2.0 calibrated |
| **Recommendation quality** | "works / does not work" positive rate | ≥ 75 % |
| **CVD success** | CVD users correctly identifying a colour unaided | ≥ 90 % |
| **Retention** | W4 users performing scan + recommend + wardrobe action | ≥ 25 % |
| **Wardrobe efficiency** | Valid outfits per garment | ≥ 2.5 at 20 garments |
| **Accessibility** | axe A/AA violations in the gate | 0 |
| **Content integrity** | Corpus entries with complete provenance | 100 % (gate) |

Every metric above has a named event in
[`docs/architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md#analytics-events) or a
named gate. A metric without instrumentation is not a metric.

---

## 9. Non-goals

Deliberately out of scope, with the reason:

| Not building | Why |
|---|---|
| AI stylist chatbot | Contradicts the deterministic, explainable core ([ADR-0002](adr/0002-deterministic-core-tiered-capability-policy.md)) |
| Virtual try-on | Different product, different technology, no colour-truth advantage |
| Face recognition | Unnecessary for the profile model (FR-30) and a serious privacy liability |
| Body-shape or attractiveness judgement | NFR-22 |
| Dermatological or medical claims | NFR-22; regulated territory we have no business entering |
| Fashion social network | Distracts from colour intelligence; adds moderation surface |
| Marketplace / commerce | Would compromise recommendation neutrality |
| Scraping retailer catalogues | [ADR-0007](adr/0007-colour-corpus-provenance-and-licensing.md); legal and quality risk |
| Ingesting third-party colour datasets | Same — the corpus is compiled in-house with provenance |

---

## 10. Constraints and assumptions

**Constraints.** TypeScript across every surface. The colour engine must run identically
in Node, browsers and React Native, and must be portable to WASM without a rewrite.
Consumer camera hardware bounds achievable accuracy; the product's job is to be honest
about that bound, not to hide it. Content licensing is a hard gate on shipping, not a
follow-up.

**Assumptions.** Users will tolerate a 90-second profile setup for materially better
recommendations. Explanation increases trust more than a single confident number. A
provenanced Japanese corpus is a durable advantage because it is expensive to build
honestly and cheap to build dishonestly — and the difference is visible.

**Open questions** (each must be closed by an ADR before the release that depends on it):

| ID | Question | Needed by |
|---|---|---|
| OQ-3 | Reference card: manufacture or partner? | R5 |
| OQ-5 | Japanese editorial reviewer — engagement model | R1 |

**Closed, not answered.** OQ-1 (OIDC provider) and OQ-2 (billing provider) asked which
vendor to choose for capabilities the product no longer has. **OQ-4 is settled at ~120
entries** — depth over breadth.

---

## 11. Release scope

Full detail in [`roadmap.md`](roadmap.md). Summary:

| Release | Theme | Ships |
|---|---|---|
| **R0** | Foundation | Toolchain, contracts, tokens, CI/CD — **delivered** |
| **R1** | Engine + corpus | The colour engine and the provenanced corpus that proves it — **delivered except the seed corpus** |
| **R2** | The app | Expo shell, on-device SQLite, design system, backup/export, Atlas, Lens, Compare, Finder, Palette Studio |
| **R3** | Personal + outfit | Profiles, compatibility, outfit engine, CVD outfit mode, bias validation, perf budgets |
| **R4** | Wardrobe | Wardrobe model, add-garment flows, outfit builder, coverage, gaps, duplicates, capsule |
| **R5** | Depth | Cost-per-wear, shopping check, calibration, outfit scanner, professional surfaces, exports, colour lab, pattern, occasion |

**R2 is the release that matters.** R0 and R1 built an engine nobody can use yet. R2 is the
first one a person can hold.

---

## 12. Withdrawn requirements

Withdrawn by [ADR-0051](adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
on 2026-08-19, when the product became a local-first mobile app with no server tier.

**These IDs are retired, not reused.** Every one is written in plain text here rather than
in bold, which is how the `state` gate distinguishes a live requirement from a withdrawn
one — a withdrawn ID needs no feature to claim it, and adding one back means restoring the
bold ID to a table above.

They are kept because the alternative is worse. Deleting them would leave nobody able to
tell, in six months, whether multi-tenancy was considered and rejected or simply never
thought of — which is the exact failure ADRs exist to prevent, applied to requirements.

| ID | Was | Why it went | What replaced it |
|---|---|---|---|
| FR-53 | Authentication via OIDC, passkeys, Apple and Google | There is no account and nothing to authenticate against | Nothing. The device is the boundary |
| FR-54 | Account management: profile, devices, sessions | Same | Nothing |
| FR-57 | Sync via an outbox with per-field resolution | There is no second device to converge with | **The door is held open**: every row carries a client-generated UUIDv7, `updated_at`, a tombstone, and an append-only `change_log`. Sync becomes a feature, not a migration |
| FR-59 | Multi-tenancy: tenant → organisation → workspace → user | One device, one user, one database file. There is no shared store to isolate | Nothing needed |
| FR-60 | Subscription tiers and entitlement enforcement | Its own acceptance condition — "entitlements are checked server-side" — cannot be met without a server. Implementing it client-side would have been security theatre | The first release is free in full (§7) |
| FR-62 | Versioned public API | There is no API | Nothing |
| FR-63 | API keys, scopes, quotas, metering | Same | Nothing |
| FR-64 | Team workspaces with roles and shared palettes | Requires a shared store and identity | Nothing |
| FR-66 | Admin application for corpus editing | The corpus is authored in this repository and reviewed in pull requests | The `content` gate, which checks provenance on **every commit** rather than only in production — a stronger guarantee than the application would have given |
| NFR-5 | Web performance: first-load JS, LCP, CLS | There is no web surface | NFR-4, which is now entirely on-device |
| NFR-6 | Availability ≥ 99.9 % monthly | There is no service to be available. The app's availability is the device's | Nothing. Offline is not a degraded mode here; it is the only mode |
| NFR-15 | Auditability: immutable audit events | The actions it audited — entitlement changes, role changes, corpus publishes — no longer exist or now happen in git | Git history for corpus changes, which is immutable in the way that matters and reviewable by anyone |
| NFR-16 | Observability: OpenTelemetry traces and metrics | There is no collector and nothing to trace across | **Nothing, and this is a real loss** — see the honesty note below |
| NFR-18 | Deployment portability: local, VPS, AWS | There is nothing to deploy | EAS Build and the app stores |

### The two that genuinely cost something

Most of the rows above describe machinery that existed to support other machinery. Two do not:

**NFR-16 (observability) means we now learn nothing about how the app is used.** No funnel,
no error aggregation, no measure of whether a recommendation was accepted. Product decisions
rest on qualitative feedback alone. That is a deliberate trade for the privacy guarantee in
NFR-12 — which becomes absolute rather than conditional — but it is a trade, and a future
opt-in, on-device, user-inspectable diagnostic would need its own ADR rather than arriving
quietly.

**FR-57 (sync) means a lost device is lost data.** FR-58 answers it with backup and export,
and that is a real answer only if the export is easy enough that people actually do it. If
support contact about lost data after a device change exceeds 5 % of contacts, that is the
signal to reopen ADR-0051, not to make the export louder.
