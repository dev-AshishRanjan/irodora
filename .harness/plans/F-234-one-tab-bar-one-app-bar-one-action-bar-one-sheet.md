# Plan: F-234 — The navigation chrome is one tab bar, one app bar, one action bar and one sheet

| | |
|---|---|
| **Feature** | F-234 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` · `apps/mobile` (the tab layout, its adapter, the Lens sheet call site, the route-header ratchet) · `mockups/inventory` · `scripts/verify-viewport.mjs` |
| **Author** | planner subagent (2026-09-30), adopted by the implementing session with two changes: OQ-48 is raised against F-265, not the screen features; the §4 E4 row for the tab bar under an action bar is also named on F-267 for a person |
| **Date** | 2026-09-30 |

---

## Intent

Four navigation elements, each built once and drawn as the mockups draw them.
- **The tab bar** at the bottom of every tab screen is mockup 01's:
  - five destinations, each a glyph and a word;
  - a rule across the top of the bar;
  - a short bar over the active tab;
  - the active tab's word and glyph in the primary ink.
- **The app bar** at the top is one component. It holds every arrangement the screens draw: a back label, a title in one or two scripts, trailing icons or a trailing button.
- **The action bar** is one component. It holds one or two buttons, sits under the content and above the tab bar, and never covers anything.
- **The bottom sheet** is one component. It has a drawn handle and detents, and is drawn over the live frame (03) and the target view (04) without dimming them.

To a user, done means:
- the tab bar reads *Home · Atlas · Lens · Wardrobe · Profile* and never wraps;
- a screen's last content is never under its buttons;
- the Lens sheet leaves the camera visible.

## The facts that govern this plan

These are read off the record, not chosen.

**1. Only `01` governs the tab bar (C1, P5).** `01.tabs` is `app:TabBar`, 384 × 77 dp at y 611, with `bg: ground` and `border: border.subtle` as a rule across the top.

| element | dp | tokens |
|---|---|---|
| `01.tabs.indicator` | 47.5 × 2.5 at x 44.5, y 612, on the rule, over Home | `text.primary` |
| glyphs | 16.5×17.5 · 17.5×18 · 18×16.5 · 19.5×17 · 15.5×17.5 | none bound (the ink is measured in increment 1) |
| labels | `caption` 500, `raw.emDp` 10, one line, y 644.5–652.5 | active `text.primary`, inactive `text.secondary` |

- The item centres fall at 68.25 · 130.25 · 192 · 253.75 · 315.75 dp. That is an even pitch of 61.9 dp inside a **37.3 dp side inset**, not five equal fifths.
- From the rule to the label bottom is 41.5 dp. Below the labels there is **35.5 dp** to the frame edge.
- `01` prints *Lens Camera*; C1 says *Lens*.

**2. `01` draws only Home active, and Home's glyph is filled** (F-228, corrected 2026-09-21).
- The filled lens, profile and compass glyphs come only from the tab bars C1 supersedes: 02, 15, 18 and 09.
- Atlas and wardrobe are drawn filled nowhere.
- So what an active Atlas, Lens, Wardrobe or Profile tab draws is undrawn. That is **OQ-47**.

**3. No screen that draws an action bar also draws a tab bar.**
- Screens with a tab bar (01 02 05 09 11 15 18 21 25) draw no action bar.
- Screens with an action bar (03 06 07 08 10 12 13 16 17 19 20 22 23 24 26) draw no tab bar.
- 16, 22 and 24 draw the OS home indicator directly under their action.
- Against that:
  - criterion 3 says "above the tab bar";
  - F-145's criterion 1 (FR-71) is "a persistent tab bar carries the primary destinations, and secondary screens are pushed within a tab";
  - 17 and 23 are `profile/index`, a primary destination.

**4. No inventory records an app bar as a component.** Each screen's header is loose elements:

| screen | back | title | trailing | rule / fill |
|---|---|---|---|---|
| 02 | – | centred, `title` 500, bilingual | – | – |
| 05 | – | **leading**, `title` 600, bilingual; second row (count chip, three buttons) | `more` | rule |
| 06 | back glyph + label | **none** | three icons (bookmark, share, export) | rule |
| 07 | back glyph only | leading, `title` 500 | – | – |
| 08 | "← Atlas" | centred, bilingual (122.5, 17, 139 × 15) | `download` 13.5 × 17 | rule at 46.5 |
| 09 | "← Atlas" | centred, `title` 600 | "✕ Clear" | – |
| 10 | "← Atlas" | title on its **own row below** | "+ Create" outlined | – |
| 11 | – | centred, `body` 500 | – | – |
| 12 | "← Cancel" | centred, `body` 600 | **Save** 47 × 28, primary, `md` | rule at 49.5 |
| 13 | "← Wardrobe" | centred, `body` 600 | Capsule Solver, outlined `border.strong`, `md` | rule |
| 15 | – | leading, `title` 600 | the **mark**, no action | – |
| 16 | "← Palettes" | centred, `label` 600 | Save Palette 79.5 × 25.5, outlined `border.strong`, `sm` | rule |
| 17 | – | centred, `body` 600 | – | – |
| 18 | "← back" | centred, `label` 600 | "? Help" | `level1` fill, rule |
| 19 | "← back" + a **vertical divider** | title after it | filter icon | `level1` fill |
| 20 | "← Back" | centred, bilingual | share | – |
| 21 | back | centred, `title` 600 | filter icon | – |
| 22 | back glyph only | centred **two-line**: `body` 600, and Japanese `body` in `text.secondary` beneath | the **mark** in `text.tertiary` | – |
| 23 | **avatar** leading | two-line | share | – |
| 24 | "‹ Back" (`chevron-left`) | two-line | share | `level1` fill **from the top of the screen, behind the status bar** (24.header, #1F2227), rule |
| 26 | Japanese back label | Japanese title only | share | rule |

**5. The action bars drawn:**

| screen | actions (dp) | layout | radius | fill / edge |
|---|---|---|---|---|
| 08 | primary 172.5 × 31.5 then outlined 171 × 30; 16 dp side inset; 8 dp gap | row | `md` | rule |
| 13 | primary with a `refresh` glyph, outlined | row | `md` | rule |
| 06 | primary with `→`, outlined (OQ-19 overhang) | row | not recorded | rule |
| 07 | primary, outlined | row | `pill` | rule |
| 26 | primary, outlined | row | `md` | ground (#15151B) |
| 20 | **tonal `level2` first, primary with `→` second** | row | `md` | a boxed container |
| 22 | primary, outlined | **column** | `md` | – |
| 23 | primary, outlined | column | `md` | rule |
| 10 | one tonal, 344 × 29 | – | `md` | rule |
| 12 | one primary, 348 × 33 | – | `md` | rule |
| 16 | one primary with `→` | – | `sm` | no container recorded |
| 17 | one primary with `→` | – | `sm` | `level1`-ish (#1D2027) |
| 19 | one tonal `level3` with `→` | – | `md` | rule |
| 24 | a **text action, no plate** | – | – | `level1` bar (#1E2028) |
| 03 | inside the sheet: primary with trailing `→` (149 × 32), outlined `border.strong` with leading `+`, then a full-width `level2` pill | 2 + 1 | `pill` | – |

So "pill" in the criterion reads as "button". "Primary first" holds on 13 of the 14 listed screens; 20 is the exception.

**6. `03` and `04` draw the sheet differently.** Board 00 draws no sheet, app bar, tab bar or action bar. So P3 has nothing to govern, and each screen governs its own state (P1, and P3's second sentence).

| | `03.sheet` | `04.sheet` |
|---|---|---|
| placement | **floats**: 28.5 dp side insets, 29.5 dp above the frame's bottom, 327 × 478.5 dp | **docked**: reaches the drawn screen's bottom; drawn 391 dp wide, past the frame (**OQ-16**) |
| fill | `bg: ground` | `bg: level1` (#1F2228) |
| edge | `border.subtle` | none |
| corners | `lg` on all four | `lg` at the top |
| handle | 40 × 4 dp, 5 dp below the top | 39.6 × 4.4 dp, 9.5 dp below the top |
| content inset | ≈ 9 dp | ≈ 12.5 dp |

- Neither draws a scrim over what is behind it.
- Neither draws a visible title.

**7. Today's chrome:**
- **Tab bar:** glyphs only (`tabBarShowLabel: false`, F-168), on a `surface.1` ground with no rule (F-163 removed a `border.strong` one). A 16 × 2 `accent` indicator. `TAB_GLYPH` 26, `TAB_BAR_BASE` 56 plus the device inset.
- **Pushed routes:** 16 of them show the platform's Stack header, titled *Irodora*.
- **`Sheet`:** a `surface.2` fill with a `border.strong` edge, only the top corners rounded, a `backdrop` scrim, a visible `title`, and gorhom's handle, whose built-in accessibility copy is English (*"Bottom sheet handle"*).
- **`Button`:** only the primary and secondary labelled forms. F-232 left **"labelled buttons with a leading icon"** to F-234. No plain or tonal form exists.

**8. `verify-viewport.mjs` lets only two files read the safe area:** `layout.tsx` and the tab layout.

## Approach

**Reused:**
- `NavIcon`, `Glyph`, `FILLABLE_GLYPHS` (F-228);
- `Button`, `IconButton`, `hitArea()`, `FocusRing`, `BUTTON_HEIGHT` (F-232; ADR-0114, ADR-0115);
- `Text` (`size`, `weight`, `script`, `numberOfLines`, `heading`);
- `Screen`'s inset structure (E-084) and its `lead` slot (E-140);
- `Mark`, `Avatar`;
- the F-177 detents;
- `TABS` and its test ids;
- the conformance registry, `selection-treatment`, `tree.ts`, `screen-insets.json`;
- the recompute-from-inventory pattern (E-157);
- the `mockups/tools` measurers and `generate-inventory.mjs`.

**New:**
- In `@irodora/ui`:
  - `TabBar.tsx`, `AppBar.tsx`, `ActionBar.tsx`;
  - `Sheet` gains `form`, `handleLabel` and `footer`;
  - `Button` gains `glyph`/`glyphAt`, `variant: 'plain' | 'tonal'`, and `edge` on the secondary form;
  - `NavIcon` gains `filled`;
  - `Screen` gains `appBar` and `actionBar` slots, absent by default.
- In `apps/mobile`:
  - `src/tabBar.tsx`, an adapter from the navigator's props to `TabBar`, kept out of `app/` (the E-099 lesson);
  - `TABS` entries gain `activeGlyph`;
  - `apps/mobile/test/chrome.test.ts`: the "only one tab bar" test and the native-header ratchet.
- ADR-0117 (the tab bar; F-168 reversed) and ADR-0118 (the placement of the app bar, the action bar and the sheet).
- OQ-47 and OQ-48.

### Decision 1 — The tab bar (criterion 1)

- **A component of ours, drawn through Expo Router's `Tabs tabBar={…}`.**
  - React Navigation's bottom bar wraps the icon slot in its own spacing and label layout, and on wide screens it puts labels beside the icon. 01's even pitch inside the side inset, and the indicator on the rule, cannot be drawn through it faithfully.
  - `TabBar` is presentational: `items`, `active`, `onSelect`, `onLongPress`, `bottomInset`, `sideInsets`. That makes it a conformance subject in four palettes.
  - The adapter emits `tabPress`/`tabLongPress` and navigates only when the event was not prevented, as React Navigation's own bar does. It takes the navigator through a structural type, so a test drives it with plain objects and no runtime import of `expo-router`.
- **Drawn values, recomputed by `tab-bar.test` from `01.json`:**
  - the ground is `background` (01's `ground`), with a 1 dp `border` rule across the top;
  - items are evenly pitched inside `TAB_SIDE_INSET` (37.3 dp, held in dp at any width);
  - the indicator is `TAB_INDICATOR`, 47.5 × 2.5 in `foreground`, centred on the active item and sitting on the rule;
  - `TAB_GLYPH` is the median over the drawn glyphs of their box × 24 / grid extent, snapped to half a dp (26 is the decoy);
  - labels are `caption` at weight 500, `foreground` when active and `foreground.2` otherwise, with `numberOfLines={1}`.
- **Height (ADR-0117).** The bar is `TAB_CONTENT` (41.5) + `max(TAB_BELOW, insets.bottom)`, where `TAB_BELOW` = 35.5.
  - The drawn space under the labels absorbs the device inset where it fits, and only the excess grows the bar. On an iPhone (34 dp) the bar is exactly 01's 77 dp.
  - Evidence: `25`, drawn in a device frame with its status bar, leaves 41.7 dp under its labels; `01` leaves 35.5; the superseded bars leave 6–10.
  - This is a measured inset, so it falls under the 2026-09-24 delegation and closes with ADR-0117. 56 is the decoy.
- **The active state.**
  - Three channels come from 01's drawing of the active tab and apply to any tab: the indicator, the `foreground` ink, and `accessibilityState.selected`.
  - **The glyph shape** is `TABS[].activeGlyph`. A test holds it to the governing inventory's `raw.filled`, recorded in increment 1: `home` is `filled`, the other four `outline`. `NavIcon filled` passes it on to `Glyph`.
  - **What ships until OQ-47 is answered:** each glyph keeps the only drawing 01 gives it. No superseded bar sets a shape, and nothing new is drawn.
- **Accessibility.**
  - The container is a `tablist`. Each item is a `tab` with `selected`, named by its visible word, with its target reached through `hitArea`.
  - Focus draws `FocusRing` outside the item (E-151).
  - `selection-treatment` learns `indicator`: an active item must paint the indicator ground and the active ink. The decoy, an ink change alone, is reported.
- **ADR-0117 records:**
  - **the reversal of F-168:** the label returns in 01's type, without the uppercase and 0.16 em tracking that made it wrap. It is one line and never wraps, the part of F-168 that is kept;
  - **the rule's return,** in `border` rather than the `border.strong` F-163 removed. F-163's criterion 3 is reversed for the tab bar only;
  - **the cost:** `プロフィール` at the caption step is about 61.8 dp against a 61.9 dp item at 384 dp. It truncates on narrower phones and at 200 % text, and the accessible name keeps the whole word. This is stated rather than hidden, and owed as an attestation.
- **Only one tab bar.** A test finds `Tabs` from `expo-router` in exactly one file, and only the adapter renders `TabBar`.
  - The decoy is a planted second import.
  - The in-page `Tabs` in `overlay.tsx` (ColourDetail) is not a navigation bar. It is named in the test with that reason, and its fate is F-247's under 06.

### Decision 2 — The app bar (criterion 2)

**The API** (`AppBar.tsx`). Types refuse `back` and `lead` together, and more than three trailing icons.

| prop | what it holds | drawn on |
|---|---|---|
| `title` | `{ text, ja?, layout: 'inline' \| 'stacked', align: 'centre' \| 'leading', placement: 'bar' \| 'below', size, weight }` | all |
| `back` | `{ label?, accessibilityLabel, glyph: 'back' \| 'chevron-left', ink, onPress }` | 06–10, 12, 13, 16, 18–22, 24, 26 |
| `lead` | a node, e.g. an avatar | 23 |
| `divider` | a vertical rule between back and title | 19 |
| `trailing` | `{ icons: 1–3 }`, `{ button }` or `{ mark }` | icons: 05 06 08 19–21 23 24 26; button: 09 10 12 13 16 18; mark: 15 22 |
| `below` | a second row above the rule | 05 |
| `fill` | `'surface.1'` | 18 19 24 |
| `rule` | a rule under the bar | 05 06 08 12 13 16 18 24 26 |
| `height` | the element's dp | all |
| `topInset` | set by `Screen`, never by a surface | – |

- **A bilingual title is one heading node.** `inline` is `<Text heading>{text}<Text script="japanese">{' • ' + ja}</Text></Text>`. `stacked` is two lines, the Japanese line in the element's own size and ink.
- **Placement.**
  - `Screen appBar={…}` renders the bar above the scroller, pinned, and moves the top inset into it, so a `fill` runs behind the status bar as 24 and 19 draw.
  - Pinned is what the platform header it replaces does today on every pushed route; scrolling is drawn nowhere (see the undrawn states).
  - The inset stays on the scroller's ancestor side. `layout.test` asserts that content cannot reach the status bar in both shapes, with the F-159 shape as the decoy (E-084).
- **Defaults are recomputed:** `APP_BAR_HEIGHT` (single line, ≈ 46.5, the median of 08 12 13 16 18) and `APP_BAR_STACKED` (24's 57.3).
- **Controls it composes:**
  - back and trailing labelled actions are `Button variant="plain"` with a leading glyph (Decision 5);
  - trailing icons are `IconButton` at the drawn glyph size, the target in the hit area (ADR-0115);
  - a trailing button is `Button` at its drawn height and radius (12's *Save* is `md`, 16's `sm`; the criterion's "pill" is P1's corner);
  - the mark is `Mark`.
- **Criterion 2's scope.** The five named features are built, with the arrangements they sit in on the named screens: leading alignment (05), the fill (24), the mark (22) and avatar lead (23), and `below` (05).
  - Three drawn arrangements outside the named list are also props, because "the variants the mockups draw" is the contract and the list only summarises it: 10's title on its own row, 19's divider, and 06's bar with no title. Each is a subject.
- **No route changes to the new app bar in F-234.** An app bar's elements must sit in the screen's rendered tree for that screen feature's conformance sweep (F-242 onward), so each of the 16 pushed routes changes when its screen feature does.
  - `chrome.test` pins the routes still on the platform header. Each is named with its feature; `profile/measure` names OQ-7.
  - The list may only shrink, and no new route may join it. The decoys are a new unlisted route and a stale entry.

### Decision 3 — The action bar (criterion 3)

- **`ActionBar`** takes:
  - `actions: [Action] | [Action, Action]`, so one or two by type (`@ts-expect-error` for zero and three);
  - `layout: 'row' | 'column'`, `fill?: 'surface.1'`, `rule`;
  - `padding`/`gap` from the element's dp.

  The defaults are the medians over the full-bleed bars (08 10 12 13 17), about 17.5 top, 18.5 bottom, 18 side and 8 gap, measured in increment 1 and recomputed.
- **It keeps the caller's order.** "Primary first" is proved by an inventory test: every drawn bar puts the primary first except 20, which is pinned as the one exception and built as drawn by F-253 (P1; golden rule 14 outranks a summary in the criterion).
- **Placement.** `Screen actionBar={…}` renders the bar as the next sibling after the scroller, in normal flow, never `absolute`.
  - The content ends above it, so it never covers anything.
  - The tab bar is laid out below the scene, so the action bar sits above it. Nothing needs the device inset, because the tab bar owns the bottom edge.
  - The structural test's decoy is an absolutely positioned bar.
- **The tab bar stays under it.** This is a new **§4 E4 row**, from FR-71, F-145's criterion 1 and this criterion's own words. No mockup draws both together, and 16, 22 and 24 draw the OS home indicator where the tab bar would be.
  - Hiding it on pushed screens instead would change F-145 and FR-71: a PRD change, not a layout one, and not an agent's to make (the reasoning of OQ-10).
  - It is named on F-267 for the person comparing screens.
- **03** draws its actions inside the sheet, pinned as its footer (Decision 4): `ActionBar rule={false}` holding *wear* and *add*. The full-width *hold* button beneath is F-244's to place in the same footer. The F-234 subject renders all three, to prove the footer carries them.
- **24's action** is a `plain` button in a `surface.1` bar.
- **20's boxed container** goes to F-253 as a note.

### Decision 4 — The sheet (criterion 4)

- **`form: 'floating' | 'docked'` is required**, because no board draws a sheet to default from.
  - **floating (03):** gorhom `detached`, 28.5 dp side margins, `background`, a 1 dp `border` edge, `lg` on all corners, a 9 dp content inset. The bottom gap is `max(29.5, insets.bottom)`, the same reading as the tab bar (ADR-0118).
  - **docked (04):** `surface.1`, no edge, `lg` at the top, a 12.5 dp content inset, and `sideInset` required by type. F-245 passes it once OQ-16 is answered; the subject uses 04's drawn left inset mirrored, labelled as a test fixture.
- **The handle** is `SHEET_HANDLE`, 40 × 4 (the median of 03 and 04, recomputed), in `border.indicator` (§4 E3), with its top offset per form (5 dp or 9.5 dp).
  - Its accessible name and hint are the caller's `handleLabel`, replacing gorhom's English defaults (ADR-0056).
  - Its role stays `adjustable`, and its target comes through `hitArea`.
- **No visible title.** Neither sheet draws one, so `title` remains the sheet's accessible name only, and the tree asserts there is no title text.
- **No visible scrim.** 03 and 04 draw the frame undimmed. The dismiss layer stays, transparent, named by `closeLabel` with role button. It keeps the shipped tap-outside and screen-reader dismissal without drawing anything (ADR-0118).
- **Detents** stay F-177's: the content height and 90 %, with an 80 % ceiling. **`footer`** is gorhom's pinned footer, which is 03's sticky action bar.
- The sheet is portalled, so it covers the tab bar, as 03 and 04 draw.
- Reading the inset in `overlay.tsx` is added to `verify-viewport`'s allowed files, with a reason and a `--prove` case (E-075).
- **The Lens** passes `form="floating"` and `handleLabel={t('lens.sheetHandle')}`, a new key in both catalogues. Composing 03's contents is F-244's.

### Decision 5 — Buttons the chrome needs (F-232's deferral)

- **`glyph` + `glyphAt: 'leading' | 'trailing'` on the labelled form.** Arrows are trailing, and `plus`, `refresh`, `close`, `help` and `back` are leading, as increment 1 records per element.
- **`variant: 'plain'`:** no fill, no edge, ink `foreground` or `foreground.2` as measured.
- **`variant: 'tonal'`** with `level: 2 | 3` (10, 19, 20, and 03's *hold*).
- **The secondary form's `edge`:** `'border'` (drawn `border.subtle`) or `'border.strong'`.
- The labelled/icon-only split is kept: `icon` stays the icon-only discriminant.

### Consumers, and what they will see (intended)

- **Every tab screen:**
  - words under the glyphs, and a thin rule over the bar;
  - the bar on the page's ground, not on a lifted fill;
  - a longer, lighter indicator, and glyphs at about 18 dp, not 26;
  - on an iPhone, a bar 77 dp tall, not 56 + 34.
- **The Lens sheet** floats with side margins, with no dimming, no visible title, and a longer handle.
- **No other screen changes.** Both `Screen` slots are absent by default, and `screen-insets.json` holds that.

### Increments (each ends green)

1. **Measure and record. No product code.**
   - 01's bar:
     - the rule's thickness and ink;
     - whether the indicator overlaps the rule;
     - the glyph inks, active and inactive;
     - the pitch and side inset;
     - the space under the labels;
     - `raw.filled: true` on `01.tabs.home.icon`.
   - Re-record:
     - all nine tab bars as `ui:TabBar`;
     - every action bar as `ui:ActionBar`, adding containers for 16 and 22, and `03.actions` under `03.sheet`;
     - a new `ui:AppBar` container on each screen that draws a header (02 05–13 15–24 26), with its back, title, subtitle, trailing element and rule re-parented under it. The `.header` elements of 18, 19 and 24 become that container.
   - Measure:
     - each bar's band height, and the back label's ink;
     - each chrome button's `raw.glyphAt`/`raw.glyphPx`;
     - each action bar's padding, gap and fill (08 10 12 13 07 19 20 06 23 22 16 are unmeasured; re-read 10's `#454F58`);
     - the sheet insets and handle offsets.
   - The schema names the new `raw` keys and the three `ui:` components.
   - The tests keyed on component names (`icon-control-forms`, `button-forms`, `illustrations`) are updated in the same increment, their counts re-stated with a reason.
   - Raise OQ-47 in PRD §10, R9 §11 and on F-267, and OQ-48 against F-265.
   - Gates: `generate-inventory.mjs <ids>` clean, `verify-mockups`, `test`, `state`.
