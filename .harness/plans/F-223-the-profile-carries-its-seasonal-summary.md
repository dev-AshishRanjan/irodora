# Plan: F-223 — The profile carries the seasonal summary the finished-profile mockup draws

| | |
|---|---|
| **Feature** | F-223 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-26, NFR-22 — constrained by FR-29 (the score is unchanged) and FR-30 (ranges, never a point) — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | packages — `@irodora/recommendation` (parser and pure summary) and `content/rules/` (the rule), plus the app's generated rule module, its loader and both catalogues |
| **Author** | Claude (planner subagent; decisions by the implementer, recorded at the end) |
| **Date** | 2026-09-15 |

---

## Intent

Mockup 23 draws a seasonal pill (*"Autumn Muted …"*) at the top of the dimensions card; today the
product produces no seasonal label — ADR-0010 and ADR-0072 both say so under *Neutral* — and the
person has already decided the question: C12, *followed — `F-223` derives the label from the four
ranges with an ADR*. Done, to a person, once F-260 draws it: the pill reads a season and a modifier
that is visibly a summary of the four rows beneath it — never contradicting them, never replacing
them, never present without them, withheld rather than guessed when a dimension was never answered,
and saying nothing about skin, ethnicity or body in either language. Done, for this feature: the
rule is versioned, checksummed, provenanced content; a pure function turns a profile's ranges into
a summary by that rule and nothing else; ADR-0102 states what the label keeps and what it discards;
the words exist in both catalogues. This feature renders nothing — the pill is F-260's.

## Reading the acceptance — ambiguities, and the reading chosen

1. **"The four profile ranges".** Two of the four are ranges (lightness, chroma — OKLCh L and C
   min…max); temperature is a bias in [−1, 1]; contrast is a three-valued preference. Reading: the
   four scalar dimensions ADR-0072 establishes — exactly `PersonalProfile` in
   `packages/recommendation/src/profile.ts`, whose axes are `SCORE_FACTORS`. The three lists are not
   ranges and are not read.
2. **"Derived from the four" (criterion 1) against "what it discards" (criterion 2).** The function
   takes all four; the rule may ignore one, provided the file declares it, the ADR says why, and a
   property test proves it. **Contrast is not read**: the twelve-season vocabulary the mockup draws
   has no contrast axis; ADR-0072 §5's photo path abstains on contrast (confidence 0), so a label
   that read it could never exist for a photo-assisted profile; weights 2026.08.4 call contrast the
   dimension "established with the least direct evidence". If a person reads criterion 1 as "all four
   must move it", the table gains a contrast axis — content, reversible, no code change.
3. **Criterion 3's "shown".** F-223 is `packages`; F-260 builds mockup 23 including `23.profile.label`
   (its acceptance 1; its notes name "the seasonal pill (F-223)") and is blocked on F-221 and
   F-232–F-236. F-223 owns everything about the label that is true before it is drawn — derived only
   from the ranges, carrying the class of each range it summarises, never stored, never scored,
   abstaining rather than guessing, no NFR-22 judgement. F-260 owns drawing it beside the rows. The
   drawn half is an **attested** entry on F-223, discharged by F-260 — the precedent of F-084's
   criterion discharged by F-018 (ADR-0060 §5).

## Approach

```
content/rules/seasonal-summary.2026.09.1.json   the rule: axis classes, a total table, a rationale per row
content/rules/index.json                        + one ledger row, kind "seasonal-summary"
        ↓ parsed by the built package
@irodora/recommendation   parseSeasonalRules(value, where) → SeasonalRules
                          summariseSeason(profile: PersonalProfile, rules) → SeasonalSummary
        ↓ scripts/generate-rules-bundle.mjs (third artefact)
apps/mobile/src/rules/generated/seasonal.ts     text + LEDGER digest, --check'ed inside gate 11
apps/mobile/src/rules.ts                        seasonalRules(): digest-verified, shaped like ruleSet()
apps/mobile/src/i18n/{en,ja}.ts                 the words, keyed by closed ids
```

**The evaluator classifies and looks up — nothing else.**

