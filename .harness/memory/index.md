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

- [lessons/a-truncated-report-reads-exactly-like-a-passing-one.md](lessons/a-truncated-report-reads-exactly-like-a-passing-one.md) — GitHub caps failure annotations at 10; absence of a failure is not evidence of a pass.
- [lessons/a-red-gate-at-step-nine-hides-every-gate-after-it.md](lessons/a-red-gate-at-step-nine-hides-every-gate-after-it.md) — the seventeen steps after a failing one are skipped, not passed; gate 15 was red for four features behind a red install.
- [lessons/parse-by-matching-what-you-want-not-by-removing-what-you-recognise.md](lessons/parse-by-matching-what-you-want-not-by-removing-what-you-recognise.md) — stripping a label kept the hex digits IN the label and accused a valid key of being the wrong one; match the shape of the value instead.
- [lessons/a-failing-gate-is-usually-already-filed.md](lessons/a-failing-gate-is-usually-already-filed.md) — the feature list is an index of known problems, not only a scheduler; grep it for the failure’s vocabulary before filing.
- [lessons/averaging-non-linear-srgb-reads-too-dark.md](lessons/averaging-non-linear-srgb-reads-too-dark.md) — pixel aggregation must happen in linear light; the error is systematic, not noise.
- [lessons/srgb-transfer-function-has-a-linear-segment.md](lessons/srgb-transfer-function-has-a-linear-segment.md) — below 0.04045 sRGB is linear, and half this corpus lives there.
- [lessons/deltae00-is-not-a-metric-and-cannot-be-indexed.md](lessons/deltae00-is-not-a-metric-and-cannot-be-indexed.md) — ΔE00 violates the triangle inequality, so every spatial index ranks it subtly wrong and silently.
- [lessons/measure-a-hand-authored-set-against-itself-before-publishing.md](lessons/measure-a-hand-authored-set-against-itself-before-publishing.md) — every file individually correct and the set still wrong: two cross-group colours at ΔE00 1.51 that no per-record check can see.
- [lessons/cvd-is-scoring-not-rendering.md](lessons/cvd-is-scoring-not-rendering.md) — a CVD display filter helps designers, not the user it names.
- [lessons/the-adaptation-transform-is-a-product-decision-not-a-detail.md](lessons/the-adaptation-transform-is-a-product-decision-not-a-detail.md) — CAT16 and Bradford disagree by 8.6 ΔE76 on saturated blue, and blue is half this corpus.
- [lessons/an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour.md](lessons/an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour.md) — culori read 10% low because our D65 Lab was tagged with its D50 mode; reproduce an oracle's own published values before trusting it.
- [lessons/measure-what-a-golden-set-can-detect-before-trusting-it.md](lessons/measure-what-a-golden-set-can-detect-before-trusting-it.md) — three published decimals cannot see a 0.11% matrix error; measure the blind spot and aim a second check at it.
- [lessons/two-oracles-agreeing-against-you-is-evidence-about-you.md](lessons/two-oracles-agreeing-against-you-is-evidence-about-you.md) — an identical disagreement from two independent libraries was written up as a structural difference; it was a wrong constant, and the ADR made the defect durable.
- [lessons/reproducing-a-standard-is-not-the-same-as-being-accurate.md](lessons/reproducing-a-standard-is-not-the-same-as-being-accurate.md) — WCAG s rounded coefficients flip 111 colours across an AA threshold; when the deliverable is conformance, precision is a different question.
- [lessons/lightness-is-triple-booked-so-spend-the-margin-on-hue-and-chroma.md](lessons/lightness-is-triple-booked-so-spend-the-margin-on-hue-and-chroma.md) — L carries contrast, salience rank and gamut headroom at once; buy CVD separation from the axes that are free.
- [lessons/a-gate-must-model-what-renders-not-what-is-physically-correct.md](lessons/a-gate-must-model-what-renders-not-what-is-physically-correct.md) — linear compositing was 2.2× more permissive than what a browser draws; when two models disagree and neither dominates, run both and take the worse.

### Design

- [lessons/the-constraint-and-the-taste-usually-agree.md](lessons/the-constraint-and-the-taste-usually-agree.md) — a constraint is a design direction, not a licence to be austere; find the field that already works under it.

