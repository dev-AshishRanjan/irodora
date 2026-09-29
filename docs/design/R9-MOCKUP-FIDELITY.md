# R9 — Mockup fidelity

| | |
|---|---|
| **Release** | R9 — the product UI is rebuilt against [`mockups/`](../../mockups/) |
| **Features** | `F-218` … `F-270` in [`feature_list.json`](../../.harness/state/feature_list.json) |
| **Inputs** | mockups `00`–`27` · the token table in [`mockups/README.md`](../../mockups/README.md) · [`mockups/AGENTS.md`](../../mockups/AGENTS.md) |
| **Decided by** | the user, 2026-09-10: *"no deviation from the mockups — we strictly need to materialise the mockup in our code"* |
| **Date** | 2026-09-10 |

---

## 1. The contract

The mockups are the specification for **everything a person can see**. This document turns
"no deviation" into something a check can hold the product to, and lists — exhaustively — the
only places the product departs from a mockup.

**Every departure falls into one of four closed categories (§4), and each one is forced**: by a
golden rule that no scope may relax, by a blocking gate that may not be lowered, by two mockups
that contradict each other, or by a PRD capability no mockup draws. **There is no discretionary
category.** A feature that departs from its mockup for any reason not listed here is not done.

Where this document states a default decision on a contradiction, the default is a rule applied,
not a taste exercised — and §6 marks which ones the user can flip.

---

## 2. What "strict" means, measurably

**Per element**: presence · order · grouping · alignment · proportion · size · typeface and weight
· colour token · radius · border · icon · illustration · copy structure (which text sits where,
in which script).

**Measurement.** A full-bleed mockup is measured at **2 px = 1 dp** — its 768 px width is a
**384 dp** reference screen. A framed mockup (device bezel or spec card: `04 06 07 19 21 22 23 24
25 26`) is measured against the frame's inner screen width, scaled to 384 dp. A measured value
snaps to the nearest step of the R9 scale (§5); where two steps are equally near, the smaller is taken (`F-220`): text set a step smaller still
fits the box the mockup draws, and text set a step larger may not. **Siblings drawn alike** — the
same element in each card, row or tile of one image — take one step, the one most of them snap to
(a tie again takes the smaller), so a record never sets two identical things at two sizes.
`raw.emDp` keeps each element's own estimate.

**Not design — never materialised:**

- device bezels, and status bars drawn into the render (`9:41`, a carrier named "Irodora");
- annotation callouts and their leader lines (`04 06 21 25`);
- labels that leaked from the generation prompt: *"HeroUI Card level="2""*, *"HeroUI Action
  Grid"*, *"100px"*, *"72px"*, *"Tab Bar"*, *"Top Navigation"*, *"Sticky action bar"*, *"Search &
  Faceted Filter Section"*, *"Category segmented choice"*, *"Material choice chips"*, *"Formality &
  season pills"*, *"Interactive 4-slott canvas"*, route strings printed under titles;
- misspellings and garbled text (*"Toggle Switche"*, *"Sutions"*, *"Formall"*, *"palalettes"*,
  *"coliurs"*, *"Teaser for iur typography"*, the unreadable lines in `18`'s report preview);
- line-art drawn **outside** a device frame. Line-art **inside** the screen is design.

**Pixels and tokens agree.** The README token table is the declared value; the rendered pixels
were measured (dominant colours, 6-bit quantised) and match it within JPEG noise:

| surface | declared | measured in the renders |
|---|---|---|
| dark ground | `#15171B` | ≈ `#181B20` (`01 06 13 15`) |
| dark card | `#20232A` | ≈ `#20242A` (`06 13 15`) |
| light ground | `#F6F5F2` | ≈ `#F6F6F2` (`25`) |
| light card | `#FFFFFF` | ≈ `#FEFEFE` (`25`) |

---

## 3. Precedence — how a contradiction between mockups is resolved

Applied in order. A feature never resolves a contradiction on its own.

| | rule |
|---|---|
| **P1** | A screen's **primary** mockup governs that screen's layout and composition. |
| **P2** | A **variant** mockup governs only the dimension it exists to show: `25` the light palette, `26` Japanese copy and Japanese typography, `27` state content, `14` icon and splash. |
| **P3** | Board `00` governs how a component is **built** where no screen shows it. A screen beats the board for how the component looks on that screen. |
| **P4** | The README token table governs **token values** (§2 shows the pixels agree). |
| **P5** | An element drawn differently on several screens with no primary (tab bar, app bar, lockup) takes the variant that matches the app's information architecture **and** appears on Home `01`. |

---

## 4. The four exceptions

### E1 — Mockup content is sample content

Every name, hex, value, count, date and provenance line in a mockup is **sample content**. The
slot is materialised exactly; what fills it comes from the engine, the corpus or the store.
[Golden rule 12](../../AGENTS.md), FR-23, FR-24 and [`content/AGENTS.md`](../../content/AGENTS.md)
rule 3 make this non-negotiable, and the mockups show why:

- **Thirteen colour names** — Ai-nezumi, Tetsu-kon, Kachi-iro, Moegi, Toki-iro, Jinza-momi,
  Koke-iro, Uguisu-cha, Nureba-iro, Shiro-neri, Gin-nezumi, Kuchiba, Sabi-asagi — and more in
  `19 21 24` (Sabi-asagi, Tetsu-onando, Minato-nezumi, Ai-iro, Midori-cha, Asagi-iro, Kariyasu,
  Benitobi): **none is in [`content/colors`](../../content/colors)**, whose 120 entries are all
  `japanese-inspired` and **none claims an era**.
- **Provenance that does not exist**: `06` *"Sourced from Edo period dyeworks manuscript
  (1842)"*, `20` *"Edo Period Dye Formula (1842)"*, `10` *"Heian Verified"*. The slot shows the
  entry's real provenance ([ADR-0065](../adr/0065-the-seed-corpus-is-coined-not-canonical-and-constructed-not-measured.md)).
- **"伝統色" — "traditional colour"** — in `05` (日本の伝統色), `26` (伝統色の詳細,
  Irodora伝統色コーパス) and `01` (*"Today's Traditional Color Card"*). FR-23: *"the UI never
  presents an inspired palette as historical."* The heading keeps its place and length; its
  words state the real classification.
- **Numbers that do not survive checking**: `#5B6B78` is printed as CIELAB `45.2 / -3.4 / -8.1`
  (it is `44.37 / -2.85 / -9.23`) and OKLCh `0.490 / 0.035 / 240.2°` (it is `0.519 / 0.028 /
  242.7°`); its "Display-P3" triplet is the sRGB values ÷ 255, not a P3 conversion; `05` renders
  `#EB6EA5`, a light pink, as deep crimson.

### E2 — A drawn claim the product cannot demonstrate

The element keeps its shape, position and style. Its **wording or value** comes from a defined
computation ([golden rule 11](../../AGENTS.md), NFR-21, [ADR-0031](../adr/0031-measurement-claims-policy.md)).

| mockup | drawn | resolution |
|---|---|---|
| `03` | *"97% Match"*, *"92%"*, *"88%"* beside ΔE00 | no such figure exists and FR-7 says naming returns a closest reference, never a match — **OQ-9** (claims-ok: quotes the drawn construction this row resolves) |
| `03` | *"Ranked Japanese Corpus Matches (ranked by ΔE00)"* | FR-7 returns the nearest references ranked by ΔE00, never a match; the heading names them as nearest references (claims-ok: quotes the drawn construction this row resolves) |
| `07` `13` | *"94% Match (Cool-Muted profile)"*, *"92% (Cool-Muted Match)"* beside the personal-fit score | the FR-29 score stays; "Match" to a seasonal type does not (C12, `F-223`) (claims-ok: quotes the drawn construction this row resolves) |
| `04` | *"Very Close Match"* | the ΔE00 descriptor band stays; "Match" does not (FR-74: *"it never asserts a match"*) — bands defined in `F-222` |
| `02` | *"Excellent Exposure"* | the capture-conditions assessment the engine produces (FR-17), in its own words |
| `07` `16` | *"6.2:1 (APCA Passed)"*, *"11.4:1 (APCA Passed - AAA)"* | the same element shows the WCAG ratio **and** the APCA Lc as two figures — APCA has no ratio (FR-3) |
| `00` `10` `15` `16` | *"100% CVD Safe"*, *"CVD 100% Distinction"*, *"100% CVD-Safe"*, *"100% Distinguishable"* | the computed separation score (FR-5) for the palettes actually shown; it prints 100 only when it is 100 (claims-ok: quotes the drawn construction this row resolves) |
| `07` `08` `13` | *"98% Separation (Protan/Deutan Safe)"*, *"(Safe)"* after each separation figure, *"98% (Safe for Protan/Deutan)"* | the computed separation (FR-5) with the model it was computed under; "Safe" is a claim about people and does not ship (claims-ok: quotes the drawn construction this row resolves) |
| `13` | *"Master Harmony"* | **OQ-9** (claims-ok: quotes the drawn construction this row resolves) |
| `08` `13` | *"1.48:1 • Non-Text / Harmonious Pairing"*, *"90% (APCA Lc 48 • Optimal)"* | the figures stay — the ratio, the Lc and the threshold they pass; the one-word verdict after them does not (FR-32, FR-3), and a pair shows its harmony relationship (FR-6) where it has one (claims-ok: quotes the drawn construction this row resolves) |
| `04` | *"(Identical Hue)"* | the ΔH figure and its descriptor band; FR-74 never asserts identity. Outside `F-219`’s five classes, so this row and `F-245` hold it, not the lint |
| `02` `27` | *"色の測定"*, *"Measurement Refused"* | a camera estimate is never called a measurement (golden rule 11, E-089): the Lens is an estimate in both languages, and the refused state names a reading. Outside `F-219`’s five classes; held by this row, `F-243` and `F-236` |
| `18` | *"Museum-grade CJK PDF Report"*, and again in lowercase in its description | a factual descriptor of the same length — grade language is banned by `F-219` (claims-ok: quotes the drawn construction this row resolves) |
| `27` | *"Extracting reflectance spectra…"*, *"Calibrating illuminant: D65 (5500K)"* | a phone camera measures no reflectance spectrum, and D65 is ≈6504 K (5500 K is D55). The lines name the pipeline's real steps (claims-ok: quotes the drawn construction this row resolves) |

`F-219` extended the claims lint to the rows above that are **claims** — the percentage offered as a
match, the absolute CVD-safety wording, the verdict on a score, the borrowed grade, the
spectrum the camera never takes — in English and Japanese. What that means is exactly two lists:
the lint refuses every line of [`drawn.md`](../../packages/testing/fixtures/claims/drawn.md) — each
construction of those five classes drawn inside a screen or on a component, found by reading all 28
images, verbatim — and every line of [`variants.md`](../../packages/testing/fixtures/claims/variants.md),
their forms in both languages, and the claims proof fails the build if it misses one;
[`near-misses.md`](../../packages/testing/fixtures/claims/near-misses.md) holds the honest copy it must
leave alone. A phrasing in none of the lists is not known to be caught; it is added to `variants.md`
before any pattern is widened. **What a source lint cannot see:** a figure and a label composed at
render time — the catalogues hold them apart — so `F-221` runs the same patterns over the text of
every capture. The other rows (`04`’s descriptor and hue, `02`’s exposure and title, the APCA ratio
in `07 16`, the illuminant and the refusal heading in `27`) fall outside `F-219`’s five classes: each
is resolved by binding the element to a defined value, and each is a departure in its feature’s
record.

### E3 — Accessibility floors that are blocking gates

NFR-8 (WCAG 2.2 AA) is enforced by gate 9, and a threshold may not be lowered to go green. The
mockup palette fails it in the places below. **Each token moves the smallest lightness step that
passes on the worst surface it is drawn on, hue and chroma held.** The step is OKLab's. This rule
first said "CIE L\*", and its published values turned out to be OKLab's (see the adopted table
below).

