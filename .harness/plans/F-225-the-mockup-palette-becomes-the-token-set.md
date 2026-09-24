# Plan: F-225 — The mockup palette becomes the token set, dark and light, with the four themes mockup 15 draws

| | |
|---|---|
| **Feature** | F-225 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-70, NFR-8, NFR-9 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/design-tokens` · `@irodora/ui` · `apps/mobile` |
| **Author** | planner subagent (survey and design), Claude Opus 5.5 (decisions on its open questions, below) |
| **Date** | 2026-09-24 |

---

## Intent

The app is painted in the mockups' palette: Sumi Charcoal (dark) and Washi Minimal (light) take the
README table exactly, except where a blocking gate forces a listed move. A person picks from the four
themes `15` draws, plus the phone's own light or dark (system) and the phone's colour (device). A
person who had fuka, yama or aota saved lands on the monochrome theme of the same mode. The ADR that
supersedes ADR-0096 and ADR-0099 says plainly that samples are now judged against a surround with
chroma. Every chroma the chrome draws is either under a re-stated ceiling or a declared exception.

## Approach

**Reused:**
- The parse-time derivation in `parseManifest`, so the gates read derived palettes.
- `checkContrast`, `checkSeparation`, `checkChromaCeiling`, `checkSalience` and `checkStructure`.
- `derivedSrgb` (ADR-0043), `toHex8`, `compositeOver` and `resolveAll`.
- `@irodora/color-spaces` and `deltaE00`. No new colour maths.
- F-289's arithmetic in `mockups/tools/derive-theme.mjs`, which moves into the package and has the
  tool re-point at it.
- `deriveTheme` and `seed.ts` (E4, device).
- `generate-design-tokens.mjs --check`, `verify-token-reach.mjs` and `unreached-tokens.json`.
- The F-220 inventories, `measure.ps1` and `tint.ps1`.
- The settings table, `AppearanceProvider`, `Select`, both catalogues and the font subset.

**New:**
- `packages/design-tokens/src/derive-theme.ts`, with two functions:
  - `reanchorTheme()`, ADR-0107's rule.
  - `smallestLightnessMove()`, the E3 search. It takes `cielab` (§4's method) or `oklab`
    (ADR-0107's), with hue and chroma held, and judges each candidate with the real checkers.
- Manifest additions: a `themes` array (15's four, in order), `themeDerivations` replacing
  `themeRecipes`, a `mockupNames` map, and element-keyed chroma exceptions.
- Tokens `foreground.3.card` and `swatch.keyline`.
- An appearance model with the choices `sumi | slate | obsidian | washi | system | device`.
- ADR-0111.

### 1. The token mapping (criterion 1)

| README role | manifest token | Sumi (dark) | Washi (light) | notes |
|---|---|---|---|---|
| ground | `background` | `#15171B` | `#F6F5F2` | |
| level1 | `surface.1` | `#20232A` | `#FFFFFF` | |
| level2 | `surface.2` | `#282C35` | `#EEEDE8` | |
| level3 | `surface.3` | `#323742` | `#E5E3DE` | |
| border.subtle | `border` | `#2E333D` | `#E5E3DE` | Becomes opaque. `alpha` and `compositeOver` go; `uncheckedReason` stays (decorative). The `border.on.*` composites stop, so their reach entry goes. |
| border.strong where a label identifies the component | `border.strong` | `#464D5B` | `#1A1B1E` | Decorative (§4 E3 ¶2). `pairsWith: []` plus `uncheckedReason`. |
| border.strong as the only indicator of a state (README: "Active border & focus ring") | `ring` | E3, decision A | E3, decision B | Pairs with `background` and `surface.1`–`3`. The blue is gone, because nothing draws it. |
| neutralKeyline | `swatch.keyline` (new) | `#FFFFFF22` | `#1A1B1E18` | `nonText`, `compositeOver` the grounds, `uncheckedReason`, reach-exempt `closedBy: F-233` |
| typography.primary | `foreground` | `#F7F8FA` | `#1A1B1E` | |
| typography.secondary | `foreground.2` | `#A6B0BC` | `#5C6470` | |
| typography.tertiary, on the ground | `foreground.3` | `#768290` (kept, 4.59:1) | `#5D6674` (E3) | Usage `text`; pairs with `background`. |
| typography.tertiary, on cards | `foreground.3.card` (new) | `#94A1AF` (E3) | `#5D6674` (E3) | Usage `text`; pairs with `surface.1`–`3`. |
| accent.primary | `accent` and `inverse` | `#FFFFFF` | `#1A1B1E` | The gold is withdrawn (ADR-0099 superseded). |
| the pill's text | `accent.foreground` and `inverse.foreground` | `#15171B` | `#F6F5F2` | The ground, by construction. |
| accent.secondary `#2A2E38` | not taken | | | Not in criterion 1's list; F-232 decides it if needed. |

