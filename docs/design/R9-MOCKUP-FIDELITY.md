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
mockup palette fails it in three places. **Each token moves the smallest CIE L\* step that
passes on the worst surface it is drawn on, hue and chroma held**:

| token | mockup | fails | smallest passing | moved by |
|---|---|---|---|---|
| dark `text.tertiary` on cards | `#768290` | 4.02 · 3.57 · 3.05 :1 on level 1 · 2 · 3 | `#94A1AF` (4.53:1 on level 3) | ΔE00 10.43 |
| light `text.tertiary` | `#8C96A5` | 2.33–2.99 :1 everywhere | `#5D6674` | ΔE00 18.55 |
| dark `border.strong`, **where it is the only indicator of a state** | `#464D5B` | 2.11:1 on ground | `#5C6472` | ΔE00 8.12 |

Dark `text.tertiary` on the **ground** passes (4.59:1) and keeps the mockup value there. Dark
`border.strong` where a label also identifies the component is decorative and keeps its value.
Every other mockup token passes as drawn.

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
exactly, except the three E3 moves. The manifest's `chromaCeiling` of `0.01` is exceeded by the
mockup ramp (C 0.0086 – 0.0251, h ≈ 264°) and is re-stated by `F-225` with an ADR.

| | dark | light |
|---|---|---|
| ground | `#15171B` | `#F6F5F2` |
| level 1 | `#20232A` | `#FFFFFF` |
| level 2 | `#282C35` | `#EEEDE8` |
| level 3 | `#323742` | `#E5E3DE` |
| border.subtle | `#2E333D` | `#E5E3DE` |
| border.strong | `#464D5B` (§E3) | `#1A1B1E` |
| keyline | `#FFFFFF22` | `#1A1B1E18` |
| text.primary | `#F7F8FA` | `#1A1B1E` |
| text.secondary | `#A6B0BC` | `#5C6470` |
| text.tertiary | `#768290` on ground, `#94A1AF` on cards (§E3) | `#5D6674` (§E3) |
| primary action | `#FFFFFF` pill, dark text | `#1A1B1E` pill, light text (`25`) |

**Themes** are the four `15` draws: *Sumi Charcoal* (`#15171B`), *Slate Graphite* (`#2C323A` — no mockup
prints it; `F-220` read it at the centre of `15`'s tile, and a colour read from a render carries
ΔE00 ≈ 2), *Obsidian Noir* (`#101114`, printed on its tile; read as `#101115`, within that noise), *Washi Minimal*. The current `fuka`, `yama`
and `aota` families retire (`F-269`). *System* and *device accent* stay (E4).