| token | mockup | fails | smallest passing | moved by |
|---|---|---|---|---|
| dark `text.tertiary` on cards | `#768290` | 4.02 · 3.57 · 3.05 :1 on level 1 · 2 · 3 | `#94A1AF` (4.53:1 on level 3) | ΔE00 10.43 |
| light `text.tertiary` | `#8C96A5` | 2.33–2.99 :1 everywhere | `#5D6674` | ΔE00 18.55 |
| dark `border.strong`, **where it is the only indicator of a state** | `#464D5B` | 2.11:1 on ground | ~~`#5C6472`~~ **`#788090`**, carried by `ring` and `border.indicator` | ~~ΔE00 8.12~~ **ΔE00 19.13** |
| light `ring` (added by `F-225`) | `#1A1B1E` | cannot separate from `border.strong`, which is the same colour, under gate 10's `[ring, border.strong]` pair | `#3A3B3E` | ΔE00 10.17 |

**Row 3 is corrected by its own rule.** `#5C6472` was measured on the ground only, and it is the
value §4 published (2026-09-14). Focus also lands on levels 1–3, where `#5C6472` fails
(2.0–2.64:1). Applying the rule as written, to every surface the indicator is drawn on, gives
`#788090`. The gate forces that value, so it is not a new choice. But it is not the number that
was approved, so `F-267` carries it for a person to confirm.

Dark `text.tertiary` on the **ground** passes (4.59:1) and keeps the mockup value there. Dark
`border.strong` where a label also identifies the component is decorative and keeps its value;
`inventory-pairings.test.ts` checks the label element by element. **Where nothing else identifies
the component**, the sheet's drag handle in `03` and `04`, the token is `border.indicator`. It takes
the row-3 move on Sumi and keeps the drawn ink on Washi. Every other mockup token passes as drawn.

**As adopted by `F-225` ([ADR-0111](../adr/0111-the-palette-is-the-mockups-and-a-sample-is-judged-against-the-surface-it-sits-on.md)), with every move and the space it is made in.**
The rule above says "CIE L\*". **The three values it publishes are OKLab's**: `smallestLightnessMove`
gives `#94A1AF` and `#5D6674` in both spaces, but the third row is `#5C6472` in OKLab and `#5D6472`
in CIE L\*. OKLab is the space the manifest stores, so every move is made there and records
`space: "oklab"`. Each value is computed by the search and judged by the gate's own checker, not
typed.

| theme | token | drawn | as shipped | forced by |
|---|---|---|---|---|
| Sumi | `foreground.3` (ground) | `#768290` | `#768290` | nothing: 4.59:1 passes |
| Sumi | `foreground.3.card` | `#768290` | `#94A1AF` | row 1 |
| Sumi | `border.strong` | `#464D5B` | `#464D5B` | nothing: decorative, a label identifies the component |
| Sumi | `border.indicator` (the sheet handle) | `#464D5B` | **`#788090`** | row 3: the handle has no label, and the drawn value is 2.11:1 on the ground a sheet sits on |
| Sumi | `ring` | `#464D5B` | **`#788090`** | row 3 **as corrected**: `#5C6472` was measured on the ground only, and focus also lands on levels 1–3 (2.0–2.64:1 there). The same rule over those surfaces gives this value (F-225 decision A) |
| Washi | `foreground.3`, `foreground.3.card` | `#8C96A5` | `#5D6674` | row 2 |
| Washi | `border.indicator` | `#1A1B1E` | `#1A1B1E` | nothing: the drawn ink passes |
| Washi | `ring` | `#1A1B1E` | **`#3A3B3E`** | a **fourth row**. The drawn value is also `foreground` and the primary action, so gate 10's `[ring, border.strong]` pair cannot separate. This is the smallest lightness step that does (F-225 decision B) |
| Slate | `foreground.2` | `#A6B0BC` | `#BFC9D5` | on level 2: 4.14:1 < 4.5 |
| Slate | `foreground.3` | `#768290` | `#8D9AA8` | on its ground: 3.30:1 < 4.5 |
| Slate | `foreground.3.card` | `#94A1AF` | `#BCCAD8` | on level 1: 4.02:1 < 4.5 |
| Slate | `ring`, `border.indicator` | `#788090` | `#9CA4B4` | on level 1: 2.67:1 < 3 |
| Slate | `status.ok` | `#49AB79` | `#69C995` | on level 1: 3.73:1 < 4.5 |
| Slate | `status.warn` | `#D58D25` | `#F2A847` | on level 1: 3.86:1 < 4.5 |
| Slate | `status.bad` | `#FEAAAC` | `#FECACA` (L 0.884, **C 0.060**) | the two moves above leave `status.ok / status.bad` at 29.5 under deutan (< 60). **No lightness-only move exists**: of the 256 lightness-only combinations that pass contrast (39,114 in gamut, on a 0.01 grid), none is clean (`mockups/tools/slate-status-search.mjs`). So the smallest-ΔE00 move with **hue held** is taken, lightness and chroma free (ADR-0111 §5) |
| Obsidian | none | | | every pairing passes as derived |

