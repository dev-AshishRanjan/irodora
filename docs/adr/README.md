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
| [0001](0001-monorepo-modular-monolith-with-extraction-triggers.md) | One repository, a modular monolith, and named extraction triggers | Accepted |
| [0002](0002-deterministic-core-tiered-capability-policy.md) | A tiered capability policy replaces the blanket "non-AI" rule | Accepted |
| [0003](0003-canonical-colour-representation-xyz-d65.md) | CIE XYZ (D65) is the canonical internal colour representation | Accepted |
| [0004](0004-own-the-colour-engine-culori-as-test-oracle.md) | We implement the colour maths; `culori` and `colorjs.io` are test oracles | Accepted |
| [0005](0005-measurement-provenance-is-a-type.md) | Measurement provenance is part of the colour value | Accepted |
| [0006](0006-camera-capture-vision-camera-and-getusermedia.md) | VisionCamera frame processors on mobile, `getUserMedia` on web | Accepted |
| [0007](0007-colour-corpus-provenance-and-licensing.md) | The colour corpus is compiled in-house with per-entry provenance | Accepted |
| [0008](0008-search-postgres-fts-with-engine-side-perceptual-ranking.md) | Postgres narrows the candidates; the engine ranks them perceptually | Accepted |
| [0009](0009-cvd-is-an-engine-concern-not-a-ui-filter.md) | CVD simulation lives in the engine and scores every recommendation | Accepted |
| [0010](0010-personal-colour-is-a-profile-not-a-skin-rgb.md) | A personal colour profile is ranges, never a skin colour value | Accepted |
| [0011](0011-recommendation-rules-are-versioned-content.md) | Recommendation weights and harmony rules are versioned content | Accepted |
| [0012](0012-backend-fastify-zod-openapi.md) | Fastify with Zod schemas that generate the OpenAPI document | Accepted |
| [0013](0013-postgres-drizzle-single-system-of-record.md) | PostgreSQL is the single system of record, accessed through Drizzle | Accepted |
| [0014](0014-offline-first-sqlite-outbox-and-merge-policy.md) | Offline-first with an outbox, field-level clocks, typed merge rules | Accepted |
| [0015](0015-auth-oidc-passkeys-no-homegrown-crypto.md) | Standards-based authentication; no password primitives | Accepted |
| [0016](0016-deployment-profiles-local-vps-cloud.md) | Three deployment profiles behind ports; VPS is first-class | Accepted |
| [0017](0017-multi-tenancy-and-rls-from-day-one.md) | Tenancy from day one, enforced by the database | Accepted |
| [0018](0018-web-nextjs-react-tailwind-radix.md) | Next.js App Router, React 19, Tailwind v4, Radix primitives | Accepted |
| [0019](0019-mobile-expo-dev-client-new-architecture.md) | Expo with a development client, on the New Architecture | Accepted |
| [0020](0020-design-tokens-are-oklch-native.md) | The design system's own tokens are defined in OKLCH | Accepted |
| [0021](0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md) | WCAG 2.2 AA is a build gate; APCA is reported alongside | Accepted |
| [0022](0022-observability-opentelemetry-no-raw-imagery.md) | OpenTelemetry throughout; imagery can never reach a telemetry sink | Accepted |
| [0023](0023-testing-golden-property-conformance-e2e.md) | Four testing methods, each answering a distinct question | Accepted |
| [0024](0024-ci-cd-github-actions-trunk-based.md) | GitHub Actions on trunk-based `main`, mirroring `gates.json` | Accepted |
| [0025](0025-api-first-and-generated-sdk.md) | The implementation generates the contract; the contract generates the SDK | Accepted |
| [0026](0026-privacy-on-device-by-default.md) | Ordinary colour detection transmits no image, ever | Accepted |
| [0027](0027-monetisation-tiers.md) | Four tiers, and accessibility is never behind any of them | Accepted |
| [0028](0028-i18n-en-ja-from-day-one.md) | English and Japanese ship together, from the first release | Accepted |
| [0029](0029-harness-agnostic-core-thin-adapter.md) | Tool-agnostic `.harness/`; `.claude/` is a thin adapter | Accepted |
| [0030](0030-effects-graph-is-a-committed-artifact.md) | The effect graph is committed, and every link names its guard | Accepted |
| [0031](0031-measurement-claims-policy.md) | Every accuracy claim must have a measurement behind it | Accepted |
| [0032](0032-design-in-claude-wireframes-before-visual-before-code.md) | Design happens in Claude; wireframes before visual design, both before code | Accepted |
| [0033](0033-frontend-foundation-own-the-token-layer-headless-primitives.md) | We own the token layer; primitives stay headless; Astryx is not adopted | Accepted |
| [0034](0034-base-ui-over-radix-for-headless-primitives.md) | Base UI, not Radix, for headless primitives | Accepted |
| [0035](0035-typescript-6-not-7-until-type-aware-linting-catches-up.md) | TypeScript 6, not 7, until type-aware linting catches up | Accepted |
| [0036](0036-wire-schema-and-engine-type-pinned-by-the-compiler.md) | The wire schema and the engine type are two artefacts, pinned by the compiler | Accepted |
| [0037](0037-design-tokens-wait-for-the-engine-r0-closes-incomplete.md) | The design token package waits for the colour engine; R0 closes incomplete | Accepted |
| [0038](0038-every-acceptance-criterion-names-its-check.md) | Every acceptance criterion names its check; external verification is attested, not gated | Accepted |
| [0039](0039-oklab-is-derived-through-xyz-not-from-srgb-directly.md) | OKLab is derived through XYZ, and that costs 0.047 ΔE00 against every other implementation | Superseded by 0040 |
| [0040](0040-oklab-uses-the-css-color-4-recalculated-matrices.md) | OKLab uses CSS Color 4's recalculated matrices, not Ottosson's original ten decimals | Accepted |

## Open questions awaiting an ADR

Tracked in [`../PRD.md` §10](../PRD.md#10-constraints-and-assumptions). Each blocks the
feature that depends on it and closes as an ADR, not as a conversation.

| ID | Question | Needed by |
|---|---|---|
| OQ-1 | OIDC provider — self-hosted or managed | R2 |
| OQ-2 | Billing provider, given multi-currency and India | R4 |
| OQ-3 | Reference card — manufacture or partner | R4 |
| OQ-4 | Corpus seed size at R1 — breadth vs verified depth | R1 |
| OQ-5 | Japanese editorial reviewer — engagement model | R1 |
