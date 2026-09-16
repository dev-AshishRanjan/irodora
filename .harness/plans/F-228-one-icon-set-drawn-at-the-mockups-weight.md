# Plan: F-228 — One icon set, drawn at the mockups' weight

| | |
|---|---|
| **Feature** | F-228 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-9, NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` · `apps/mobile` · `scripts/` |
| **Author** | implementing session |
| **Date** | 2026-09-16 |

---

## Intent

Every glyph a mockup draws exists once, in one registry, at the stroke weight F-220 measured — so the
surface features (F-232 onward) take an icon by name and never draw one. An icon that is the only
content of a control cannot be built without an accessible name. A screen that draws its own icon
fails a check.

## Approach

### Which icons — the record, not the list

The acceptance names 32 icons; it was written before F-220 measured the mockups. **F-220's
inventories bind 56 distinct icon names** (57 once 00's `external` is rebound, below), and the acceptance's governing clause is *"every icon any
mockup draws"* — so the inventories decide, and the list is reconciled against them rather than built
as written:

| in the acceptance | in the inventories | disposition |
|---|---|---|
| clear | `close` | the drawn name |
| photo | `image` | the drawn name |
| regenerate | `refresh` | the drawn name |
| light | `sun` (02, 03) · `bulb` (11) | both are drawn; both are built |
| hanger | an **illustration** in 22 and 27 | F-229's, not an icon |
| t-shirt | `wardrobe` | the same glyph — 11 and 25 draw the wardrobe glyph as a shirt |
| external | `share` on `00.controls`, **rebound** | 00 draws a box with an arrow leaving its corner; every screen draws `share` as a tray with an arrow up (06 20 23 24 26). One name was drawing two shapes, so 00's element is now `external` |
| calendar | — | **drawn in none** of the twelve images the notes cite: not built |

The other 29 of the acceptance's names appear in the inventories as written. The inventories add 27
the list does not name — `arrow-right`, `bell`, `camera-locked`, `chevron-*`, `colour-wheel`, `compass`,
`document`, `file-*`, `grid`, `list`, `map`, `more`, `plus`, `reticle`, `score` and its five kinds,
`shield`, `sparkle` — and they are built, because they are drawn.

### Which drawing, when the mockups disagree

Rendering every instance of each name side by side showed the mockups draw **one name several ways**:
`atlas` as a globe (01, 25), an open book (05) and a folded map (21); `search` as a magnifier (05) and
two people (21); `swap` as a single circular arrow (07) and a two-headed one (13); `lens` as an
outline camera (01), a filled one (02) and a ring (25). The contract's precedence decides each, so none
of it is this feature's choice:

- **The tab bar is `01`'s** (§6 C1, by P5): Home · Atlas · Lens · Wardrobe · Profile. So `atlas` is the
  globe, `lens` the outline camera, `wardrobe` the shirt, `profile` the outline person — and 01
  draws its ACTIVE tab filled (home), so each tab glyph has a filled variant for that state.
  **As built:** only where a filled drawing exists — `home` (01), `lens` (02), `profile` (02 15 18),
  `compass` (09). `atlas` and `wardrobe` are drawn filled nowhere, so they have no filled drawing;
  how 01's tab bar shows either one active is F-234's question, recorded on it.
- **A superseded element never sets a shape** that a governing one draws. The tab bars of 02 05 09 11
  15 18 21 and 25 are replaced by C1, so 05's book and 21's map are not `atlas`, 21's two people are not
  `search` (05's search field draws the magnifier), and 25's ring is not `lens`. Names drawn ONLY in
  those tab bars — `bell`, `compass`, `map`, `grid`, `document`, `file-export` — are still built as
  drawn, because the acceptance asks for every icon any mockup draws.
- **Inside a screen, that screen governs** (P1). 07 draws its Swap buttons with the single circular
  arrow it shares with `refresh`, and 13 draws swap as a two-headed arrow — so 07's three elements are
  rebound to `refresh` (the glyph shown; the action stays a swap), and `swap` is 13's drawing.
- **Colour is not the glyph's.** Every glyph is drawn in one ink, and tinting is the surface's under
  §6 C10. C10 already declares 02's gold HUD, 04 and 12's green verdicts and 27's tan state art. Four
  tinted icons it does not list — 00's colour wheel and palette, 13's harmony circles, 11's bulb — are
  **OQ-37**, which blocks the surfaces that draw them rather than this feature.

### One registry

- **`Glyph`** in `packages/ui` — SVG on a 24-unit grid, keyed by the inventory's own names, so a
  surface feature writes the name its inventory records and nothing translates it.
- **NavIcon's five become entries** in it (`home`, `atlas`, `lens`, `wardrobe`, `profile`) — "exists
  once". `NavIcon` stays as the tab bar's thin wrapper, drawing through the registry.
- **The status glyphs keep their token registry** (`icon.check`, `icon.alert`, `icon.cross`, asserted
  both ways against `statusPairing`) and draw through `Glyph` where the shape is the same drawn icon —
  `icon.check` is `check`. A status glyph with no drawn counterpart stays where it is.
- **The weight is a token, and it does not scale with the icon.** F-220 measured the stroke at ≈ 1.65 dp
  on `01`'s tab icons (§5). Declared once in the manifest (`size.iconStroke`), and applied as a
  constant RENDERED width — `strokeWidth = iconStroke × 24 / size` in grid units — so a 16 dp icon and
  a 28 dp icon carry the same line, which is what "drawn at the mockups' weight" means at every size.
- **Silhouette, not colour** (NFR-9): each glyph is outline, and the `score-*` kinds differ in shape,
  not only in the tint 13 draws beside them.

### Drawn, checked against the image

Each glyph is drawn after a magnified crop of the element that binds it (the inventory gives the box),
and the paths are ours (NavIcon's reasoning: no vendored artwork, one family, one source). **As built:**
all 57 were drawn in one pass and compared on one contact sheet — each crop beside its glyph at 72 and
20 dp — rather than in batches; the seal and the padlock were redrawn after that comparison. The crops
are derived from committed images by the inventory's own boxes, so they are not committed; which element
each glyph was drawn against is recorded under *Evidence* below, and that is enough to regenerate them.

### The accessible name

**`IconButton`** — an icon as the only content of a control — takes `label` as a **required** prop, so
the careless version does not compile (the move F-140 made for spacing). A decorative glyph beside a
word is hidden from screen readers; a glyph that is the whole control is named.

### No screen draws its own

**`verify-app-glyphs.mjs`** in the lint chain: `apps/mobile` may not import `react-native-svg`, with
**one declared exception** — the share-card document renderer (`card.ts`, `ColourCard.tsx`), which
draws a DOCUMENT (ADR-0070), not an icon. **As built:** two rules, not one — an import of an SVG or icon
module, and SVG markup in a string — because `card.ts` imports nothing and writes the markup, while
`ColourCard.tsx` imports `react-native-svg` and writes none; each exemption names its rule. A `--prove`
plants eighteen cases beside the real tree, and a dead exemption fails too.

### Increments

1. **Record**: the claim, this plan, the reconciliation of the three unrecorded names against the
   images, and the inventory bindings that result.
2. **The registry and the weight**: `size.iconStroke`, `Glyph`, the five nav glyphs moved in, NavIcon
   and the status `check` drawing through it; registry tests (every inventory icon name has a glyph,
   every glyph is an inventory name — both directions, read from the inventories).
3. **The glyphs**, in batches by mockup, each against its crop. *(Built with increment 2 — one sheet.)*
4. **`IconButton`** with the required name; type-level refusal and render tests.
5. **The check** and its proof.
6. **Effects and the record.**

## Mockup fidelity

- **Governing mockups:** every one that binds an icon — `00 01 02 03 04 05 06 07 08 09 10 11 12 13 15
  16 17 18 19 20 21 22 23 24 25 26 27`, per the inventories.
- **Inventory:** the `icon` field of every element; 57 names once 00's `external` is rebound.
- **Bindings:** none — a glyph is a shape, not a value.
- **Departures:** none. Names the acceptance lists and no mockup draws are not built, and that is
  following rule 14 rather than departing from it.

## Files to touch

```
docs/design/design-system.manifest.json     size.iconStroke
packages/design-tokens/src/*                parse, emit
packages/ui/src/Glyph.tsx (new), IconButton.tsx (new), NavIcon.tsx, Icon.tsx, index.ts; tests
scripts/verify-app-glyphs.mjs (new); package.json lint chain
mockups/tools/inventory-data/*.mjs, mockups/inventory/*.json   only if an unbound drawn icon is found
docs/design/DESIGN-SYSTEM.md                the icon section
.harness/state/*; memory/effects/*
```

## Anticipated effects

1. **A manifest size token** → emitters, token reach (it must be read). Guard: `generate --check`,
   token reach.
2. **NavIcon draws through the registry** → the tab bar; its both-directions test. Guard: that test,
   the conformance suite.
3. **The status check draws through the registry** → every status indicator. Guard: the status
   registry's both-directions test, the cvd gate.
4. **A registry keyed by inventory names** → the inventories become an input to a ui test. Guard: the
   test reads them, so a renamed icon in an inventory fails here rather than at a surface.
5. **A new lint check** → the lint chain. Guard: its proof.

## Test plan

- **Both directions**: every icon name any inventory binds has a glyph; every glyph is bound by at least
  one inventory (a glyph nobody draws is a design nobody made) — with a decoy name planted each way.
- **Weight**: the rendered stroke is the token at 16, 20, 24 and 28 dp.
- **Silhouette**: the five `score-*` glyphs render to distinct outlines (their path data differs), so
  they are told apart without colour.
- **`IconButton`**: `@ts-expect-error` on a missing `label`, paired with a decoy that compiles; the
  rendered tree carries the name and role.
- **The check**: its proof, planted and dead-exemption cases.
- **Gates**: state, typecheck, lint, format, test, build, a11y, contrast, cvd.

## Evidence

Each glyph was drawn against a magnified crop of the element below (an inventory id, or where the
inventory binds a compound element, the part of it that is the icon). Crops: the inventory box with a
3 px margin, fitted into a 96 px cell from the mockup's own pixels.

| | | |
|---|---|---|
| `arrow-right` · 04.sheet.outfits.icon | `edit` · 00.controls.icon-edit-2 | `palette` · 00.buttons.icon-palette |
| `atlas` · 01.tabs.atlas.icon | `export` · 06.export | `plus` · 03.actions.add.icon |
| `back` · 22.back | `external` · 00.controls.icon-external | `profile` · 15.tabs.profile |
| `bag` · bag (11, icon part) | `file-code` · file-code (18) | `refresh` · refresh (13, icon part) |
| `bell` · 15.tabs.bell | `file-export` · file-export (18) | `reticle` · 06.actions.hold.icon |
| `bookmark` · 06.bookmark | `file-table` · 18.tools.csv.icon | `score` · score (13, icon part) |
| `bulb` · 11.gap.icon | `file-text` · file-text (18) | `score-balance` · 13.score.balance.icon |
| `camera` · 00.buttons.icon-camera | `filter` · 19.filter | `score-contrast` · score-contrast (13) |
| `camera-locked` · 27.lens-permission.icon | `glare` · 27.lens-refused.icon | `score-cvd` · 13.score.cvd.icon |
| `check` · 12.intelligence.check | `grid` · 11.tabs.grid.icon | `score-fit` · 13.score.fit.icon |
| `chevron-left` · 16.tray.previous | `help` · help (18, icon part) | `score-harmony` · 13.score.harmony.icon |
| `chevron-right` · 16.tray.next | `history` · history (23) | `search` · search (05 tab) |
| `chevron-up` · 12.tracking.toggle | `home` · 01.tabs.home.icon | `settings` · 09.tabs.settings.icon |
| `close` · 09.search.clear | `image` · 00.buttons.icon-image | `share` · 24.share |
| `colour-wheel` · colour-wheel (00) | `lens` · 01.tabs.lens.icon | `shield` · 12.intelligence.icon |
| `compass` · 09.tabs.atlas.icon | `list` · list (05.count, icon part) | `sparkle` · sparkle (04) |
| `contrast` · contrast (00) | `lock` · 13.slots.slot-2.lock | `sun` · 02.conditions.icon |
| `document` · 18.tabs.document.icon | `map` · 09.tabs.map.icon | `swap` · swap (13, icon part) |
| `download` · 08.export | `more` · more (05.more) | `wardrobe` · 01.tabs.wardrobe.icon |

## Risks and open questions

- **Drawing 56 glyphs to match renders is judgement at the level of a stroke.** The shapes follow the
  crops; a person comparing F-221's captures is where the fine points get settled.
- **A glyph whose drawn shape is unreadable at the image's resolution** is drawn as the nearest
  unambiguous form of the same object and recorded as derived, the way F-220 records its readings.
- No open question blocks this feature.

## Out of scope

Placing any icon on a screen (the surface features do, from their inventories); illustrations (F-229);
the mark (F-230); motion on an icon (F-266).
