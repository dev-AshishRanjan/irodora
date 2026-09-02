# Plan: F-056 — Local exports: CSV, JSON, CSS, ASE, design tokens, PDF

| | |
|---|---|
| **Feature** | F-056 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-51, FR-65 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages` — a new `@irodora/export` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

Take a set of colours the person assembled — a palette, or a batch-compare result — and write
it out in the format the tool at the other end reads. Six of them, on the device, with the
versions that produced it embedded in every one, so a file found in a folder next year can be
traced back to the engine and corpus that made it.

Done, to a user: choose a format, get a file, and open it in the thing they meant to open it
in. Done, to this repository: **the same subject at the same versions produces byte-identical
output**, and a test asserts it rather than a person checking.

## Approach

**One subject, six writers, and every writer is a pure function of the subject.** That is
ADR-0070's shape — `cardSvg` is a pure function returning SVG text, and the byte equality is
what makes the criterion checkable in CI with no device. The same argument applies with more
force here: a PDF nobody can diff is a PDF nobody can verify.

```ts
export interface ExportSubject {
  readonly title: string;
  readonly envelope: ReproducibilityEnvelope;   // @irodora/color-core, already canonical
  readonly colours: readonly ExportColour[];    // id, name, hex, lab, lch, oklch, source
  readonly deltas?: readonly ExportDelta[];     // FR-65's ΔE table, when there is one
}

export interface ExportFile { readonly filename: string; readonly mediaType: string;
                              readonly bytes: Uint8Array }