1. **Classify** each read axis into one of three declared classes (low pole · middle · high pole) by
   one declared statistic and thresholds from the file: temperature — the bias; lightness — the range
   midpoint (the statistic `ProfileSetup`'s `nearestBand` already uses); chroma — declared in the file.
   The parser proves each axis's classes partition its domain — no gap, no overlap, every boundary
   stating its side.
2. **Look up** the tuple of classes in the table. The parser refuses a table that is not total and
   unique (every tuple exactly once — 27 cells for three axes), so determinism and totality are
   properties of the content, checked when it loads.
3. **The cell answers** a season id and a modifier id, or no summary, with a rationale.
4. **Abstention is structure, not content**: if any read axis has confidence 0, the result is `none`
   with reason `not-established` — golden rule 11, the same thing the row already says (*"Not asked
   yet"*). It lives in code and the ADR, not in a tunable.

```ts
type SeasonalSummary =
  | { kind: 'label'; season: SeasonId; modifier: ModifierId;
      basis: Readonly<Record<ReadAxis, { class: AxisClass; confidence: number }>>;
      ruleVersion: string }
  | { kind: 'none'; reason: 'not-established' | 'not-summarised';
      axes: readonly ScoreFactor[]; ruleVersion: string };
```

`basis` is what makes "a summary of the ranges beside it" checkable — the class of every range it
summarises, so F-260 and a test can assert the pill never contradicts a row. Nothing is persisted:
`NewPersonalProfile` gains no field; the label is computed on read, so it cannot outlive a corrected
range or stand in for one. Nothing reaches scoring (`PersonalProfile` is unchanged). There is no
inverse, label → ranges — that is the "quiz produces a label first" model ADR-0010 and ADR-0072 rejected.

### Who decides the thresholds and the words

Every editorial rule file here was drafted in a session under roster id `ed-001` with
`reviewIndependence: "self"` — the phrase lexicon (F-021), four weight sets (F-029, F-031, F-065,
F-130), the taxonomy's Japanese words (F-090), the seed combinations (F-196), the corpus (F-012,
where the person's reading is an outstanding attested criterion blocking the release). OQ-5 was closed
by ADR-0060 as "proceed with one editor, declared"; the pull request is the publish path and review
is the control (ADR-0011's addendum). C12 already answers what an open question would ask. So the
agent drafts under **anchor or ask**:

1. **Every threshold equals a boundary the product already states**, cited in its rationale and held
   by an agreement test; where none exists, the implementer stops and raises an open question rather
   than authoring the number. Lightness: the lexicon's measured gaps 0.395 / 0.725 (ADR-0069's one
   definition of dark), agreement-tested against the published lexicon. Chroma: two existing
   definitions disagree — the lexicon's 0.039 / 0.100 and ProfileSetup's chips — the one chosen is
   recorded with the other in `editorialNotes`. Temperature: **not** `TEMPERATURE_DECISIVE`, which is
   unsafe (below): the boundary sits in the gap between reachable values (ADR-0069 §3's method), ±1/6.
2. **No invented vocabulary.** Closed id sets in code: seasons `spring summer autumn winter`; modifiers
   `light deep bright muted warm cool` — the six dominant characteristics of the twelve-season
   convention. Each row encodes that convention's structure with its own rationale; where the
   convention has no answer (a neutral temperature), the cell says **no summary** rather than inventing one.
3. **Declared in the data**: provenance `editorial`, source `IRO-ED-005`, authoredBy and verifiedBy
   `ed-001`, `reviewIndependence: "self"`; `editorialNotes` names the most arguable cells and states
   the Japanese is not reviewed by a competent speaker (OQ-5's standing gap).
4. **Held outstanding**: the attested entry on criterion 3 (Verification).
5. **The whole effect is printed**: gate 11 prints the resolved table; the app test prints the label
   distribution over every reachable guided profile — so the reviewer reads what the rule does.

### Found while planning, and confirmed by running it

`deriveProfile` computes the bias as `2a/3 − 1`: a 2-of-3 warm split gives `0.33333333333333326`, a
2-of-3 cool split `−0.33333333333333337`, and `TEMPERATURE_DECISIVE` is `0.3333333333333333`.
`agreesWithBias` tests `Math.abs(bias) < TEMPERATURE_DECISIVE` and `deriveAvoid` tests `>=`, so
*leans cool* is decisive and *leans warm* is not — a leans-warm person's lists are built as if they
had no temperature preference. Run on 2026-09-15: `|warm| < 1/3` true, `|cool| >= 1/3` true. F-223's
boundary must not sit on a reachable value (±1/6 does not), and a test with a decoy holds it. The
`derive.ts` defect is not F-223's to fix — it changes every leans-warm profile's lists (E-030
territory) — and is recorded as backlog **F-276**. Also confirmed: gate 11's weights section never
validates the weights files' provenance block (`parseProvenance` is not called) — backlog **F-277**.

### Reused

- `PersonalProfile`, `SCORE_FACTORS`, `Interval`, `ContrastPreference` (`packages/recommendation/src/profile.ts`)
  — the input type; `NewPersonalProfile` satisfies it structurally (asserted in `test/profile.test.ts`);
  `SCORE_FACTORS` is the closed set of axes a rule may condition on, the structural NFR-22 guard.
- `MIN_RATIONALE` (`weights.ts`) — the same floor on every row's rationale.
- The ledger, digest and loader pattern — `content/rules/index.json`; `entryDigest`, `canonicalize`,
  `sha256` from `@irodora/corpus`; `scripts/generate-rules-bundle.mjs`; `apps/mobile/src/rules.ts`;
  gate 11's discovered-not-named weights section with in-memory spoilings (ADR-0046, 0066, 0069).
- `parseProvenance` (`packages/corpus/src/provenance.ts`, exported) — one answer to "complete" (NFR-20).
- `PROHIBITED_IDENTIFIERS` and the tokenise-then-prefix-match technique (`packages/store/src/prohibited.ts`,
  `scripts/verify-no-inference.mjs`) — the English half of the vocabulary check; one list (E-013).
- `deriveProfile`, `TRIALS`, the published bundle — to enumerate every reachable guided profile.
- The published phrase lexicon — lightness anchors, agreement-tested.
- `MessageKey` catalogues (ADR-0056) — `satisfies Record<SeasonId, MessageKey>` makes both locales
  complete by type.

Nothing in `packages/color-*` is touched: the summary compares numbers the profile already holds.

### New

`packages/recommendation/src/season.ts` (closed ids, `SeasonalRules`, `SeasonalSummary`,
`parseSeasonalRules`, `summariseSeason`, `seasonalCellCount`); `content/rules/seasonal-summary.2026.09.1.json`,
its ledger row and register row `IRO-ED-005`; ADR-0102 amending ADR-0010 and ADR-0072;
`PROHIBITED_COPY_JA` beside `PROHIBITED_IDENTIFIERS` (イエベ and ブルベ name a skin undertone — the
likeliest way a Japanese rendering breaks NFR-22); a gate 11 section; a third artefact in
`generate-rules-bundle.mjs`; `seasonalRules()` and `seasonalSummary(profile)` in the app; E-129 and
its note; OQ-31 and OQ-32.

### Increments — each one leaves the build green

1. **Record before building** (docs and state): ADR-0102, its README row, "amended by ADR-0102" in the
   Status of ADR-0010 and ADR-0072; OQ-31 and OQ-32 in PRD §10 and R9 §11; the §8 row split and §10
   bullet citing ADR-0102; OQ-31 on F-260, OQ-32 on F-248 and F-257; F-223's attested entry.
   *Verify:* `verify-state`, `verify-mockups`, `verify-claims`.
2. **The engine**: `season.ts`, its exports, tests against fixture rule sets.
   *Verify:* typecheck, lint, format, test for the package, `pnpm build`.
3. **The words and the NFR-22 check**: `PROHIBITED_COPY_JA` with decoys and near-misses; catalogue
   keys keyed by the closed ids, and the composed label, in `en` and `ja`; an app test running the
   NFR-22 lexical check over them. *Verify:* typecheck, lint, test, `verify-font-coverage`.
4. **The content**: the rule file (anchor or ask), its ledger and register rows; the gate 11 section —
   discovered by pattern, parsed by the built package, `parseProvenance`, ledger row and checksum and
   cell count, the NFR-22 lexical check over ids and catalogue words, each in-memory spoiling required
   red naming its field with the clean file green in the same block, the resolved table printed.
   *Verify:* `pnpm build && pnpm test:content`.
5. **The app**: the third artefact and the generated module; `seasonalRules()` (digest from the ledger,
   then the count check) and `seasonalSummary(profile)`; app tests — the exhaustive enumeration, the
   agreement tests, the rule-is-content test. *Verify:* `generate-rules-bundle.mjs --check`,
   `verify-no-key-material.mjs`, `pnpm test`.
6. **Effects and the record**: E-129 and its note; E-026 and E-009 rationales; REQUIREMENTS-COVERAGE;
   progress.md. OQ-33 only if increment 5 shows it reachable.

## Mockup fidelity

- **Governing mockup:** `23`, the finished state of `(tabs)/profile/index` (C15). `17` draws no pill.
- **Inventory:** none of 23's elements is put on screen here. This supplies the value of
  `23.profile.label` (order 6, a `ui:Chip` in `23.profile`, bound `derived:F-223`) — the season half,
  summarising the four rows beneath it (`23.profile.temperature.*`, `.depth.*`, `.chroma.*`, `.contrast.*`,
  bound `engine:profile.dimensions.*`).
- **Bindings (§8):** *`23` · seasonal label · — · `F-223`* becomes `summariseSeason(profile, the
  published seasonal-summary rule)` → the catalogue words. *"/ Kasane Harmony"* → **OQ-31**. *"Autumn
  Muted"* is sample content (E1).
- **Departures:** none. C12 followed; C10 (the pill's chroma) is F-225's; §4 E2's 07/13 row honoured —
  no id, word or catalogue value contains "match", 一致 or マッチ.
- **Found, not resolved here:** **OQ-31** — the pill's second half, *"Kasane Harmony"*, which no
  requirement, ADR, computation or conflict row defines; blocks F-260, not F-223. **OQ-32** — mockups
  07 and 13 put the label beside the personal-fit score with no ranges beside it, which criterion 3
  requires; blocks F-248 and F-257. **OQ-33** (conditional) — raised only if a finished profile can
  reach `none`.

## Files to touch

```
docs/adr/0102-a-seasonal-label-is-a-lossy-summary-read-off-the-ranges.md   new — criterion 2
docs/adr/README.md; docs/adr/0010-*.md; docs/adr/0072-*.md                  status and index rows
content/rules/seasonal-summary.2026.09.1.json; content/rules/index.json     the rule and its ledger row
docs/content/licensing-and-provenance.md                                    register row IRO-ED-005
packages/recommendation/src/season.ts; src/index.ts; test/season.test.ts    the engine
packages/store/src/prohibited.ts; test/prohibited.test.ts                   PROHIBITED_COPY_JA
apps/mobile/src/i18n/en.ts, ja.ts                                           the words
apps/mobile/src/rules.ts; src/profile/season.ts; src/rules/generated/seasonal.ts; test/season.test.ts
scripts/generate-rules-bundle.mjs; scripts/verify-content.mjs               third artefact; gate 11 section
docs/PRD.md; docs/design/R9-MOCKUP-FIDELITY.md; docs/REQUIREMENTS-COVERAGE.md
.harness/state/feature_list.json; effects.json; memory/effects/<E-129>.md; progress.md
```

## Anticipated effects

1. **A third kind of versioned content in one ledger** → `generate-rules-bundle.mjs` (selects rows by
   kind), gate 11's lexicon and weights sections, `verify-no-key-material.mjs` (E-026: the new digest
   literal). Guards: `gate:content` with `generate-rules-bundle --check` inside it; `gate:security` via
   `verify-no-key-material.mjs` — run although `security` is not in F-223's list, because E-026 records
   that publishing reaches gate 15. E-026 and E-009 rationales updated.
2. **New E-129** (high): the rule → `summariseSeason` → the loader → `derived:F-223` in inventories 23
   (and 07, 13) → F-260 (F-248, F-257 via OQ-32). A publish renames what every profile is called;
   moving one boundary relabels people nobody touched. Guards: `gate:content` (parse, totality,
   uniqueness, digest, NFR-22) and `gate:test` (properties, exhaustive enumeration, symmetry decoy).
3. **The pill contradicting the rows** (criterion 3's semantic half): F-223 builds `basis` and an
   agreement test against the lexicon; F-260 inherits "the pill's basis agrees with each row's label"
   as a guard it must build — named in E-129's `to` and written into F-260's notes.
4. **The float boundary** → the symmetry test with its decoy; the `derive.ts` defect itself → F-276.
5. **`PersonalProfile` gains a second consumer** → `gate:typecheck` and the assignability test.
6. **NFR-22's vocabulary module gains a list** → `prohibited.test.ts` with decoys.
7. **Copy reaches the claims lint** → `gate:lint`.
8. **PRD §10 and R9 §11 gain rows** → `verify-mockups`' `openQuestions()`, F-260's `openQuestions` → `gate:lint`, `gate:state`.
9. **The ADR index** → `gate:state`.
10. **Japanese words may add codepoints** → `verify-font-coverage.mjs`; regenerate the subset if it reports any.

Deliberately untouched: **E-030** — the summary reads no slug and no corpus value.

## Test plan

- **Parser spoilings** (package test, and in memory in gate 11), each required red **naming its field**,
  the clean file green in the same block: a cell removed (totality, names the tuple); a cell duplicated;
  overlapping classes; a gap; a boundary outside the domain; rows disagreeing on the read axes; an unknown
  season or modifier id; a rationale under `MIN_RATIONALE`; **a condition on an axis outside
  `SCORE_FACTORS` — `undertone`, then `skin`** (the structural NFR-22 decoy).
- **Properties** (fast-check; bias in [−1, 1] incl. ±1 and 0; 0 ≤ min ≤ max ≤ 1 incl. min = max; the
  three contrast values; confidences in [0, 1]): determinism; totality; invariance over what is
  discarded (contrast, the lists, `origin`, `method`, any confidence above 0); monotone classification
  per axis; boundary sides; abstention exactly when a read axis has confidence 0; `basis` present for
  exactly the read axes.
- **The rule is content, not code** — one engine, two rule sets, the same profile, different summaries.
- **Exhaustive guided enumeration** (app test) — all 4,096 answer sets through `deriveProfile` against the
  published bundle: never throws; **symmetry** — a 2-of-3 warm split and a 2-of-3 cool split land in
  mirrored temperature classes; **the decoy** — the same assertion against a copy of the rule with its
  boundary at exactly 1/3 must fail; prints the label distribution and the smallest distance from any
  reachable statistic to a boundary; reports whether a finished profile reaches `none` (OQ-33's evidence).
- **Agreement** — the lightness edges equal the lexicon's dark / medium / light region edges.
- **Golden / conformance / e2e:** none, on purpose — no colour maths, no port, no journey.
- **NFR-22 negatives with decoys**, three layers: structural (the axis spoilings); lexical (every id
  and every catalogue value under the season keys in `en` and `ja`, tokenised and matched against
  `PROHIBITED_IDENTIFIERS` stems and `PROHIBITED_COPY_JA` — decoys "Warm Complexion", "Fair-Skinned
  Autumn", イエベ秋, ブルベ夏, 肌映え rejected naming word and source; near-misses "Autumn Muted",
  "Deep Winter", "Vintage", ソフトオータム green); type-level (`// @ts-expect-error` on a `seasonalLabel`
  property passed to `saveProfile` — the label cannot be stored).
- **Catalogue completeness** — `satisfies Record<SeasonId | ModifierId, MessageKey>` in both locales.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm build && pnpm test:content
node scripts/generate-rules-bundle.mjs --check
node scripts/verify-no-key-material.mjs
node scripts/verify-font-coverage.mjs
node scripts/verify-mockups.mjs
```

Not run, and why: `color-golden` and `cvd` (no colour maths); `a11y`, `contrast`, `e2e` (no surface).

**Attested entry on F-223** (ADR-0038, the criterion verbatim): *"The label is shown as a summary of
the ranges beside it, never instead of them, and it carries no skin-tone, ethnic or body judgement
(NFR-22)"* — verified by (1) F-260's conformance sweep asserting inventory 23 on the rendered tree,
`23.profile.label` inside `23.profile` ahead of the four rows, and its person-recorded comparison; (2) a
competent Japanese reader confirming no ja word of the seasonal vocabulary carries a skin-tone, ethnic
or body judgement (the gate refuses the listed terms and cannot know the ones nobody listed — OQ-5's
standing gap). Blocks the release; outstanding.

## Risks and open questions

- The acceptance readings above; a contrast axis is a content change (81 cells).
- Editorial ownership is weak by construction (`ed-001`, `self`) — the repository's standing position
  (ADR-0060), kept visible by the attested entry.
- Three definitions of "Muted" (the lexicon's, ProfileSetup's chip ceiling 0.05, the label's) — one
  anchor chosen, the others recorded in `editorialNotes`.
- "Autumn" means two things: the corpus's `taxonomy.season` is not a personal-colour type; the label gets
  its own catalogue keys, ADR-0102 says they are unrelated, and the summary never reads the corpus.
- The label jumps at boundaries (monotone, not continuous) — a *Bad* consequence in ADR-0102.
- The vocabulary is a convention, not an instrument; NFR-23 / F-037 bias validation is not done, and
  nothing may claim the label performs evenly.
- The label describes the ranges, not the person: copy never says *"You are an Autumn"* — F-260's
  wording, ADR-0102's rule.
- Backlog: F-276 (the `derive.ts` asymmetry), F-277 (weights provenance not validated).
- OQ-31 (blocks F-260), OQ-32 (blocks F-248, F-257), OQ-33 (conditional). None blocks F-223.

## Out of scope

Drawing anything (the pill, its layout, its chroma — F-260, F-225); what *"/ Kasane Harmony"* means
(OQ-31); 07's and 13's notes beside the fit score (F-248, F-257 via OQ-32); kasane palettes (F-224); the
avatar (F-241); the row value formats (F-222, F-260); storing the label, scoring with it, an inverse
mapping, a quiz, the PDF report (F-263); an NFR-22 copy lint over every catalogue; fixing F-276 and F-277;
mockup 17's radar (OQ-24, OQ-25).

---

## Decisions taken by the implementer (2026-09-15)

1. **Authorship:** drafted as `ed-001` with `reviewIndependence: "self"` and the attested entry, under
   anchor or ask — the repository's precedent for every editorial rule file (ADR-0060).
2. **Contrast is not read** — for the three reasons in *Reading the acceptance* 2.
3. **OQ-31 and OQ-32 are raised now**; OQ-33 only if increment 5 shows a finished profile reaching `none`.
4. **The row-agreement guard is F-260's**, named in E-129 and written into F-260's notes.
5. **F-276 and F-277 are filed as backlog**, each confirmed by running it, not only by reading.
6. Chroma's statistic and anchor, the 27 cells, and the Japanese words are decided in increment 4 under
   anchor or ask — any value with no existing boundary to cite stops the increment and becomes a question.

## What building it showed (2026-09-15)

- Every boundary found an anchor: lightness and chroma at the phrase lexicon's measured gaps (chroma:
  the lexicon over ProfileSetup's chips, recorded in `editorialNotes`), temperature at ±1/6. No value
  needed asking.
- **The enumeration over all 4,096 guided profiles: 3,136 get no summary**, and only four labels are
  reachable (winter deep, autumn deep, summer muted, autumn muted). **OQ-33 is raised**, blocking F-260.
  The thresholds are not moved to fill the pill — that would be tuning editorial content to a mockup.
- fast-check is not a dependency of `@irodora/recommendation`; the property tests are exhaustive grids
  that include every boundary value exactly, which needs no lockfile change.
- Found and filed: `weights.2026.08.4.json` cites `IRO-ED-003`, which the register gives to the
  taxonomy vocabulary — added to F-277.