2. **Button additions** (Decision 5), with subjects in four palettes and `button-forms.test` extended. Any missing `foreground` on `surface.2`/`surface.3` pairing goes into the manifest, then `generate --check`.
3. **`NavIcon filled`; `TabBar` in `@irodora/ui`; `selection-treatment` learns `indicator`.**
   - The constants are recomputed.
   - Subjects: five active states × four palettes, plus focused.
   - Nothing uses it yet.
4. **Wire the tab bar.**
   - The adapter `src/tabBar.tsx`, `TABS[].activeGlyph`, and `(tabs)/_layout.tsx` on `tabBar`.
   - Drop `tabBarShowLabel`, `TAB_GLYPH`, `TAB_BAR_BASE`, and the route's unused `TAB_BAR_COLORS`/`TAB_LABEL_STEP`.
   - Rewrite `tab-icons.test` as `tab-bar.test`: the F-168 block inverted, plus the adapter's event cases.
   - The "only one tab bar" case in `chrome.test`, and ADR-0117.
   - `generate-e2e-flows --check` still resolves `tab-atlas`.
5. **`AppBar` + `Screen appBar`.**
   - Subjects for 02 05 06 08 10 12 16 19 22 23 24.
   - `layout.test`'s structural inset cases in both shapes.
   - The native-header ratchet in `chrome.test`, with all 16 routes pinned.
