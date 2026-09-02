# Architecture Decision Records

A decision that lives only in a conversation does not exist. Every architectural choice
that deviates from an obvious default, constrains future work, or would otherwise be
re-litigated in six months lives here.

**This index is machine-checked.** The `state` gate fails if a file in this directory has
no row below, or a row points at a file that does not exist.

## Writing one

Copy [`0000-template.md`](0000-template.md). Use the
[`write-adr`](../../.harness/skills/write-adr/SKILL.md) skill.

Two rules that matter more than the format:

- **Title the decision, not the topic.** "Postgres is the single system of record", not
  "Database choice".
- **Fill in the Bad consequences.** An ADR with no downsides is describing a preference.
  Every real decision costs something, and the next person needs to know what.

## Index

| # | Decision | Status |
|---|---|---|
| [0000](0000-template.md) | Template | — |
| [0001](0001-monorepo-modular-monolith-with-extraction-triggers.md) | One repository, a modular monolith, and named extraction triggers | Amended by ADR-0051 |
| [0002](0002-deterministic-core-tiered-capability-policy.md) | A tiered capability policy replaces the blanket "non-AI" rule | Accepted |
| [0003](0003-canonical-colour-representation-xyz-d65.md) | CIE XYZ (D65) is the canonical internal colour representation | Accepted |
| [0004](0004-own-the-colour-engine-culori-as-test-oracle.md) | We implement the colour maths; `culori` and `colorjs.io` are test oracles | Accepted |
| [0005](0005-measurement-provenance-is-a-type.md) | Measurement provenance is part of the colour value | Accepted |
| [0006](0006-camera-capture-vision-camera-and-getusermedia.md) | VisionCamera frame processors on mobile, `getUserMedia` on web | Accepted |
| [0007](0007-colour-corpus-provenance-and-licensing.md) | The colour corpus is compiled in-house with per-entry provenance | Accepted |
| [0008](0008-search-postgres-fts-with-engine-side-perceptual-ranking.md) | Postgres narrows the candidates; the engine ranks them perceptually | Superseded in part by ADR-0051 |
| [0009](0009-cvd-is-an-engine-concern-not-a-ui-filter.md) | CVD simulation lives in the engine and scores every recommendation | Accepted |
| [0010](0010-personal-colour-is-a-profile-not-a-skin-rgb.md) | A personal colour profile is ranges, never a skin colour value | Accepted |
| [0011](0011-recommendation-rules-are-versioned-content.md) | Recommendation weights and harmony rules are versioned content | Accepted |
| [0012](0012-backend-fastify-zod-openapi.md) | Fastify with Zod schemas that generate the OpenAPI document | Superseded by ADR-0051 | <!-- retired-ok: An index row whose own Status column reads "Superseded by ADR-0051". -->
| [0013](0013-postgres-drizzle-single-system-of-record.md) | PostgreSQL is the single system of record, accessed through Drizzle | Superseded by ADR-0051 |
| [0014](0014-offline-first-sqlite-outbox-and-merge-policy.md) | Offline-first with an outbox, field-level clocks, typed merge rules | Amended by ADR-0051 |
| [0015](0015-auth-oidc-passkeys-no-homegrown-crypto.md) | Standards-based authentication; no password primitives | Superseded by ADR-0051 |
| [0016](0016-deployment-profiles-local-vps-cloud.md) | Three deployment profiles behind ports; VPS is first-class | Superseded by ADR-0051 |
| [0017](0017-multi-tenancy-and-rls-from-day-one.md) | Tenancy from day one, enforced by the database | Superseded by ADR-0051 | <!-- retired-ok: An index row whose own Status column reads "Superseded by ADR-0051". -->
| [0018](0018-web-nextjs-react-tailwind-radix.md) | Next.js App Router, React 19, Tailwind v4, Radix primitives | Superseded by ADR-0051 | <!-- retired-ok: An index row whose own Status column reads "Superseded by ADR-0051". -->
| [0019](0019-mobile-expo-dev-client-new-architecture.md) | Expo with a development client, on the New Architecture | Accepted |
| [0020](0020-design-tokens-are-oklch-native.md) | The design system's own tokens are defined in OKLCH | Accepted |
| [0021](0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md) | WCAG 2.2 AA is a build gate; APCA is reported alongside | Accepted |
| [0022](0022-observability-opentelemetry-no-raw-imagery.md) | OpenTelemetry throughout; imagery can never reach a telemetry sink | Superseded by ADR-0051 |
| [0023](0023-testing-golden-property-conformance-e2e.md) | Four testing methods, each answering a distinct question | Accepted |
| [0024](0024-ci-cd-github-actions-trunk-based.md) | GitHub Actions on trunk-based `main`, mirroring `gates.json` | Accepted |
| [0025](0025-api-first-and-generated-sdk.md) | The implementation generates the contract; the contract generates the SDK | Superseded by ADR-0051 |
| [0026](0026-privacy-on-device-by-default.md) | Ordinary colour detection transmits no image, ever | Accepted |
| [0027](0027-monetisation-tiers.md) | Four tiers, and accessibility is never behind any of them | Superseded by ADR-0051 |
| [0028](0028-i18n-en-ja-from-day-one.md) | English and Japanese ship together, from the first release | Amended by ADR-0056 |
| [0029](0029-harness-agnostic-core-thin-adapter.md) | Tool-agnostic `.harness/`; `.claude/` is a thin adapter | Accepted |
| [0030](0030-effects-graph-is-a-committed-artifact.md) | The effect graph is committed, and every link names its guard | Accepted |
| [0031](0031-measurement-claims-policy.md) | Every accuracy claim must have a measurement behind it | Accepted |
| [0032](0032-design-in-claude-wireframes-before-visual-before-code.md) | Design happens in Claude; wireframes before visual design, both before code | Accepted |
| [0033](0033-frontend-foundation-own-the-token-layer-headless-primitives.md) | We own the token layer; primitives stay headless; Astryx is not adopted | Accepted |
| [0034](0034-base-ui-over-radix-for-headless-primitives.md) | Base UI, not Radix, for headless primitives | Superseded by ADR-0054 |
| [0035](0035-typescript-6-not-7-until-type-aware-linting-catches-up.md) | TypeScript 6, not 7, until type-aware linting catches up | Accepted |
| [0036](0036-wire-schema-and-engine-type-pinned-by-the-compiler.md) | The wire schema and the engine type are two artefacts, pinned by the compiler | Accepted |
| [0037](0037-design-tokens-wait-for-the-engine-r0-closes-incomplete.md) | The design token package waits for the colour engine; R0 closes incomplete | Accepted |
| [0038](0038-every-acceptance-criterion-names-its-check.md) | Every acceptance criterion names its check; external verification is attested, not gated | Accepted |
| [0039](0039-oklab-is-derived-through-xyz-not-from-srgb-directly.md) | OKLab is derived through XYZ, and that costs 0.047 ΔE00 against every other implementation | Superseded by 0040 |
| [0040](0040-oklab-uses-the-css-color-4-recalculated-matrices.md) | OKLab uses CSS Color 4's recalculated matrices, not Ottosson's original ten decimals | Accepted |
| [0041](0041-three-luminance-definitions-coexist-deliberately.md) | Three definitions of relative luminance coexist, and none may be substituted for another | Accepted |
| [0042](0042-wcag-luminance-cutoff-is-004045-not-003928.md) | The WCAG luminance cutoff is 0.04045; 0.03928 was superseded in 2021 | Accepted |
| [0043](0043-the-oklch-field-is-authoritative-and-srgb-is-derived.md) | The `oklch` field is authoritative; `srgb` is derived output, not an input | Accepted |
| [0044](0044-status-tokens-corrected-and-status-colour-is-text.md) | The status tokens are corrected to pass their own gates, and status colour is classified as text | Accepted |
| [0045](0045-gamut-mapping-is-chroma-bisection-without-minde.md) | Gamut mapping is OKLCh chroma bisection, without CSS Color 4 MINDE step | Accepted |
| [0046](0046-published-corpus-is-an-immutable-generated-bundle.md) | A published corpus version is one immutable generated bundle, vouched for by a ledger | Accepted |
| [0047](0047-editorial-identity-is-a-roster-id-not-a-name.md) | Editorial identity is a roster id, and every record records its author | Accepted |
| [0048](0048-similarity-percentage-is-a-stated-scale.md) | The similarity percentage is a stated scale, not a measurement | Accepted |
| [0049](0049-warm-and-cool-are-a-stated-convention.md) | Warm and cool are a stated convention, anchored to the corpus taxonomy | Accepted |
| [0050](0050-rate-limiting-is-a-fixed-window-that-fails-open.md) | Rate limiting is a fixed window, and it fails open | Retired with the server tier ([ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)) |
| [0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) | Irodora is a local-first mobile app; there is no server tier | Accepted |
| [0052](0052-oklab-round-trip-tolerance-is-conditioned-on-lms.md) | The OKLab round-trip tolerance is conditioned on LMS, and 1e-12 was wrong | Accepted |
| [0053](0053-dark-status-salience-matches-light-and-error-gets-lighter.md) | Dark-theme status salience matches light, and error gets lighter to reach it | Accepted |
| [0054](0054-react-native-core-primitives-and-ui-stays-a-package.md) | Component behaviour comes from React Native’s own primitives; `@irodora/ui` stays a package | Accepted |
| [0055](0055-the-a11y-gate-renders-under-jest-expo-and-proves-the-tree-not-the-pixels.md) | The `a11y` gate renders under jest-expo, and proves the accessibility tree rather than the pixels | Accepted |
| [0056](0056-the-message-catalogue-is-enumerated-typescript-not-a-runtime-i18n-framework.md) | The message catalogue is enumerated TypeScript; a missing key is a typecheck error | Accepted |
| [0057](0057-the-japanese-face-is-a-bundled-noto-sans-jp-subset-generated-from-the-corpus.md) | The Japanese face is a bundled Noto Sans JP subset, generated from the corpus it must render | Accepted |
| [0058](0058-release-builds-are-github-actions-and-gradle-not-eas.md) | Release builds are GitHub Actions running Gradle, not EAS Build | Accepted |
| [0059](0059-a-blocking-advisory-with-no-fix-is-accepted-with-an-expiry.md) | A blocking advisory with no fix is accepted with an expiry, not ignored and not left red | Accepted |
| [0060](0060-one-editor-and-self-review-is-declared-rather-than-assumed.md) | Irodora ships with one editor, and self-review is declared rather than assumed | Accepted |
| [0061](0061-nfr-3-guarantees-the-observable-value-not-the-double.md) | NFR-3 guarantees the observable value, not the double | Accepted |
| [0062](0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md) | HeroUI Native is the component foundation, and it lives behind the `@irodora/ui` boundary | Accepted |
| [0063](0063-culori-ships-in-the-app-bundle-and-the-generated-stylesheet-emits-hex-only.md) | `culori` ships in the app bundle, and the generated stylesheet emits sRGB hex only | Accepted |
| [0064](0064-irodora-ui-resolves-the-way-metro-does-not-the-way-node-does.md) | `@irodora/ui` resolves modules the way Metro does, not the way Node does | Accepted |
| [0065](0065-the-seed-corpus-is-coined-not-canonical-and-constructed-not-measured.md) | The seed corpus is coined, not canonical, and constructed, not measured | Accepted |
| [0066](0066-the-app-verifies-the-corpus-with-noble-hashes-and-ships-the-bundle-as-generated-text.md) | The app verifies the corpus with `@noble/hashes`, and ships the bundle as generated text | Accepted |
| [0067](0067-a-palette-built-on-a-device-is-validated-by-the-corpus-schema-and-says-it-came-from-a-device.md) | A palette built on a device is validated by the corpus schema, and says it came from a device | Accepted |
| [0068](0068-a-gate-on-an-unsupported-toolchain-warns-and-re-keys-rather-than-refusing.md) | A gate on an unsupported toolchain warns and re-keys rather than refusing | Accepted |
| [0069](0069-a-phrase-is-versioned-rule-content-and-a-hue-term-carries-a-chroma-floor.md) | A phrase is versioned rule content, and a hue term carries a chroma floor | Accepted |
| [0070](0070-a-shareable-card-is-a-deterministic-document-not-a-bitmap.md) | A shareable card is a deterministic document, not a bitmap | Accepted |
| [0071](0071-a-token-with-no-reader-is-a-decision-nobody-applied.md) | A token with no reader is a decision nobody applied | Accepted |
| [0072](0072-a-guided-profile-is-forced-choices-and-confidence-is-agreement.md) | A guided profile is forced choices, and confidence is agreement | Accepted |
| [0073](0073-the-japanese-aesthetic-score-is-corpus-affinity-and-says-so.md) | The "Japanese aesthetic" score is corpus affinity, and says so | Accepted |
| [0074](0074-the-spacing-scale-is-a-four-point-grid-and-the-step-that-was-not-goes.md) | The spacing scale is a four-point grid, and the step that was not one goes | Accepted |
| [0075](0075-the-frame-output-is-requested-as-rgb-because-yuv-would-mean-writing-a-colour-transform.md) | The frame output is requested as `rgb`, because `yuv` would mean writing a colour transform | Accepted |
| [0076](0076-a-near-neutral-has-no-temperature-and-scorecolor-now-agrees.md) | A near-neutral has no temperature, and `scoreColor` now agrees | Accepted |
| [0077](0077-the-random-source-is-a-port-and-the-app-installs-it.md) | The random source is a port, and the app installs it | Accepted |
| [0078](0078-wardrobe-images-are-blobs-in-the-encrypted-database.md) | Wardrobe images are BLOBs in the encrypted database, not files beside it | Accepted |
| [0079](0079-the-android-minimum-is-api-26-because-the-pixel-buffer-is-compiled-out-below-it.md) | The Android minimum is API 26, because the pixel buffer is compiled out below it | Accepted |
| [0080](0080-the-pdf-report-is-latin-1-and-refuses-what-it-cannot-draw.md) | The PDF report is Latin-1 and refuses what it cannot draw | Accepted |

## Open questions awaiting an ADR

Tracked in [`../PRD.md` §10](../PRD.md#10-constraints-and-assumptions). Each blocks the
feature that depends on it and closes as an ADR, not as a conversation.

| ID | Question | Needed by |
|---|---|---|
| OQ-3 | Reference card — manufacture or partner | M3 |
| OQ-6 | Apple Developer Program enrolment — individual or organisation | M3 |

**Closed by [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md), not
by an answer.** OQ-1 (OIDC provider) and OQ-2 (billing provider) asked which vendor to pick
for capabilities the product no longer has. There is no account and no monetisation in the
first release, so both questions are void rather than open.

**OQ-5 is closed by [ADR-0060](0060-one-editor-and-self-review-is-declared-rather-than-assumed.md) as a DECISION, not an answer.** Irodora ships with one editor and an entry declares whether
its reviewer was its author. A Japanese editorial reviewer is still wanted; when one joins
they are a roster entry and no code changes.

**OQ-4 (corpus seed size) is settled at ~120 entries**, depth over breadth — recorded in
[`../../.harness/state/feature_list.json`](../../.harness/state/feature_list.json) against
the corpus feature.