### Engineering discipline

- [lessons/a-negative-test-needs-a-decoy-not-an-empty-fixture.md](lessons/a-negative-test-needs-a-decoy-not-an-empty-fixture.md) — "X cannot see Y" is untested if Y does not exist.
- [lessons/a-gate-that-errors-is-failing-open.md](lessons/a-gate-that-errors-is-failing-open.md) — a check that cannot run is not passing; the same shape appears in authorisation and tenancy.
- [lessons/a-style-engine-that-resolves-in-metro-is-invisible-to-jest.md](lessons/a-style-engine-that-resolves-in-metro-is-invisible-to-jest.md) — className resolved by a bundler plugin is absent from the rendered tree, so the contrast gate measures an empty set and stays green.
- [lessons/provenance-in-the-type-is-what-makes-honesty-structural.md](lessons/provenance-in-the-type-is-what-makes-honesty-structural.md) — ask what makes a guarantee impossible to violate, not what reminds people not to.

- [lessons/a-later-flat-config-object-replaces-a-rule-it-does-not-merge.md](lessons/a-later-flat-config-object-replaces-a-rule-it-does-not-merge.md) — a rule that has never been watched fail is not enforcement, it is configuration that parses.
- [lessons/mutual-assignability-does-not-catch-an-optional-field.md](lessons/mutual-assignability-does-not-catch-an-optional-field.md) — assignability in both directions is not shape equality; assert the key set too, and prove it by breaking the type.
- [lessons/a-decoy-that-is-not-broken-proves-nothing.md](lessons/a-decoy-that-is-not-broken-proves-nothing.md) — four decoys in one feature were secretly correct or misread; assert the baseline in every mutation table.
- [lessons/a-pipe-discards-the-exit-status-a-gate-just-produced.md](lessons/a-pipe-discards-the-exit-status-a-gate-just-produced.md) — a check is only as good as the weakest link between its answer and the decision it governs; never put a gate inside a pipeline.
- [lessons/brand-a-wire-scalar-only-where-the-engine-has-no-counterpart.md](lessons/brand-a-wire-scalar-only-where-the-engine-has-no-counterpart.md) — a branded string is not assignable from a plain one, and the zero-dependency engine can never name our brands.
- [lessons/a-directory-walk-that-enters-node-modules-is-checking-someone-elses-repository.md](lessons/a-directory-walk-that-enters-node-modules-is-checking-someone-elses-repository.md) — gate 0 counted 13 scoped harnesses where 7 exist, and was scanning third-party files for golden-rule violations.
- [lessons/a-duplicate-json-key-silently-deletes-the-earlier-one.md](lessons/a-duplicate-json-key-silently-deletes-the-earlier-one.md) — the manifest's `"status": "approved"` never survived parsing, so the contrast gate's blocking condition could not be true; assert types, not presence.
- [lessons/a-decoy-written-against-old-values-quietly-stops-discriminating.md](lessons/a-decoy-written-against-old-values-quietly-stops-discriminating.md) — a mutation proof that passed when written rotted when unrelated values moved; keep proofs runnable and attack the mechanism, not the margin.
- [lessons/a-gate-that-ships-before-its-data-must-carry-its-own-fixtures.md](lessons/a-gate-that-ships-before-its-data-must-carry-its-own-fixtures.md) — gate 11 activated over an empty corpus; the fixtures caught two defects in themselves within an hour.
- [lessons/an-effect-rationale-is-prose-in-a-state-file-and-nothing-executes-it.md](lessons/an-effect-rationale-is-prose-in-a-state-file-and-nothing-executes-it.md) — E-017 claimed its guard was not yet blocking for two features after it was; a promise kept turns its own record into a lie.
- [lessons/an-interactive-control-inside-a-screen-is-checked-by-nothing.md](lessons/an-interactive-control-inside-a-screen-is-checked-by-nothing.md) — the component suite and the screen suite meet at its edges; and when a check objects, ask whether its model is the thing that is wrong.
- [lessons/a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing.md](lessons/a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing.md) — `tabular-nums` was emitted, tested and read by no component for two releases; ask what would break if a generated value were deleted.
- [lessons/a-batch-edit-that-reports-its-own-success-is-not-evidence.md](lessons/a-batch-edit-that-reports-its-own-success-is-not-evidence.md) — a counter that increments on "I did something" is indistinguishable from one that increments on "I did the right thing".
- [lessons/prose-in-a-state-file-rots-and-no-schema-can-see-it.md](lessons/prose-in-a-state-file-rots-and-no-schema-can-see-it.md) — F-017 was still specified as a Next.js app nine months after the web surface was retired, and gate 0 was green throughout; a schema checks that a field is a string, not that the string still describes something that exists.
- [lessons/peerdependencies-did-not-name-the-constraint-that-broke-the-install.md](lessons/peerdependencies-did-not-name-the-constraint-that-broke-the-install.md) — jest-expo@57 pins Jest 29 in `dependencies` and never mentions jest in `peerDependencies`; "both are latest" is not evidence of compatibility.
- [lessons/a-ci-step-guarded-by-an-if-is-invisible-to-the-mirror-check.md](lessons/a-ci-step-guarded-by-an-if-is-invisible-to-the-mirror-check.md) — gate 0 compares `run:` and never reads `if:`, so an "active" gate can run nowhere for a whole release.
- [lessons/a-tested-module-nobody-wired-up-passes-every-test-it-has.md](lessons/a-tested-module-nobody-wired-up-passes-every-test-it-has.md) — F-015's error mapper, limiter and idempotency store were all green and none was attached to the server; decompose by behaviour, not by module.
- [lessons/a-compound-mutation-reports-a-miss-only-if-every-part-misses.md](lessons/a-compound-mutation-reports-a-miss-only-if-every-part-misses.md) — three drifted anchors said "MUTATION DID NOT APPLY"; the fourth chained two replaces, so the half that planted the real failure went missing in silence.
- [lessons/a-task-runner-that-walks-packages-cannot-see-a-file-outside-one.md](lessons/a-task-runner-that-walks-packages-cannot-see-a-file-outside-one.md) — `turbo run lint` reported 31/31 successful with two errors planted in a gate script; ask what a check's traversal ROOT is, not what its rules are.
- [lessons/generating-an-artefact-is-not-checking-it.md](lessons/generating-an-artefact-is-not-checking-it.md) — E-004 named `gate:build` as its guard, and a build overwrites rather than compares; the guard is the `--check`, in a gate that is not the build.
- [lessons/a-cache-key-describes-the-package-not-the-world-the-test-read.md](lessons/a-cache-key-describes-the-package-not-the-world-the-test-read.md) — `pnpm test` printed 31/31 successful while --force was red in four; ask what a check READ, not which package it lives in.
- [lessons/test-the-requirements-own-example-before-your-own.md](lessons/test-the-requirements-own-example-before-your-own.md) — FR-47 names "dark muted green" and the first lexicon could not resolve it; when a decoy fails, suspect the design.
- [lessons/a-word-boundary-fails-before-an-underscore-so-the-obvious-name-is-caught-and-the-real-one-is-not.md](lessons/a-word-boundary-fails-before-an-underscore-so-the-obvious-name-is-caught-and-the-real-one-is-not.md) — `rac(e|ial)` catches `race` and misses `racial_group`; plant every rule at the name somebody would actually type, not the one it was written from.
- [lessons/a-note-explaining-that-an-artefact-is-absent-is-an-instance-of-it.md](lessons/a-note-explaining-that-an-artefact-is-absent-is-an-instance-of-it.md) — two gates read source text and both failed on the COMMENT explaining the fix; writing about the forbidden thing produces it.

