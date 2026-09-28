# Plan: F-226 — The type is the mockups' type: a serif for display, the sans for reading, tabular figures for every number

| | |
|---|---|
| **Feature** | F-226 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69, NFR-11, NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/design-tokens` · `@irodora/ui` · `scripts/` · `mockups/tools/` |
| **Author** | planner subagent (2026-09-28), adopted by the implementing session with the decisions below |
| **Date** | 2026-09-28 |

---

## Intent

The wordmark and the display type render in Gelasio (ADR-0106), at a weight measured against the
drawings. `20`'s card has a Japanese serif, subset from the corpus and covered by the coverage gate.
The type scale is board `00`'s. Every figure is tabular. Every face loads behind the native splash,
so the launch hand-over still never shows a blank frame. To a person, the brand type finally looks
like the mockups, and nothing flashes on launch.

## What the brief did not have (found by the planner)

1. **OQ-13 is also listed against F-226** (R9 §11): *"Measured type runs off the scale … the screens'
   sizes (P3), or §5's steps?"* Decided below.
2. **Only `20` draws a mincho.** `26.hero.kanji` is gothic 600, as C6 says (sans on `01 05 06 26`).
   ADR-0106 d.4's "`20` and `26` draw a Mincho" is wrong about `26`, and the new ADR corrects it.
3. **Board `00` draws captions itself**: 7 `caption` elements. There are 121 across 17 inventories.
4. **HarfBuzz instancing keeps the default instance's names.** Every static cut from
   `Gelasio[wght].ttf` would carry the same PostScript name. iOS refuses a duplicate registration, and
   `_layout.tsx` ignores the `useFonts` error, so the app would hang on the splash. The name table is
   rewritten per file, and the check refuses duplicates.
5. **Gelasio's default figures are oldstyle and proportional.** `tnum`/`lnum` exist but must be
   asked for. No mockup draws a serif figure, so `numeric` with the serif face is a type error.
6. **The manifest's WCAG large-text floor is the BOLD one.** `largeTextMinPx 18.66` is 14 pt, which
   WCAG allows only for bold; regular text needs 18 pt (24 px). Nothing depends on it today (no token
   has been large-text-only since F-225). It is a gate threshold, so **it is recorded as a backlog
   feature for a person and not changed here.**
7. **F-226's notes are wrong about Geist.** They say the app ships Geist and Geist Mono. It ships the
   platform sans (ADR-0057 §6). The note is corrected when recording.

## Decisions (implementing session, under the person's 2026-09-24 delegation)

- **OQ-12 → a caption step, at the measured median.** The mockups draw 121 captions below 12 dp,
  including `01`'s tab labels on every screen (10.0) and board `00`'s own swatch captions. Of the
  measured readings below 12 dp, there are 92 across 10 images, from 8.6 to 11.9, with a **median of
  10.3** (`18`'s illegible report lines, 5.5–7.5, are excluded as not design under §2). The other
  answer, "14 as the floor", would enlarge 121 drawn elements by 18–63 %. No §4 category forces
  that: WCAG 2.2 sets no minimum size, and no gate does. So the mockups answer it. The step value is
  **recomputed by a test** from every `raw.emDp` below 12, not typed.
- **OQ-13 → §5's steps, by §2's snap rule.** §2 is titled *"What 'strict' means, measurably"*; it is
  the definition of strict the person approved on 2026-09-10, and it says a measured value snaps to
  the nearest §5 step. Criterion 3 names the steps. So reading strictly means reading §2. The
  elements that snapping moves by more than 4 dp are listed in the ADR and on F-267, so the person's
  comparison sees them:
  - `01`'s wordmark 34 → 22;
  - `20`'s kanji 32.2 → 22;
  - `26`'s kanji 40.4 → 22;
  - `06`'s name 53 → 72;
  - `22`'s figures 45–47 → 22;
  - the 18.4–20.6 cluster, split between 16 and 22.

  **If the person prefers the screens' sizes (P3), that amends §2 and this acceptance.** The ADR says
  so, and nothing here makes it harder: the steps are data.
- **Criterion 3 REPLACES the scale; it does not add to it** (ADR-0103's precedent). The old steps map
  onto the new ones by §2's snap rule, and pre-R9 screens change visibly until they are rebuilt from
  F-242 on.

  | Step | dp | Absorbs |
  |---|---|---|
  | `display1` | 72 | `display.1` 72 |
  | `title` | 22 | `title` 22; `display.2` 34 (nearer 22 than 72) |
  | `body` | 16 | `body` 15 |
  | `label` | 14 | `small` 13 |
  | `caption` | 10.3 | `xs` 11.5; the old `label` 10 |

  The old `label`'s uppercase transform and 0.16 em tracking go with it; no mockup draws uppercase
  labels at scale.
- **Faces are chosen per element, not per step.** Board `00` sets *Display 1* and *Title* in the serif,
  but the screens draw 44 sans titles, and under P3 the screen wins for its own element. So `Text`
  takes a `face` in the inventory's vocabulary (`sans | serif | gothic | mincho`), defaulting to sans
  (gothic for Japanese). The serif is available at `display1`, `title` and `body`, because those are
  the steps the mockups draw it at. A serif `label` or `caption` is a type error.
- **The Japanese serif**: the candidate list is pinned, filtered by coverage of every corpus kanji,
  and scored on `20.card.kanji` (藍鼠). If the leader's margin is under 0.03, the choice is Noto
  Serif JP: it is Source Han, so it shares its metrics with the bundled Noto Sans JP, and it has the
  broadest coverage. It is subset to exactly the codepoints of every published entry's `name.kanji`,
  the only field a mincho element binds (`20.card.kanji → corpus:entry.kanji`).
- **The serif's weight and tracking per role are measured**, not chosen (ADR-0106 d.2).
  - The drawing side is blur-invariant: the stem is integrated ink coverage across a stem, divided
    by the cap or ascender height from 50 % crossings. The word's aspect ratio gives the tracking.
  - The font side is exact: it is read from Gelasio's outlines along `wght` 400–700 through harfbuzzjs.
  - A calibration run renders the cut statics at each crop's pixel size, JPEG-encodes them, and
    requires the instrument to recover their order. Where a crop cannot resolve weight, the ADR says so.
  - Recorded in **ADR-0112**.

## Approach

**Reused:**
- `scripts/generate-font-subset.mjs` (ADR-0057), generalised to a table of faces. `subset-font@2.5.0`
  pins the axis with `variationAxes: { wght }` and keeps the GSUB features, so `tnum` and `lnum`
  survive.
- `scripts/verify-font-coverage.mjs`: its cmap reader and `--prove`.
- `mockups/tools/serif-match.ps1` and `serif-candidates.json`, which pins the commit and sha256.
- harfbuzzjs (already installed): `setVariations`, `shape`, `glyphToPath`.
- The `useFonts` gate and the no-gap launch order in `_layout.tsx`.
- `Text`'s `numeric` prop and F-239's setting.
- The ragged-figure sweep and its decoy in `screens.test.tsx`.
- `verify-token-reach`.
- ADR-0103's method: rewrite every reference by the snap rule, and never let an old name keep a
  changed meaning.

**New:**
- `scripts/font-sources.json`: the Gelasio and Japanese-serif sources and their `OFL.txt`, each pinned
  by `google/fonts` commit and sha256. The generator refuses a mismatch.
- `scripts/lib/sfnt-read.mjs`: cmap, `name`, `OS/2`, `fvar` and GSUB-feature readers, shared by the
  check and the tools.
- `mockups/tools/stem.ps1`, `mockups/tools/serif-weight.mjs` and `mockups/tools/mincho-candidates.json`.
- `apps/mobile/src/fonts.ts`: one map from emitted family name to asset module.
- `Text`'s `face` prop.
- **ADR-0112**: the serif's weight and tracking per role, and the Japanese serif. It amends ADR-0057
  §6 and corrects ADR-0106 d.4.
- **ADR-0113**: the caption step (closes OQ-12) and §2's snap rule for off-scale type (closes OQ-13).

**Increments** (the build stays green after each):
1. **Pins and instruments.**
   - `font-sources.json`, `sfnt-read.mjs`.
   - `serif-match.ps1 -codepoints`, `stem.ps1`, `serif-weight.mjs`, `mincho-candidates.json`.
   - The calibration run.
   - No product change.
2. **Measurements and decisions.**
   - The weight and tracking per role; the mincho choice.
   - ADR-0112 and ADR-0113.
   - The inventory-data serif weights where they differ from the recorded 400, regenerated and
     checked by `verify-mockups`.
   - R9 §5's type paragraph; §11 OQ-12/13 moved to *Closed*; PRD §10; the ADR index.
3. **The faces.**
   - Generate and commit the static Gelasio instance(s) and `NotoSerifJP-Subset.ttf` (or the chosen
     mincho), with the OFL texts.
   - NOTICE §4.
   - Extend the coverage check. The mincho requirement is derived from the inventories: an unknown
     binding fails. Add structural checks: a unique PostScript name, `usWeightClass` equal to the pin,
     no `fvar`, and `tnum` present.
   - `--prove` decoys.
4. **Tokens.**
   - The manifest families gain `serif` and `mincho`, plus the serif roles (weight, tracking).
   - `nativeFamilies` gains them.
   - `typography.test` records ADR-0112's amendment of ADR-0057 §6.
   - Regenerate the targets.
5. **Loading.** `fonts.ts` and `_layout.tsx`'s `useFonts` take the emitted names. A layout test
   checks that the key sets are equal and that rendering is held until the fonts load (criterion 4).
6. **`Text` gets `face`.** `Wordmark` is set in the serif at the measured wordmark role.
7. **The scale.**
   - 7a: add `caption`, rewrite the old `label` and `xs` to it, delete `xs`.
   - 7b: redefine `label` as 14, rewrite `small` to it, delete `small`.
   - 7c: `body` becomes 16, `display.2` becomes `title`, `display.1` is renamed `display1`, and
     `WordmarkSize` follows.
   - A deleted step is a type error at every caller, and `verify-token-reach` fails on a step nothing
     reaches.
8. **Tabular figures everywhere.**
   - The ragged-figure sweep covers every registered screen and state in both themes.
   - The matcher also catches hex values and figures with a unit.
   - A planted-hex decoy.
9. **Effects, notes and records.** Then the single review.

## Mockup fidelity

- **Governing mockups:**
  - `00` (P3): the scale, *Display 1* and *Title*.
  - `01`: the in-app wordmark (C4) and the tagline.
  - `14`: the splash lockup (C4).
  - `20`: the mincho (C6).
  - `25`: the light palette only (P2). Its wordmark is measured and reported, not governing.
  - `26`: Japanese typography (P2). Its kanji are gothic (C6).
- **Inventory:**
  - `00.wordmark`, and `00.type.display1`, `.title`, `.body`, `.label`, `.tabular`;
  - `00`'s 7 captions;
  - `01.header.wordmark`, `01.header.tagline`;
  - `14`'s splash wordmark;
  - `20.card.kanji`.
- **Bindings:** `20.card.kanji → corpus:entry.kanji` drives the mincho subset.
- **Departures:** none. Applied: C4, C6, P2, P3 and §2's snap rule (OQ-13). Japanese text inside a
  Latin-serif element resolves to gothic (C6).

## Files to touch

```
scripts/font-sources.json · scripts/lib/sfnt-read.mjs                   — new
scripts/generate-font-subset.mjs · scripts/verify-font-coverage.mjs     — faces table, names, structure, --prove
mockups/tools/{stem.ps1, serif-weight.mjs, mincho-candidates.json}      — new; serif-match.ps1 -codepoints; README
mockups/tools/inventory-data/*.mjs → mockups/inventory/*.json           — measured serif weights, if changed
apps/mobile/assets/fonts/{Gelasio-*.ttf, <mincho>-Subset.ttf, OFL-*.txt}
apps/mobile/src/fonts.ts · apps/mobile/app/_layout.tsx
docs/design/design-system.manifest.json                                 — families, serif roles, the scale
packages/design-tokens/src/{manifest.ts, emit/react-native.ts, emit/*} + tests; regenerated targets
packages/ui/src/{Text.tsx, brand.tsx} + tests
size literals across apps/mobile/src and packages/ui/src                — the snap rewrite
apps/mobile/test/{screens.test.tsx, layout.test.tsx}
NOTICE.md §4 · docs/adr/0112, 0113 + index · R9-MOCKUP-FIDELITY §5/§11 · PRD §10 · DESIGN-SYSTEM.md
.harness/state/effects.json + memory notes
```

## Anticipated effects

- **E-007 and E-093**: manifest → targets, `Text`, the RN emitter, `_layout`. Guards: gate 9 (runs
  `generate-design-tokens --check`), the emit tests, and typecheck, since a deleted step fails at
  every caller.
- **The scale → about 257 call sites.** Guards: typecheck; `verify-token-reach` in both directions;
  and a new `type-scale.test.ts`, which requires the manifest's steps to equal the inventory schema's
  `size` enum and `caption` to equal the recomputed median. That creates a **new link**: inventories
  → manifest `caption`.
- **E-138**: display settings → `Text`. Guards: the existing conformance cases, the widened sweep and
  its decoys.
- **E-017, E-145, E-146**: content → coverage. Guard: gate 11, with the mincho requirement derived
  from inventory bindings. The notes are updated.
- **New link: emitted family names → `useFonts` → the first frame.** Guard: the layout test.
- **New link: pinned sources → committed assets → NOTICE.** Guards: the sha256 check and `--check`'s
  byte comparison.
- **E-116**: `brand.tsx` → `launch.tsx`. Guards: the brand and launch tests.
- **Downstream consumers** (F-230, F-231, F-242, F-247, F-253) get notes.

## Test plan

- **Emitter:**
  - one family name per weight, never a stack;
  - every serif role resolves to a declared file;
  - decoys: a stack in `serif` is refused, and so is a role weight with no file.
- **Scale:**
  - exactly five steps at the ADR's values, with `caption` equal to the recomputed median;
  - decoy: a planted `emDp` moves the median, and the test fails.
- **`Text`, on rendered nodes:**
  - serif + Latin → `Gelasio-<W>`, with `fontWeight` equal to W;
  - serif + Japanese → `NotoSansJP` (C6);
  - mincho → the mincho family;
  - sans + Latin → no `fontFamily`, with a decoy;
  - `@ts-expect-error` cases: a serif `label` or `caption`, and `numeric` with the serif.
- **Tabular:** every registered screen and state, both themes, zero ragged figures. Decoys: the
  planted `4.23` and a planted hex.
- **Launch (criterion 4):**
  - `useFonts` receives exactly the emitted names, and a decoy name with no asset fails;
  - while loading, nothing renders and `hideAsync` is not called.
- **Fonts:**
  - `generate --check` is byte-equal for every face;
  - coverage is green, with the counts printed;
  - `--prove` decoys: an absent codepoint, a duplicate PostScript name, a mincho element with an
    unknown binding, and a variable face shipped by mistake.
- **Instrument:** the calibration's known-answer run, recorded in ADR-0112.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd && pnpm test:content
node scripts/verify-font-coverage.mjs --prove && node scripts/generate-font-subset.mjs --check
```

**Not provable here, and attested rather than claimed:** glyph rendering, weight matching on devices,
and the no-gap launch on a device. There is no JDK on this machine.

## Risks and open questions

- **OQ-13's reading.** If the person wants P3, that amends §2 and this acceptance.
- **HarfBuzz determinism across operating systems.** Instancing plus the name rewrite is confirmed
  byte-equal only when CI's `--check` runs.
- **Small crops may not resolve weight** (`14`, *Title*, the tagline). The ADR states the interval and
  the tie rule: on a tie, the lighter instance, because Gelasio widens with weight.
- **A font-load failure hangs on the splash.** The error is ignored today, and more faces widen the
  exposure. No mockup draws that state, so it is recorded as a backlog feature. The name-uniqueness
  check removes the one known cause.
- **App size** grows by roughly 0.3–0.6 MB. CI fetches one more source.
- **Stops for a person:**
  - the WCAG large-text floor (a threshold), recorded as a backlog feature;
  - matching the drawn Latin **sans**, which no OQ covers (this plan keeps the platform sans, ADR-0057
    §6);
  - a Reserved Font Name found at the pinned commit.

## Out of scope

- Rebuilding any surface: Home (F-242), the card and its PDF (F-253), the splash lockup (F-231),
  colour detail (F-247).
- Applying the serif beyond `Wordmark`.
- The Latin sans face.
- OQ-38's script face.
- Re-measuring the sans steps' leading or tracking.
- F-273's inventory completion.
- Fixing the WCAG floor.
- The font-load error path.
