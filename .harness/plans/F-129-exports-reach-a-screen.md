# Plan: F-129 — The export formats reach a screen, and a CJK-capable PDF

| | |
|---|---|
| **Feature** | F-129 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-51, FR-28 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` + `packages/export` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-02 |

---

## Intent

F-056 built six writers and deliberately not the surface. Nothing in the app calls any of them —
another consumer-with-no-producer, the shape F-125 just closed for the Lens. Done: a screen that
exports a palette or a comparison in any of the six formats to a file the person chose, a PDF
that can draw Japanese, and an importer the exporter agrees with.

## This is three pieces, and they are independent

Stated plainly because the increments are large and a reader should know where the seams are:

| # | Criterion | Where it lands |
|---|---|---|
| **A** | export in six formats, to a file they chose | `apps/mobile` — a port, a screen, two dependencies |
| **B** | a PDF that draws kanji, kana and macron romaji | `packages/export` — a TrueType parse and a CID font |
| **C** | tokens/JSON import, round-trip asserted | `packages/export` — two parsers |

**A and C do not depend on B.** Five of the six formats already carry every character, so the
screen is useful the moment it exists.

---

## A — the surface

**Two new dependencies:** `expo-file-system` (already in the store as a transitive) and
`expo-sharing`. Both are checked by `verify-manifest-permissions.mjs` (F-114, E-049) — neither is
expected to add a permission on modern Android, and **the check decides that, not this plan.**

**A port, for the reason `ImageSource` is one.** `apps/mobile/src/export/sink.ts` declares

```ts
export interface FileSink { save(file: ExportFile): Promise<SaveResult>; }
```

and `device.ts` implements it with `expo-file-system` + `expo-sharing`. The route supplies the
real one; the screen suite supplies a fake. A screen importing `expo-file-system` could not be
rendered by jest, and jest is where the accessibility guarantees are checked.

**`app/**/*.tsx` may not import `expo-file-system` at all** — the Lens/route zone in
`eslint.config.mjs` bans it, and rightly: *"if a surface here genuinely needs the filesystem, it
is not the Lens and it does not belong in this directory."* The port keeps the route clean and
the ban intact.

**The subject comes from a palette or a comparison.** `PaletteStudio` holds palettes and
`Compare`/`Measure` hold comparisons; the export screen takes an `ExportSubject` and does not
build one from scratch — a second way to assemble a subject would be a second answer.

## B — the PDF that can draw Japanese

**ADR first.** ADR-0080 decided Latin-1 and recorded the cost; this changes that decision for the
case where a font is supplied, so it needs its own ADR that says what replaced it and what the
new cost is. Written before the code.

**The font is passed in, never read.** `packages/export` has no filesystem and no runtime
dependencies, and that is not negotiable — `toPdf(subject, { font })` takes bytes. **With no
font it behaves exactly as today**: Latin-1, base-14 Helvetica, and a character it cannot encode
refused by name. Every existing caller keeps working and the refusal path keeps its tests.

**Embed the bundled subset whole; do not subset again.** The app already ships
`NotoSansJP-Subset.ttf`, generated from the corpus, the catalogue, the lexicon and the taxonomy
by `generate-font-subset.mjs` and verified by `verify-font-coverage.mjs` (ADR-0057, E-017). A
per-document subsetter means rewriting `glyf` and `loca`, which is a second font pipeline with
its own failure modes and no gate. **The cost is a large PDF** — 674 KB of font in a document
with no compression, by design (ADR-0070) — and that is the trade the ADR records.

**What must be parsed** — enough to describe the font, and no more:

| table | for |
|---|---|
| `head` | `unitsPerEm`, the scale every width is expressed in |
| `maxp` | `numGlyphs` |
| `hhea` + `hmtx` | advance widths, for `/W` |
| `cmap` (format 4 and 12) | Unicode → glyph id |

**The PDF side:** `/Type0` with `/Encoding /Identity-H`, a `/CIDFontType2` descendant, a
`/FontDescriptor` carrying `/FontFile2`, a `/W` array, and a **`/ToUnicode` CMap** so the text is
selectable — which is criterion 2's own words and the thing that separates an embedded font from
a picture of one.

**Text is drawn as glyph ids**, hex, two bytes each. A character the font has no glyph for is
**refused by name**, exactly as an unencodable one is today: the failure mode does not change,
only the set of characters that reach it.

## C — the import

`fromJson` and `fromDesignTokens` in `packages/export`, returning an `ExportSubject` or throwing
`ExportError`. **The round trip is the assertion**, over the same subjects the writer tests use —
a parser tested against hand-written fixtures agrees with the fixtures, not with the writer.

## Increments

| # | Step | Verified by |
|---|---|---|
| 1 | `fromJson` / `fromDesignTokens` + round-trip tests | `test` |
| 2 | the ADR, then the TrueType parse + its tests | `test` |
| 3 | the CID font in `toPdf`, ToUnicode, glyph-id text | `test` |
| 4 | the app: deps, port, device sink | `typecheck`, `lint`, **`script:verify-manifest-permissions.mjs`** |
| 5 | the screen, its route, a Home entry, i18n both locales, font subset | `test`, `a11y`, `contrast`, `test:content` |
| 6 | registry subjects, and an interaction test that a chosen format reaches the sink | `test`, `a11y` |

**Order is deliberate:** C first because it is small and independent, B before the app so the
screen offers a PDF that works, A last because it is the part that cannot be gate-verified end to
end.

## Files to touch

```
docs/adr/0083-…-embeds-the-bundled-subset.md   — NEW, and its index row
packages/export/src/truetype.ts                — NEW. head/maxp/hhea/hmtx/cmap
packages/export/src/import.ts                  — NEW. fromJson, fromDesignTokens
packages/export/src/pdf.ts                     — the CID font path
packages/export/src/index.ts                   — the new exports
packages/export/test/export.test.ts            — round trip, TTF, ToUnicode
apps/mobile/src/export/{sink,device}.ts        — NEW. The port and the real one
apps/mobile/src/screens/Export.tsx             — NEW
apps/mobile/app/export.tsx                     — NEW. The route
apps/mobile/src/screens/Home.tsx + app/index.tsx — one entry
apps/mobile/src/i18n/{en,ja}.ts                — the copy
apps/mobile/package.json + pnpm-lock.yaml      — two dependencies
apps/mobile/test/screens.test.tsx              — registry subjects
apps/mobile/test/export-screen.test.tsx        — NEW. The interaction
turbo.json                                     — the font as a global dependency, if a test reads it
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-032** workspace manifests → the lockfile | Two dependencies added | **`gate:state`**, `pnpm install --frozen-lockfile` in CI |
| **E-049** a dependency ships a permission | `expo-file-system` and `expo-sharing` may add manifest entries nobody asked for | **`script:verify-manifest-permissions.mjs`** (F-114) |
| **E-017** Japanese copy → the font subset | New ja strings | **`script:verify-font-coverage.mjs`** |
| **E-016** `en.ts` → `ja.ts` and every render site | New keys | **`gate:typecheck`** |
| **E-025** a test that reads past its package | If a `packages/export` test reads the app's font asset | **`script:verify-cache-scope.mjs`** — declare it in `turbo.json` or use a fixture |
| ADR-0080's Latin-1 decision | Partially superseded | the new ADR, and the refusal tests that stay |