### Environment

- [lessons/powershell-51-round-trips-utf8-into-mojibake.md](lessons/powershell-51-round-trips-utf8-into-mojibake.md) — read and write UTF-8 explicitly at both ends, or Japanese names and ΔE notation corrupt silently.

### Content and licensing

- [lessons/wada-public-domain-is-not-the-same-as-free-to-ingest.md](lessons/wada-public-domain-is-not-the-same-as-free-to-ingest.md) — the source work's status says nothing about a digitiser's dataset.
- [lessons/an-identity-check-a-typo-can-satisfy-is-not-a-check.md](lessons/an-identity-check-a-typo-can-satisfy-is-not-a-check.md) — "these two must differ" fails OPEN on any corruption of either value; compare roster ids, and reject an unknown one.

## Effects

The narrative behind each link in [`../state/effects.json`](../state/effects.json).

- [effects/srgb-xyz-is-the-root-of-every-derived-value.md](effects/srgb-xyz-is-the-root-of-every-derived-value.md) — **E-001** · change the conversion, invalidate the whole corpus. No import edge to see it.
- [effects/the-color-type-reaches-every-surface.md](effects/the-color-type-reaches-every-surface.md) — **E-002** · and making Provenance optional would compile.
- [effects/the-message-key-set-is-a-contract-with-every-render-site.md](effects/the-message-key-set-is-a-contract-with-every-render-site.md) — **E-016** · the compiler is the completeness check, and a copy-pasted translation satisfies the type perfectly.
- [effects/a-corpus-publish-can-outrun-the-font-that-renders-it.md](effects/a-corpus-publish-can-outrun-the-font-that-renders-it.md) — **E-017** · a rare kanji becomes an empty box on the corpus entries the product exists for, with every gate green.
- [effects/the-permission-set-is-decided-by-the-manifest-merger-not-by-us.md](effects/the-permission-set-is-decided-by-the-manifest-merger-not-by-us.md) — **E-018** · `blockedPermissions` is an input to a merge; the artefact is the output, and only one of them ships.
- [effects/deltae00-is-the-ranking-authority.md](effects/deltae00-is-the-ranking-authority.md) — **E-003** · a defect changes every answer and produces no error.
- [effects/one-separation-definition-for-ui-and-engine.md](effects/one-separation-definition-for-ui-and-engine.md) — **E-005** · a second definition means a claimed accessibility property nobody delivers.
- [effects/corpus-version-pins-caches-and-envelopes.md](effects/corpus-version-pins-caches-and-envelopes.md) — **E-006** · why publishing mints rather than invalidates.
- [effects/the-source-register-is-a-markdown-table-that-125-records-depend-on.md](effects/the-source-register-is-a-markdown-table-that-125-records-depend-on.md) — **E-021** · a tidy-up of a prose document can unpublish the whole corpus, and the diff looks harmless.
- [effects/the-app-pins-a-corpus-version-and-a-publish-can-leave-it-behind.md](effects/the-app-pins-a-corpus-version-and-a-publish-can-leave-it-behind.md) — **E-022** · the app reads a COPY of the bundle, so a publish without a regenerate ships a stale corpus with every gate green.
- [effects/a-token-change-is-a-contrast-change-in-both-themes.md](effects/a-token-change-is-a-contrast-change-in-both-themes.md) — **E-007** · dark is derived, and derivation does not preserve contrast.
- [effects/sampling-lives-in-the-engine-not-the-platform.md](effects/sampling-lives-in-the-engine-not-the-platform.md) — **E-008** · a platform-side optimisation makes the same fabric measure differently.
- [effects/rule-weights-change-every-answer-without-a-deploy.md](effects/rule-weights-change-every-answer-without-a-deploy.md) — **E-009** · `guard: none`, honestly recorded; closes with F-029.
- [effects/one-gamut-mapping-defines-the-closest-displayable-colour.md](effects/one-gamut-mapping-defines-the-closest-displayable-colour.md) — **E-012** · a second implementation looks like an inline clip, and moves hue 33.6°.
- [effects/the-entry-schema-is-a-contract-with-every-authored-file.md](effects/the-entry-schema-is-a-contract-with-every-authored-file.md) — **E-013** · the destination nobody thinks of is the spec document, and it was already wrong three ways.
- [effects/canonicalisation-decides-what-a-checksum-means.md](effects/canonicalisation-decides-what-a-checksum-means.md) — **E-014** · change it and every recorded digest is wrong, self-consistently, with no test able to notice.
- [effects/the-shortlist-bound-is-the-only-thing-making-two-stage-equal-a-full-scan.md](effects/the-shortlist-bound-is-the-only-thing-making-two-stage-equal-a-full-scan.md) — **E-015** · a fixed radius is wrong on 317 of 360 queries, and looks right every time.
- [effects/the-stylesheet-is-generated-and-a-colour-function-in-it-hands-the-conversion-away.md](effects/the-stylesheet-is-generated-and-a-colour-function-in-it-hands-the-conversion-away.md) — **E-019** · a generated file a dependency evaluates at runtime is only as authoritative as the notation it is written in.
- [effects/a-component-styled-by-a-bundler-plugin-is-invisible-to-the-gate-that-reads-it.md](effects/a-component-styled-by-a-bundler-plugin-is-invisible-to-the-gate-that-reads-it.md) — **E-020** · HeroUI styles in Metro, jest never runs Metro, and the contrast gate measured an empty set.
- [effects/a-migration-reaches-two-drivers-and-a-backup-format.md](effects/a-migration-reaches-two-drivers-and-a-backup-format.md) — **E-023** · no rollback exists, and `SELECT *` puts a new column into the backup format nobody edited.
- [effects/the-palette-schema-now-runs-on-a-phone.md](effects/the-palette-schema-now-runs-on-a-phone.md) — **E-024** · tightening the schema for editors breaks saving on a device, with gate 11 green throughout.
- [effects/the-cache-key-decides-whether-a-gate-ran-at-all.md](effects/the-cache-key-decides-whether-a-gate-ran-at-all.md) — **E-025** · every other link names a gate as its guard, and a replayed cache discharges none of them.
- [effects/a-word-in-the-lexicon-is-also-a-word-in-the-taxonomy.md](effects/a-word-in-the-lexicon-is-also-a-word-in-the-taxonomy.md) — **E-026** · "dark" is defined twice; the agreement check found a boundary a MILLIONTH on the wrong side.
- [effects/a-token-leaves-the-app-inside-the-card.md](effects/a-token-leaves-the-app-inside-the-card.md) — **E-027** · E-007 stopped at components; a shared card keeps the token values it was built with for ever.
- [effects/a-family-word-is-content-because-the-family-is.md](effects/a-family-word-is-content-because-the-family-is.md) — **E-028** · the key set comes from a publish, so the compiler cannot check it and gate 11 does.
- [effects/a-token-with-no-reader-is-a-decision-nobody-applied.md](effects/a-token-with-no-reader-is-a-decision-nobody-applied.md) — **E-029** · emitting a value is not applying a decision, and a comment is not a reader.
- [effects/a-declared-pair-of-slugs-is-a-claim-about-published-values.md](effects/a-declared-pair-of-slugs-is-a-claim-about-published-values.md) — **E-030** · twelve constants assert that two colours differ on ONE axis; only the bundle can check it, and every gate stays green when it stops being true.
- [effects/the-capture-ceiling-is-now-a-profile-confidence.md](effects/the-capture-ceiling-is-now-a-profile-confidence.md) — **E-031** · a lens confidence used to describe one swatch; it now caps seven profile dimensions, and the type is identical either way.
- [effects/the-warm-cool-rule-is-written-twice-because-an-install-cannot-run.md](effects/the-warm-cool-rule-is-written-twice-because-an-install-cannot-run.md) — **E-032** · one colour rule, two implementations, `guard: none` honestly; a check whose model is wrong is worse than an absent one.
- [effects/one-contrast-target-answers-two-different-questions.md](effects/one-contrast-target-answers-two-different-questions.md) — **E-033** · one table read by a person-to-colour question and a garment-to-garment one; a contrast preference is a TARGET, and overshooting it is a miss.
- [effects/a-hue-angle-on-a-near-neutral-is-a-rounding-artefact.md](effects/a-hue-angle-on-a-near-neutral-is-a-rounding-artefact.md) — **E-034** · a grey at C=0.012 read as more warm than a vivid red; when an angle is evidence, ask what its radius is.
- [effects/a-manifest-and-the-lockfile-must-move-together.md](effects/a-manifest-and-the-lockfile-must-move-together.md) — **E-032** · the dependency edge was true in the manifest and in node_modules, and false in the one file CI reads.

## Glossary

- [glossary/japanese-colour-classification.md](glossary/japanese-colour-classification.md) — the five classifications, and why presenting our curation as historical is the failure to avoid.

## Product

- [product/competitor-landscape.md](product/competitor-landscape.md) — every feature exists somewhere; the combination and the provenance do not.

## Architecture

*Empty. Populated as subsystems are built and their real behaviour becomes worth recording —
which is after they exist, not before.*
