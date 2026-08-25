# Plan: F-090 — Taxonomy vocabulary is readable in Japanese, not only in English

| | |
|---|---|
| **Feature** | F-090 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-20, NFR-11 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `content` · `apps/mobile` · `packages/corpus` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-25 |

---

## Intent

A Japanese reader looking at a Japanese colour product currently sees **`blue-grey`**,
**`off-white`**, **`mineral-green`** — the authoring slug, in the ja locale, on the Atlas filter,
the Atlas list row and the colour detail screen.

**Done, to a user:** in Japanese, the family reads as Japanese. In English it reads as before.
And a family with no Japanese form fails the build rather than reaching a screen.

## Approach

### Where the words live is the whole decision

F-018 saw this and deliberately did not fix it, for a reason worth restating: **a lookup table
in the app would be putting words in the editor's mouth**, and it would be an *enumerated* table
against a set the **corpus** controls. A family introduced by a future publish would render
blank or fall back to English — and [ADR-0028](../../docs/adr/0028-i18n-en-ja-from-day-one.md) forbids
fallback precisely because it makes a gap invisible.

The message catalogue cannot hold it either: ADR-0056 makes it a TypeScript record whose
completeness `tsc` checks, and **`tsc` cannot check a key set that comes from JSON data**.

So the family is content, and its Japanese form belongs in content — **`content/taxonomy.json`,
beside `editors.json`**, as this feature's own notes concluded.

### Completeness moves from the compiler to the gate

The guarantee ADR-0028 wants — *no fallback, no silent gap* — is kept by a different mechanism
here, and that swap is the design:

| | English catalogue | Taxonomy vocabulary |
|---|---|---|
| Key set comes from | source | **corpus data** |
| Completeness checked by | `tsc` | **gate 11** |
| A missing entry is | a compile error | **a build failure naming the family** |

The check is the same shape as the source register's (E-021): every `taxonomy.family` used by an
authored entry must have a row, and a row for a family nobody uses is reported too — a dead
entry is how a live one gets waved through later.

### Reaching the app

A generated module with a `--check`, exactly like the corpus and rules bundles, wired into
gate 11 beside them.

**No digest ledger, and that is a deliberate step down from the corpus.** A corrupted vocabulary
shows wrong *words*; a corrupted corpus shows a wrong *colour claim*. The digest chain exists for
the second. Here the content gate validates the source, `--check` proves the shipped copy matches
it, and the diff is what a reviewer reads — the same control the register itself has.

### The lookup is total, and says so loudly if it ever is not

`familyLabel(family, locale)` throws on an unknown family rather than falling back to the slug.
The gate makes that unreachable; if it ever fires, the bundle disagrees with the corpus and that
is the corpus loader's SEV1 posture, not a caption to paper over.

**Reused:** `parseProvenance` and `primitives.ts` (`@irodora/corpus`) · the generator +
`--check` pattern from `generate-rules-bundle.mjs` · the register-style cross-check in
`verify-content.mjs` · `useMessages` for the locale.

**New:** `content/taxonomy.json` · a parser in `packages/corpus` · a generator ·
`familyLabel` in the app.

### Increments

1. The schema and parser, with tests.
2. `content/taxonomy.json` — 25 families, each with a Japanese form and a rationale.
3. The content-gate check, watched failing on a removed row and on a dead row.
4. The generator + `--check` into gate 11.
5. `familyLabel`, the three render sites, screen assertions.
6. Record.

## Files to touch

```
packages/corpus/src/taxonomy.ts             — NEW: the vocabulary schema
packages/corpus/src/index.ts                — export it
packages/corpus/test/taxonomy.test.ts       — NEW
content/taxonomy.json                       — NEW: 25 families, en + ja
scripts/verify-content.mjs                  — completeness, both directions
scripts/generate-taxonomy-bundle.mjs        — NEW, with --check
package.json                                — the --check joins gate 11
apps/mobile/src/taxonomy/generated/vocabulary.ts — NEW, generated
apps/mobile/src/corpus/index.ts             — familyLabel()
apps/mobile/src/screens/Atlas.tsx           — filter chip + list row
apps/mobile/src/screens/ColourDetail.tsx    — the taxonomy row
apps/mobile/test/screens.test.tsx           — the ja assertions
.prettierignore · eslint.config.mjs         — the generated module
```

## Anticipated effects

| Change | Propagates to | Guard |
|---|---|---|
| **`content/taxonomy.json`** | the generated module · three render sites | `gate:content` — the new completeness check plus `--check`. **New link.** |
| **A published corpus gaining a family** | the vocabulary must gain a row | `gate:content` — the same check, from the other side |
| **New Japanese words** | the bundled font subset | `script:verify-font-coverage.mjs` — E-017, seventh firing expected |
| **A new screen string path** | the screen conformance suite | `gate:a11y` |

## Test plan

- **Schema:** a row without a `ja` form is rejected; a duplicated family is rejected; the
  provenance block is the same one every content record carries.
- **Completeness, both directions:** a family used by an entry with no row **fails**; a row for
  a family nobody uses **fails**. Watched, with the baseline green either side.
- **The lookup is total:** `familyLabel` returns the ja form in ja and the en form in en, for
  **every** family in the corpus — not a sampled one.
- **Negative, with a decoy:** an unknown family throws rather than returning the slug, and the
  decoy is that a known one does not throw.
- **On the screen:** the ja locale shows no bare authoring slug on any of the three sites. The
  decoy is the en locale, which must still show it.

## Verification

```
node scripts/verify-state.mjs
node scripts/gate.mjs typecheck && node scripts/gate.mjs build && node scripts/gate.mjs lint
node scripts/gate.mjs test && node scripts/gate.mjs test:a11y
node scripts/verify-content.mjs && node scripts/verify-font-coverage.mjs
```

`test` stays red repo-wide for the Node 22 reason F-093 made visible and F-083 owns.

## Risks and open questions

- **The Japanese is written by one editor and not reviewed** — the same standing gap as the
  corpus and the phrase lexicon (ADR-0060, OQ-5). Declared in the file's own provenance, and
  carried as this feature's attested criterion. It is the part most likely to be wrong, and a
  family name is more visible than a rationale.
- **`era` and `material` have the same problem** the day a measured entry carries one. Both are
  nullable and null on every seed entry, so there is nothing to translate yet — noted, not built.
- **A vocabulary row is editorial judgement**, not a translation of the slug. `off-white` is not
  「オフホワイト」 by obligation; the file says what was chosen and why.
- No `OQ-*` blocks this feature.

## Out of scope

`era`, `material` and any other nullable taxonomy field with no data yet · a digest ledger for
the vocabulary · retranslating the corpus entry names, which are already Japanese · the
`content/locales/` directory, which is empty and untouched by this.
