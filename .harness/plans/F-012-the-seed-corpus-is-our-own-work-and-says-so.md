# Plan: F-012 — the seed corpus is our own work, and says so

| | |
|---|---|
| **Feature** | F-012 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-20, FR-21, FR-22 (and the fields FR-23, FR-24, FR-25 render) — [`docs/PRD.md`](../../docs/PRD.md) · NFR-20 |
| **Service / package** | `content/` · consumed by `@irodora/corpus` |
| **Author** | Claude Code (generator role), reviewed by the evaluator subagent |
| **Date** | 2026-08-24 |

---

## Intent

`content/colors/` is empty. Every gate that reads it — `content`, font coverage, the naming
and harmony adapters — is green over nothing, and the Atlas (F-018) and everything behind it
cannot start. This feature puts **~120 colours and 5 palettes** in the corpus, each with
complete provenance, and publishes them as the first immutable version `2026.08.1`.

To a user: the Atlas has something in it, every colour shows where it came from, and nothing
in it claims to be older or better-sourced than it is.

---

## The constraint that decides the whole design

**We have no colorimeter and no licensed published source.** There is no measured silk, no
cleared edition of a primary work, and — under
[ADR-0007](../../docs/adr/0007-colour-corpus-provenance-and-licensing.md) — no ingestible
dataset. That is not a gap to be papered over; it is the actual epistemic position, and the
schema already has a name for it:

```
provenance.sourceType = "editorial"
  ⇒ checkClassification permits only  japanese-inspired | editorial
  ⇒ historical / traditional / modern-japanese are unavailable, by construction
```

So **every seed entry is our own editorial work, classified as such.** Three consequences,
each of which is a decision rather than a fallback:

1. **The values are constructed, not measured.** Each colour is specified in OKLCh and
   converted to canonical D65 XYZ by `@irodora/color-spaces`. `derivation` carries the OKLCh
   triple and the engine version, so any future editor can re-derive the exact `xyz` from the
   record itself.
2. **The Japanese names are Irodora coinages, not the received canon.** This is the
   contestable half and it gets an ADR. Attaching a name a reader recognises as canonical —
   藍鼠, 蘇芳 — to a value that is ours would let the reader conclude the *value* is the
   traditional colour's value. That is the ADR-0007 dishonesty pointed sideways, and it is
   easier to commit than copying because it requires no external action.
   `provenance.editorialNotes` says on every entry that the name is a coinage.
3. **No entry claims an era, a material or a history.** `taxonomy.era`,
   `taxonomy.material` and `editorial.historicalNote_en` are `null` with a reason on every
   entry. A corpus of 120 nulls in those columns is an honest corpus, and the day a
   measurement or a cleared source arrives, those columns are where it lands.

---

## Approach

**Reused — nothing colour-related is written here.**

| Existing | For |
|---|---|
| `@irodora/color-spaces` | `oklchToXyz` for every value; `xyzToOklch` to read one back |
| `@irodora/color-difference` | `deltaE00` for the `related` relations |
| `@irodora/color-harmony` — `WARM_HUE` / `COOL_HUE` | `taxonomy.temperature`, so the corpus cannot contradict the engine (ADR-0049) |
| `@irodora/corpus` — `parseEntry`, `parsePalette`, `checkCorpus` | the schema this content is written against |
| `scripts/generate-corpus.mjs` | validate → derive → checksum → publish `2026.08.1` |
| `scripts/generate-font-subset.mjs` | regenerate the bundled face over the new codepoints (E-017) |

**New:** content only, plus one ADR and one register row. **No new source code, no new
script committed.** The mechanical assembly (OKLCh → XYZ, bands, temperature, proximity
relations) runs from a one-shot script in the session scratchpad; the entry files are the
authored artefacts, and each one is self-describing without it.

### Two stated conventions, both recorded in the ADR

**Temperature**, from ADR-0049's anchors rather than a fresh opinion:

```
oklch.C < 0.012                          → neutral   (hue is not reliable at this chroma)
|Δh(WARM_HUE=55)| − |Δh(COOL_HUE=245)| within 15°  → neutral   (the bisector, where sources disagree)
otherwise                                → the nearer anchor
```

**Bands**, from the same OKLCh the value was specified in, so they can never disagree with it:

```
lightnessBand:  L < 0.40 dark · L < 0.72 mid · else light
chromaBand:     C < 0.04 low  · C < 0.10 mid · else high
```

### Composition — 120 entries, 5 palettes (FR-22)

| Group | Entries | What it is |
|---|---|---|
| Quiet Neutrals | 24 | paper, ash, stone, mist, ink — the near-neutral ground the product's own UI rules care about |
| Indigo Studies | 24 | a vat progression from palest to deepest, plus the greens and greys indigo sits beside |
| Forest and Mineral | 24 | greens and mineral greys — moss, pine, celadon, slate, oxide |
| Earth and Clay | 24 | ochre, umber, clay red, rust, brown |
| Seasonal | 24 | 6 per season, and the only group carrying `taxonomy.season` |

Each group yields **one palette** of 6–8 members with roles and a required `anchor`. The
other entries are Atlas content (FR-20), not palette members — a 24-colour "palette" is a
colour list with a title.

### Increments

Each leaves the build green and is committed at its own boundary.

