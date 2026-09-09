# Plan: F-209 — Decide what `@irodora/contracts` is for, or retire it

| | |
|---|---|
| **Feature** | F-209 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-26 |
| **Service** | `packages` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Criterion 1 — every trust boundary, and what validates it today

The package's own docblock names four. Measured against the code:

| boundary | the docblock says | what actually validates it |
|---|---|---|
| **SQLite row** | *"parsed, never cast"* | **Cast.** `Driver.query<T>(sql, params): T[]` — `T` is supplied by the caller and nothing checks the row against it. |
| **imported backup** | *"the strongest case"* | `parseArchive` in `@irodora/store` — hand-written, takes `unknown`, and the lint caught the day the parameter was typed `Archive`. |
| **corpus bundle** | *"digest-checked and parsed"* | `parseEntry` / `parseCombination` in `@irodora/corpus`, plus `entryDigest` / root digest. Hand-written, and they produce the `CorpusError` paths the **content gate** reports. |
| **camera frame** | *"the numbers coming back from a native module are not ours"* | `@irodora/color-sampling` and `lens/reading`. |

And one the docblock does not list: **route parameters**, `useLocalSearchParams<{ slug?: string \| string[] }>`, resolved by `entryBySlug` returning `null`.

**`@irodora/contracts` serves none of them.** Not one boundary imports it, and the one it
describes most confidently is the one that is cast.

## The finding: it is a pin around an empty room

The package's only live function is the ADR-0036 compile-time pin, and it does work — it fired
during F-207, five errors, before the wire schema was updated.

But look at what it pins. `measurementSourceSchema` and `colorSpaceSchema` are validated against
nothing: the wire they describe retired with the server tier (ADR-0051). **The schema exists to
be pinned, and the pin exists to protect the schema.** Its guards say so outright — *"the two
engine types it duplicates — `ColorSpace` and `MeasurementSource`"*.

And F-207 already removed the pin's remaining value on one of them, by a better route: the union
became **data**, with the type derived from it. One artefact instead of two, no pin needed, and
it can be iterated — which a pinned duplicate never gave us.

`errors.ts` settles it. 105 lines of HTTP status codes, seven members unreachable since ADR-0051
(*"all HTTP concepts retired with the server tier"*), imported by nothing.

## The decision: retire it

NFR-26 is the requirement this feature cites and it says the exception **expires**: *"a recorded
decision naming the feature that will consume it, and it expires with that feature — not a
warning."* The declaration has named a closing feature twice and been wrong both times.

Adopting it somewhere would mean writing a second parser beside a hand-written one that already
produces the errors our gates report — the defect `version.ts` documents for `serialiseBundle`
and the one this feature's own notes name.

## What goes, and what replaces it

```
packages/contracts/                    deleted — 856 lines of src, its tests, its zod dep
apps/mobile/package.json               the dependency
eslint.config.js                       two zones over packages/contracts
scripts/verify-guards.mjs              six guards written for the contract layer
.harness/verification/unused-packages.json   the declaration, REMOVED not re-pointed
```

**`ColorSpace` becomes data-first**, the same shape F-207 gave `MeasurementSource`:

```ts
export const COLOR_SPACES = ['srgb', 'display-p3', …] as const;
export type ColorSpace = (typeof COLOR_SPACES)[number];
```

That is not a consolation prize for the lost pin — it is strictly stronger. The pin protected
two artefacts from disagreeing; this leaves one artefact, and makes the set iterable, which is
what `provenance.test.ts` needed and could not have from a type.

## Docs that name it

`corpus/src/entry.ts`, `corpus/src/index.ts`, `design-tokens/src/manifest.ts`,
`color-core/src/provenance.ts`, `color-spaces/src/types.ts`, `docs/roadmap.md`,
`docs/architecture/security/threat-model.md`, and the mobile provenance test's prose. Each is a
sentence claiming the package owns validation at a boundary; each is now false and each is
corrected rather than deleted, because *why* it was true is the useful part.

**ADR-0101** records the decision and supersedes **ADR-0036**. ADR-0012 and ADR-0025 are already
superseded by ADR-0051 and are left alone.

## Test plan

- Every gate, because this is a subtraction and the gates are what say nothing depended on it.
- `verify-guards` still passes with six fewer cases, and **the count it prints must drop** —
  a guard suite that silently checks less is the failure mode here.
- The dead-package list is empty and the check still fails on a real unused package — asserted
  by the existing proof rather than by trusting the empty list.
- `COLOR_SPACES` and `ColorSpace` agree by construction; `provenance.test.ts` keeps passing,
  which is the evidence the F-207 witness never needed the wire.

## Verification

`state · typecheck · lint · format · test · build`, plus `color-golden` and `content`, because
the corpus and engine docblocks are touched.

## Risks

- **Deleting a package is the least reversible thing in this plan.** It is one `git revert`, and
  the gates are run before the commit rather than after.
- **`zod` leaves the repository entirely.** Nothing else imports it. If a real wire ever
  returns, it comes back with the boundary that needs it, which is the ADR's own conclusion.
- **A guard removed is a check removed.** Six of them are written for a package that will not
  exist; keeping them would be six cases asserting rules about nothing.

## Out of scope

`parseArchive`, `parseEntry` and `parseCombination` stay exactly as they are. This feature
removes a package; it does not rewrite validation that works.