Slate's and Obsidian's "drawn" column is ADR-0107's derivation, since neither theme's roles are
drawn. The moves live in the manifest's `themeDerivations` and are recomputed by
`generate-design-tokens.mjs`, and `--check` fails if they drift. **The device colour**
(`seed.ts`) applies the same rule at runtime, in its own theme only, and reports each move as a
floor correction. All 720 hue-and-mode seeds apply.

**Tap targets** meet 44 dp (iOS) / 48 dp (Android) through the hit area, not the drawn size — the
chip stays the size the mockup draws.

### E4 — A required capability no mockup draws

Preserved, built from the mockup's own components, and listed here so it is visible:

- **FR-70** — *system* appearance and the *device accent* theme. `15` draws four theme tiles only.
- **FR-61** — `profile/measure`, the colorimeter entry and the ΔE00 table. **No mockup — OQ-7.**
- **FR-14** and the calibrated-card flow — `02` draws the mode pills, no mockup draws the states
  behind *Garment Scan* or *Calibrated Card*. **OQ-8.**
- **FR-52** — the personal-compatibility score and the investment signal. `22` draws four tiles
  and neither of them. **OQ-10** — dropping them is a PRD change, not a layout one.

---

## 5. Tokens

**Dark** (`Sumi Charcoal`, the default) and **light** (`Washi Minimal`) take the README table
exactly, except the E3 moves. **Adopted by `F-225`
([ADR-0111](../adr/0111-the-palette-is-the-mockups-and-a-sample-is-judged-against-the-surface-it-sits-on.md))**,
and a test reads the table out of the README and holds the manifest to it. The mockup ramp exceeds
the old `chromaCeiling` of `0.01` (C 0.0086–0.0256, h ≈ 264°), so the ceiling is re-stated at
**0.026**: the largest chroma drawn in chrome, rounded up, and recomputed by that test.

| | dark | light |
|---|---|---|
| ground | `#15171B` | `#F6F5F2` |
| level 1 | `#20232A` | `#FFFFFF` |
| level 2 | `#282C35` | `#EEEDE8` |
| level 3 | `#323742` | `#E5E3DE` |
| border.subtle | `#2E333D` | `#E5E3DE` |
| border.strong | `#464D5B`, decorative; the state is `ring` `#788090` (§E3) | `#1A1B1E`; `ring` `#3A3B3E` (§E3) |
| keyline | `#FFFFFF22` (`swatch.keyline`; the hairline stays until `F-233` draws it) | `#1A1B1E18` |
| text.primary | `#F7F8FA` | `#1A1B1E` |
| text.secondary | `#A6B0BC` | `#5C6470` |
| text.tertiary | `#768290` on ground (`foreground.3`), `#94A1AF` on cards (`foreground.3.card`) (§E3) | `#5D6674`, both tokens (§E3) |
| primary action | `#FFFFFF` pill, dark text | `#1A1B1E` pill, light text (`25`) |

**Themes** are the four `15` draws: *Sumi Charcoal* (`#15171B`), *Slate Graphite* (`#2C323A` — no
mockup prints it; `F-220` read it at the centre of `15`'s tile, and a colour read from a render carries
ΔE00 ≈ 2), *Obsidian Noir* (`#101114`, printed on its tile; read as `#101115`, within that noise), *Washi Minimal*. The `fuka`, `yama`
and `aota` families are **removed by `F-225`** (ADR-0111), and a stored choice is read by the mode it chose. *System* and *device accent* stay (E4).

