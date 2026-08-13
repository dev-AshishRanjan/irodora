# Irodora — Design Brief

| | |
|---|---|
| **Status** | Ready for design |
| **Audience** | Whoever designs the UI and flows (currently: Claude design) |
| **Inputs** | [`BRAND.md`](BRAND.md) · [`../PRD.md`](../PRD.md) · [`ACCESSIBILITY.md`](ACCESSIBILITY.md) |
| **Tool** | **Claude** — designs arrive as inspectable HTML/SVG, not Figma files ([ADR-0032](../adr/0032-design-in-claude-wireframes-before-visual-before-code.md)) |
| **Output** | **Stage 1 wireframes** → approval → **Stage 2 visual design** → approval → code |

This is the design contract. Anything here marked **hard constraint** is not a preference —
it is enforced by a build gate or by a product commitment, and a design that violates it
cannot ship.

---

## 1. What is being designed

A colour intelligence platform. A person points a camera at a shirt; the product tells them
what colour it is — honestly, with its confidence — what goes with it, whether it suits
them, and whether a colour-blind person can tell it apart from their jacket.

**Web first** (R1), mobile close behind (R3). Design both; deliver web first.

Read [`BRAND.md`](BRAND.md) before starting. The section that matters most is §4, *What the
brand is not*.

---

## 2. Hard constraints

These are gates. A design that violates one fails the build, not a review.