```

**Reused:**

| Piece | Where |
|---|---|
| `ReproducibilityEnvelope`, `assertEnvelope`, `serialiseEnvelope` — **canonical key order already** | `@irodora/color-core` (FR-10) |
| ΔE00 for the table | `@irodora/color-difference` |
| Lab / LCh / OKLCh of a colour | `@irodora/color-spaces` |
| The determinism argument, and its precedent | [ADR-0070](../../docs/adr/0070-a-shareable-card-is-a-deterministic-document-not-a-bitmap.md) |

**New:** `packages/export/` — `subject.ts`, `csv.ts`, `json.ts`, `css.ts`, `tokens.ts`,
`ase.ts`, `pdf.ts`, `index.ts`. **Zero runtime dependencies**, like the engine, though it is
not in the engine zone: a compressor or a PDF library would be a dependency whose output we
could not diff.

Six decisions:

1. **Every writer embeds the envelope, and the shape is per-format rather than bolted on.** CSV
   gets a header comment, JSON and design tokens get a `$irodora` object, CSS gets a comment
   block plus `--irodora-engine` custom properties, ASE gets a named group, the PDF gets a
   printed line. Criterion 2 is *"every export"*, so the test iterates the writer list rather
   than naming six cases — **a seventh format cannot be added without one**.
2. **No compression, no timestamp, no generated id.** The PDF has no `/CreationDate`, no `/ID`
   built from a clock, and uncompressed streams. Those three are where non-determinism enters a
   PDF, and criterion 4 — *"a report is reproducible from its envelope"* — is exactly the claim
   they would break.
3. **The PDF is WinAnsi, and a character it cannot encode is refused by name.** Base-14
   Helvetica needs no embedded font, which is what keeps the writer dependency-free and the
   bytes diffable. The cost is real and is the ADR: **no kanji, no kana, and nine corpus romaji
   carry macrons WinAnsi has no code for.** The five text formats carry all of it, so nothing is
   lost from the export *set* — but a Japanese palette title cannot go in a PDF, and refusing
   with the character named beats a silently dropped glyph or a box.
4. **ASE is written to the published binary layout, and the round-trip we can check is our
   own.** `ase.ts` gets a reader as well as a writer, and the test asserts write → read → write
   is byte-identical. **That is not the acceptance criterion** — criterion 3 is Adobe's tooling
   and stays `attested` — but it is the half that can fail in CI.
5. **The design-token format is the W3C draft shape**, `{ $value, $type: "color" }`, because
   that is what the tools consuming it read. Its version block goes under `$irodora`, outside
   the token tree, so a consumer walking tokens does not trip over it.
6. **Filenames are derived, not passed in.** A caller supplying the name is a caller that can
   supply `../`; the subject's title is slugified to ASCII and the extension comes from the
   format.

**Increments** — each leaves the build green and is committed separately:

| # | Step | Verified by |
|---|---|---|
| 1 | The package, `ExportSubject`, and the envelope embedding contract | `typecheck`, `lint`, `test` |
| 2 | CSV + JSON + CSS + design tokens | `test` |
| 3 | ASE writer **and reader**, with the round-trip | `test` |
| 4 | The PDF writer, and its refusal | `test` |
| 5 | ADR for the PDF decision; the app-side wiring is **out of scope**, see below | `state` |

## Files to touch

```
packages/export/package.json, tsconfig*.json, src/*.ts, test/*.test.ts   — NEW
pnpm-workspace.yaml                       — only if the glob does not already cover packages/*
docs/adr/0080-*.md                        — the PDF's encoding decision and its cost
docs/adr/README.md                        — the ADR index row
.harness/state/feature_list.json          — status, notes
.harness/state/progress.md                — the entry
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-032** `pnpm-workspace.yaml` + every manifest → `pnpm-lock.yaml` | A **new package** is the sharpest version of this: CI installs `--frozen-lockfile` and a missing entry reads as a total build outage. F-055's plan missed the same link for a *dependency*; this one is named up front | **`gate:state`** section 7b, proven by `verify-lockfile-proof.mjs`. Run `pnpm install` in increment 1 |
| **E-045** `@irodora/recommendation`'s public surface | Not touched. This package imports `color-core`, `color-difference`, `color-spaces` only | `typecheck`, `build` |
| Engine purity | `@irodora/export` is **not** an engine package and must not become one by an edge. It depends on the engine; nothing in the engine depends on it | **`lint`** — `verify-engine-purity.mjs` closes the graph over the declared zone |
| Turborepo task graph | A new package needs its `build`, `test`, `lint`, `typecheck` tasks to be picked up | `pnpm build && pnpm test` from the root |

**No new effect link is warranted yet.** Nothing here is consumed by a second party. When the
app wires an export surface, the *format* becomes a contract with files already on disk — and
that is the moment one is owed, which the follow-up feature will carry.

## Test plan

- **Determinism, over every writer:** the same subject written twice is byte-identical, and a
  subject differing only in envelope produces different bytes. The second half is the decoy —
  without it, a writer that ignored the envelope entirely would pass the first.
- **The envelope is in every format:** a loop over the writer list, not six named cases, so a
  seventh format fails until it embeds one.
- **CSV:** a value containing a comma, a quote and a newline round-trips through a parser
  written in the test. The decoy is a value with none of those, which must be unquoted.
- **JSON / design tokens:** `JSON.parse` returns the colours and the version block; the token
  tree contains no `$irodora` key.
- **CSS:** every custom property name is a valid ident, and a title with spaces and punctuation
  produces one.
- **ASE:** write → read → write is byte-identical; the header is `ASEF`, the version `1.0`, and
  the block count matches the colour count plus the group open and close. The decoy is a
  **hand-built fixture of known bytes** for a one-colour file, so the writer is checked against
  the format rather than against its own reader.
- **PDF:** starts `%PDF-`, ends `%%EOF`, the xref offsets point at the objects they claim to,
  and the byte count is stable. **The refusal:** a title containing a kanji is refused naming
  the character; the decoy is the same title in ASCII, which succeeds.
- **Fixture discipline:** every fixture carries at least one value that would collapse a wrong
  implementation into a right-looking one — a colour that is *not* mid-grey, a title that is
  *not* a single word, a subject with *more than one* colour
  [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].
- **Golden:** not applicable — no colour maths is computed here; every value arrives on the
  subject. The ΔE table's numbers come from `deltaE00`, which has its own golden coverage.
- **E2E:** not in this feature's verification list.

## Verification

```
node scripts/verify-state.mjs
pnpm install                 # E-032: the lockfile learns about the new package
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm build
```

**Will not run:** `e2e`, `a11y`, `contrast` (no screens), `color-golden`, `cvd`, `perf`.

## Risks and open questions

- **No `OQ-*` is attached to F-056.**
- **Criterion 3 stays attested and outstanding.** *"ASE round-trips through Adobe tooling"*
  needs Adobe tooling, which this repository does not have and CI cannot install. The
  declaration already exists in `feature_list.json` and is not being quietly discharged by the
  self round-trip in increment 3 — those are different claims and the notes will say so.
- **The PDF is the part most likely to be subtly wrong.** A viewer is forgiving: a broken xref
  or a wrong `/Length` often still renders, so "it opened" is not evidence. The test asserts the
  **structure** — offsets, lengths, object numbering — rather than opening anything.
- **A hand-written ASE reader is a second implementation of the format.** It exists to check the
  writer, and if the two ever disagree the writer is the one that must be right — the format is
  Adobe's, not ours.

## Out of scope

- **The export surface in the app.** `service` is `packages` and the verification list is
  `state, test` — no `a11y`, no `e2e`. F-035 already owns the export *journey* (writing to a
  file the person chose) and carries the attestation for it. Wiring these formats to a screen is
  a mobile feature and will be filed.
- **Importing any of these formats.** FR-28's *"import a custom palette"* needs a format to
  agree with, which is what this feature creates. Filed with the surface.
- **A CJK-capable PDF.** Embedding a CID font means parsing a TrueType `cmap`, building a
  `ToUnicode` map and subsetting — a font pipeline, not an export format. The ADR records it as
  the cost, and it is filed.
- **Compression.** Flate would need a compressor; the files are small and diffable uncompressed,
  which is worth more here than the bytes.