6. **`ActionBar` + `Screen actionBar`.**
   - Subjects for 08 12 17 19 22 24.
   - The structural and type tests, and the "primary first" inventory test with 20 pinned.
   - The §4 E4 row.
7. **The sheet** (Decision 4).
   - `verify-viewport`'s allowed file and its proof case.
   - The Lens call site and its key.
   - `sheet.test` gains the form, handle, title-absent, dismiss-layer and footer cases, with every F-177 case kept.
8. **Close-out.**
   - ADR-0118 and the ADR index.
   - R9: §4 E4; §6 C1 ("labels returned by F-234, ADR-0117"); §10 (F-168 superseded); §11.
   - DESIGN-SYSTEM.md.
   - Effects E-164…E-167 with memory notes, and updates to the existing links.
   - Notes to:
     - F-242–F-263 (compose `AppBar`/`ActionBar`, and remove their ratchet entry);
     - F-243, F-244 and F-245 (sheet forms; OQ-16);
     - F-253 (20's order and boxed bar);
     - F-256 (the keyboard);
     - F-267 (OQ-47, and the E4 row).
   - `progress.md`.

## Mockup fidelity

- **Governing:**
  - the tab bar is `01` (C1, P5), with `25` only for light values (C2);
  - each app bar and action bar is its own screen's (P1);
  - the sheet is `03` and `04`, each its own state;
  - no board applies (P3).
- **Bindings:** the tab words come from the catalogue. All other copy is the caller's (ADR-0056). F-234 adds only `lens.sheetHandle`.
- **Contradictions settled:**
  - *Lens Camera* becomes *Lens* (C1).
  - 25's `level1` bar, `text.tertiary` inactive tabs and missing indicator give way to 01's structure with 25's values (C2), as F-233 did for card edges.
  - The superseded bars' single labels give way to 01's five (C1).
  - 03 against 04: each its own (P1).
  - The criterion against 20's order, 03's three buttons, 24's text action and the `md`/`sm` corners: rule 14, built as drawn.
- **Departures:**
  - **E4, new:** the tab bar persists under an action bar (FR-71).
  - **E3:** tap targets through the hit area (tab items, the handle, back labels, trailing icons), and `border.indicator` for the handle.
  - Not built, by rule: status bars, home indicators, and 01's leaked *Lens Camera*.
- **Readings closed by ADR under the delegation:** the bottom inset absorbed into the drawn space (ADR-0117, ADR-0118). The invisible dismiss layer is not a visible departure: its behaviour is the one already shipped.
- **Deferred to a person:** OQ-47, OQ-48, OQ-16 (the docked width) and OQ-7 (`measure`'s app bar).

## Anticipated effects

**Existing links touched:**

| link | what changes | guard |
|---|---|---|
| E-007 | the bar paints `background`, `border`, `foreground` and `foreground.2`, not `surface.1`/`accent`; tonal fills | gate contrast, `generate --check` |
| E-075 | a third file may read the inset (`overlay.tsx`) | `verify-viewport --prove`, with a new case |
| E-084 | the top inset can live on the app bar | `layout.test` structure, with the F-159 decoy |
| E-140 | `Screen` gains two slots, absent by default | the sweep, `screen-insets.json` |
| E-081, E-134 | `NavIcon filled` reaches `Glyph`; `tree.ts` reads the SVG fill | a11y, `glyphs.test` |
| E-080 | `selection-treatment` learns `indicator` | the colour-only decoy |
| E-151 | new focusable items | the focus cases, extended |
| E-099 | the adapter lives in `src/`, with no runtime `expo-router` import | the lint boundary, `verify-guards` |
| E-069 | the portal and fake-timer harness rules hold for the new sheet subjects | – |
| E-157 | gains the `TAB_*`, `APP_BAR_*`, `ACTION_BAR_*` and `SHEET_HANDLE` defaults | the recompute tests, each with a decoy |
| E-163 | component re-records | the name-keyed tests |
| E-128 | inventory edits | `verify-mockups` |
| E-063 | route files | `verify-route-targets` |

**New links:**
- **E-164:** the chrome components → `Screen` slots → the screen features F-242–F-263. Guard: the conformance sweep, `layout.test`, and the `chrome.test` ratchet.
- **E-165:** `src/tabBar.tsx` ↔ React Navigation's `tabPress` contract and the e2e ids. Guard: the adapter tests and `generate-e2e-flows --check`.
- **E-166:** `Sheet`'s `form` and its inset read → the Lens (F-243, F-244, F-245) and `verify-viewport`. Guard: `sheet.test` and the viewport proof.
- **E-167:** the governing inventory's `raw.filled` → `TABS[].activeGlyph`, so OQ-47's answer changes data, not code. Guard: `tab-bar.test`.

## Test plan

- **Recomputed defaults:** each constant against its inventory, each with a decoy:
  - `TAB_GLYPH` against 26;
  - `TAB_CONTENT`/`TAB_BELOW` against 56;
  - `TAB_INDICATOR` against 16 × 2;
  - `APP_BAR_*`, `ACTION_BAR_*` and `SHEET_HANDLE` against 7.5 % of the window.
- **Tab bar:**
  - An active item paints the indicator and the `foreground` ink; colour alone is reported (the decoy).
  - An inactive item paints neither.
  - Every label has `numberOfLines={1}`, with a wrapped label as the decoy.
  - The word is both drawn and announced.
  - `activeGlyph` is `filled` only where the governing inventory records it; `lens: 'filled'` is the decoy.
  - The adapter: an inactive press emits and navigates; an active press emits only; a prevented event does not navigate (the decoy).
  - There is exactly one `Tabs` from `expo-router`; a planted second is the decoy.
- **App bar:**
  - The title has the heading role, as one node holding both scripts, the Japanese run in the Japanese face.
  - Back and trailing controls are named.
  - The bar sits outside the scroller (the decoy is inside).
  - A fill paints behind the top inset.
  - `back` with `lead`, and four icons, are refused by type.
- **Action bar:**
  - It is the next sibling after the scroller, never `absolute` (the decoy is absolute).
  - One or two actions by type (`@ts-expect-error` for zero and for three).
  - The primary comes first everywhere except 20.
- **Sheet:**
  - `form` is required by type, and the docked form requires `sideInset`.
  - The floating form is detached, with the drawn margins and gap; the docked form is not.
  - The dismiss layer paints no colour yet is a named button (the decoy paints `backdrop`).
  - No title text is in the tree (the decoy is present) while the container carries the name.
  - The handle is 40 × 4 in `border.indicator` with the caller's label (the decoy is gorhom's English default).
  - Every F-177 detent case is kept, with its finder decoys.
- **Ratchet:** an unlisted route and a stale entry are both reported.
- **Conformance:** every new form and state, in four palettes and both locales.
- **Golden:** none. No colour value is computed.

## Verification

Run each gate separately and record the printed exit code. Never grep a summary line.

```
node scripts/verify-state.mjs; echo state=$?
pnpm typecheck; echo typecheck=$?
pnpm lint; echo lint=$?
pnpm format:check; echo format=$?
pnpm test; echo test=$?
pnpm build; echo build=$?
pnpm test:a11y; echo a11y=$?
pnpm test:contrast; echo contrast=$?
pnpm test:cvd; echo cvd=$?
node scripts/verify-mockups.mjs; echo mockups=$?
node scripts/verify-viewport.mjs --prove; echo viewport=$?
```

There is one evaluator review at the end. Its findings are fixed or recorded as `backlog`, and the gates are re-run.

**Criterion → proof:**
- **1:** `tab-bar.test` (both apps), `chrome.test`, ADR-0117.
- **2:** `app-bar.test` and its subjects.
- **3:** `action-bar.test`, `layout.test`, and the E4 row.
- **4:** `sheet.test` and its subjects.

**Not run:** `e2e` (gate 7 is pending; there is no device or JDK).

**Owed attestations, on a device:**
- The Atlas journey through the new bar (`tab-atlas`).
- VoiceOver and TalkBack announce "tab, n of 5" and the selected tab.
- No label wraps, in English and Japanese, at 360 and 384 dp, at 1× and 200 % (A7). Record where `プロフィール` truncates.
- The tab bar's height with the iPhone home indicator, and with Android gesture and three-button navigation.
- The floating sheet clears the home indicator, drags between its detents, leaves the live camera visible, and dismisses on a tap outside.
- The end of a scroll is never under an action bar.
- The hit areas on the tab items and the handle (with F-305).

## Risks and open questions

- **OQ-47 (raised; blocks F-267, not F-234):**
  > *"01, the governing tab bar, draws only Home active, its glyph filled. What does an active Atlas,
  > Lens, Wardrobe or Profile tab draw: (a) its outline glyph with 01's indicator and ink; (b) a
  > filled glyph — lens and profile have filled drawings only on the tab bars C1 supersedes (02, 15,
  > 18), and atlas and wardrobe have none; or (c) no fill on any tab, Home included, departing from
  > 01?"*

  (a) ships until it is answered.
- **OQ-48 (raised against F-265):**
  > *"In the Japanese locale, what does an 'English • 日本語' title show, and the two-line
  > English-over-Japanese title? 26 draws a Japanese-only title, but 06, its English original, draws
  > no title, so no pair exists to compare."*
- **The E4 reading could be challenged.** The drawings arguably show no tab bar on those screens. That reading is named on F-267 for a person, never taken as a quiet hide.
- **Truncated labels** in Japanese and at 200 % are stated in ADR-0117 and attested. A shorter Japanese word is a copy decision for a person.
- **Undrawn states, and what ships** (none is designed):

  | state | what ships | basis |
  |---|---|---|
  | a disabled action | F-232's treatment | F-232 settled it |
  | the keyboard over the action bar or a sheet | unchanged (no avoidance anywhere today) | a note to F-256 |
  | the app bar on scroll | pinned | the platform header it replaces |
  | a route with no drawn app bar | `measure` keeps the platform header | OQ-7 |
  | the tab bar while a sheet is open | covered by the sheet | as 03 and 04 draw |

- **Found on the way:** gorhom's English handle copy reaches the Lens today (ADR-0056). Probe whether HeroUI overrides it, and fix it in increment 7.
- **10's tonal fill** was read as `#454F58`, far from any level. Re-measure it before choosing its `level`.
- **The docked sheet's width** waits on OQ-16 (F-245); the subject's width is a test fixture.
- **JPEG readings** carry ΔE00 ≈ 2 and ±0.5 dp; framed images are ±1 dp.

## Out of scope

- Composing any screen, or moving any route to `AppBar`/`ActionBar`. That is each screen feature's work, held by the ratchet.
- 03's and 04's sheet contents (F-244, F-245), and the docked width (OQ-16).
- 20's boxed action container (F-253).
- The in-page `Tabs` on ColourDetail (F-247).
- 05's chip row contents, 23's avatar data and 06's bookmark (F-246, F-260, F-237).
- Pressed states (F-304).
- Any colour value, golden dataset or corpus change.

## Status (implementing session)

| inc | commit | what landed |
|---|---|---|
| 0 | `e92870c` | Claimed, and this plan. |
| 1 | `b0554d7` | Every header recorded as a `ui:AppBar` container on 21 screens, its elements re-parented; the band from each screen's own elements (top: the status bar's bottom or the frame's; bottom: the rule or fill where drawn, else symmetric about the elements, clipped at the content below). Tab bars `ui:TabBar`, action bars `ui:ActionBar`, with containers added for 03 (inside the sheet), 16 and 22. 01's bar measured: the rule 2 px (one dp of `border`), the indicator 4.5 px of #FAFBFD directly under it, active glyph ink #FAFDFF and inactive #ACAFB4–#AFB2B5, home's glyph filled (70 % of its box bright against 37 %), 35.5 dp under the labels. 10's tonal fill re-read: #464F58 is `border.strong` (ΔE00 3.43), not `level2`. OQ-47 (on F-267) and OQ-48 (on F-265) raised. **Changed from the plan:** each chrome button's `glyphAt` is not recorded per element; the drawn set follows one rule (an arrow trails its label, every other glyph leads), which 03's child boxes show and increment 2's test holds. |
| 2 | this commit | `Button`: `glyph`, `glyphAt` (`glyphSide`: an arrow trails, every other glyph leads, held against every drawn chrome button and 03's child boxes), `glyphSize` (the label's type size by default, a stated convention: only 03's two button glyphs are measured); `variant` `plain` (no fill, edge or padding; `ink` `foreground` or `foreground.2`) and `tonal` (`level` 2 or 3); the secondary's `edge`. Each form's props are refused on another by type. Subjects in four palettes. **Not built:** a tonal fill in `border.strong` for 10's export button: in the light palette `border.strong` is the ink colour, 10 is drawn only dark, so its light ink is undrawn — a note to F-251 and F-264. No new pairing was needed: `foreground` on `surface.2`/`surface.3` is declared. |
