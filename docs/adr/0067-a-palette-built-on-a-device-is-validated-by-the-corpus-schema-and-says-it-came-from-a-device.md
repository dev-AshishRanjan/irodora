# ADR-0067 — A palette built on a device is validated by the corpus schema, and says it came from a device

## Status

Accepted

## Date

2026-08-25

## Context

FR-49 gives Palette Studio two acceptance criteria, and the second is the one that decides the
architecture:

> Palettes validate against the same schema as corpus palettes.

There is an easy reading of that sentence and a hard one. The easy reading is *"the app checks
the same things"* — a set of validations in the screen that agree with
[`packages/corpus/src/palette.ts`](../../packages/corpus/src/palette.ts) today. The hard reading
is *"the app calls the same function"*.

The easy reading is worth rejecting on evidence rather than on principle. The rules a palette
editor breaks are exactly the ones the schema states:

- **at least one member is the `anchor`** — *"a palette without an anchor is a colour list"*;
- **ranks are contiguous from 1** — which is what a delete-without-renumber destroys;
- **weights are in `(0, 1]`** — a zero weight being a deletion written so it survives review;
- **a slug appears once**.

Two of those are produced by a reordering bug, and a reordering control is the feature. A
second implementation of those rules in a screen would be a second answer to *"is this a
palette"*, and the copy that drifts is always the one nobody is looking at.

### What makes the hard reading hard

`CorpusPalette` was designed for **provenanced editorial content**. It requires a `source`, a
`sourceId` that the content gate cross-checks against the register in
[`licensing-and-provenance.md`](../content/licensing-and-provenance.md) §5, an `authoredBy` that
must be an id in [`content/editors.json`](../../content/editors.json), a `derivation` long
enough to carry an epistemic claim, a `classification`, and a `versionId`.

A palette somebody builds on their phone has none of those things in the sense the corpus means
them. There is no register row behind it. No roster editor wrote it. It was not published.

So the question this ADR answers is not *"should we validate?"* — it is **what a device-built
palette is entitled to say about itself**, given that every one of those fields is required and
none of them may be filled in plausibly.

## Decision

**Every palette built in Palette Studio is parsed by `parsePalette` before it is written, and
again when it is read back. Its provenance states that it came from a device, using two
reserved identities that repository content may never use.**

### The record

| Field | Value | Why it is true |
|---|---|---|
| `slug` | the row's UUIDv7 | A uuid is valid kebab-case, unique without a registry, and — unlike a slugified name — makes no claim to be a name. Two palettes may share a name. |
| `classification` | `editorial` | The honest member of `OUR_OWN_CURATION` for work that is neither canonical nor a claim about the received canon. See the consequence below about its label. |
| `sourceType` | `editorial` | `checkClassification` then requires the classification to be one of ours, which it is. |
| `sourceId` | **`USER-LOCAL`** | Reserved. Not in the register, and enforced never to be. |
| `authoredBy` | **`user-local`** | Reserved. Not a roster id, and enforced never to be. |
| `derivation` | assembled by hand in Palette Studio from published entries of a named corpus version; nothing measured, converted or altered | The real derivation, and it is a stronger epistemic claim than most corpus entries carry: every member is an entry as published. |
| `status` | `draft` | Which makes `verifiedBy`, `verifiedAt` and `reviewIndependence` required to be `null` — exactly what an unreviewed palette is. |
| `versionId` | the corpus version the members came from | The fact that matters later, when a newer version supersedes an entry. |
| `name.en` / `name.ja` | the one string the person typed | We do not translate user content. There is one name; putting it in both fields says that, and inventing a second would not. |
| `weight` | derived from rank | See below. |

### The two reserved identities are enforced, not trusted

[`verify-content.mjs`](../../scripts/verify-content.mjs) rejects any record under `content/`
whose `sourceId` or `authoredBy` is either sentinel. Without that, a content record wearing one
would fail the *register* check instead — reading as a missing register row rather than as
content claiming to have come from somebody's phone.

Because both strings appear nowhere under `content/`, the check runs over an empty set on every
green build, which is indistinguishable from a check that does nothing. It therefore applies its
rule to a **planted record on every run** and fails if the planted record is accepted — and to a
clean one, and fails if that is rejected.

The constants live in `packages/corpus` so the app that writes them and the gate that forbids
them read the same two strings. Two copies of a reserved word is how a reserved word stops being
reserved.

### Weight is derived from rank

The corpus schema requires `weight` in `(0, 1]`; FR-49 asks for roles and ordering and says
nothing about a number per colour. Asking a person to type one would be inventing a requirement;
defaulting every member to 1 would make the field meaningless.

