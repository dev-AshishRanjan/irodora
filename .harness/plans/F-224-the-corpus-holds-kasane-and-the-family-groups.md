# Plan: F-224 — The corpus holds what the mockups draw: kasane palettes and the Japanese family groups

| | |
|---|---|
| **Feature** | F-224 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-22, FR-23, NFR-20 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `content` · `@irodora/corpus` · `apps/mobile` (generated bundles only) |
| **Author** | Claude Opus 5.5 |
| **Date** | 2026-09-24 |

---

## Intent

Two things the mockups draw have no data behind them. `10`, `23` and `26` draw *kasane* palettes, and
the corpus has five palettes, none a kasane (C14). `05` draws a colour-family filter whose chips the
corpus's 25 English family slugs do not map onto (C13, closed by ADR-0108 as nine chips). When this is
done, a surface feature (F-246, F-251, F-260) can bind every one of those elements to corpus data
rather than to sample content. Nothing a person sees changes in this feature; the Atlas and Palette
Studio are rebuilt later.

## Approach

### Criterion 1 — kasane palettes, as ours

**A kasane is a palette, with a category that says so.** `PALETTE_CATEGORIES` gains `kasane`.
Palettes are already "these belong together, with an anchor and ranks", and a kasane is that with a
stated order: **rank is layer order, outermost first** (the *omote*, what shows most), which is how
*kasane no irome* is read. A new record type (as F-196 made combinations) was considered and rejected:
a combination's roles are `lead` / `companion` for "worn together", and a kasane is a palette whose
members are layers. It needs the palette's anchor and ranks, not a second vocabulary.

**The parser makes "never historical" structural**, the way F-196 did for combinations:
`category: "kasane"` requires a classification in `OUR_OWN_CURATION`, whatever the `sourceType`.
The Heian system is historical; a combination *composed in its manner* is not, and the type refuses
the confusion rather than a reviewer catching it (content/AGENTS.md rule 3, FR-23). It also requires
**at least two layers**: a single colour is not a layering.

**Eight kasane, two per season, from our own 120 entries** (rule 2: nothing ingested). The seasonal
tie is what the historical system is: every *irome* is worn in its season. One of each season's pair
has **three layers** and one has **four**. `23` draws three three-layer kasane recommended for a
profile, and `10` draws one four-layer kasane. So each screen can be filled as drawn, and F-260's
recommender has more than three to choose from. Each palette's derivation states the construction
("composed in the manner of kasane no irome … not a historical combination"). Its
`editorialNotes` says why each layer is where it is. Names are ours, coined as seasonal images the
way the historical names are. The one exception is `10`'s *Autumn Dew · 秋の露*: that is a generic
seasonal image, not a documented kasane, and adopting it for the autumn four-layer kasane keeps `10`
as drawn.

| season | layers | name (en · ja) | layers, outer → inner |
|---|---|---|---|
| spring | 3 | Budding · 芽吹 | haru-na · fuka-shida · kare-eda |
| spring | 4 | Blossom Gradient · 花匂 | usu-gami · hana-gasumi · hana-bie · kai-jiro? (chosen at authoring) |
| summer | 3 | Cool Shade · 涼影 | sabi-do · iwa-shimizu · yoru-gami |
| summer | 4 | Summer Field · 夏野 | ao-ta · natsu-kage · ko-more-bi · natsu-zora |
| autumn | 3 | Autumn Brocade · 錦秋 | yama-moe · ina-ho · koi-tsuchi |
| autumn | 4 | Autumn Dew · 秋の露 | ame-iwa · kari-ato · asa-nuno · aki-yu |
| winter | 3 | Winter Clearing · 冬晴 | samu-zora · yuki-ge · samu-boshi |
| winter | 4 | Frosted Cedar · 霜杉 | usu-shimo · fuyu-sugi · fuyu-kage · shimo-yo |