README hexes are stored as OKLCh at double precision, so that `derivedSrgb` reproduces each hex exactly
(ADR-0043).

### 2. Tokens the README leaves open

| token | rule |
|---|---|
| `link` | equals `foreground` |
| `accent.muted` | equals level 1: 15's selected tile shows its card |
| `swatch.well` | equals level 1: the sample sits on the drawn card (C11) |
| `swatch.hairline` and `.inverse` | held |
| `chart.*` | held |
| `backdrop` | held |
| `status.*` | held; moved E3-way only where gate 9, gate 10 or salience forces it, in that theme only |

**Pairings** follow where the inventories draw each role:
- `surface.1`, `surface.2` and `surface.3` pair with `foreground`, `foreground.2` and `foreground.3.card`.
- `background` pairs with `foreground`, `foreground.2` and `foreground.3`.

A test derives the drawn pairings from the inventories and requires each one to be declared. That way,
passing cannot be bought by declaring fewer. The ceiling is re-stated at the smallest 3-decimal value
at or above the largest OKLCh chroma among the README's drawn values: 0.0251, so 0.026. A test
recomputes it.

### 3. The four themes, system and device

- `THEMES` becomes `['dark','light','slate.dark','obsidian.dark']`, where `dark` is Sumi and `light`
  is Washi.
- `defaultTheme` stays `dark`.
- The manifest `themes` array holds 15's order, and the parser checks it against `THEMES`.
- `themeRecipes` and fuka, yama and aota are removed.
- `themeDerivations` for slate and obsidian: each ground's OKLCh and its source ("read, ΔE00 ≈ 2" /
  "printed"); `reanchor` covers background, surface.1–3, swatch.well and accent.muted; `moves` lists
  each token, its l, its space and what forced it.
- The generator computes the moves in OKLab: foreground side only, in a deterministic order, with the
  gates re-run after each move. `--check` fails on drift, and the generator stops rather than searching
  jointly.
- `system` follows the platform: dark gives Sumi, light gives Washi, unknown gives `defaultTheme`.
- `device` behaves as today, capped at the new ceiling.
- Stored values: `parseAppearance` stays total and maps legacy values by mode:
  `…:dark` to sumi, `…:light` to washi, `…:system` to system, `device:*` to device, anything else to
  the default.
- Preferences' `Select` offers the four, then System, then Device. The mode chips go, because 15 draws
  none. F-262 builds the tiles.
- `appearance.hint` is rewritten truthfully in both catalogues.

### 4. C10 and the ADR-0110 icons (criterion 3)

**The census.** Every C10 element (02, 04, 12, 13, 23, 24, 27) and every ADR-0110 icon occurrence is
measured and classified: `tint`, `gradient`, `spectrum` or `sample`. Readings within ΔE00 2 are grouped
as one colour.

**The exceptions.** Each group becomes one element-keyed exception:
`{rule, elements[], kind, measured?, reason, owner, recordedAt, adr, mintedBy}`. `checkChromaCeiling`
reports one as stale when its measured chroma is not above the ceiling. The status triple stays as
token exceptions. The `ring`, `accent` and `accent.muted` exceptions go stale and are removed.

**No tint token is minted here.** The feature that draws each element mints its token and names it on
the exception. OQ-24 and OQ-28 stay open and are not in this census.

### 5. ADR-0111 (criterion 4)

**Decisions:**
- The palette is the mockups' and the themes are 15's four, with system and device.
- A sample is judged against the surface it sits on.
- **The measured consequence, stated plainly:** samples are judged against a surround of C up to
  0.0206, which a neutral well at the same lightness could not hide (ΔE00 2.94–6.50).
- The gold accent is withdrawn.
- The ceiling is re-stated from the drawn ramp.
- The keyline is declared, and the two-tone hairline stays until F-233.
- `foreground.3` becomes normal text.

**Supersedes** ADR-0096 and ADR-0099; amends ADR-0044's ceiling value. A test reproduces the
consequence figures, and the ADR quotes whatever that test reproduces.

### Increments (each leaves every gate green)

