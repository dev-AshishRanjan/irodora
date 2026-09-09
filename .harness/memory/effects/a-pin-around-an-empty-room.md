# A pin around an empty room

**Effect:** [E-119](../../state/effects.json) · `packages/contracts` **removed** →
`eslint.config.mjs` · `scripts/verify-guards.mjs` · `packages/color-spaces` · six docblocks ·
**medium**

## What happened

`@irodora/contracts` was created by F-002 as *"the single source of runtime validation"*, for a
product with a Fastify server and a generated API description. ADR-0051 removed the server. The
package stayed, and its docblock was rewritten to claim four **local** trust boundaries instead.

F-209 was the first time anybody measured that claim:

| boundary | claimed | actual |
|---|---|---|
| SQLite row | *"parsed, never cast"* | **cast** — `Driver.query<T>` returns `T[]`, `T` from the caller |
| imported backup | *"the strongest case"* | `parseArchive`, hand-written, takes `unknown` |
| corpus bundle | *"digest-checked and parsed"* | `parseEntry` + digests, hand-written |
| camera frame | — | `@irodora/color-sampling` |

Not one imported the package. **The boundary it described most confidently was the one that was
cast.**

## The shape worth remembering

The package was not unfinished, or wrong, or untested. It was **complete**, and it had one live
function: a compile-time pin (ADR-0036) between its Zod schemas and two engine types. That pin
worked — it fired during F-207, five errors.

But it pinned schemas that validate nothing, describing a wire that no longer exists.

> The schema existed to be pinned, and the pin existed to protect the schema.

A closed loop passes every check it sets itself. Nothing in the repository could see it, because
from the inside it looks exactly like a guarded invariant.

## The tell, and it had fired twice already

The dead-package declaration **named a closing feature twice and was wrong both times** — F-196,
then F-207. Each time the named boundary turned out to have a parser already, and adding a schema
beside it would have been two parsers for one shape.

NFR-26 says an exception *"expires with the feature it names — not a warning."* An answer to
*"which feature will use this?"* that has been wrong twice is not a scheduling problem.

## What replaced the pin

Nothing needed to. F-207 had already done the better thing for an unrelated reason — a test
needed to **iterate** a union, and a type is erased:

```ts
export const COLOR_SPACES = [...] as const;
export type ColorSpace = (typeof COLOR_SPACES)[number];
```

The pin protected two artefacts from disagreeing. One artefact cannot. And the const is
iterable, which the pinned union never was.

## The part that can go wrong quietly

**A subtraction can make a check quieter without failing.** Six guards went with the package; if
the suite had simply reported "all boundaries enforced" the loss would have been invisible. It
prints its count, and the count moved — 26 to 20. Any removal of guarded surface should be able
to point at a number that dropped.

Two smaller ones, both caught by gates rather than by review: an effect link named a file that
had just been deleted (gate 0), and the retired-surface record for the API description cited the
deleted package as its evidence.

## The general shape

Ask what a component **guards**, not what it **is**. A well-tested package with a working
invariant can still be guarding nothing, and the question that finds it is not "is this correct?"
but "which caller would break if this were wrong?"

Related: [[declared-means-a-person-and-a-computed-colour-was-borrowing-it]],
[[a-memory-note-without-its-link-turns-gate-0-red-and-strands-a-plant]]