| # | Constraint | Why |
|---|---|---|
| **C1** | **The interface must not decorate with colour.** Chrome is near-neutral. No coloured backgrounds behind or adjacent to a colour under examination without a neutral separator | Simultaneous contrast shifts perceived colour. A decorative interface makes the product's core function less accurate |
| **C2** | **Colour is never the only channel.** Every meaning carried by colour also carries text, icon, shape or pattern | NFR-9, gated |
| **C3** | **WCAG 2.2 AA everywhere.** Zero axe A/AA violations on every route | NFR-8, gated |
| **C4** | **Every swatch has a visible name and its numeric value.** A swatch alone is an empty box to a CVD user | NFR-10 |
| **C5** | **Provenance is always visible with a colour.** Source class and confidence appear wherever a measured colour does — never behind a tap | FR-9, [ADR-0005](../adr/0005-measurement-provenance-is-a-type.md) |
| **C6** | **No gradients, glows, or shadows on or near colour swatches.** True rectangles, defined borders | They alter the perceived colour of what they surround |
| **C7** | **Motion never changes a colour mid-transition.** No swatch cross-fades. `prefers-reduced-motion` fully honoured | The product asks people to judge colour; animating it defeats that |
| **C8** | **Every layout works in English and Japanese**, at both text lengths, with correct Japanese line breaking | NFR-11, [ADR-0028](../adr/0028-i18n-en-ja-from-day-one.md) |
| **C9** | **Numbers are tabular.** Colour values appear in columns and must align | Proportional figures make a ΔE table unscannable |
| **C10** | **Keyboard completes every journey.** Including the Lens | NFR-8, gated |
| **C11** | **No claim the product cannot support.** No "exact", "100%", "AI-powered", "perfect match" | NFR-21, [ADR-0031](../adr/0031-measurement-claims-policy.md), lint-enforced |
| **C12** | **No body imagery, attractiveness framing, or gendered defaults** | NFR-22, [BRAND.md §4](BRAND.md#4-what-the-brand-is-not) |

---

## 3. Surfaces to design

### Priority 1 — R1 web, in this order

| Surface | Route | The job |
|---|---|---|
| **Colour detail** | `/colors/[slug]` | The atom of the product. A single colour: names in four forms, all coordinate systems, provenance, related and complementary colours, palettes it belongs to, CVD appearance, pairings. **Design this first** — every other surface reuses its parts |
| **Colour Atlas** | `/colors` | Browse and filter hundreds of colours. Must be indexable, scannable, and filterable by family, era, temperature, lightness, chroma, season |
| **Colour Lens** | `/lens` | Camera → live crosshair → result. The moment the product proves itself. Must communicate confidence and lighting condition **before** the user reads the value |
| **Colour Compare** | `/compare` | Two colours, all difference metrics, CVD separation, contrast. A working instrument |
| **Palette Studio** | `/palettes` | Build, edit, reorder, assign roles, save |
| **Colour Finder** | search | Global search across names, kanji, romaji, hex, natural phrases |
| **Shareable card** | rendered | A single colour as a shareable image — must read at thumbnail size |
| **Home** | `/` | Orient a first-time visitor and route them into the Lens or the Atlas within one screen |

### Priority 2 — R2 web

Personal colour setup (the guided swatch comparison flow) · Compatibility result ·
"What goes with this" result · Outfit builder · CVD outfit mode · Account and settings

### Priority 3 — R3 mobile

Lens (all four modes) · Wardrobe list and item · Add garment · Outfit builder ·
Profile · Navigation shell

---

## 4. The three flows that decide whether this product works

### Flow A — First value in 60 seconds, no account (J1)

```
land → understand what this is → open Lens → grant camera
     → point at a shirt → see the colour named, measured, placed
     → see trousers and shoes that work → understand why
```

**The design problem:** confidence and lighting condition must be understood *before* the
colour value is read. A user who reads "#263B3C" first and "estimated, mixed lighting"
second has already formed a belief the second line then has to fight.

### Flow B — Guided personal colour setup (J3, FR-26)

```
"which looks better on you?"  ×N swatch pairs
     → derived profile with per-dimension confidence
     → every dimension editable
     → saved
```

**The design problem:** 90 seconds, no camera, and it must not feel like a quiz. Each
comparison should feel like looking at fabric, not answering a question. Low-confidence
dimensions must be visibly less certain without being alarming.

### Flow C — CVD outfit check (J4, FR-35)

```
outfit → "red shirt and olive trousers are hard to distinguish for you"
       → an alternative, with the measured improvement
       → understand why, and choose
```

**The design problem:** this must feel like a capable instrument, not a warning about a
deficiency. The user is not being told they have a problem. They are being told something
about the *outfit*, which is where the problem actually is.

---

## 5. Components the design must define

**Colour-specific** (the ones only this product needs):

- **Swatch** — small, medium, large, with-name, with-values. True rectangle, defined
  border. Every size has an accessible name.
- **Provenance badge** — source class + confidence. Must read at a glance and never be
  optional.
- **Colour value table** — hex, RGB, Lab, LCh, OKLCh. Tabular numerals, aligned columns,
  copyable.
- **CVD preview** — original beside protan, deutan, tritan. Labelled, never colour-coded.
- **Separation indicator** — a [0,100] score with a non-colour visual encoding.
- **Score with explanation** — a number that expands into its named factors with direction
  and magnitude.
- **Palette strip** — ordered colours with roles (anchor, neutral, light, accent), labelled.
- **Confidence meter** — with its contributing reasons ("✓ large sample · ⚠ mixed light").
- **Lighting-condition indicator.**
- **Delta display** — ΔE00 with its interpretation ("perceptible at a glance").

**Standard, restyled:** navigation, filters, search, forms, dialogs, tabs, tables, empty
states, error states, skeletons, toasts.

---

## 6. Layout and type

**Grid.** Generous. 間 (*ma*) is a design element. Content maximum ~1200 px; colour detail
pages may be narrower.

**Type.** Humanist sans with real multilingual coverage, plus a Japanese face chosen for
kanji at small sizes. Tabular numerals throughout. A modest scale — this is a reference
work, not a landing page.

**Density.** Two modes. Comfortable by default; a compact mode for professional surfaces
where a colorist wants forty values on screen.

**Dark theme.** Required, and derived from the light theme by transforming lightness while
preserving hue and chroma ([ADR-0020](../adr/0020-design-tokens-are-oklch-native.md)).
**Both themes must present colour swatches faithfully** — the surrounding surface changes
the perceived colour, so the neutral separator around a swatch matters more in dark mode,
not less.

---

## 7. What to deliver, and in what order

Three stages, each separately approved
([ADR-0032](../adr/0032-design-in-claude-wireframes-before-visual-before-code.md)). Nothing
proceeds until the previous stage is signed off.

### Stage 1 — Wireframes · **greyscale**

1. **Priority 1 surfaces** (§3), desktop and mobile web.
2. **Flows A, B and C** (§4) as annotated sequences.
3. **Every state** for the components in §5: default, hover, focus-visible, active,
   disabled, loading, error, empty.

**Greyscale, with one deliberate exception: a colour sample is content, not decoration.**
Wireframes show a real representative colour wherever a sample would appear, because
**C1 is only testable if you can see a sample sitting inside the chrome.** Everything else
— chrome, type, borders, accents — is neutral.

*Approving:* is this the right content, in the right order, with the right states?

### Stage 2 — Visual design

4. **A token proposal** — colour as OKLCh triples with their intended `pairsWith`
   pairings, spacing, type scale, radii, borders, motion durations. Precise enough to
   become `design-system.manifest.json` without a second round of decisions.
5. **Both themes, both locales**, for at least the colour detail page and the Lens result.
6. **The mark and wordmark** per [`BRAND.md` §7](BRAND.md#7-the-mark) — one-colour, 16 px,
   and CVD-simulated.

*Approving:* does it read as precise, honest, calm, editorial, accessible, unisex — and can
you still judge a garment colour accurately inside it?

### Stage 3 — Code

The manifest `status` moves from `placeholder` to `approved`, **which makes the contrast
gate blocking**.

**Format throughout:** self-contained HTML with inline SVG, published as an artifact —
openable, resizable, inspectable. Annotations sit in the page beside what they describe and
are numbered, so feedback can reference a number. Because it is real markup, **axe and a
contrast check can run against a design before it is implemented.**

---

## 8. How this will be reviewed

Against, in order:

1. **The hard constraints in §2.** Any violation is a blocker.
2. **[`BRAND.md` §3 and §4](BRAND.md).** Does it read as precise, honest, calm, editorial,
   accessible, unisex? Does it avoid everything in §4?
3. **The three flows.** Does Flow A reach first value in 60 seconds? Does Flow B feel like
   looking at fabric? Does Flow C feel like an instrument rather than a diagnosis?
4. **The hardest test:** *put a real garment colour on screen surrounded by this interface.
   Can you judge the colour accurately?* If the chrome interferes, the design has failed at
   the one thing this product exists to do.

---

## 9. Open, and genuinely yours to decide

- Navigation shape for web — persistent sidebar, top bar, or a hybrid that changes on the
  Lens.
- Whether the Atlas defaults to a grid, a list, or a perceptual arrangement (colours
  positioned by hue and lightness rather than in rows).
- How much numeric detail appears by default versus on expansion — the tension between
  *precise* and *calm* is real, and where you put the line is a design judgement.
- Whether the mark is used in-product at all, or only on marketing and the app icon.