**Radius**: `sm 6 · md 10 · lg 16 · pill`. **Spacing**: `4 · 8 · 16 · 24 · 32 · 48` — still a
4-point grid. **Type** (board `00`): *Display 1* 72 and *Title* 22 in a serif; *Body* 16 and
*Label* 14 in the sans; tabular figures for every number. The serif is named by no mockup. `F-220` measured it against every serif installed where it measured
(20 faces, each rendered as the drawn word and scored by mask overlap after scaling to it): `01`'s
wordmark matches **Georgia Pro** best (0.83; Georgia 0.77, Times New Roman 0.70), and so does `01`'s
tagline (0.66; next 0.52). `00`, `14` and `25` do not separate the candidates — best 0.66–0.68 with
the top four within 0.03, too small or too low in contrast at their size. Georgia Pro is under a
commercial licence, so which face ships is **OQ-29** — and `F-275` measured what an open licence can
offer, so that question is now a choice between measured options rather than one option.

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
| **C9** | `15` draws four themes; the product ships eight | the four drawn (§5); system and device accent kept (E4) |
| **C10** | Chroma where the monochrome brief says none: `02` gold HUD, `04 12` green verdicts, `24` tinted ΔE00 badges, `27` tan / amber / purple state art, `23` gradient slider tracks and a brown label pill, `13` tinted slot rows | followed. Each also carries text or an icon (golden rule 13); each is declared as a chroma-ceiling exception by `F-225`; the purple mark in `27` is the one place the mark takes a tint |
| **C11** | Samples sit on tinted cards (C up to 0.0206). A neutral well at the same lightness would **visibly** differ from them — ΔE00 2.94 (ground) to 6.50 (level 3) | followed — **the user's decision**, reaffirmed 2026-09-10 after this was raised. The ADR superseding [ADR-0096](../adr/0096-a-theme-is-a-hue-on-the-chrome-and-never-touches-the-ground-a-colour-is-judged-against.md) records that samples are now judged against a surround of measured chroma, which is the consequence that ADR existed to prevent |
| **C12** | `23` draws a seasonal label (*"Autumn Muted / Kasane Harmony"*) and an avatar; [ADR-0010](../adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md) and ADR-0072 produce no seasonal label, and the product has no avatar | followed: `F-223` derives the label from the four ranges with an ADR; `F-241` adds an optional on-device avatar with a security review |
| **C13** | `05` draws family chips *Ao 青 · Aka 赤 · Midori 緑 · Ki 黄 · Murasaki 紫 · Cha 茶 · Kuro 黒*; the corpus has 25 English family slugs | `F-224` groups the families under those seven, as content with provenance |
| **C14** | `10 23 26` draw *kasane* palettes; the corpus has five palettes and none is kasane | `F-224` authors them, labelled `japanese-inspired` (FR-23) |
| **C15** | The README routes `17` to `/profile/setup`, which does not exist | `17` is the in-progress state of `profile/index`; `23` is its finished state |
| **C16** | `24` is routed to `wardrobe/with/[id]` only | it also governs `atlas/with/reading/[id]` — its *"Estimated from a capture"* chip is that route's case |
| **C17** ⇄ | `14` draws the splash dark only | light appearance: `14`'s composition in `25`'s palette — so a light-mode launch does not flash dark then light |
| **C18** | `19` prints ΔE00 **from the anchor** (48.2); the current Combinations prints the gamut-mapping cost | `19`: ΔE00 from the anchor, as drawn. Settled by `F-220` against FR-73's acceptance text: it also requires each proposed colour's gamut cost and each combination's family and generated-or-curated mark, none of which `19` draws — **OQ-27** |
| **C19** | `06`'s right-hand card holds only garbled text | not design (§2) — *Wearable Combinations* spans the row |

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

