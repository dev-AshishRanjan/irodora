# Plan: F-026 — Guided personal colour profile setup

| | |
|---|---|
| **Feature** | F-026 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-26, FR-30 (and NFR-22, which criterion 3 is) — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/store` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-25 |

---

## Intent

A person answers a short run of **forced-choice swatch comparisons** — no camera, no photograph,
no face — and gets a profile: the lightness range that suits them, whether they lean warm or
cool, how much chroma they tolerate, how much contrast they want, and three lists of corpus
colours (neutrals, accents, avoid). **Every one of the seven dimensions carries its own
confidence and can be edited**, and re-running the flow never overwrites something the person
corrected by hand.

To a user: *"I tapped through a dozen pairs of colours, it told me what it concluded and how sure
it is about each part, I changed the two it got wrong, and it remembered that I changed them."*

---

## Approach

### The shape of the thing

A profile is **seven dimensions**, each a `{ value, confidence, origin }` triple:

| Dimension | Value |
|---|---|
| `lightness` | `{ min, max }` in OKLCh L |
| `temperature` | bias in `[-1, +1]`, cool ↔ warm |
| `chroma` | `{ min, max }` in OKLCh C |
| `contrast` | `'low' \| 'medium' \| 'high'` |
| `neutrals` · `accents` · `avoid` | corpus slugs, in order |

`origin` is `'derived'` or `'user'`, and it is the whole mechanism behind acceptance criterion 4:
**re-derivation writes only into dimensions whose origin is `derived`.** Not a convention a
screen remembers to honour — a rule in one pure function, with a decoy asserting that a derived
value *does* move when the origin is `derived`, so the test can tell "preserved" from
"nothing ever changes".

There is no `skin_color`, no ITA°, no ethnicity, no seasonal label
([ADR-0010](../../docs/adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md)).

### Where the questions come from

Twelve trials, three per scalar axis. Each trial is a **declared pair of corpus slugs**, and each
pair is constructed to isolate exactly one axis: a temperature trial holds OKLCh L and C close
and separates hue class; a lightness trial holds hue and C close and separates L; a chroma trial
holds L and hue close and separates C. A contrast trial offers two *combinations* — one with a
large ΔL between its two swatches, one with a small one.

**The pairs are declared and then checked against the published bundle**, the same move
`SEED_ORIGIN_SPACE` makes: `pairs.test.ts` asserts, from the bundle's own published OKLCh values,
that every trial separates on its axis by at least a declared threshold and stays matched on the
others. A corpus publish that moves a value, or a slug that stops existing, fails a test with a
message naming the trial — rather than silently turning a temperature question into a lightness
question that nobody would ever notice from the screen.

### Confidence is agreement, not count

Three trials per axis. Unanimous → `0.75`; two of three → `0.5`. **Never 1.0**: a preference
inferred from twelve taps is an estimate, and a confidence of 1 would say otherwise (golden rule
11, [ADR-0031](../../docs/adr/0031-measurement-claims-policy.md)). A list dimension takes the
**minimum** of the confidences of the dimensions it was derived from — a neutrals list built from
an uncertain temperature reading is exactly that uncertain, and taking a mean would launder it.

**Reused:** `@irodora/corpus` (`PublishedEntry`, taxonomy bands, the verified bundle via
`src/corpus/index.ts`), `@irodora/store` (`Repository`, `SYNC_COLUMNS`, `uuidv7`, migration
ladder), `@irodora/ui` (`Swatch`, `Button`, `Surface`, `Text`, `Chip`), `src/i18n` (both
catalogues), `src/engine.ts` for display colours. **No colour maths is written here** — trials
compare published OKLCh values from the bundle and nothing is converted.

**New:**

- `packages/store` — migration 3: `personal_color_profile` + `profile_dimension_color`; the
  prohibited-column check; four repository methods.
- `apps/mobile/src/profile/` — `dimensions.ts` (types + the origin rule), `trials.ts` (the
  declared trials), `derive.ts` (answers → profile), `store.ts` (profile ↔ store rows).
- `apps/mobile/src/screens/ProfileSetup.tsx` + `app/profile.tsx`, linked from Home.

**Increments**, each leaving the build green:

1. Store: migration, prohibited-column check, repository methods, conformance additions.
2. `dimensions.ts` + `derive.ts` + tests (criteria 2 and 4).
3. `trials.ts` + the bundle-checked pair test (criterion 1's "no camera" half).
4. Screen, route, Home link, both catalogues.
5. Effects, docs, ADR, progress.

---

## Files to touch

```
packages/store/src/schema.ts               — migration 3, the two tables, SYNC_TABLES
packages/store/src/prohibited.ts           — NEW. The NFR-22 schema check
packages/store/src/migrate.ts              — call the check before any step runs
packages/store/src/repository.ts           — profile row types + 4 methods
packages/store/src/createRepository.ts     — implement them
packages/store/src/testing/index.ts        — conformance: profile round-trip, tombstone, log
packages/store/src/index.ts                — export the new surface
packages/store/test/profile.test.ts        — NEW. Round-trip, migration, refusals
packages/store/test/prohibited.test.ts     — NEW. The decoy: a migration adding skin_color
apps/mobile/src/profile/dimensions.ts      — NEW. Types, the origin rule, editing
apps/mobile/src/profile/trials.ts          — NEW. The twelve declared trials + the budget
apps/mobile/src/profile/derive.ts          — NEW. Answers → profile
apps/mobile/src/profile/store.ts           — NEW. Profile ↔ store rows
apps/mobile/src/screens/ProfileSetup.tsx   — NEW. The flow and the editor
apps/mobile/app/profile.tsx                — NEW. The route
apps/mobile/src/screens/Home.tsx           — a way in
apps/mobile/app/index.tsx                  — wire it
apps/mobile/src/i18n/en.ts · ja.ts         — the copy, in both
apps/mobile/test/profile.test.ts           — NEW. Derivation, origin, trials vs the bundle
apps/mobile/test/screens.test.tsx          — the screen, in both themes and both locales
docs/architecture/data-model.md            — the table as built
docs/adr/00NN-…                            — the derivation decision
.harness/state/effects.json + memory       — E-023 and the new link
```

---

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| **A new migration** | both drivers (`node:sqlite` in CI, `expo-sqlite` on the device) **and** the archive format — `ARCHIVE_TABLES = [...SYNC_TABLES]`, so a new sync table enters the backup by construction | **E-023**, `gate:test` — the conformance suite runs on both drivers and `archive.test.ts` digests every archived table |
| **`SYNC_TABLES` grows** | `eraseEverything`, `exportArchive`, `importArchive`, the conformance sync-column check | `gate:test` |
| **New message keys** | both catalogues; `MessageKey` is derived from `en`, so `ja` fails to typecheck if it lags | **E-016**, `gate:typecheck` + `i18n.test.ts` |
| **Kanji in new Japanese copy** | the bundled Noto subset — a character the face lacks is a tofu box | **E-017**, `gate:content` |
| **A new screen** | every declared contrast pairing in both themes, plus heading roles and Dynamic Type | **E-007**, `gate:contrast` + `gate:a11y` |
| **The trials name corpus slugs** | a corpus publish can remove a slug or move a value out of the band that makes a trial isolate its axis | **NEW LINK** — `apps/mobile/test/profile.test.ts` checks every trial against the published bundle. This is the same shape as **E-022** (the app pins a corpus version) but a different destination: E-022 asks whether the *bundle* is current, this asks whether a *declared constant naming its contents* still means what it said |

---

## Test plan

- **Unit:** the origin rule (derived moves, user does not, with the decoy); confidence from
  agreement; range derivation from choices; list derivation and its minimum-confidence rule;
  every dimension editable.
- **Data-checked:** each of the twelve trials, against the published bundle — separated on its
  own axis, matched on the others. The thresholds are declared constants and the test names the
  trial that fails.
- **Conformance:** the store suite, both drivers — profile round-trip through a **reopen**,
  tombstone, and the change-log op and row id.
- **Negative, with decoys:**
  - a migration adding `skin_color` is **rejected** — planted, watched failing, with the
    unplanted baseline asserted green in the same table;
  - the same for `skin_colour`, `skin_rgb`, `skin_tone`, `ethnicity`, `race`, `complexion`;
  - re-derivation over a `user` dimension leaves it alone **while a `derived` one moves**;
  - no module under `src/profile/` and no line of `ProfileSetup.tsx` reaches a camera —
    asserted over the import graph with a decoy import proving the check can fail.
- **A11y / contrast:** the screen in both themes and both locales; heading role; every swatch
  carrying its name and value; the disabled-with-a-reason rule for "finish".
- **E2E:** the journey — open setup, answer twelve trials, read the summary, correct a
  dimension, save, reopen. **Cannot run: gate 7 is `pending` and F-091 is blocked on the
  environment.** Reported as not run, not as passed.

---

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm build
pnpm test:a11y && pnpm test:contrast
pnpm security
```

