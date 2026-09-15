# Plan: F-220 — Every mockup is redlined into an element inventory, and every contradiction in the set is resolved by rule

| | |
|---|---|
| **Feature** | F-220 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-25, NFR-9 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | root — `mockups/inventory/`, `mockups/inventory.schema.json`, `mockups/tools/`, `scripts/verify-mockups.mjs`, `docs/design/R9-MOCKUP-FIDELITY.md`, `docs/PRD.md` §10 |
| **Author** | Claude (generator) |
| **Date** | 2026-09-15 |

---

## Intent

Golden rule 14 says build exactly what the mockup draws. Today "what the mockup draws" is a picture a
person has to interpret, so two builders — or one builder on two days — read it differently and both
believe they matched it. Done means: for each of the 28 images there is a machine-readable list of
every element, in reading order, with its measured box, its dp at its screen's scale, its token, face,
icon, binding and action; the presentation artefacts are listed so nobody builds one; every
contradiction is either resolved by the precedence rule and recorded, or raised as an open question
for a person; and `verify-mockups` refuses an image without its inventory once this is done.

## What drafting eight inventories taught (2026-09-14, scratch, before claiming)

Eight are drafted and pass the check below — 00, 01, 02, 03, 04, 05, 06, 14 (339 elements, 83
not-design regions, 12 departures, 17 conflict citations). What they taught changed the approach:

- **Four measurement methods, each with a known failure.** A difference-from-background blob scan
  works on the app's flat surfaces and fails on a photograph (02, 03, 04's viewfinders): the photo
  differs from its own mean everywhere. Over a photo, a BRIGHTNESS MASK (white strokes, dark pills)
  or a LINE SCAN against a control's own uniform fill works. A corner is fitted by least squares after
  subtracting the straight-side baseline; a fit that returns ≈ 0 is a failed fit (wrong local
  background), never a square corner, and is left unrecorded rather than guessed.
- **The em rule.** A text box's height is not its size. The em is estimated by glyph class — Latin
  with descenders ≈ box / 0.93, with brackets ≈ box / 1.05, caps/ascenders/digits ≈ box / 0.73,
  Japanese ≈ box / 0.9 — snapped to §5's steps, and `raw.emDp` keeps the estimate wherever the snap
  moves it. Measured ems run SMALLER than §5 suggests (tab labels ≈ 10 dp, section titles ≈ 13 dp):
  §5's 72 / 22 / 16 / 14 were read off board 00's printed labels, which §2 classes as leaked. That
  is an open question, not a thing to snap away.
- **Reading order is mechanical.** Sorted by top edge; consecutive tops within 8 px chain into one
  row; each row reads left to right. Anchoring a row to its FIRST top split rows whose members step
  down a pixel at a time; chaining does not. The generator checks every screen against the rule.
- **Mockups contradict themselves**, and the inventory must not paper over it: 04 and 06 draw cards
  wider than their own frame; 05's fourth card lacks a line the other three draw; a texture badge
  (01) has no defined meaning. Each is recorded as drawn and raised as a question — never resolved by
  the agent. An element drawn past its screen is allowed only when DECLARED (`overhangs`), and the
  overhang must be a `presentation` region naming it.
- **Variants govern a dimension.** 03 and 04 are `variantFor /lens`: they govern the analysis and
  against-target STATES (P2), and the inventory says `governs: state`.

## Approach

**Reused:** `mockups/index.json` and `scripts/verify-mockups.mjs` (F-218) — the index has an
`inventory` field per image, and the check already refuses an inventory whose `mockupSha256` differs
from its image and, once F-220 is done, a null inventory. `R9-MOCKUP-FIDELITY.md` §2–§8 are the rules
each inventory applies.

**New:**

1. **`mockups/inventory.schema.json`** — the shape: `mockup`, `mockupSha256`, `kind` (screen | board),
   `governs` (layout | palette | locale | state | vocabulary), `frame` (kind and `screens[]`, each with
   its box and `dpPerPx`, null on a board), `elements[]` (id, order, parent, screen, component, box,
   dp, tokens, measured, raw, type, icon, illustration, binding, action, copy), `notDesign[]`,
   `departures[]` (a §4 rule), `conflicts[]` (a §6 id, the elements it decides, `flippedByUser`).
   The TEXT an image prints is never recorded (E1) — only its shape and script.
2. **`mockups/inventory/NN.json`** — 28 files, generated from per-image data by the authoring tool and
   committed as JSON (the gate reads the JSON; it never re-measures).
3. **`scripts/verify-mockups.mjs` grows the inventory check** (drafted: `check-inventory.mjs`):
   required keys; ids unique and prefixed by their image; order a strict sequence and, on a screen,
   the reading-order rule; parents listed before children; component `ui:` | `new:` | `app:`; binding
   one of §8's kinds, and an `oq:` binding naming an OPEN question in PRD §10; dp present exactly on a
   scaled screen and equal to the box at its `dpPerPx` (to 0.5 dp); every box inside the image and
   inside its screen unless declared an overhang; departures citing a §4 rule; conflicts citing a §6
   id. Proof cases plant one of each defect and watch it go red, with a decoy that stays green.