**No new effect link expected.** If the font path turns out to couple the app's asset pipeline to
the PDF writer, that **is** a new link and will be opened rather than noted.

## Test plan

- **Round trip (C):** every writer's output for a subject parses back to a subject that writes
  the same bytes. Asserted over `WRITERS`, not over named formats, so a seventh cannot skip it.
  **The decoy:** a hand-mangled export must be refused by name, or "it parsed" is the only claim.
- **TrueType (B):** widths for a known glyph against the font's own `hmtx`; a cmap lookup for a
  kanji, a kana and a macron; **a codepoint the subset lacks must be refused**, not mapped to
  glyph 0 — `.notdef` in a report is the silent-loss failure ADR-0080 refused.
- **PDF (B):** the ToUnicode CMap is present and maps the glyphs actually drawn; the bytes are
  still deterministic for one subject; **the Latin-1 path is unchanged when no font is passed**,
  which is what keeps ADR-0080's refusal tests meaningful.
- **The screen (A):** an interaction test — choose a format, press export, assert the **bytes
  handed to the sink** are the writer's. A static registry subject cannot see that, which is
  `wardrobe-screen.test.tsx`'s lesson applied again.
- **Mutation, precondition first:** the harness asserts a PASS on unmutated source before
  mutating [[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]].
- **Not applicable:** `color-golden`, `cvd` — no colour maths. `perf` — no budget names this.
- **`e2e` is in this feature's verification list and CANNOT RUN** (gate 7, F-091). Criterion 1's
  *"to a file they chose"* is therefore **owed as an attestation**, exactly as F-035's export
  journey already is. Said here rather than discovered at the end.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:content
pnpm test:a11y && pnpm test:contrast
pnpm build
node scripts/verify-manifest-permissions.mjs
```

**Will not run:** `e2e` (gate 7, F-091), `color-golden`, `cvd`, `perf`.

## Risks and open questions

- **No `OQ-*`.**
- **The device half of criterion 1 cannot be verified here.** It is owed as an attestation. This
  is the largest honest gap in the feature and it is not a reason to skip the surface.
- **How the app obtains the font bytes** is unresolved: `expo-font` loads a face for rendering,
  not for reading. `expo-asset` plus `expo-file-system` is the likely route, and if it needs a
  third dependency that is a decision to record rather than to slip in.
- **674 KB of font in every PDF.** Stated in the ADR as the cost of not writing a second
  subsetter. If it proves unacceptable, the successor is a per-document subsetter and this is the
  note that says so.
- **A TrueType parser is new surface with no golden data.** It is checked against the font we
  ship, whose coverage another gate already verifies — which is weaker than a published dataset
  and is the honest limit.

## Out of scope

- **A per-document font subsetter.** Named in the ADR as the successor.
- **Importing the other four formats.** Criterion 3 names tokens and JSON; CSS, CSV, ASE and PDF
  are lossy or awkward to parse and no criterion asks.
- **Exporting the wardrobe or a profile.** FR-51 is about palettes and comparisons; the database
  export is F-035's and lives in `@irodora/store`.