`color-golden`, `cvd` and `content` are run too — `content` because new Japanese copy is in
scope, and it is the gate that catches a character the bundled face lacks.

**Known red on this workstation, and not caused by this feature:** gate 4 fails three tests in
`@irodora/color-difference` on Node 22.16.0 against fixtures generated on Node 24 — recorded in
`progress.md` on 2026-08-25 and consistent with F-083. The evidence for this feature must
therefore report the *touched packages* separately from the repo-wide run, and must not describe
gate 4 as green.

---

## Risks and open questions

- **The 90-second criterion cannot be measured here.** What is checkable is the *design budget*:
  twelve trials at a declared per-trial budget plus overhead must fit inside 90 s, asserted by a
  test. What is not checkable is what a real person actually takes. That half is **attested,
  blocking the release** — never quoted as a measurement, in copy or in a report.
- **No open question blocks this.** OQ-6 is R3 but belongs to F-081 (Apple enrolment).
- **The trials are a design judgement, not a validated instrument.** Twelve forced choices do not
  make a colour analyst. The confidences say so, and the copy must say so too.
- **Bias across skin tones is F-037's subject, not this feature's** — and F-037 is blocked by
  F-027 and F-028. Nothing here may claim a bias property it has not measured.

---

## Out of scope

Photo assistance (F-027) · the compatibility engine that consumes the profile (F-028) · rules and
weights as content (F-029) · a seasonal label · any dermatological, ethnic or attractiveness
inference (NFR-22 — permanently out of scope, not deferred) · persisting more than one profile ·
profile export as a separate artefact (the archive already carries it).