1. **ADR + register row.** The coined-name decision, the two conventions, and the one row in
   `licensing-and-provenance.md` §5 that every entry cites. *Gate: `state`, `content` (still
   0 entries, still green).*
2. **One group — Quiet Neutrals (24 + 1 palette).** The whole pipeline end to end on a small
   set: author, `--check` the parse, publish nothing yet. *Gate: `content`.*
3. **The remaining four groups (96 + 4 palettes).**
4. **Relations.** Computed proximity and hue opposition across the full set, so they resolve
   corpus-wide rather than within a group.
5. **Publish `2026.08.1`** — bundle + ledger row. *Gate: `content` with `--check`.*
6. **Font subset** regenerated over the new codepoints (E-017). *Gate: `content` in full.*
7. **Docs, effects, state.**

---

## Files to touch

```
docs/adr/00NN-<coined-names>.md            — new: the naming decision + the two conventions
docs/adr/README.md                         — index row
docs/content/licensing-and-provenance.md   — §5 gains the one row every entry cites
content/colors/*.json                      — new: 120 authored entries
content/palettes/*.json                    — new: 5 authored palettes
content/versions/2026.08.1.json            — generated bundle
content/versions/index.json                — generated ledger row
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf — regenerated over the new codepoints
.harness/state/{feature_list,progress,effects}.json/md
.harness/memory/effects/*.md               — the paired notes for the links below
```

---

## Anticipated effects

| Link | What this change does to it | Guard |
|---|---|---|
| **E-006** `content/colors` → `@irodora/corpus`, spec, gate | The first real publish. Everything the link describes stops being hypothetical | `gate:content` — exists, blocking |
| **E-017** `content/colors` → `ja.ts`, font coverage, ADR-0057 | ~120 new names and Japanese descriptions introduce codepoints the committed subset does not have. **This is the link most likely to break, and it breaks as tofu on the product's most important content** | `script:verify-font-coverage.mjs` — wired into `test:content`. **Its rationale is stale**: it says the guard is "not yet blocking" because no font asset exists. F-076 shipped the asset. Correct it |
| **E-001** `srgbToXyz` → derived corpus values | Was guarded over the *fixture* bundle only. After this it guards ~120 real entries | `gate:color-golden` + `gate:content` |
| **E-013** `parseEntry` → authored files | Was a contract with 5 fixtures. After this, with 125 real records | `gate:content` |

No new effect link is expected. If authoring finds one, it is recorded before the feature
closes, per golden rule 5.

---

## Test plan

- **The gate is the test.** `content` re-parses every record, resolves every relation and
  palette member, cross-checks every `sourceId` against the register, and recomputes every
  derived value in the published bundle from its `xyz` under the current engine.
- **Negative, with decoys** — the existing 22 fixture corpora already cover the rule set;
  this feature adds the case they cannot have, which is *scale*. Specifically asserted by
  hand before publishing, each with the mutation watched failing:
  - a `fixture-` slug under `content/` (the prefix guard, now with real content beside it);
  - a relation pointing at a slug in another group;
  - a palette whose `anchor` is removed;
  - an entry citing a `sourceId` not in the register.
- **Font coverage:** `verify-font-coverage.mjs` over the real corpus rather than an empty
  set — the first run where its number means something. A deliberately uncovered codepoint
  is planted and watched failing before the subset is regenerated.
- **Not a test, and stated as such:** nothing here proves the Japanese is idiomatic or that
  a coinage does not collide with an existing traditional name. See the attested criterion.

## Verification

```bash
node scripts/verify-state.mjs
pnpm test:content                # gate 11 + font coverage + subset --check
node scripts/verify-content-proof.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:golden                 # E-001's source end, because this feature is its destination
```

`contrast`, `cvd`, `a11y`, `security` are not in F-012's set — no surface and no dependency
changes. Say so rather than implying they were run.

## Risks and open questions

- **No `OQ-*` blocks this.** OQ-4 is settled at ~120 entries; OQ-5 is closed by
  [ADR-0060](../../docs/adr/0060-one-editor-and-self-review-is-declared-rather-than-assumed.md)
  as a *decision* — one editor, `reviewIndependence: "self"`, declared per entry.
- **The attested criterion is not discharged and gets sharper here.** A single non-native
  editor cannot self-check a mistranslation, and now cannot self-check a *coinage* either —
  including whether one collides with a name already in the received canon. The criterion is
  reworded to name that specific risk rather than left as it stands.
- **`self` on 125 records is the largest single use of ADR-0060 so far.** It is the honest
  label and it is also a lot of unreviewed content. Recorded in `progress.md` as a fact about
  the release, not buried per entry.
- **Scale is its own hazard.** 120 records assembled by one script share any mistake the
  script makes. Mitigated by the mutation checks above and by reading a random sample of
  finished files against the spec by hand.

## Out of scope

- **The Atlas surface.** F-018. This feature ships data, not a screen.
- **`content/rules/`** — recommendation weights. F-029, E-009.
- **Any second corpus version.** One publish, `2026.08.1`.
- **Measuring anything.** A measured entry needs an instrument this project does not have;
  when one arrives it supersedes, it does not edit.
- **Finding a Japanese reviewer.** Still open, still owed, and not solvable inside a feature.