(The table is the starting point. Authoring checks each pair of adjacent layers for visible separation
under the engine. That is the point of a layering: the edge of each robe shows. A member that fails
is swapped for its nearest same-family entry, and the swap is recorded in the palette's notes.)

**A new corpus version, `2026.09.2`.** `2026.09.1` is published and immutable, and
`generate-corpus.mjs` refuses to overwrite it. This publishes the same 120 entries, the five
palettes and the combinations, unchanged, plus the eight kasane. The app's generated bundle moves to
it.

### Criterion 2 — the nine groups, as content with a stated rule

`content/taxonomy.json` gains `groups` (the nine, in ADR-0108's order: `ao aka midori murasaki cha
kuro ki shiro nezumi`), each with `romaji`, `kanji`, `en`, its `families` and a `rationale`. It also
gains `groupRule`, the rule as a sentence. `parseTaxonomyVocabulary` enforces:

- the group ids are **exactly** the nine, in that order (exported as `FAMILY_GROUPS`, so the order is
  a constant F-246 imports rather than retypes);
- **every family is in exactly one group** (none missing, none twice, none unknown), which makes
  "every entry lands in exactly one group" follow from the existing check that every entry's family
  has a vocabulary row;
- **no group is empty**, since a chip that filters to nothing is a broken control;
- a rationale of at least the existing 20-character floor.

`familyGroup(vocabulary, family)` is total or throws, like `familyWord`.

**The rule**, as `groupRule` states it:

1. *A family named for no hue goes to the achromatic class its name names*: 生成り (off-white) → 白,
   墨 (charcoal) → 黒. The greys named for temperature or material, not a hue — 寒色系の鼠,
   暖色系の鼠, 石の鼠, 石色 — go → 鼠.
2. *Otherwise the hue in the family's own Japanese name decides*: the head of a hue compound
   (青緑, 黄緑 → 緑; 金茶 → 茶), or the hue that tints a grey (青鼠 → 青, 緑鼠 → 緑, 紫鼠 → 紫),
   or the hue word it carries (淡い青 → 青, 黄土 → 黄).
3. *A name with no hue word goes by established usage, stated per family*: 陶土色 and 錆色 → 茶,
   桃 → 赤, 岩緑青 → 緑 (緑青 is a green pigment).

Resulting counts, from the 2026.09.1 entries: Ao 29 · Aka 5 · Midori 31 · Murasaki 3 · Cha 20 ·
Kuro 4 · Ki 8 · Shiro 5 · Nezumi 15 = 120. Every chip is non-empty. Tinted greys go to their hue, not
to 鼠. The alternative, 鼠 taking every name headed 鼠, empties 紫, the chip `05` draws, and the
corpus's only purples are its violet-greys.

**Reused:** `parseTaxonomyVocabulary`, `parseProvenance`, `requireRecord`/`requireMatch` and friends
(`packages/corpus/src/primitives.ts`), `parsePalette` and `checkClassification`,
`OUR_OWN_CURATION`, `generate-corpus.mjs`, `generate-corpus-bundle.mjs`,
`generate-taxonomy-bundle.mjs`, `verify-content.mjs`, `verify-font-coverage.mjs`.

**New:** `FAMILY_GROUPS`, `FamilyGroup`, `familyGroup()`; the `kasane` category and its two rules;
eight palette files; `content/versions/2026.09.2.json` and its ledger row.

**Increments:**

1. Schema. `kasane` in `PALETTE_CATEGORIES` with its two rules, and `groups` in the taxonomy parser.
   Tests with decoys for each rule. The build stays green because no content uses either yet, and
   `groups` is added to `taxonomy.json` in the same increment (the parser requires it).
2. Content. The eight kasane files, and version `2026.09.2` published and the app bundle regenerated.
   `test:content` green.
3. Records: the feature, the effects and the progress entry.

## Mockup fidelity

- **Governing mockups:** `05` (the chip row, C13 / ADR-0108), `10` (`10.palette-2`), `23`
  (`23.palettes.kasane-1…3`), `26` (`26.kasane`, **not adopted**: C3 makes `26`-only elements
  opt-in, so the kasane bar needs no data here).
- **Bindings:** `corpus:family.<group>` (05), `corpus:kasane.name`, `corpus:kasane.colours.N.hex`,
  `corpus:kasane.tags` (from the category), `corpus:kasane.provenance` (10), `corpus:kasane.N.name`
  (23). No hex or name is copied off an image. *Autumn Dew · 秋の露* is adopted as our own seasonal
  name, not transcribed as data, and its members are our entries.
- **Departures:** `10.palette-2.tag-provenance` is already E1 in inventory 10 (the chip shows our
  provenance label, not "Heian Verified"). No new departure.

## Files to touch

```
packages/corpus/src/palette.ts          — `kasane` category; our-own-curation and ≥2-layer rules
packages/corpus/src/taxonomy.ts         — groups, FAMILY_GROUPS, familyGroup(), groupRule
packages/corpus/src/index.ts            — exports
packages/corpus/src/*.test.ts           — the rules, each with a decoy
content/taxonomy.json                   — groupRule + the nine groups
content/palettes/<8 kasane>.json        — the palettes
content/versions/2026.09.2.json         — published (generated)
content/versions/index.json             — ledger row (generated)
apps/mobile/src/corpus/generated/bundle.ts        — regenerated
apps/mobile/src/taxonomy/generated/vocabulary.ts  — regenerated
apps/mobile/src/**                       — only if a count or an exhaustive switch needs it
.harness/state/effects.json + memory/effects/  — the links this touches
```

## Anticipated effects

- **Palette schema** (`PALETTE_CATEGORIES`) → the store's palette rows (Palette Studio goes through
  `parsePalette`), `apps/mobile/src/contemporary.ts` (filters `category === 'contemporary'`, so kasane
  are correctly excluded), and any exhaustive switch over category. Guard: `tsc`.
- **Published corpus → app bundle** (E-0xx, the ledger digest): a new version must reach the app, or
  the app runs the old one. Guard: `generate-corpus-bundle.mjs --check` in gate 11.
- **Palettes → editorial harmonies** (`editorialHarmoniesFrom`) and ColourDetail's *In these
  palettes*: eight more palettes flow through both, as intended (a kasane is a curated harmony). Guard:
  the harmony tests and the corpus-count assertion in `apps/mobile/src/corpus/index.ts`.
- **Taxonomy → app vocabulary**: `groups` ride in `VOCABULARY_TEXT`. Guard:
  `generate-taxonomy-bundle.mjs --check`.
- **New strings → the Japanese font subset** (E-017): new kanji in palette names and group labels.
  Guard: `verify-font-coverage.mjs`, and the subset regenerated if it names a codepoint.

## Test plan

- **Unit:** kasane with `historical` / `traditional` / `modern-japanese` classification refused
  (each a separate decoy); a one-layer kasane refused; a two-layer kasane accepted. Taxonomy: a family
  in no group, a family in two groups, a group naming an unknown family, a group out of order, a
  missing group, an extra group, an empty group, each refused; the real `taxonomy.json` parses, and
  `familyGroup` returns the stated group for each of the 25 and throws for an unknown family.
- **Content:** `pnpm test:content`, meaning the eight kasane through the full provenance and
  classification checks, and every member resolving to a published entry.
- **Separation:** a test that every adjacent layer pair in every kasane is visibly distinct under the
  engine (ΔE00 above the corpus's own near-duplicate floor). This is the claim a layering makes.
- **Negative:** the gate's proof (`verify-content-proof.mjs`) gains a planted historical kasane,
  which must fail.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:content
```

## Risks and open questions

- **Nobody has looked at these kasane.** Whether they read as considered is an editorial judgement,
  and one editor reviewing their own work is `reviewIndependence: "self"` (ADR-0060). Stated, not
  hidden.
- **The grouping rule's third clause is judgement per family** (four families). Each is stated in its
  group's rationale so it can be argued with.
- No OQ blocks this. OQ-35 is closed by ADR-0108.

## Out of scope

Rendering either: the Atlas chip row (F-246), Palette Studio (F-251), the profile's recommended
kasane (F-260). Recommending kasane for a profile is F-260's computation. `26`'s kasane bar is not
adopted (C3).