| | question | blocks |
|---|---|---|
| **OQ-7** | `profile/measure` has no mockup. Generate one, or compose it from `08`'s readout table and `12`'s form? | `F-261` |
| **OQ-8** | The Lens states behind *Garment Scan* and *Calibrated Card* have no mockup. Generate them, or compose from `02`–`04`? | `F-243` |
| **OQ-9** | Four printed figures have no definition in the product: *% Match* (`03`), *Master Harmony* (`13`), *Garment Calibration History · concordance* (`23`), *Wardrobe Pairings* (`22`). Define each, or put a defined figure in the slot? | `F-222` (claims-ok: quotes the drawn construction this row resolves) |
| **OQ-10** | `22` omits FR-52's compatibility score and investment signal. Extend the drawn grid, or amend FR-52? | `F-258` |
| **OQ-11** | The checkered badge on every garment tile (`01`, `25`) has no defined meaning. Define it, or leave it out? | `F-242` |
| **OQ-12** | Type below 14 dp (`01`'s tab labels ≈ 10 dp, its card note ≈ 12 dp). A caption step, or 14 as the floor? | `F-226` |
| **OQ-13** | Measured type runs off the scale (`01`'s tagline ≈ 18.5 dp, `17`'s slider labels ≈ 9 dp, `22`'s figures ≈ 46 dp). The screens' sizes (P3), or §5's steps? | `F-226` |
| **OQ-14** | The page inset: 18–20 dp on most screens, ≈ 37 dp on `01`. One inset, or is `01`'s deliberate? | `F-227` |
| **OQ-15** | Multicoloured icons C10 does not register (`00 03 13 16 24`). Followed, or monochrome? | `F-225` |
| **OQ-16** | `04` draws its gauge and its sheet wider than its screen. Fit them, or keep the drawn width? | `F-245` |
| **OQ-17** | `05`'s cards end in an era no entry holds. The season instead, no line, or authored eras? | `F-246` |
| **OQ-18** | `05`'s fourth card has no OKLCh line. Does every card carry it? | `F-246` |
| **OQ-19** | `06` draws two screen widths (479 px above, 667 px below). Which is the screen? | `F-247` |
| **OQ-20** | `06`'s green check after the review line. Followed, or monochrome? | `F-247` |
| **OQ-21** | `11`'s yellow bulb on the gap card. Followed, or monochrome? | `F-255` |
| **OQ-22** | `12`'s form groups are labelled only by leaked prompt text. Visible labels, or accessible names only? | `F-256` |
| **OQ-23** | `13 16 17 18` print headings, roles and buttons in square brackets. Copy, or notation? | `F-251` `F-257` `F-260` `F-263` |
| **OQ-24** | `17`'s radar is drawn blue. Followed, or monochrome like `23`? | `F-260` |
| **OQ-25** | `17`'s radar axes and its ranges name different dimensions. Which four, and what does *Muted Tolerance* plot? | `F-260` |
| **OQ-26** | `19` and `21` head sections with component names, and `19`'s rows read *Action: Wear*. Design, or leaked? | `F-252` `F-254` |
| **OQ-27** | FR-73's gamut cost, family and generated-or-curated mark, none drawn by `19` (C18). Where do they appear? | `F-252` |
| **OQ-28** | `22`'s green chip and ΔE00 badges (not in C10), badges with no figure. Followed, and do they print ΔE00? | `F-258` |
| **OQ-29** | The serif: `01` matches Georgia Pro best (0.825) of 20 installed faces, under a commercial licence. Of 20 SIL OFL faces, Source Serif 4 Medium (0.747) and Gelasio SemiBold (0.732, Georgia-metric-compatible) are closest on `01`; Charis SIL leads `00` (0.762) and `14` (0.793) ahead of every installed face; on `25` the field is low and Georgia Pro ranks 82nd, so either that image is drawn in another face or caps at that size separate nothing (§5). Georgia Pro licensed, or one of those? | `F-226` |
| **OQ-30** | `13`'s fourth score row ends in *(Natural Dyes)*, which no computation produces. Define it, or a defined figure in its place? | `F-257` |
| **OQ-31** | `23`'s seasonal pill ends in *Kasane Harmony*, which nothing defines. Define it, or the summary alone? | `F-260` |
| **OQ-32** | `07` and `13` put the seasonal label beside the fit score with no ranges beside it. Show it there, something else, or nothing? | `F-248` `F-257` |
| **OQ-33** | `23`'s pill has no summary for 3,136 of the 4,096 finished guided profiles (ADR-0102's rule, as published). What does it show then — nothing, a line, or a rule that names more? | `F-260` |
| **OQ-34** | The rule reads a range's midpoint against edges that classify one colour: *light* and *bright* are unreachable from the guided flow, and it disagrees with the profile screen's band chips on 3 of 16 answer patterns. Which statistic and thresholds — and is contrast read? | `F-260` |
| **OQ-35** | `05`'s seven family chips (C13) name no white and no grey: off-white and the neutral greys (20 entries) have no honest home among them. New chips past the drawn edge, a stated folding rule, out of the filter, or something else? | `F-224` |
| **OQ-36** | `15` draws Slate Graphite and Obsidian Noir as one swatch each; their levels, borders and text roles are drawn nowhere. A stated derivation, supplied values, or ground only — and is Slate's swatch its ground or its card? | `F-225` |
| **OQ-39** | `06` draws a bookmark toggle, and no mockup draws where the bookmarks are read back — no saved list, no filter, no route | `F-237` |
| **OQ-38** | `18`'s report envelope draws a signature — the word *Signed*, written in a script face (`18.report.preview.envelope.signature`). It is TYPE, not a drawing: traced into paths it is a word pretending to be a picture, and set as text it needs a script face the product does not bundle (ADR-0057 bundles a Japanese subset; `F-226` ships the serif). It is also the one drawing that makes a claim about a person having signed something. Trace it, set it in a bundled face, or drop the element? | `F-229` `F-263` |
| **OQ-37** | Icons drawn in colours C10 does not list, and two whose SHAPE in one ink cannot be read off the image: `00`'s colour wheel and palette, `03`'s hue ring, `06`'s green verification seal, `07 15 16`'s gold padlocks, `11`'s bulb, `13`'s harmony circles and gold sparkles, `15`'s two-colour CVD badge. Further C10 exceptions, or ink — and for the harmony circles and the CVD badge, what shape survives the answer? Overlaps `OQ-15`, which asks the same of `00 03 13 16 24` as a set; this is the per-icon list the icon set found. | `F-232` `F-243` `F-244` `F-247` `F-248` `F-251` `F-255` `F-257` `F-262` |

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