4. **`mockups/tools/`** — the measurement helpers (`measure.ps1`, `mask.ps1`, `corner.ps1`) and the
   generator, so §2's promise holds: a second person can repeat a reading. They need Windows
   PowerShell's System.Drawing and are stated as such; no gate runs them.
5. **Open questions.** Every question found while inventorying becomes an OQ row in PRD §10 (ten so
   far), and each element it touches keeps `binding: null` or its drawn form until answered.
6. **§5's open values** measured and written: Slate Graphite and Obsidian Noir (15); the swatch corner
   on each mockup (so far 00 ≈ 7 px board · 01 ≈ 6.75 dp · 02 ≈ 8.1 dp · 03 5.6 / 9.75 dp · 05 ≈ 4.5
   dp); the icon stroke weight — 1.75 dp, which is `NavIcon`'s `STROKE` already; the serif face,
   identified by rendering OFL candidates beside the wordmark in 00, 01, 14 and 25.
   **Changed while building (2026-09-15):** no OFL serif is bundled or installed, so the candidates were
   the 20 serifs installed on the measuring machine (`mockups/tools/serif-match.ps1`). 01's wordmark and
   tagline match Georgia Pro best; 00, 14 and 25 do not separate the candidates. Georgia Pro is not an
   open-licence face, so which face ships is OQ-29. Open-licence candidates would need a download,
   which needs the user's permission.
   **Changed after the review (2026-09-15):** the generator and the per-image data are committed
   (`mockups/tools/generate-inventory.mjs`, `mockups/tools/inventory-data/`). They are not linted —
   the root lint runs `eslint scripts` — and the generator validates its output with the gate's own
   `inventoryProblems()`.
7. **§4 E2 rows the inventories cite** that §4 does not yet list (so far: 03's list heading).

**Increments:** (1) the schema, the check and its proof, with the eight drafted inventories; (2) the
remaining route mockups in route order, each committed with its index row pointing at it; (3) the
variants 25, 26, 27 — only the dimension each governs; (4) §5's open values, the OQ rows and the E2
rows; (5) mark F-220 done — `verify-mockups` now refuses any null inventory.

## Mockup fidelity

This feature *is* the fidelity record. **Governing mockup:** `all`.

## Files to touch

```
mockups/inventory.schema.json               — new
mockups/inventory/00.json … 27.json         — new; 28 inventories
mockups/tools/                              — new; the measurement helpers and the generator
mockups/index.json                          — each row's inventory path
scripts/verify-mockups.mjs                  — the inventory check, and its proof cases
docs/design/R9-MOCKUP-FIDELITY.md           — §5 measured values; §4 E2 rows the inventories cite
docs/PRD.md                                 — §10: one OQ per question found (ten so far)
```

## Anticipated effects

- **Every surface feature (F-242 … F-263)** builds from an inventory and adds its elements to the
  conformance sweep (F-221). E-126 links image → index; this adds the inventory as the third node.
- **Changing an image** now forces its inventory to be rewritten, not only its row.
- **PRD §10 gains open questions**, and every feature whose surface they touch becomes blocked by
  them — the loop skips it rather than deciding.

## Test plan

- **Negative (proof):** a missing key; a duplicated id; an id from another image; a gap in the order;
  an element out of reading order; a child before its parent; an unknown binding kind; an `oq:` to a
  closed or absent question; dp that does not match the box; an undeclared overhang; a departure under
  a rule §4 lacks; a conflict §6 does not register; a stale `mockupSha256` (already F-218's).
- **Must stay GREEN:** a complete inventory; `binding: null` for pure decoration; a board with `dp:
  null`; a declared overhang with its presentation region; a variant listing only its dimension.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-mockups.mjs && node scripts/verify-mockups.mjs --prove
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm security
```

## Risks and open questions

- **Size.** 28 inventories at 8–60 elements each; eight done, and the method is now fixed.
- **Measurement precision.** ±2 px a reading is ±1 dp at 2 px/dp, ±1.5 dp on a spec card's scale. A
  colour read from a render carries ΔE00 ≈ 2 (validated against the two tiles 15 prints its hex on).
- **The OQs.** Ten questions so far. None blocks F-220 itself — the inventories record the drawn form
  and the question — but several will block surface features until a person answers them.
- **`verify-mockups.mjs` line 606** holds a raw NUL (the never-match sentinel). F-272 owns every raw
  control byte in the tree; F-220 does not touch it.

## Out of scope

Building any screen. Capturing the running app (F-221). Answering any open question.
