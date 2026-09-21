# Plan: F-229 — The illustration set the mockups are drawn with

| | |
|---|---|
| **Feature** | F-229 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69, NFR-9 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` · `apps/mobile` |
| **Author** | implementing session |
| **Date** | 2026-09-21 |

---

## Intent

The line art the screens are drawn with — the plum branch, the kimono, the leaves, the waves, the
document — exists once, as one vector set keyed by the names F-220's inventories bind, drawn at the
weight and in the tone the mockups draw it. A surface feature asks for `plum-branch` and gets the
drawing `01` has; nothing draws its own, nothing carries meaning the text does not, and no drawing
ever sits over a colour sample.

## Approach

**Reused.** `Illustration` already exists (F-185, F-188) and already holds the three rules this
feature keeps: every colour a token, never a fill that competes with a sample, hidden from a screen
reader. `Glyph`'s shape is the model for the registry (F-228): one module, keyed by the inventory's
own names, held to the inventories in both directions by a test that reads them, with the drawings
compared against magnified crops of the elements that bind them. `size.iconStroke` is the icon line
and is NOT this — an illustration's line is its own measurement (below).

**New.** The 13 drawn names as one registry in `packages/ui/src/Illustration.tsx`, a declared tone
per drawing, a version over the path data, and a conformance rule for the sample.

### Which illustrations — the record, not the list

The acceptance names nine groups; F-220's inventories bind **13 names across 33 elements**, and the
acceptance's governing clause is *"every illustration the screens draw"* — so the inventories decide,
as they did for the icon set. Reconciled:

| in the acceptance | in the inventories | disposition |
|---|---|---|
| plum-blossom branch (01 05 06 08 15 25) | `plum-branch` — 01 (×3), 06, 08 (×3) | built. `05` binds no art at all; `15` binds `leaves`; `25` binds `blossom` and `waves`, which are their own drawings |
| garment and kimono line-art (06 07 11 13 16 23) | `kimono` — 00, 03, 11, 13 (×2), 16 | built. `06`, `07` and `23` bind no art |
| hanger and blossom (22 27) | `hanger` — 27 · `blossom` — 25 | both built; `22` binds no art |
| seigaiha waves (24 26) | `waves` — 25 | built as `25`'s; `24` and `26` bind none |
| asanoha lattice (16) | `sashiko` — 16 (×2) | built; the inventory's name is the stitch, not the lattice |
| leaf sprays (09 10 15) | `leaves` — 09, 10, 12 (×2), 15 | built |
| fabric-fold lines (17) | — | `17` binds no illustration; its only figure is `new:RadarChart` (F-235's) |
| hanko seal (26, C3) | `new:HankoSeal` — 26 | **not built here.** C3: *"`26`-only elements — the hanko seal, the kasane bar — are not adopted by default"*, so it belongs to whoever builds `26` |
| the splash wave lines (14) | `silk-wave` — 14 | built |

Five more the acceptance does not name are drawn and therefore built: `viewfinder` (00),
`no-results` (00), `page-fold` (18), `document` (18 ×5), `signature` (18).

### The three that are already there

`swatches`, `reading` and `pairing` are R7's empty-state drawings, and eight screens render them
today. They are not in any inventory — `00` draws the empty state's art as `no-results` — so under
the registry's own rule they are a design nobody drew. **They are not deleted here**: golden rule 6,
and the surfaces that use them are rebuilt by F-236 (empty, working, refused and denied are mockup
`27`). They stay as a declared, expiring set — named in the module, asserted by a test that they are
NOT part of the drawn registry, and recorded against F-236 so the list cannot outlive it.

### The line and the tone are measurements

F-220 measured the icon stroke; it did not measure the art. Two things have to be read off the images
before anything is drawn, with `mockups/tools/measure.ps1` and the same crop tooling the icon set
used:

- **The line width**, per illustration, at the element's own scale (dp per px is in each inventory).
- **The tone** — the art is drawn faint. Each element's ink is measured against the ground it sits on
  and expressed as the nearest DECLARED token (`foreground.3`, `text.tertiary`, `border.subtle`),
  with the measured value and the distance recorded in R9-MOCKUP-FIDELITY §5. **An opacity that no
  token matches is an open question, not a number invented here** — `14`'s wave and `26`'s seal are
  the two the inventories already bind to `text.tertiary`, which is the evidence that this is how the
  mockups express it.

### One set, one version

The acceptance says *one versioned, vector set*. `ILLUSTRATION_SET` carries a version and a digest
of the path data; a test asserts the digest, so a redrawn line is a deliberate, recorded change
rather than a silent one. That is what "versioned" can mean that a check can hold.

### Never over a sample

The rule already exists in words (`Illustration`'s docblock, ACCESSIBILITY.md) and nothing enforces
it. `checkStatusAdjacency` (F-069) is the shape: a rendered-tree rule in the conformance suite —
an `Illustration` may not be a sibling of a `Swatch` unless `swatch.well` sits on their shared
parent. Simultaneous contrast is the reason, and it is the same reason the status rule exists.

### Increments

1. **Record**: the claim, this plan, and the reconciliation above written into the feature's notes.
2. **The measurements**: line width and tone per illustration, recorded in §5; any tone no token
   matches raised as an open question before anything is drawn.
3. **The registry**: the 13 names, drawn against their crops, with the legacy three declared and
   expiring; both-directions test against the inventories.
4. **The rules**: the sample-adjacency conformance rule and its decoy; the set version and its
   digest test.
5. **Effects and the record.** (E-136, E-137, their notes, the index, DESIGN-SYSTEM's section.)

## Mockup fidelity

- **Governing mockups:** every one that binds an illustration — `00 01 03 06 08 09 10 11 12 13 14 15
  16 18 25 27`, per the inventories.
- **Inventory:** the `illustration` field of every element (33 of them; 13 names), and each element's
  `dp` box for the scale its drawing is read at. (The 34th art-like element is `26`'s hanko seal, a
  `new:HankoSeal` component rather than an illustration — C3 leaves it to whoever builds `26`.)
- **Bindings:** none — an illustration is a shape, not a value.
- **Departures:** none. One name is NOT drawn — `signature`, `18`'s envelope word *Signed* in a
  script face — and that is **OQ-38** rather than a departure: type traced into paths is a word
  pretending to be a picture, and set as text it needs a face nothing bundles. It is declared unbuilt
  in the registry, held to its question by a test, and F-263 waits on it.

**As built, where it differs from the plan:**

  - **The tone question did not need an OQ.** The measurement answered it: art is drawn as a
    BACKDROP at 0.10 – 0.18 of `foreground` (median 0.15, 21 elements) or as a FIGURE at 0.80 – 0.96
    (5), so `opacity.art` and `size.artStroke` are declared from the reading rather than chosen.
    No declared COLOUR token matches that ink — nearest `chart.5` at ΔE00 4.6 — which is why the art
    is the foreground turned down rather than a token of its own.
  - **Never over a sample is asserted over the record's geometry**, not as a new conformance rule:
    33 drawn illustration boxes against 73 drawn sample boxes, with a planted overlap as the decoy.
    A rendered-tree rule would first need a marker that tells a drawing from an icon in the tree, and
    the inventories already carry the evidence — the mockups never do it. Two of the drawings are
    registered as conformance subjects instead, so they are read under the colour and both-theme
    rules. **It found one pair**: `10.art` over `10.palette-2.swatch-4`, where the image draws the
    leaves BESIDE the card — the box is a scan blob, which is **F-282**, and the exception is declared
    and held to still overlapping.
  - **Five drawings were wrong on the first pass** and were corrected against their crops: `18`'s
    document (solid, not outline), its page-fold (a turned corner, not a slab), `25`'s waves (a corner
    fan, not half circles), `16`'s sashiko (blocks of inset stitches, not diagonals joining across
    blocks) and `27`'s hanger (slim, not twice its drawn thickness).

## Files to touch

```
packages/ui/src/Illustration.tsx       the registry: 13 drawn names, the legacy three declared
packages/ui/src/index.ts               exports
packages/ui/test/illustrations.test.tsx (new)  both directions, the tone, the version digest
packages/ui/test/conformance.test.tsx  the sample-adjacency rule's subjects and decoys
packages/ui/src/testing/conformance.ts the rule itself
docs/design/R9-MOCKUP-FIDELITY.md      §5: the measured line and tone
docs/design/DESIGN-SYSTEM.md           the illustration section
.harness/state/*, .harness/memory/effects/*
```

## Anticipated effects

1. **A registry keyed by inventory names** → the inventories become an input to a second ui test.
   Guard: that test, with `mockups/inventory/**` already a turbo global dependency (E-134).
2. **`IllustrationName` changes shape** → `EmptyState` and eight screens take the legacy names.
   Guard: typecheck, the screens' own suites, and the declared expiry against F-236.
3. **A new conformance rule** → every registered subject is judged by it. Guard: the rule's own
   decoy subjects in the suite (a drawing beside a sample fails; one in a well does not).
4. **A measured tone written into §5** → the surfaces that place art read it. Guard: the test that
   each drawing's ink is a declared token, and the fidelity record.

## Test plan

- **Both directions**: every `illustration` name any inventory binds has a drawing; every drawing is
  bound by an inventory — with a decoy each way, and the legacy three asserted OUTSIDE the drawn set.
- **Tone and line**: every stroke is a declared token, and every drawing's line is the measured width
  at the size it is drawn (the icon set's arithmetic, its own value).
- **Silhouette**: no two drawings are the same shape (NFR-9's rule applied to art).
- **Hidden**: every drawing is hidden from a screen reader, asserted on the rendered tree.
- **Never over a sample**: the conformance rule, with a subject that violates it and one that does
  not — the decoy is the drawing inside a `swatch.well`.
- **The version**: the digest test, and a case proving it changes when a path does.
- **Gates**: state, typecheck, lint, format, test, build, a11y, contrast, cvd.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd
```

## Risks and open questions

- **No open question blocks this feature today.** One may be raised by increment 2: a measured tone
  that no declared token matches.
- **The drawings are judgement at the level of a line**, as the icon set's were, and the icon set's
  review is the warning: a name check in both directions says nothing about the drawing
  [[a-name-check-in-both-directions-says-nothing-about-the-drawing]]. Each drawing is compared with a
  magnified crop of every element that binds it, and F-281 is the check that would make that
  comparison survive the session.
- **`10`'s and `13`'s art are 1150 and 1140 px tall** — a drawing that long is a repeating motif
  rather than one picture, and it must tile without a visible seam at the sizes the screens use.

## Out of scope

Placing art on a screen (the surface features do, from their inventories); the hanko seal and the
kasane bar (C3, `26`'s own); `17`'s radar chart (F-235); the empty states themselves (F-236); the
mark and the wordmark (F-230, F-231); motion (F-266).