**Answered 2026-09-24 ([ADR-0107](../adr/0107-slate-and-obsidian-are-sumis-drawn-steps-re-anchored-at-their-drawn-grounds.md), OQ-36 closed on the person's delegation):** each tile draws its theme's **ground**. Sumi's swatch reads `#171A1E` against its ground `#15171B` (card `#20232A`), and Washi's reads `#F3F2ED` against `#F6F5F2` (card `#FFFFFF`). The ramps below are adopted as the rule produces them, and a pairing that fails moves the E3 way, in that theme only. **`F-225` implements it**: Obsidian needs no move, and Slate takes the eight listed in §4 E3. The four Sumi failures described below are gone. `border.strong` is decorative, `ring` carries the state at `#788090`, and `swatch.well` is level 1 (C11).

**What the two undrawn themes would be, and what the numbers actually say (`F-289`, OQ-36).**
`15` draws Slate Graphite and Obsidian Noir as one swatch each, so their levels are drawn
nowhere. Running OQ-36's own proposed derivation — Sumi's lightness steps above its ground,
re-anchored, chroma and hue carried from Sumi's corresponding step, everything else held — gives:

| | ground | level 1 | level 2 | level 3 |
|---|---|---|---|---|
| Sumi Charcoal (drawn) | `#15171B` | `#20232A` | `#282C35` | `#323742` |
| Slate Graphite (derived) | `#2C323A` | `#3B3F46` | `#444952` | `#4F5460` |
| Obsidian Noir (derived) | `#101114` | `#1A1D24` | `#22262E` | `#2B303B` |

**Obsidian introduces no failure. Slate introduces seven**, two of them between tokens this table
specifies (`foreground.2` on level 2 at 4.12 where 4.5 is required, passing at `#AEB8C4`;
`border.strong` on the ground at 2.17 where 3 is, passing at `#727B89`). **And Sumi itself fails
four** — `border.strong` reaches 2.0–2.64 against levels 1–3 and `swatch.well` where 3 is
required — which is `F-225`'s fifth criterion on the theme that IS fully drawn, and is worth
answering before OQ-36 is.

**What those numbers do and do not rest on**, because the first version of this block claimed more
than the run supports and `F-289`'s review said so:

- **Measured with `checkContrast` and `checkSeparation`** — the checker functions themselves, not
  a ratio rewritten for the occasion. That is *the contrast pairings and the CVD pairs*, **not
  "gates 9 and 10"**: gate 9 is also `checkChromaCeiling`, `checkStructure`, `checkSalience` and
  ADR-0043's derived-hex check, and none of those ran.
- **The CVD result says nothing about the derivation.** No `cvdPair` contains a token the ramp
  moves, so all three palettes return the same twelve numbers. They pass; that is a fact about
  the status colours, not about these themes.
- **"Seven" assumes §4/E3's conditional `#5C6472` for `border.strong`**, applied to the token
  everywhere. With the value this table carries (`#464D5B`) it is **six introduced for Slate, none
  for Obsidian, and five inherited by each** — `--drawn` measures that.
- **"Seven" is not robust to Slate's own read error.** Its ground came off a JPEG at ΔE00 ≈ 2;
  moving it along L within that band gives 6 introduced at ΔE00 1.6 below and 11 at ΔE00 1.6
  above. Obsidian's ground was printed on its tile and holds at 0 across the same band. **The
  qualitative result survives and the count does not.**
- **34 of the 48 pairings have at least one token this table does not specify** (25 with one side,
  9 with neither): `status.*`, `ring`, `accent`, `chart.*` and `swatch.well` are held at their
  pre-R9 values, tuned against the old `#12100F` ground. `F-225` owes those a re-tune for every
  theme including Sumi, so "Obsidian introduces zero" is a statement about a palette that is
  three-quarters unfinished.
- **`text.tertiary` has two values here and the token has one.** The measurement holds the cards
  value (`#94A1AF`) on the ground too, which is the more generous of the pair; with the on-ground
  `#768290`, Slate's `foreground.3` on ground is 3.30 against a largeText 3 rather than 4.91. No
  verdict changes, and Slate's margin there is thinner than the run prints.
- **`border.subtle` is mapped onto the `border` token, which was translucent then** (F-225 made it
  the opaque `#2E333D` the README draws) and declares no
  pairings, so that assignment is checked by nothing; the `keyline` row has no token at all.

Reproduce: `node mockups/tools/derive-theme.mjs` (add `--drawn` for this table's `border.strong`,
`--json` for the per-pairing numbers and the sensitivity rows).

**Radius**: `sm 6 · md 10 · lg 16 · pill`. **Spacing**: `4 · 8 · 16 · 24 · 32 · 48` — still a
4-point grid. **Type** (board `00`): *Display 1* 72 and *Title* 22 in a serif; *Body* 16 and
*Label* 14 in the sans; tabular figures for every number. **Adopted by `F-226`**
([ADR-0113](../adr/0113-the-type-scale-is-board-00s-four-steps-and-a-measured-caption-and-off-scale-type-snaps.md)): the scale is those four steps plus a **`caption` at 10.3**, the
measured median of every em the mockups draw below 12 dp (OQ-12). **Which governs type a screen
draws off the scale — its drawn size or the nearest step — is OQ-13, still open.** **The serif ships as Gelasio Regular at no tracking, and the card's mincho as
Noto Serif JP at 400** ([ADR-0112](../adr/0112-the-serif-ships-as-gelasio-regular-and-the-mincho-as-noto-serif-jp-because-the-drawings-measure-there.md)). Both weights are measured against the drawn
stems with a blur-invariant instrument, and calibrated. The serif is named by no mockup. `F-220` measured it against every serif installed where it measured
(20 faces, each rendered as the drawn word and scored by mask overlap after scaling to it): `01`'s
wordmark matches **Georgia Pro** best (0.83; Georgia 0.77, Times New Roman 0.70), and so does `01`'s
tagline (0.66; next 0.52). `00`, `14` and `25` do not separate the candidates — best 0.66–0.68 with
the top four within 0.03, too small or too low in contrast at their size. Georgia Pro is under a
commercial licence, so which face ships is **OQ-29** — and `F-275` measured what an open licence can
offer, so that question is now a choice between measured options rather than one option — and it is
answered below, by [ADR-0106](../adr/0106-the-serif-is-gelasio-because-the-mockups-type-is-georgia-metric.md).

**Open-licence candidates (`F-275`, 2026-09-16).** Twenty open-licence families from
`google/fonts`' `ofl/` tree — **an implementing session's shortlist**, chosen for resemblance to the
drawn letterforms rather than by popularity, and pinned by file, size, sha256 and source commit in
[`serif-candidates.json`](../../mockups/tools/serif-candidates.json). Nineteen carry an `OFL.txt`
beside the font; **Tinos does not** — its `METADATA.pb` declares OFL but no licence text sits in its
directory, so its terms are unconfirmed and it is excluded from any claim about the set (it scored
0.609 on `01`, 26th).

They were scored by the same tool in the same runs as the installed faces, which reproduce F-220's
published figures (0.825, 0.772, 0.695 round to its 0.83, 0.77, 0.70), so the two sets are comparable.
A variable font is scored at each named instance, so twenty families became 89 faces and, with the
installed twenty, **109 candidates per run** — and the weight is part of the answer. **The word matters
as much as the crop**: the wordmark is drawn *Irodora* on `00`, `01` and `14` and *IRODORA* on `25`,
and scoring caps against a mixed-case target collapses the whole field to 0.06–0.29 (mean 0.20),
ranked by weight rather than by shape.

| image | drawn | closest open-licence | for comparison |
|---|---|---|---|
| image | target aspect | closest open-licence (aspect) | for comparison |
|---|---|---|---|
| `01` wordmark *Irodora* | 4.31 | **Source Serif 4 Medium 0.747** (4.63) · Gelasio SemiBold 0.732 (5.04) · Source Serif 4 0.726 (4.57) · Gelasio 0.719 (4.34) | Georgia Pro 0.825 (4.45) · Georgia 0.772 · Times New Roman 0.695 · Charis SIL 0.602, 30th of 109, tied with Century |
| `00` wordmark *Irodora* | 4.15 | **Charis SIL 0.762** (4.41) · Lora SemiBold 0.739 (4.69) · Source Serif 4 SemiBold 0.734 (4.70) | Georgia Pro 0.653 (24th) · Georgia 0.612 |
| `14` splash *Irodora* | 4.29 | **Charis SIL 0.793** (4.41) · Lora SemiBold 0.726 · Bitter SemiBold 0.691 | Source Serif 4 0.641 (26th) · Georgia Pro 0.599 (46th) |
| `25` wordmark *IRODORA* | 6.11 | Newsreader Medium 0.511 · Charis SIL 0.465 | Rockwell 0.58 · Palatino Linotype 0.532 · Georgia Pro 0.313 (82nd) |

**The images disagree, and that is the finding.** On `01` — where the top of the field stands
furthest above its body, 0.223 from the leader to the 30th, against 0.157 on `14` and 0.116 on `00` —
the closest open faces are Source Serif 4 Medium and Gelasio SemiBold, short of Georgia Pro by
0.08–0.09 and ahead of Times New Roman. On `00` and `14` Charis SIL leads every candidate, installed
ones included, while sitting 30th on `01`. **Gelasio is Georgia's metric-compatible counterpart**,
which answers a different question from an outline match: it keeps the drawn metrics.

**`25` is the one to be careful with.** It is the only wordmark drawn in caps, its whole field is low
(the best of 109 candidates is Rockwell, a slab, at 0.58) and **Georgia Pro ranks 82nd there (0.313)**
— the face that wins `01` outright. Either `25` is not drawn in the face `01` is, or a caps
comparison at 38 px separates nothing. This measurement cannot tell which, and says so rather than
averaging the two readings into a recommendation. **It also supersedes F-220's `25` figure above**:
under this crop — the Latin 229 px of a 301 px box — `25`'s best is 0.58 with the top four spread
0.077, where F-220 recorded "0.66–0.68, top four within 0.03" for `00`, `14` and `25` together. Its
`00` and `14` figures do reproduce here (0.663 and 0.676 among installed faces); its `25` figure does
not.

What the score is: mask overlap at one size, after each bounding box is scaled onto the target's grid
**independently in x and y** — so a face wider than the drawn word is squashed to fit rather than
penalised for it, which is why the aspects are quoted above. Gelasio SemiBold's natural aspect is 5.04
against a target of 4.31: it scores well on shape after a 17 % horizontal squash, and a person
choosing on score alone would be choosing a face wider than the one drawn. The score says nothing
about spacing, hinting, Japanese coverage (`20` and `26` draw a serif and no Latin face answers that —
`F-226`'s second criterion), or licence terms.

**The tagline was not re-measured.** F-220's reading (Georgia Pro 0.66, next 0.52) stands as it is:
`01.header.tagline` is three lines in a 269 × 112 box and this tool renders one line, so an
open-licence comparison there needs a different measurement rather than a rerun.

**The answer — eight crops, not three (2026-09-24, [ADR-0106](../adr/0106-the-serif-is-gelasio-because-the-mockups-type-is-georgia-metric.md), OQ-29 closed on the person's delegation).** Three wordmarks are three samples of one word. The mockups also draw `00`'s *Display 1* and *Title* samples and `01`'s tagline. The tagline is three lines, and each line is one line, so each was measured on its own. Same tool, same twenty files re-fetched at the pinned commit and checked against every sha256, and F-275's figures reproduce exactly:

| face | mean of 8 (rank of 109) | wordmarks `00` · `01` · `14` | *Display 1* · *Title* | tagline lines 1 · 2 · 3 |
|---|---|---|---|---|
| **Gelasio SemiBold** | **0.671 (1)** | 0.699 · 0.732 · 0.615 | **0.711** · 0.570 | **0.663** · 0.702 · 0.675 |
| Gelasio | 0.640 (2) | 0.592 · 0.719 · 0.570 | 0.664 · 0.535 | 0.660 · 0.669 · 0.709 |
| Gelasio Medium | 0.638 (3) | 0.606 · 0.709 · 0.590 | 0.677 · 0.493 | 0.663 · 0.640 · **0.730** |
| Georgia Pro (commercial) | 0.637 (4) | 0.653 · **0.825** · 0.599 | 0.524 · 0.487 | 0.662 · 0.673 · 0.671 |
| Source Serif 4 SemiBold | 0.606 (11) | 0.734 · 0.713 · 0.670 | 0.442 · 0.603 | 0.588 · 0.550 · 0.546 |
| Charis SIL | 0.574 (25) | **0.762** · 0.602 · **0.793** | 0.262 · 0.626 | 0.493 · 0.413 · 0.641 |

**The Gelasio family takes the top three places**, above Georgia Pro, and leads where the mockups set
serif at length (*Display 1*, the tagline). Gelasio is metric-compatible with Georgia, and that
explains the result: the drawn type is Georgia-shaped. **It loses on `14`'s splash (38th) and `00`'s
*Title* (24th)**, which are drawn in something else, and that is the cost of one face for a set that
was not drawn in one. The weight per role is F-226's: stroke weight and width point to different
instances (SemiBold leads the mean, Regular's aspect on `01` is 4.34 against the drawn 4.31), and
neither GDI+ named instances nor a JPEG's bloom is an instrument to choose between them.

The font files are not committed — `F-275` measured them and `F-226` is what ships one, with
`NOTICE.md`, the subset and the coverage gate — but what is needed to fetch the same twenty and get
the same numbers is: [`serif-candidates.json`](../../mockups/tools/serif-candidates.json), pinned by
sha256 and by the `google/fonts` commit the files were read at. The icon
stroke measures 3–4 px on `01`'s tab icons (mean ≈ 3.3 px, ≈ 1.65 dp at 2 px/dp). `F-228` declares it
as `size.iconStroke` 1.65 dp and every glyph renders that width at every size. (This said "`NavIcon`'s
1.75 dp `STROKE`, inside the reading's ±0.5 dp" — that constant is gone, and it was a width in GRID
units, about 1.46 dp as drawn, never a dp value.)

**The line art**, measured by `F-229` ([`art-measure.ps1`](../../mockups/tools/art-measure.ps1)) over
the 33 elements the inventories bind an `illustration` to. Two readings per box: the width of a line
the shorter way across it, and how strongly the art is inked against the ground it sits on — as a
fraction of the `foreground` that theme declares, which is what *"at its mockup's opacity"* can mean
when art and ground are read off the same image. **Two readings and one space, both stated because
the numbers move with them:** the fractions below are the tool's `inkP90` — the line at full
strength — and the median of `inkP50`, the line as it is mostly drawn, is 0.13 rather than 0.15.
Both are measured on gamma-encoded luma, which is the space an opacity composites in; in linear
light the same pixels read about 0.036.

**The art is drawn two ways, and the difference is large.**

| use | what it is | ink, as a fraction of `foreground` | line |
|---|---|---|---|
| **backdrop** | the branch, leaves, kimono, sashiko and the `18` documents, behind a screen's content — 21 of the 33 | **0.10 – 0.18, median 0.15**, and two exceptions below at 0.31 and 0.33 | 1 px at 2 px/dp ≈ **0.5 dp** for 15 of the 21; `13.art-left` 2 px; `18`'s five documents 3–4 px ≈ 1.5–2 dp |
| **figure** | the drawing IS the content: `27`'s hanger (0.92), `00`'s three specimens on the component board (0.80 – 0.85), `18`'s signature (0.96) | **0.80 – 0.96** | 1–2 px |

- **The two exceptions** are `06.provenance.art` (0.31) and `15.art` (0.33) — twice the backdrop
  tone, on a card ground rather than the page. They are recorded as read; a surface that draws them
  binds its own value rather than the median.
- **`27`'s hanger is chromatic** (tan) and `C10` already declares that; the measurement reports its
  strength, not its hue.
- **Seven boxes could not be measured cleanly** — the inventory box catches a neighbouring element, so
  what the tool reads there is that element: `09.art`, `10.art` and `11.art` (text and cards),
  `14.splash.wave` (the progress bar beneath it), `18.report.fold` (the word *Report*),
  `25.art-blossom` and `25.art-waves` (a heading and a rule). The drawings are legible in the crops;
  only the numbers are unusable, and they are excluded rather than averaged in.
- **No declared colour token matches the backdrop ink**: the nearest are `chart.5` and `chart.4` at
  ΔE00 ≈ 4.6–7, which are a chart ramp and mean something else. So the art is the `foreground` token
  at a declared opacity rather than a colour of its own — `F-229` declares the measured 0.15.

**Swatch corners**, measured by `F-220` (`corner.ps1`; the left-hand fit where the right is
disturbed by what sits beside it), at each mockup's own scale: `00` 6.5–7.5 px (a board, no scale) ·
`01` 6.75 dp hero, 7 tiles, 5.75 card sample · `02` 8.1 · `03` 9.75 sample, 5.6 matches · `04` 5.1 ·
`05` 4.5 · `06` 7.7 · `07` 5.4 · `08` 5.0 · `09` 8.75 (the result card is the swatch) · `10` 8 ·
`15` 3.75 (theme tiles) · `16` 4.0 · `17` 5.1 · `19` 11.5 · `20` 4.75 · `21` 8.4 · `23` 8.9 (kasane
strips) · `24` 10.6 reading, 9.7 rows · `26` 9.1 (the hero card). `12`'s fabric swatch is pinked and
has none; `11 13 22` draw photographs; `25`'s circle yields to `01` (C7). The largest corner-to-side
ratio is `19`'s, 0.19 — inside [ADR-0094](../adr/0094-a-swatch-corner-is-bounded-by-what-stays-straight.md)'s
0.25. The readings span `sm` and `md`, so no one radius is what the set draws. `F-227` declares
both steps and the ceiling a corner may not exceed (ADR-0103); **each drawn element's step is bound in
its inventory**, and the surface feature that builds the element passes it — a sample whose surface
passes nothing takes `sm`, which is what 42 of the 70 drawn samples are bound to. The 25 bound `md`
draw `sm` until their surfaces are rebuilt (F-242 onward).

---

## 6. Conflict register

`⇄` marks a default the user can flip. Flipping one changes the governing mockup for **both**
themes and **both** locales — a screen never has two layouts.

| | conflict | decision |
|---|---|---|
| **C1** | The tab bar is drawn nine ways — `01` five labelled; `02` three; `05 09 11 15 18` four, all different; `21` three; `25` four labelled, no Profile | **P5 → `01`**: Home · Atlas · Lens · Wardrobe · Profile, icon **and** label. The label reads *Lens* (`02` and `25` both say so; `01` says *Lens Camera*). The current order already matches; labels return, which reverses `F-168` |
| **C2** ⇄ | Home `01` and Home-light `25` are different designs — lockup, hero shape, where the text sits, the CTA, the wardrobe strip, the tab bar | **P1 + P2**: `01`'s layout, `25`'s palette. The README itself calls `25` a *"light mode translation"* |
| **C3** ⇄ | Colour detail `06` and its Japanese `26` are different designs | **P1 + P2**: `06`'s layout; `26`'s headings (測色値と表色系 · 着こなしの配色調和 · コーパス典拠と査読) and Japanese typography. `26`-only elements — the hanko seal, the kasane bar — are not adopted by default |
| **C4** | The lockup is drawn four ways — `00` coral outline mark; `01` filled white mark + *Irodora*; `14` silver mark + *Irodora* + 彩り・色の知性; `25` *IRODORA 彩度* + outline mark | mark geometry from `14`; in-app lockup from `01`; splash lockup from `14`. Monochrome everywhere, including the icon — supersedes [ADR-0093](../adr/0093-the-mark-is-monochrome-in-the-app-and-carries-colour-on-the-icon.md). `00`'s and `25`'s variants are not used |
| **C5** | Board `00` draws a *Level 1* card white | **P3**: the screens draw it `#20232A` |
| **C6** | Kanji are sans on `01 05 06 26`, Mincho on the card `20` | each surface follows its own mockup — the card needs a Japanese serif face |
| **C7** | `25` draws Home's hero sample as a circle | **P1**: `01`'s rounded square |
| **C8** | Text sits **on** the sample in `01 07 09 13` and beside it in `05 06 19 21 24` | each screen follows its own mockup. Text on a sample takes, per sample, whichever of the two text colours passes 4.5:1 (E3) |
| **C9** | `15` draws four themes; the product shipped eight | the four drawn (§5), adopted by `F-225` (ADR-0111); system and device accent kept (E4) |
| **C10** | Chroma where the monochrome brief says none: `02` gold HUD, `04 12` green verdicts, `24` tinted ΔE00 badges, `27` tan / amber / purple state art, `23` gradient slider tracks and a brown label pill, `13` tinted slot rows | followed. Each also carries text or an icon (golden rule 13); each is declared as a chroma-ceiling exception by `F-225`; the purple mark in `27` is the one place the mark takes a tint. **Extended by [ADR-0110](../adr/0110-the-multicoloured-icons-are-followed-as-drawn-over-a-silhouette-that-reads-in-one-ink.md)** (OQ-15, OQ-37) to the icons drawn in colour: `00`'s wheel and palette, `03`'s hue ring, `06`'s seal, `07 15 16`'s padlocks, `11`'s bulb, `13`'s harmony circles and sparkles, `15`'s split CVD badge — each over its one-ink silhouette (`24`'s camera, which OQ-15 called gold, is drawn white and takes none) |
| **C11** | Samples sit on tinted cards (C up to 0.0206). A neutral well at the same lightness would **visibly** differ from them — ΔE00 2.94 (ground) to 6.50 (level 3) | followed — **the user's decision**, reaffirmed 2026-09-10 after this was raised. The ADR superseding [ADR-0096](../adr/0096-a-theme-is-a-hue-on-the-chrome-and-never-touches-the-ground-a-colour-is-judged-against.md) records that samples are now judged against a surround of measured chroma, which is the consequence that ADR existed to prevent |
| **C12** | `23` draws a seasonal label (*"Autumn Muted / Kasane Harmony"*) and an avatar; [ADR-0010](../adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md) and ADR-0072 produce no seasonal label, and the product has no avatar | followed: `F-223` derives the label from the four ranges with an ADR; `F-241` adds an optional on-device avatar with a security review ([ADR-0105](../adr/0105-a-face-stays-out-of-the-plaintext-archive.md)). **THE ABSENT STATE IS F-241's, NOT A MOCKUP'S**: `23` always draws a picture and `23.avatar` binds `"tokens": {}`, so the size (36 dp) and the circle are read off the image while the fallback — the mark at two thirds of the diameter in `foreground.2` — comes from the feature's own criterion (*"replaced by the mark when absent"*). Initials are impossible: the product asks for no name. Covered by the conformance sweep in both themes rather than by a drawing, because there is no drawing to cover it |
| **C13** | `05` draws family chips *Ao 青 · Aka 赤 · Midori 緑 · Murasaki 紫 · Cha 茶 · Kuro 黒*, the last cut by the screen’s edge; the corpus has 25 English family slugs | `F-224` groups the families under nine chips — the six drawn, in the drawn order, then *Ki 黄 · Shiro 白 · Nezumi 鼠* past the edge ([ADR-0108](../adr/0108-the-family-chips-are-the-six-drawn-then-ki-shiro-and-nezumi-past-the-edge.md), OQ-35; this row once listed Ki between Midori and Murasaki, which `05` does not draw) — as content with provenance |
| **C14** | `10 23 26` draw *kasane* palettes; the corpus has five palettes and none is kasane | `F-224` authors them, labelled `japanese-inspired` (FR-23) |
| **C15** | The README routes `17` to `/profile/setup`, which does not exist | `17` is the in-progress state of `profile/index`; `23` is its finished state |
| **C16** | `24` is routed to `wardrobe/with/[id]` only | it also governs `atlas/with/reading/[id]` — its *"Estimated from a capture"* chip is that route's case |
| **C17** ⇄ | `14` draws the splash dark only | light appearance: `14`'s composition in `25`'s palette — so a light-mode launch does not flash dark then light |
| **C18** | `19` prints ΔE00 **from the anchor** (48.2); the current Combinations prints the gamut-mapping cost | `19`: ΔE00 from the anchor, as drawn. Settled by `F-220` against FR-73's acceptance text: it also requires each proposed colour's gamut cost and each combination's family and generated-or-curated mark, none of which `19` draws — **OQ-27** |
| **C19** | `06`'s right-hand card holds only garbled text | not design (§2) — *Wearable Combinations* spans the row |

**The C10 census (`F-225`, [ADR-0111](../adr/0111-the-palette-is-the-mockups-and-a-sample-is-judged-against-the-surface-it-sits-on.md)).**
Each element C10 and ADR-0110 name is declared once in the manifest's `exceptions`, keyed by the
inventory elements that draw it, with the tints read off the image and the feature that mints its
token. `c10-exceptions.test.ts` holds the two lists together, and `checkChromaCeiling` reports an
exception whose every measured tint falls under the ceiling (0.026). A spectrum, a gradient or a
sample-coloured element has nothing single to measure. When a feature mints a row's tokens it
retires the element exception and declares a **token group** that carries the elements forward, so
each stays covered once (`F-232`, ADR-0110's amendment).

| elements | kind | measured | minted by |
|---|---|---|---|
| `02.conditions` (and its icon and text): the gold HUD | tint | `#9E9374` | `F-243` |
| `04.gauge.band`, `.sparkle`, `.chroma.bar`, `04.sheet.tolerance`: the green verdict | tints | `#538666` `#47795F` `#5BB27C` `#385847` | `F-245` |
| `12.intelligence` (and its icon, title, check, body): the green card | tints | `#345D47` `#336649` `#376B4C` | `F-256` |
| `13.slots.slot-1`, `slot-4`: rows tinted by their garment | sample | — (slot 1 reads `#556574` under a `#5B6B78` shirt) | `F-257` |
| `23.profile.temperature.range`: cool-to-warm track | gradient | — | `F-260` |
| `23.profile.label`: the brown pill (C12) | tint | `#69523A` | `F-260` |
| `24.rows.row-1…4.distance`: ΔE00 badges tinted by their row | sample | — (row 1 `#87795D`, row 2 `#4495A3`) | `F-259` |
| `27.wardrobe-empty.art`, `27.lens-working.mark`, `27.lens-refused.icon`, `27.lens-permission.icon` | tints | `#BFA184` `#926C9A` `#634E32` `#B7A07F` | `F-236` |
| `00.controls.icon-wheel` (ADR-0110) | spectrum | **minted** as `glyph.wheel.1–8` (eight sector means, `#D68164` … `#C25E62`), declared as a token group that carries this element | `F-232` ✓ |
| `00.buttons.icon-palette` (ADR-0110) | multi | **minted** as `glyph.palette.1–8` (a hue sweep over the palette, `#BC8073` … `#B66380`), declared as a token group that carries this element | `F-232` ✓ |
| `03.chips.gamut` (ADR-0110) | spectrum | — | `F-244` |
| `06.provenance.review`: the green seal (ADR-0110) | tint | `#4B9D61` | `F-247` |
| `07.slots.slot-2.lock`, `15.security.badge`, `16.slots.slot-1.locked`: the padlock (ADR-0110) | tint | `#C8A145` (read on `07`, where it is largest) | `F-248` |
| `11.gap.icon`: the bulb (ADR-0110) | tint | `#E7DDB2` | `F-255` |
| `13.score.harmony.icon`: three circles (ADR-0110) | multi | — (≈ `#B0514E` · `#83A665` · `#535FA0`) | `F-257` |
| `13.capsule.icon`: the sparkles (ADR-0110) | tint | `#9E813F` | `F-257` |
| `15.cvd.badge`: split disc (ADR-0110) | multi | — (≈ `#44628A` / `#787F57`) | `F-262` |

`23`'s depth, chroma and contrast tracks **measure achromatic** and need no exception. They are
named in the test, so their absence is on record rather than an omission. The three status
tokens keep their own exceptions (ADR-0044), which makes 20 in all.

---

## 7. Route → mockup

| route | governing | variants and states | feature |
|---|---|---|---|
| `(tabs)/index` | `01` | `25` light · `27` | `F-242` |
| `(tabs)/lens` | `02` | `03` sheet · `04` target · `27` · OQ-8 | `F-243` `F-244` `F-245` |
| `(tabs)/atlas/index` | `05` | | `F-246` |
| `(tabs)/atlas/[slug]` | `06` | `26` Japanese | `F-247` |
| `(tabs)/atlas/wear/[slug]` | `07` | | `F-248` |
| `(tabs)/atlas/compare` | `08` | | `F-249` |
| `(tabs)/atlas/find` | `09` | | `F-250` |
| `(tabs)/atlas/palettes` | `10` | `16` draft | `F-251` |
| `(tabs)/atlas/with/[slug]` | `19` | | `F-252` |
| `(tabs)/atlas/card/[slug]` | `20` | | `F-253` |
| `(tabs)/atlas/nearby/[slug]` | `21` | | `F-254` |
| `(tabs)/wardrobe/index` | `11` | `27` empty | `F-255` |
| `(tabs)/wardrobe/add` | `12` | | `F-256` |
| `(tabs)/wardrobe/outfit` | `13` | | `F-257` |
| `(tabs)/wardrobe/shopping` | `22` | OQ-10 | `F-258` |
| `(tabs)/wardrobe/with/[id]` · `(tabs)/atlas/with/reading/[id]` | `24` | | `F-259` |
| `(tabs)/profile/index` | `23` | `17` in progress | `F-260` |
| `(tabs)/profile/measure` | **none — OQ-7** | | `F-261` |
| `(tabs)/profile/preferences` | `15` | | `F-262` |
| `(tabs)/profile/export` | `18` | | `F-263` |
| app icon · adaptive icon · splash | `14` | C17 | `F-231` |
| components | `00` | | `F-232` – `F-236` |

---

## 8. Every printed figure, and what it binds to

| mockup | drawn | binds to | |
|---|---|---|---|
| `01` | hero OKLCh; *"14 Garments • 38 Valid Outfits"* | corpus derivation; wardrobe count and `coverage()` | exists |
| `02` | live OKLCh, sRGB, three nearest with ΔE00 | the Lens reading and naming | exists |
| `03` | Hex · OKLCh · CIELAB; *"95% Confidence"* | the reading; `provenance.confidence` ∈ [0,1] — display format in `F-222` | exists |
| `03` | *"97% Match"* | — | **OQ-9** (claims-ok: quotes the drawn construction this row resolves) |
| `04` | ΔE00, ΔL\*, ΔC\*, ΔH and their readings | the FR-48 metric set (FR-74) | exists; bands `F-222` |
| `06` `26` | Hex · OKLCh · CIELAB · sRGB · Display-P3; family · era · season | engine conversions — P3 is a real conversion; taxonomy, where era is empty for all 120 | exists |
| `07` | personal fit %, CVD separation %, contrast | FR-29, FR-5, FR-3 (ratio and Lc apart) | exists |
| `08` | ΔE00 · ΔEok · ΔL\* · ΔC\* · ΔH · WCAG · APCA · three separations | FR-48, FR-3, FR-5 | exists |
| `10` `16` | contrast ratio; CVD separation | FR-3; FR-5 per palette | exists |
| `11` | coverage %, outfits, outfits per garment, the gap; wears, cost per wear | `coverage()`, `gaps()`; wardrobe cost | exists |
| `12` | duplicate check with ΔE00 | `findDuplicates` | exists |
| `13` | overall and five components; capsule *"5 → 12"* | `scoreOutfit` (FR-32, [ADR-0073](../adr/0073-the-japanese-aesthetic-score-is-corpus-affinity-and-says-so.md)); `solveCapsule` | exists |
| `13` | *"Master Harmony"* | — | **OQ-9** (claims-ok: quotes the drawn construction this row resolves) |
| `15` | learned weights | preference weights | exists |
| `17` `23` | four dimensions, radar, trials per dimension | the profile's ranges and agreement ([ADR-0072](../adr/0072-a-guided-profile-is-forced-choices-and-confidence-is-agreement.md)) | exists |
| `23` | seasonal label — a season and a modifier | `summariseSeason` over the published seasonal-summary rule ([ADR-0102](../adr/0102-a-seasonal-label-is-a-lossy-summary-read-off-the-ranges.md)) | `F-223` |
| `23` | the label's second half, *"Kasane Harmony"* | — | **OQ-31** |
| `23` | *"Garment Calibration History · 94% concordance"* | — | **OQ-9** |
| `19` `21` `24` | ΔE00 per row; *"5 matches"*, *"120 colors"* | color-difference; counts | exists |
| `22` | outfits unlocked; duplicates and their threshold | `shoppingCheck` | exists |
| `22` | *"Gaps Addressed"* | `gaps()` before and after the candidate | derivable — `F-222` |
| `22` | *"Wardrobe Pairings"* | — | **OQ-9** |
| `27` | the refusal reason and its threshold | the Lens's own refusal reasons and thresholds | exists |

---

## 9. Drawn capabilities that do not exist yet

Checked against the source on 2026-09-10 — each returned no implementation:

| drawn in | capability | feature |
|---|---|---|
| `06` | bookmark a colour | `F-237` |
| `13` | *"Save Outfit to Lookbook"* | `F-238` |
| `15` | *Tabular Numeric Figures*, *Show Provenance Badges* switches (haptics exists, its switch does not) | `F-239` |
| `15` | app-wide CVD preview — Standard · Protanopia · Deuteranopia · Tritanopia | `F-240` |
| `23` | avatar | `F-241` |
| `23` | seasonal summary label | `F-223` |
| `23` `08` | *Export Profile PDF*, *Export Precision Delta PDF* | `F-263` — the existing `ExportSubject` shape carries both |

---

## 10. Decisions this release supersedes

Each needs its ADR, written by the feature named, before that feature is done
([golden rule 7](../../AGENTS.md)):

- [ADR-0093](../adr/0093-the-mark-is-monochrome-in-the-app-and-carries-colour-on-the-icon.md) — colour on the icon (`F-230`)
- [ADR-0096](../adr/0096-a-theme-is-a-hue-on-the-chrome-and-never-touches-the-ground-a-colour-is-judged-against.md) and [ADR-0099](../adr/0099-the-ground-lifts-off-near-black-and-the-product-gets-one-accent.md) — the neutral ground, the one gold accent, the theme recipes (`F-225`)
- [ADR-0010](../adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md) and [ADR-0072](../adr/0072-a-guided-profile-is-forced-choices-and-confidence-is-agreement.md) — no seasonal label (`F-223`); amended by [ADR-0102](../adr/0102-a-seasonal-label-is-a-lossy-summary-read-off-the-ranges.md)
- `F-168` — the tab bar is icons alone (`F-234`)
- the spacing, radius and type values in the manifest (`F-226`, `F-227`)

**No golden rule is superseded.** E1 – E3 exist because they cannot be.

---

## 11. Open questions

Recorded in [`PRD.md` §10](../PRD.md). Each blocks the feature that needs it and closes as an ADR.

**Delegated, 2026-09-24.** Asked OQ-29, OQ-35 and OQ-36, the person answered each with *"Follow mockup strictly. Decide yourself. Think reason research before deciding"*. Asked whether that extends to the rest, they answered the same way. So from that date, **a question the mockups answer when read strictly** is decided by the implementing session and closed by an ADR. That covers a drawn colour, a measured size, an inset, notation, which of two drawings wins, and which face. The session measures or researches first, and the ADR quotes the delegation and states the evidence and its limits. **Golden rule 14's last sentence is not delegated**: a surface no mockup draws (OQ-7, OQ-8, OQ-39, OQ-40) is still not designed by an agent, and a decision that changes a gate threshold or a golden value still needs a person.

| | question | blocks |
|---|---|---|
| **OQ-7** | `profile/measure` has no mockup. Generate one, or compose it from `08`'s readout table and `12`'s form? | `F-261` |
| **OQ-8** | The Lens states behind *Garment Scan* and *Calibrated Card* have no mockup. Generate them, or compose from `02`–`04`? | `F-243` |
| **OQ-9** | Four printed figures have no definition in the product: *% Match* (`03`), *Master Harmony* (`13`), *Garment Calibration History · concordance* (`23`), *Wardrobe Pairings* (`22`). Define each, or put a defined figure in the slot? | `F-222` (claims-ok: quotes the drawn construction this row resolves) |
| **OQ-10** | `22` omits FR-52's compatibility score and investment signal. Extend the drawn grid, or amend FR-52? | `F-258` |
| **OQ-11** | The checkered badge on every garment tile (`01`, `25`) has no defined meaning. Define it, or leave it out? | `F-242` |
| **OQ-13** | Measured type runs off the scale (`01`'s tagline ≈ 18.5 dp, `17`'s slider labels ≈ 9 dp, `22`'s figures ≈ 46 dp). The screens' sizes (P3), or §5's steps? ADR-0113 lists the seven elements drawn more than 4 dp from a step; its first version closed this on a false premise, and the closure is withdrawn | `F-230` `F-242` `F-247` `F-253` `F-258` |
| **OQ-14** | The page inset: 18–20 dp on most screens, ≈ 37 dp on `01`. One inset, or is `01`'s deliberate? | `F-227` |
| **OQ-16** | `04` draws its gauge and its sheet wider than its screen. Fit them, or keep the drawn width? | `F-245` |
| **OQ-17** | `05`'s cards end in an era no entry holds. The season instead, no line, or authored eras? | `F-246` |
| **OQ-18** | `05`'s fourth card has no OKLCh line. Does every card carry it? | `F-246` |
| **OQ-19** | `06` draws two screen widths (479 px above, 667 px below). Which is the screen? | `F-247` |
| **OQ-22** | `12`'s form groups are labelled only by leaked prompt text. Visible labels, or accessible names only? | `F-256` |
| **OQ-23** | `13 16 17 18` print headings, roles and buttons in square brackets. Copy, or notation? | `F-251` `F-257` `F-260` `F-263` |
| **OQ-24** | `17`'s radar is drawn blue. Followed, or monochrome like `23`? | `F-260` |
| **OQ-25** | `17`'s radar axes and its ranges name different dimensions. Which four, and what does *Muted Tolerance* plot? | `F-260` |
| **OQ-26** | `19` and `21` head sections with component names, and `19`'s rows read *Action: Wear*. Design, or leaked? | `F-252` `F-254` |
| **OQ-27** | FR-73's gamut cost, family and generated-or-curated mark, none drawn by `19` (C18). Where do they appear? | `F-252` |
| **OQ-28** | `22`'s green chip and ΔE00 badges (not in C10), badges with no figure. Followed, and do they print ΔE00? | `F-258` |
| **OQ-30** | `13`'s fourth score row ends in *(Natural Dyes)*, which no computation produces. Define it, or a defined figure in its place? | `F-257` |
| **OQ-31** | `23`'s seasonal pill ends in *Kasane Harmony*, which nothing defines. Define it, or the summary alone? | `F-260` |
| **OQ-32** | `07` and `13` put the seasonal label beside the fit score with no ranges beside it. Show it there, something else, or nothing? | `F-248` `F-257` |
| **OQ-33** | `23`'s pill has no summary for 3,136 of the 4,096 finished guided profiles (ADR-0102's rule, as published). What does it show then — nothing, a line, or a rule that names more? | `F-260` |
| **OQ-34** | The rule reads a range's midpoint against edges that classify one colour: *light* and *bright* are unreachable from the guided flow, and it disagrees with the profile screen's band chips on 3 of 16 answer patterns. Which statistic and thresholds — and is contrast read? | `F-260` |
| **OQ-45** | `04`, `10` and `23` draw their joined samples 46.5, 60 and 45.5 dp tall, under ADR-0095's 77 dp floor for a pair a person judges (a sample must subtend the observer its ΔE00 was fit for). Follow the drawn height (golden rule 14), keep the floor (rule 11: never overstate accuracy), or keep it only where a figure is shown beside the pair? F-233 leaves `Strip`'s height as it is until this is answered. | `F-245` `F-251` `F-260` |
| **OQ-43** | `05` draws its selected season chip as a fill swap with no mark; ACCESSIBILITY §4 asks for a highlight + checkmark, and `12 15 17` mark a chosen pill with a leading dot. Does golden rule 13 force the dot onto `05`'s chip? A segmented row is a different case — an unchosen segment draws no shape, so its fill is a shape appearing (F-232) | `F-246` |
| **OQ-42** | No mockup draws a font that failed to load: fall back to the platform face silently, say so, or something else? Today the splash would never hide | `F-302` |
| **OQ-41** | `15` draws a 5 dp `text.tertiary` dot in the gutter of each engine switch row (`15.engine.*.state`, unbound) and draws all three switches ON; `00` draws a switch on and off with no dot on either. Decoration on every row, or a mark of the on state like `15`'s selected theme tile? `F-239` renders it when on and says why; nothing drawn is left out either way | `F-262` |
| **OQ-40** | `13` draws *Save Outfit to Lookbook*, and no mockup draws the lookbook — nothing in any inventory reads a saved outfit back (see `OQ-39`, the same gap for colours) | `F-238` |
| **OQ-39** | `06` draws a bookmark toggle, and no mockup draws where the bookmarks are read back — no saved list, no filter, no route | `F-237` |
| **OQ-38** | `18`'s report envelope draws a signature — the word *Signed*, written in a script face (`18.report.preview.envelope.signature`). It is TYPE, not a drawing: traced into paths it is a word pretending to be a picture, and set as text it needs a script face the product does not bundle (ADR-0057 bundles a Japanese subset; `F-226` ships the serif). It is also the one drawing that makes a claim about a person having signed something. Trace it, set it in a bundled face, or drop the element? | `F-229` `F-263` |


**Closed.**

| | answer | ADR |
|---|---|---|
| **OQ-15**, **OQ-20**, **OQ-21**, **OQ-37** | The multicoloured icons are followed as drawn, each colour a declared exception, over the one-ink silhouette F-228 registered; each already reads by shape and by the text beside it | [ADR-0110](../adr/0110-the-multicoloured-icons-are-followed-as-drawn-over-a-silhouette-that-reads-in-one-ink.md) |
| **OQ-12** | A `caption` step at 10.3 dp: the median of the 92 ems the mockups draw below 12 dp, recomputed by a test. 14 as a floor would enlarge 121 drawn elements and nothing forces it | [ADR-0113](../adr/0113-the-type-scale-is-board-00s-four-steps-and-a-measured-caption-and-off-scale-type-snaps.md) |
| **OQ-29** | The serif is **Gelasio** (OFL), Georgia’s metric-compatible counterpart: first of 109 over the eight serif crops the mockups draw (§5) | [ADR-0106](../adr/0106-the-serif-is-gelasio-because-the-mockups-type-is-georgia-metric.md) |
| **OQ-35** | Nine chips: the six `05` draws, in its order, then Ki 黄, Shiro 白, Nezumi 鼠 past the drawn edge | [ADR-0108](../adr/0108-the-family-chips-are-the-six-drawn-then-ki-shiro-and-nezumi-past-the-edge.md) |
| **OQ-36** | Each tile draws its theme’s ground; Slate and Obsidian are Sumi’s drawn steps re-anchored there; a failing pairing moves the E3 way, per theme | [ADR-0107](../adr/0107-slate-and-obsidian-are-sumis-drawn-steps-re-anchored-at-their-drawn-grounds.md) |
---

## 12. How fidelity is proven

1. **Structure — automated.** `F-220` writes an element inventory per mockup. Each surface
   feature adds its inventory to the conformance sweep, which asserts every element exists on
   the rendered tree, in both themes and both locales.
2. **Appearance — captured, then attested.** `F-221` renders every route at the reference
   viewport and composes it beside its mockup. A person compares each pair and records the result
   — the sweep itself says it *"cannot see a layout that is cramped or unbalanced"*.
3. **Everything else is unchanged.** Contrast, CVD, claims, token reach, font coverage and brand
   byte-comparison stay blocking. Fidelity is a reason to materialise a mockup — never a reason to
   lower a gate.
