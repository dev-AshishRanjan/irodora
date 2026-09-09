# ADR-0101 — `@irodora/contracts` is retired, because it served no boundary

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-09 |
| **Feature** | F-209 |
| **Supersedes** | [ADR-0036](0036-wire-schema-and-engine-type-pinned-by-the-compiler.md) — the pin it describes is removed along with the artefact it pinned |
| **Reverses in part** | ADR-0012 and F-002 — both already superseded for the server tier by [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md). Cited by number rather than linked, because the filename carries a retired surface and this document is Accepted |

---

## Context

F-002 created `@irodora/contracts` as *"the single source of runtime validation and of the
TypeScript types derived from them"*. That was correct for the product as designed: a Fastify
server, Zod schemas generating an API description and an SDK from it (ADR-0012, ADR-0025).

ADR-0051 removed the server tier. The package stayed, its docblock rewritten to claim four
local trust boundaries instead. **This ADR is the first time anybody measured that claim.**

| boundary | the docblock says | what actually validates it |
|---|---|---|
| SQLite row | *"parsed, never cast"* | **Cast.** `Driver.query<T>(sql, params): T[]` — `T` is supplied by the caller. |
| imported backup | *"the strongest case"* | `parseArchive` in `@irodora/store`. Hand-written, takes `unknown`. |
| corpus bundle | *"digest-checked and parsed"* | `parseEntry` / `parseCombination` plus the digests, in `@irodora/corpus`. Hand-written, and they produce the `CorpusError` paths the content gate reports. |
| camera frame | *"the numbers … are not ours"* | `@irodora/color-sampling` and `lens/reading`. |

Not one of them imports the package. The one it described most confidently is the one that is
cast.

**The dead-package declaration named a closing feature twice and was wrong both times** — first
F-196, then F-207 — each time because the boundary in question turned out to have a parser
already, and *"adding Zod beside any of them would be two parsers for one shape."*

### What the package was actually doing

One thing, and it worked: the ADR-0036 compile-time pin. It fired during F-207 — five type
errors, before the wire schema was updated.

But look at what it pinned. `measurementSourceSchema` and `colorSpaceSchema` validate nothing;
the wire they describe retired with the server tier. **The schema exists to be pinned, and the
pin exists to protect the schema.** The guards written for the package say so outright: *"the two
engine types it duplicates — `ColorSpace` and `MeasurementSource`"*.

`errors.ts` settles it. 105 lines of HTTP status codes — `unauthorized`, `rate_limited`,
`idempotency_key_conflict` — with seven members already recorded as unreachable since ADR-0051,
imported by nothing.

## Decision

**The package is removed.** With it go its two ESLint zones, its six boundary guards, its `zod`
dependency — the last in the repository — and the dead-package declaration, which is deleted
rather than re-pointed at a fourth feature.

### The pin is replaced by having one artefact instead of two

F-207 had already done this for `MeasurementSource`, for an unrelated reason: a test needed to
*iterate* the union, and a type is erased.

```ts
export const COLOR_SPACES = ['srgb', 'display-p3', …] as const;
export type ColorSpace = (typeof COLOR_SPACES)[number];
```

This is not a consolation prize. The pin protected two artefacts from disagreeing; there is now
one artefact, which cannot. And the const is iterable, which the pinned union never was — the
capability that let `provenance.test.ts` check a union member's reach at all.

### NFR-26 is the rule being followed, not bent

> *"An exception is a recorded decision naming the feature that will consume it, and it expires
> with that feature — not a warning."*

The exception expired. Twice.

## Consequences

- **Validation is where the shape is owned.** `parseArchive` lives with the archive, `parseEntry`
  with the entry, the sampling checks with the sampler. Each names the field that failed, which
  is what NFR-20 promises and what an issue tree does not give without a formatter longer than
  the parser.
- **A future wire brings its own schema.** If one returns, it arrives with the boundary that
  needs it rather than waiting in a package for three releases.
- **The guard count drops from 26 to 20, visibly.** A guard suite that quietly checks less is the
  failure mode of a subtraction like this, so the number is printed on every run and it moved.
- **`zod` leaves the repository.** Nothing else imported it.
- **This is reversible in one revert.** The package was complete and tested; it is being removed
  for having no consumer, not for being wrong.

## What this does not say

**It does not say hand-written parsers beat schemas.** For a real wire — a server, a public API,
a document format other programs write — a schema package earns its place. It says that a
schema package with no boundary to guard is a docblock, and that the honest response to *"which
feature will use this?"* being answered wrongly twice is to stop asking it.