1. **The shared rule.** `derive-theme.ts` with ADR-0107's table pinned, F-289's controls and its
   mutation decoy. `mockups/tools/derive-theme.mjs` re-points at the package, with its report
   unchanged.
2. **Appearance before palette.**
   - Recipes removed; `THEMES` is `dark` and `light`.
   - The choice model, the legacy parse and `resolveThemeName`.
   - Preferences offers Sumi, Washi, System and Device.
   - Catalogues, hint and font subset.
3. **The README values, meaning unchanged.**
   - Grounds, levels, `foreground`, `foreground.2`, opaque `border`, `swatch.keyline`.
   - The ceiling, `mockupNames` and the regenerated targets.
   - Reach entries; re-derive `verify-contrast-proof.mjs`'s anchors.
4. **The changes of meaning.**
   - Split `foreground.3` into two tokens.
   - `border.strong` becomes decorative, and `ring` takes the state (decisions A and B).
   - `accent`, `inverse`, `accent.muted` and `swatch.well` follow their rules; stale exceptions are
     retired.
   - Consumers: `TextField` and `SearchField` focus reads `ring`; ColourDetail cards use
     `foreground.3.card`; the `Text` types.
   - The inventory-pairing test.
5. **Slate and Obsidian.**
   - `themeDerivations`, the parser derivation, and the generator's moves under `--check`.
   - `THEMES` grows to four; the manifest `themes` array.
   - The picker offers six choices.
   - The conformance suite runs all four themes; `themes.test.ts` is rewritten.
6. **The C10 census and element exceptions.** The schema, `checkChromaCeiling`, the coverage test and
   §6 C10's census table.
7. **ADR-0111 and the documents.** ADR-0096 and ADR-0099 superseded; the index; §4 E3 (every move, per
   theme, with its space); §5 adopted; `mockups/AGENTS.md`; PRD FR-70; `DESIGN-SYSTEM.md`; the manifest
   notes, description and `valuesChangedSinceApproval` ("NOT YET APPROVED BY A PERSON"); the
   consequence test.
8. **Effects, notes, record, review.**

## Mockup fidelity

- **Governing:** the README §3 table (P4) for values, `15` for the theme set, `25` for light, `00` for
  keyline and selection, the C10 elements, and the ADR-0110 icons.
- **Bindings:** `static:themes.<id>.ground` resolves to `nativeColors[palette].background`.
- **Departures:**
  - E3: §4's rows as corrected (A), Washi's ring (B), and ADR-0107's per-theme moves;
  - E4: system and device;
  - C9, C10 and C11.
- The interim Preferences `Select` carries criterion 2's options. F-262 builds 15.

## Decisions on the planner's open questions (2026-09-24, under the person's delegation)

- **A. §4 E3's third row is corrected by its own rule.** `#5C6472` was measured against the ground
  only. Focus lands on levels 1–3 too, and F-289 measured `#5C6472` failing there (2.0–2.64 against 3).
  §4's rule is "the smallest move that passes on the worst surface it is drawn on", so applying it to
  the surfaces focus lands on gives the value, computed in increment 4 and recorded with its evidence.
  The alternative that keeps `#5C6472` (pairing `ring` with the ground only) launders gate 9 and is
  refused. This applies a listed rule; it is not a new design decision.
- **B. Washi's ring is a fourth E3 row.** As drawn, light border.strong is `#1A1B1E`, equal to
  `foreground` and `accent`, so gate 10's `[ring, border.strong]` pair and the focused-vs-selected
  invariant both fail. A blocking gate forces the departure, which §1 admits. The smallest lightness
  move that separates them is computed, not guessed.
- **C.** FR-70's "the well stays neutral" is amended to record C11, the person's own decision of
  2026-09-10.
- **D.** Whether `13`'s slot tints and `24`'s badges follow their rows' colours is read off the images
  in the census. If one cannot be read, that element is recorded as open and excluded, and criterion 3
  names it.
- **E.** ADR-0110's list contains `06`'s seal and `11`'s bulb, which are exactly what OQ-20 and OQ-21
  ask about. ADR-0110 answers them by name, so its **Closes** line is extended to OQ-20 and OQ-21
  explicitly, and they are removed from PRD §10 with a closure paragraph. That is a deliberate record,
  not a closure in passing.
- **F.** The Japanese names of the four themes are the names `15` prints (Sumi Charcoal · 墨炭 etc. are
  NOT drawn; `15` prints Latin names only). They stay Latin in both locales, as drawn; font coverage
  checks whatever Japanese the catalogue adds.

## Files to touch

