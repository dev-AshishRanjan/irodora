# Plan: F-155 — Contemporary equivalents for a traditional colour

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-155 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | FR-72, FR-22, NFR-21                                      |
| **Service / package** | `apps/mobile` · `content` · `packages/corpus`             |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-07                                                |

---

## Intent

FR-72: *for a traditional entry, the contemporary colours that correspond to it.* Reported as
missing, and it is.

## Two things the feature's own note gets wrong, measured first

**`contemporaryNote_en` is not empty, and it does not hold what its name says.** The note claims
it is *"null in every content file"*. It is filled on **eight** entries, with curatorial prose
about each colour's role in this corpus:

> *"The corpus ceiling for chroma. It is here so that the Atlas has one colour that a screen
> renders convincingly and a camera estimate does not."*

That is a note about why the entry exists, not about what somebody could buy in it. Some of the
eight lean the other way — *"Offered as the alternative to black in the Indigo palette"* — so the
field is **mixed**, which is worse than either. Renaming a published field is a corpus version
change, so this is recorded as a finding and the feature adds a precisely named one instead.

**There are no traditional entries.** All 120 are `japanese-inspired`; none is `historical`, and
none carries an `era`. That is deliberate — F-011's rule is that our own curation cannot be
classified historical — but it means *"for a traditional entry"* has no subject today.

## The reading this feature builds under, stated rather than assumed

**The contemporary reference set is FR-22's own curated palettes.** Four palettes carry
`category: "contemporary"` and 28 entries appear in them, each with editorial provenance and a
named reviewer. That is the only thing in this product that is *contemporary* and signed off, and
"nearest contemporary reference by ΔE00" is exactly computable against it.

**Every entry can show its equivalents**, and the surface says that no entry in this corpus is
classified historical rather than implying one is. Reading "traditional entry" as "any entry"
overstates nothing; reading it as "an entry we call historical" would build a screen with no
subject.

## The two kinds, and why the distinction is the feature

**Computed** — the nearest members of a contemporary palette by ΔE00, with the delta shown and
the palette named. Deterministic, reproducible, and reusing `deltaE00` rather than adding a
second implementation of it.

**Editorial** — a recorded note with provenance and a reviewer, which the content gate already
enforces for every other editorial field.

**Conflating them is the failure to avoid.** A computed neighbour presented as editorial judgement
is a claim nobody made — the same move ADR-0005 makes for provenance, applied here. So they are a
**discriminated union**, and criterion 3 is discharged by `tsc`: a renderer cannot show one as the
other without a compile error.

**An entry that is itself in a contemporary palette** is the interesting case, and it is stated
rather than shown as a ΔE00 of 0.00 with no explanation: *this colour is in Quiet Neutrals.*

## Approach

1. **`apps/mobile/src/contemporary.ts`** — the union, and the computation. Nothing renders here;
   the screens format, as `compare.ts` and `finder.ts` already establish.
2. **The schema field** — `contemporaryEquivalents`, with provenance per entry, on the corpus
   entry type. Optional and absent from every published entry, because filling one is editorial
   work needing a named reviewer that the content gate enforces and I am not.
   **Proven against the fixture corpus**, which has fixture editors — the same seam every other
   editorial rule is proven through, and it is what stops this being a type nobody has rendered.
3. **The screen**, reachable from a colour and from a Lens reading — criterion 5 says *on their
   own screen*, and the Lens stays decluttered, so this is a way **out** of it.
4. **The claims lint** — criterion 4 asks for enforcement, and the gate already reads both
   languages since F-172. A pattern for describing an equivalent as a match, in both.

## Files to touch

```
apps/mobile/src/contemporary.ts             — new: the union and the computation
apps/mobile/test/contemporary.test.ts       — new
apps/mobile/src/screens/Contemporary.tsx    — new
apps/mobile/app/(tabs)/atlas/nearby/[slug].tsx — new route
packages/corpus/src/entry.ts                — the editorial field
packages/corpus/test/fixtures/valid/        — one entry that carries one
.harness/verification/claims.json           — the match pattern, both languages
apps/mobile/src/i18n/{en,ja}.ts             — the copy
```

## Anticipated effects

- **A corpus schema field** ⇒ gate 11, the fixture corpus, the bundle generator, and the version
  ledger. Optional and absent everywhere published, so no republication — but the parser, the
  bundle and the app's own corpus reader all see it.
- **A new claims pattern** ⇒ every file in the repository, including the ones that discuss the
  ban. Guard: the inline suppression marker, which has caught my own records four times.
- **A new screen and route** ⇒ `a11y-scope.mjs`, the conformance registry, gate 9 and the e2e
  route-target check.

## Test plan

- **The computation is deterministic and reuses ΔE00**: the same entry gives the same ranking, and
  the deltas match `deltaE00` computed directly.
- **The union cannot be misrendered**: `@ts-expect-error` on a computed value read as editorial
  and the reverse — which is criterion 3, asserted in **both** directions so a type that rejected
  everything would fail too.
- **An entry that is itself a palette member** says so rather than reporting ΔE00 0.00.
- **The editorial path renders**, against the fixture corpus, with its provenance shown.
- **The claims pattern discriminates**, with a real sentence per language and a green baseline.
- **The screen** in the conformance registry, in both themes and both locales.

## Risks and open questions

- **28 reference colours is a small set**, so a computed equivalent can be far away. The delta is
  shown for exactly that reason, and a distance the product cannot stand behind should say so
  rather than be presented as an answer — the threshold is a judgement, and it is stated in the
  copy rather than hidden in a constant.
- **The eight mixed `contemporaryNote_en` values stay as they are.** Renaming a published field is
  a corpus version change; the finding is recorded and the new field does not touch them.
- **No entry is `historical`**, so the feature's title is about a subject that does not exist yet.
  Recorded in the notes rather than papered over.

## Out of scope

- Adding historical entries, or an era to any entry. That is corpus work with its own provenance
  obligations.
- Renaming or repurposing `contemporaryNote_en`.
- Any external reference set — Pantone, RAL, a retailer's palette. Each is licensed, none is in
  this repository, and inventing one would be exactly the kind of unsourced claim ADR-0005 and the
  content rules exist to prevent.
