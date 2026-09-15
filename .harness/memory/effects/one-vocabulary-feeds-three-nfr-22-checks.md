# One vocabulary feeds three NFR-22 checks

**Effect:** [E-130](../../state/effects.json) · `PROHIBITED_IDENTIFIERS` (`packages/store/src/prohibited.ts`)
→ the schema check (`assertMigrationsClean`), the source scan (`scripts/verify-no-inference.mjs`) and
the copy check (`findProhibitedCopy`) · gates 15, 11 and 4 · **high**

## Why the link exists

NFR-22 keeps skin, ethnicity, body and age out of *"the data model and the copy"*, and the repository
answers it with one list read three ways: a regex per family for SQL, stems for camelCase source
identifiers, and — since F-223 — the same stems for prose. That is deliberate: two vocabularies drift.
It also means **a change made for one check changes the other two.** Narrowing a stem because the
source scan fired on an honest identifier — as `diagnos` became `diagnosis` — narrows what copy may
say and what a column may be called, silently. Widening one widens all three: F-223 added `undertone`,
`yellow base` and `blue base` to the skin family after its review found the copy check missed them.

## What holds it

- **`packages/store/test/prohibited.test.ts`** — the schema check against planted columns, with
  decoys (`average`, `percentage`, `bracelet`) that must stay clean.
- **`packages/store/test/prohibited-copy.test.ts`** — the copy check over decoys in both languages
  and over near-misses that must stay clean; multi-word stems must be a run of whole words.
- **`scripts/verify-no-inference-proof.mjs`** — plants identifiers the source scan must find (CI,
  gate 15).
- **Gate 11 and `apps/mobile/test/season-words.test.ts`** — the copy check over all 48 seasonal labels,
  with a planted decoy watched failing.

## What it does not hold

The Japanese terms (`PROHIBITED_COPY_JA`) are a separate list read only by the copy check, and no
check knows a word nobody listed — a competent Japanese reader's review stays an attested criterion
(OQ-5, F-223).
