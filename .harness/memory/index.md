# Memory Index

Every memory file has a line here. **Machine-checked** — the `state` gate fails on an
unindexed file, because an unindexed memory is an unread memory.

Format: a markdown link to the file, then an em dash, then the claim in one line.

---

## Decisions

- [decisions/stack-and-architecture.md](decisions/stack-and-architecture.md) — the stack, the topology, the pinned versions, and the NFR-3 constraint that decided most of them.
- [decisions/brand-name-and-namespace.md](decisions/brand-name-and-namespace.md) — Irodora, from 彩り; why it beat Kasane; the namespace held.

## Lessons

### Colour science

- [lessons/averaging-non-linear-srgb-reads-too-dark.md](lessons/averaging-non-linear-srgb-reads-too-dark.md) — pixel aggregation must happen in linear light; the error is systematic, not noise.
- [lessons/srgb-transfer-function-has-a-linear-segment.md](lessons/srgb-transfer-function-has-a-linear-segment.md) — below 0.04045 sRGB is linear, and half this corpus lives there.
- [lessons/deltae00-is-not-a-metric-and-cannot-be-indexed.md](lessons/deltae00-is-not-a-metric-and-cannot-be-indexed.md) — ΔE00 violates the triangle inequality, so every spatial index ranks it subtly wrong and silently.
- [lessons/cvd-is-scoring-not-rendering.md](lessons/cvd-is-scoring-not-rendering.md) — a CVD display filter helps designers, not the user it names.
- [lessons/the-adaptation-transform-is-a-product-decision-not-a-detail.md](lessons/the-adaptation-transform-is-a-product-decision-not-a-detail.md) — CAT16 and Bradford disagree by 8.6 ΔE76 on saturated blue, and blue is half this corpus.
- [lessons/an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour.md](lessons/an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour.md) — culori read 10% low because our D65 Lab was tagged with its D50 mode; reproduce an oracle's own published values before trusting it.
- [lessons/measure-what-a-golden-set-can-detect-before-trusting-it.md](lessons/measure-what-a-golden-set-can-detect-before-trusting-it.md) — three published decimals cannot see a 0.11% matrix error; measure the blind spot and aim a second check at it.

### Design

- [lessons/the-constraint-and-the-taste-usually-agree.md](lessons/the-constraint-and-the-taste-usually-agree.md) — a constraint is a design direction, not a licence to be austere; find the field that already works under it.

### Engineering discipline

- [lessons/a-negative-test-needs-a-decoy-not-an-empty-fixture.md](lessons/a-negative-test-needs-a-decoy-not-an-empty-fixture.md) — "X cannot see Y" is untested if Y does not exist.
- [lessons/a-gate-that-errors-is-failing-open.md](lessons/a-gate-that-errors-is-failing-open.md) — a check that cannot run is not passing; the same shape appears in authorisation and tenancy.
- [lessons/provenance-in-the-type-is-what-makes-honesty-structural.md](lessons/provenance-in-the-type-is-what-makes-honesty-structural.md) — ask what makes a guarantee impossible to violate, not what reminds people not to.

- [lessons/a-later-flat-config-object-replaces-a-rule-it-does-not-merge.md](lessons/a-later-flat-config-object-replaces-a-rule-it-does-not-merge.md) — a rule that has never been watched fail is not enforcement, it is configuration that parses.
- [lessons/mutual-assignability-does-not-catch-an-optional-field.md](lessons/mutual-assignability-does-not-catch-an-optional-field.md) — assignability in both directions is not shape equality; assert the key set too, and prove it by breaking the type.
- [lessons/a-decoy-that-is-not-broken-proves-nothing.md](lessons/a-decoy-that-is-not-broken-proves-nothing.md) — four decoys in one feature were secretly correct or misread; assert the baseline in every mutation table.
- [lessons/a-pipe-discards-the-exit-status-a-gate-just-produced.md](lessons/a-pipe-discards-the-exit-status-a-gate-just-produced.md) — a check is only as good as the weakest link between its answer and the decision it governs; never put a gate inside a pipeline.
- [lessons/brand-a-wire-scalar-only-where-the-engine-has-no-counterpart.md](lessons/brand-a-wire-scalar-only-where-the-engine-has-no-counterpart.md) — a branded string is not assignable from a plain one, and the zero-dependency engine can never name our brands.
- [lessons/a-directory-walk-that-enters-node-modules-is-checking-someone-elses-repository.md](lessons/a-directory-walk-that-enters-node-modules-is-checking-someone-elses-repository.md) — gate 0 counted 13 scoped harnesses where 7 exist, and was scanning third-party files for golden-rule violations.