So rank 1 takes `1.0` and ranks 2..n descend linearly from `0.9` to `0.6`. **Order is
proportion** — which is also the only thing that makes a reorder control worth having, as
against a way to rearrange some rows.

It deliberately does **not** reproduce the seed palettes' weights. Those are hand-authored and
vary between sets because an editor weighed each one. A formula that claimed to reproduce
editorial judgement would be claiming something a formula cannot do.

### Storage

Migration 2 adds `saved_color.corpus_slug`, `palette.name_ja / classification / category /
version_id`, and `palette_member.weight` — the fields F-041's provisional tables could not
carry. `palette.id` doubles as the corpus `slug` and `palette_member.position` is the corpus
`rank`, because a second column for the same fact is a second thing that can disagree.

Every added column is **nullable with no default**. A `DEFAULT` would be a value nobody chose
standing in for one somebody must; `NULL` means *written before this column existed*, and the
read path refuses it by name.

A palette member **copies the corpus colour into `saved_color`**. That is what lets a palette
built against `2026.08.1` still show the colours the person chose after a later version
supersedes an entry, and `version_id` records which version it was built against.

## Consequences

### Good

- The rules a palette editor breaks are checked by the code that defines them, with messages
  that explain themselves. A reorder bug fails at the boundary rather than producing a saved
  palette nobody can interpret.
- A saved palette is re-parsed on the way **out** of SQLite, so a column that cannot carry what
  the schema needs is a failure at the seam rather than a screen that renders something odd.
- The device-local provenance is a positive statement rather than a gap. *"Built in Palette
  Studio on this device"* is more informative than most `sourceLicence` strings in the corpus.
- The reserved identities give the content gate a name for a real confusion it could otherwise
  only report obliquely.

### Bad — and this is the one to watch

- **`classification: "editorial"` renders as "Irodora original".** That label is true of the
  seed corpus and false of a palette somebody else made. The Studio never renders the corpus
  classification label — it states the origin in its own words, and `screens.test.tsx` asserts
  the label is absent as a whole text node. **This holds only as long as no surface renders user
  palettes generically.** A future "all palettes" view that reuses the corpus renderer would
  reintroduce the defect, and the assertion protecting against it lives on one screen.
- **The corpus schema now has a second kind of caller**, and a future change tightening
  provenance for editorial records — requiring `sourceUrl`, say — would break saving on a device
  with no compile error, only a runtime throw. E-013 gains this destination, and `gate:test`
  is the guard.
- **`saved_color` rows accumulate.** Every distinct corpus colour used in any palette gets a
  row. Deleting a palette tombstones the palette and its members and leaves the colours, because
  one saved colour may be in two palettes. Nothing garbage-collects them.
- Migration 2 raises `SCHEMA_VERSION` to 2, so an older build opening a newer database refuses
  to start — correct, and now reachable.

### Neutral

- `parsePalette` runs on every save. It is a parse of a small object and the cost is invisible
  beside a SQLite write.

## Alternatives considered

**Validate with rules written in the app.** Rejected on the evidence above: the two rules most
likely to break are the two the schema already states, and a second copy would be the one that
drifts. It would also have been cheaper to write, which is the argument that usually wins.

**Give a user palette a real register row and a roster id.** Rejected as dishonest in the
direction that matters most here. The register is a licensing record reviewed by a person before
each corpus version, and `editors.json` is a roster of people who agreed to review entries.
Adding a fictional row to either to satisfy a required field is exactly the failure the
provenance rules exist to prevent, pointed inwards.

**Store the validated palette as a JSON document in one column.** Rejected: `data-model.md` §5
already rejects the same shape for the reproducibility envelope — *"four separate columns, not
one JSON blob"* — because a blob makes *"which palettes use this colour"* a table scan and
*"which palettes were built against 2026.08.1"* unanswerable.

**A sixth classification, for user content.** Rejected: `Classification` is a contract with
every authored file and every renderer (E-013), and adding a member to it to describe something
that never appears in `content/` would put a corpus-wide concept in the schema for the benefit of
one screen. `editorial` is already the right *field*; only its *label* is wrong for this case,
and a label is a presentation problem with a presentation fix.

## Revisit when

- A surface renders user palettes alongside corpus palettes. That is when the classification
  label becomes a real defect rather than a documented one, and it should be met by giving the
  renderer the origin rather than by widening the schema.
- A palette can hold a colour that is **not** a corpus entry — a Lens capture (F-040). At that
  point `corpus_slug` is null for a member, the record can no longer be expressed as a
  slug-addressed corpus palette, and this decision needs its second half.
- `content/editors.json` gains a second editor, or the register gains rows. Neither changes this
  decision, but both make the reserved-identity check load-bearing rather than precautionary.