```
docs/design/design-system.manifest.json
packages/design-tokens/src/{manifest,check,derive-theme(new),seed,index}.ts, src/emit/*, src/generated/*, generated/*
packages/design-tokens/test/{mockup-palette,derive-theme,c10-exceptions,inventory-pairings}.test.ts (new) + updated suites
packages/ui/src/{theme,TextField,SearchField,Text,index}.tsx|ts, src/testing/conformance.ts + tests
apps/mobile/src/{appearance.tsx,screens/Preferences.tsx,screens/ColourDetail.tsx,i18n/en.ts,i18n/ja.ts}, app/_layout.tsx, global.css, font subset, tests
scripts/generate-design-tokens.mjs, scripts/verify-contrast-proof.mjs
mockups/tools/derive-theme.mjs, mockups/tools/README.md
.harness/verification/unreached-tokens.json; turbo.json (mockups/README.md if a test reads it)
docs/adr/0111 (new), 0096, 0099 (status), 0110 (Closes), README; docs/design/{R9-MOCKUP-FIDELITY,DESIGN-SYSTEM}.md; docs/PRD.md; mockups/AGENTS.md
.harness/state/*, .harness/memory/effects/*
```

## Anticipated effects

| effect | guard |
|---|---|
| The theme set and appearance model (E-093) | `themes.test.ts`, typecheck, gates 9 and 10 over four palettes, conformance over four themes |
| The seed ceiling (E-095) | `seed.test.ts`'s 720-case sweep |
| Anchors the contrast proof pinned (E-098) | the proof refuses on a retuned manifest; re-derived |
| `swatch.well` = level 1 (E-111) | `status.bad`'s well pairing, and the adjacency rule |
| New: README → manifest | `mockup-palette.test.ts` |
| New: ADR-0107 rule → manifest | `derive-theme.test` + `generate --check` |
| New: C10 / ADR-0110 elements → exceptions | the coverage test |
| New: stored appearance format | parse tests with legacy inputs and decoys |
| `border.strong`'s meaning; focus consumers read `ring` | component tests (a guard to be built; nothing checks border contrast at component level today) |
| Tokens that now share a value | audit the conformance decoys that tell tokens apart by value (E-098) |
| The HeroUI stylesheet has only the authored pair | **unguarded**: className paint is invisible to jest. F-221's captures are the only check |

## Test plan

- **Unit:**
  - `derive-theme` controls, and each move is minimal: it passes, and one grid step back fails.
  - The ceiling recomputation.
  - The legacy mapping, 4 families × 3 modes.
  - `resolveThemeName` for every choice against every scheme.
- **Golden:** ADR-0107's table, the §2 README hexes, the §4 E3 values, and the C 0.0206 /
  ΔE00 2.94–6.50 reproduction.
- **Conformance:** the whole registry in four themes and both locales. Selection edges differ in all
  four. The large-text rule reports that it checks nothing.
- **Negative, each with a decoy:**
  - a level nudged by one hex step fails `mockup-palette`;
  - a pairing drawn but not declared fails `inventory-pairings`;
  - an element dropped from its exception fails coverage;
  - a stale element exception is reported;
  - the README keyline alone fails the sample-edge floor (recorded for F-233);
  - unknown stored values fall back to the default;
  - the F-289 mutation fails the derivation table.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd && pnpm test:content
node scripts/verify-contrast-proof.mjs && node scripts/verify-token-reach.mjs --prove
node mockups/tools/derive-theme.mjs
```

**Evidence to capture:** gate 9's table over all four themes, the move table per theme, the census and
the derive report.

**e2e is not run.** The gate is `pending`, and this machine has no JDK, Maestro or device.

## Risks

- §4 uses CIE L* and ADR-0107 uses OKLab, so every row states its space.
- §4's values may not reproduce exactly. Assert the properties: the value passes, the drawn value
  fails, and hue and chroma are held.
- Washi's darker level 2 or Slate's lighter ground may push a status token or break salience. If one
  move cannot fix it, **stop**: a joint search over the status triple changes values ADR-0098
  approved, and that needs a person.
- `LARGE_TEXT_TOKENS` becomes empty, and the ADR states it.
- New exports need real readers, or `verify-dead-exports` fails.

## Out of scope

- F-262: 15's tiles and the rest of 15.
- F-233: whether the sample family draws a well or the keyline.
- F-232: the controls' looks, and minting C10 and icon tokens.
- F-240: the CVD preview.
- The HeroUI stylesheet for slate and obsidian.
- OQ-24 and OQ-28.
- `accent.secondary`.