### Environment

- [lessons/powershell-51-round-trips-utf8-into-mojibake.md](lessons/powershell-51-round-trips-utf8-into-mojibake.md) — read and write UTF-8 explicitly at both ends, or Japanese names and ΔE notation corrupt silently.

### Content and licensing

- [lessons/wada-public-domain-is-not-the-same-as-free-to-ingest.md](lessons/wada-public-domain-is-not-the-same-as-free-to-ingest.md) — the source work's status says nothing about a digitiser's dataset.

## Effects

The narrative behind each link in [`../state/effects.json`](../state/effects.json).

- [effects/srgb-xyz-is-the-root-of-every-derived-value.md](effects/srgb-xyz-is-the-root-of-every-derived-value.md) — **E-001** · change the conversion, invalidate the whole corpus. No import edge to see it.
- [effects/the-color-type-reaches-every-surface.md](effects/the-color-type-reaches-every-surface.md) — **E-002** · and making Provenance optional would compile.
- [effects/deltae00-is-the-ranking-authority.md](effects/deltae00-is-the-ranking-authority.md) — **E-003** · a defect changes every answer and produces no error.
- [effects/contract-to-openapi-to-sdk-is-one-direction.md](effects/contract-to-openapi-to-sdk-is-one-direction.md) — **E-004** · hand-editing the document severs the property that protects consumers.
- [effects/one-separation-definition-for-ui-and-engine.md](effects/one-separation-definition-for-ui-and-engine.md) — **E-005** · a second definition means a claimed accessibility property nobody delivers.
- [effects/corpus-version-pins-caches-and-envelopes.md](effects/corpus-version-pins-caches-and-envelopes.md) — **E-006** · why publishing mints rather than invalidates.
- [effects/a-token-change-is-a-contrast-change-in-both-themes.md](effects/a-token-change-is-a-contrast-change-in-both-themes.md) — **E-007** · dark is derived, and derivation does not preserve contrast.
- [effects/sampling-lives-in-the-engine-not-the-platform.md](effects/sampling-lives-in-the-engine-not-the-platform.md) — **E-008** · a platform-side optimisation makes the same fabric measure differently.
- [effects/rule-weights-change-every-answer-without-a-deploy.md](effects/rule-weights-change-every-answer-without-a-deploy.md) — **E-009** · `guard: none`, honestly recorded; closes with F-029.
- [effects/a-port-change-is-a-change-to-every-adapter.md](effects/a-port-change-is-a-change-to-every-adapter.md) — **E-011** · one suite run against both adapters is the only thing making "interchangeable" true.
- [effects/a-new-user-data-table-needs-tenancy-and-a-decoy-test.md](effects/a-new-user-data-table-needs-tenancy-and-a-decoy-test.md) — **E-010** · FORCE is the part that gets missed.

## Glossary

- [glossary/japanese-colour-classification.md](glossary/japanese-colour-classification.md) — the five classifications, and why presenting our curation as historical is the failure to avoid.

## Product

- [product/competitor-landscape.md](product/competitor-landscape.md) — every feature exists somewhere; the combination and the provenance do not.

## Architecture

*Empty. Populated as subsystems are built and their real behaviour becomes worth recording —
which is after they exist, not before.*
