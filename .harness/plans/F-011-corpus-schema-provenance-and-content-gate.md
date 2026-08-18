# Plan: F-011 — Corpus schema, provenance and the `content` gate

| | |
|---|---|
| **Feature** | F-011 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-21, FR-23, FR-24, FR-25, NFR-20 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `content` · `@irodora/corpus` |
| **Author** | Claude Code (Opus 5) — planner subagent, adopted with scope trimmed |
| **Date** | 2026-08-18 |

---

## Intent

The corpus is the product's editorial asset, and its value is not the hex values — it is that
every value can be traced to where it came from. This feature builds the machinery that makes
that structural rather than aspirational: a schema in which an entry without complete
provenance cannot parse, a build step in which `lab`/`oklch`/`hex` cannot be typed by a human,
a publication model in which editing a published entry makes something go red, and a gate that
fails the build on one incomplete record.

To a user: the provenance panel on a colour detail page is never blank, never stale, and never
attached to a value the engine no longer agrees with — because there is no path that produces
such an entry.

**No colour is added to the corpus by this feature.** F-011 builds the container and the check.
F-012 fills it. `content/colors/` is still empty when this is done.

---

## What exists, and what does not

`packages/corpus/src/index.ts` is four lines — a `Classification` union and
`CORPUS_SCHEMA_VERSION = '0.0.0'`. `content/{colors,palettes,rules,locales,schemas}` hold only
`.gitkeep`. `scripts/verify-content.mjs` **does not exist**, although `package.json` already
declares `"test:content": "node scripts/verify-content.mjs"` and `ci.yml` already has a gate 11
step. Gate 11 is `pending` in [`gates.json`](../verification/gates.json), `activatesWith: F-011`.

Five facts were verified in the tree rather than assumed, and each one moves the design:

**1. The CI step for gate 11 is conditional on the data existing** —
[`ci.yml:136`](../../.github/workflows/ci.yml) reads `if: hashFiles('content/colors') != ''`.
`scripts/verify-gate-mirror.mjs` proves every active gate has a step that *runs a command*; it
never reads `if:`. So a gate whose step is skipped would still look fully mirrored. Whether
`hashFiles` on a directory holding only `.gitkeep` returns a hash is a question about the
runner's hidden-file handling — and that uncertainty **is** the argument. Criterion 6 says the
gate "activates and fails the build"; it cannot honestly be called active behind that
condition. Removed here. That gate 0 cannot see a skipped step is a *general* defect (gates 7,
10, 12 share it) and is recorded as a proposed feature, not fixed under this number.

**2. `@irodora/corpus` is not in the engine-purity zone — and that is a hazard, not a
permission.** `eslint.config.mjs:94` scopes the platform-API ban to `packages/color-*/**` and
`packages/cvd-engine/**`; `verify-engine-purity.mjs` scopes it the same way. So `packages/corpus`
may today import `node:fs`. But **F-013 (colour naming) is blocked by F-011 and lives in
`packages/color-naming`**, which is inside that zone. The moment an engine package imports
`@irodora/corpus`, a `node:fs` inside corpus is inside the engine, with every gate green.
NFR-3 is the one guarantee that cannot bend, so `packages/corpus/src/**` gets the portability
override now, before there is a consumer to break.

**3. ADR-0043 was written to be applied here.** It says in terms: *"This is the rule the corpus
already lives under (F-011: derived values computed from `xyz` by the engine at build time,
never typed)."* The manifest → generate → gate-recomputes-and-compares pipeline in
`@irodora/design-tokens` is a working implementation of criterion 3 on a different dataset. It
is the model to copy, not to reinvent.

**4. There is no hex formatter in the engine.** `toHex` lives in
`packages/design-tokens/src/derive.ts:150`, over a `channelToByte` that clamps to `[0,1]` and
rounds to a byte — the standard sRGB byte encoding, nothing token-specific. The corpus needs
the same function, and writing a second one is the defect `AGENTS.md` §7 names.

**5. Three documents disagree about which provenance fields are required.**

| Source | Required provenance fields |
|---|---|
| [`color-corpus-spec.md`](../../docs/content/color-corpus-spec.md) §1 | `source · sourceType · derivation · verifiedBy · verifiedAt` |
| [ADR-0007](../../docs/adr/0007-colour-corpus-provenance-and-licensing.md) §1 | the above **plus** `publisher · publishedYear · rightsHolder · sourceLicence · editorialNotes` |
| NFR-20 | "source, type, **licence**, reviewer and date" |

**Resolution:** ADR-0007 and NFR-20 win; the spec's shorter list is the outlier and is
corrected here. That is bringing a document in line with an accepted decision, so it needs no
new ADR of its own. `sourceLicence` is required. A field genuinely inapplicable to a
`sourceType` — `publishedYear` on a `measurement` — goes through the explicit-null mechanism
below, not through being optional.

---

## Approach

### Reused

| What | From | For |
|---|---|---|
| `xyzToLab`, `xyzToLch`, `xyzToOklch`, `xyzToSrgb` | `@irodora/color-spaces` | every derived value |
| `gamutMap`, `gamutMapDetail`, `isInGamut` | `@irodora/color-spaces` | the hex of an out-of-gamut measured colour (E-012 — a clip here is the 33.6°-hue-shift failure that link exists to name) |
| `ENGINE_VERSION`, `CORE_VERSION` | `@irodora/color-spaces`, `@irodora/color-core` | stamped into every published bundle |
| `fromXyz`, `Provenance` | `@irodora/color-core` | an entry resolves to a `Color`; golden rule 12 has no corpus exemption |
| `parseManifest`'s hand-written-parser shape, and its stated reason for not using Zod | `packages/design-tokens/src/manifest.ts` | `parseEntry` |
| `derivedSrgb` / generator / `--check` shape | `packages/design-tokens/src/derive.ts`, `scripts/generate-design-tokens.mjs` | derive-and-compare (ADR-0043) |
| Gate-script house style, `pathToFileURL` for Windows, explicit "NOT CHECKED HERE" reporting | `scripts/verify-contrast.mjs` | `scripts/verify-content.mjs` |
| Mutation-proof shape, baseline asserted green before **and after** each mutation | `scripts/verify-contrast-proof.mjs` | `scripts/verify-content-proof.mjs` |
| Planted-violation guard shape | `scripts/verify-guards.mjs` | guard #11 |

**Not reused, deliberately:** `float64Digest` from `@irodora/testing` is FNV-1a and its own
docs say it is *"not defending against an adversary choosing a collision"*. A corpus checksum
is a tamper control whose mismatch is a SEV1 ([threat model
§9](../../docs/architecture/security/threat-model.md)). Using it here would be a silent
downgrade of a security control.

### New

```
packages/corpus/src/
  classification.ts   the five values, and the evidence each requires
  workflow.ts         draft→review→verified→published→superseded; author ≠ reviewer
  entry.ts            parseEntry — the schema, as a parser that names the field it rejects
  palette.ts          parsePalette — roles, ranks, the anchor rule
  derive.ts           deriveColor(xyz) → {lab, lch, oklch, rgb, hex}, entirely by delegation
  canonical.ts        canonicalize(value) → the deterministic string that gets hashed
  digest.ts           the DigestFn seam; the two-level (entry, root) digest scheme
  version.ts          the published bundle shape; publishVersion
  load.ts             loadPublishedVersion — checksum verified at load, or it throws
  register.ts         the licensing register parser and the source cross-check
  corpus.ts           whole-corpus invariants: duplicate slugs, relations, roster
  errors.ts           CorpusError(file, path, detail)
```

All of it **pure**: no `node:*`, no `zod`, no `process`. Reading files happens in `scripts/`,
exactly as `generate-design-tokens.mjs` does and for the same reason.

---

### D1 — The schema lives in `@irodora/corpus`, not `@irodora/contracts`

`@irodora/contracts` is the wire-format source of truth — *"every shape that crosses a process
boundary"*. **A corpus source entry never crosses a process boundary.** It is an authoring
format read from disk at build time. What crosses the boundary is the API's colour resource, a
*projection* of a published entry, and that belongs in contracts when F-016 defines it.

Three further reasons, in order of weight:

1. **Zod is a runtime dependency.** `design-tokens/src/manifest.ts` already argues this case:
   pulling Zod in would put a runtime dependency into a package `apps/mobile` bundles, to
   validate a file that only exists at build time. Here it is worse, because of the F-013
   hazard in fact 2 above.
2. **The gate's value is its error message.** NFR-20 promises the build fails *on a single
   incomplete entry* — so the entry and the field have to be named. `CorpusError(file, path,
   detail)` does that; a Zod issue tree needs a formatter longer than the parser to.
3. **The contracts ESLint override forbids interfaces and union type aliases** (schemas only).
   The `Classification` union that `packages/corpus` already exports, and F-013 will consume,
   cannot be declared there at all.

**The boundary decision that follows, and it is not optional.** `packages/corpus/src/**` gets
the portability override `packages/contracts/src/**` already has — `node:*`, `fs`, `path`,
`crypto`, `os` banned, tests excluded, with the workspace deep-import patterns **repeated
inside the override** because [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]] —
plus **guard #11** in `verify-guards.mjs`, which plants a `node:fs` import at
`packages/corpus/src/__guard__.ts` and asserts the rule fires. A rule nobody has watched fail
is not a boundary.

**Consequence, and it is the design rather than a limitation:** the loader cannot read the
filesystem. It takes already-read text, the way `parseManifest` takes an already-parsed object.

---

### D2 — Derived values: computed at publish, stored only in the bundle, re-checked against the live engine

**Where it runs.** `scripts/generate-corpus.mjs` (Node, reads files) calls `deriveColor(xyz)`
from `@irodora/corpus`, which calls `@irodora/color-spaces`. **No colour arithmetic is written
in this feature.** If a golden test in `color-spaces` moves, something has gone wrong.

**What it writes.** A published version is one generated file, `content/versions/<label>.json`
— which is literally what spec §6 draws. It holds every published entry with its derived block,
the `engine` and `corpusSchemaVersion` that produced it, `publishedAt`, and per-entry digests.

**A source entry under `content/colors/` carries no derived values at all.** `parseEntry`
rejects unknown keys, so `lab`, `oklch` and `hex` are not merely regenerated — they are
**unauthorable**. That is one step stronger than ADR-0043, which must regenerate-and-compare
because the manifest has to keep its `srgb` for browsers. Nothing needs the hex in a source
entry, so the stronger form is available.

Spec §3's hex-input path is preserved as `color.sourceHex` — a record of **what the source
printed**, never a derived value. The gate asserts `srgbToXyz(sourceHex)` agrees with the
entry's `xyz`, catching transcription errors in exactly the lossy path most likely to have one.

**Derived block:** `{ lab, lch, oklch, rgb, hex, hexIsGamutMapped, gamutMapDeltaE }`.

> **Interpretation, stated because it is a real ambiguity.** Criterion 3 names *(lab, oklch,
> hex)*; **FR-21 — also a requirement of this feature** — names *"hex, RGB, Lab, LCh, OKLCH"*.
> I read criterion 3's three as illustrative of the *rule* ("computed, never typed") rather
> than as an exhaustive field list, and derive all five: each is one existing engine call over
> the same `xyz`, adding no new risk surface, and FR-21 is not claimed by any other feature.

**The hex of an out-of-gamut colour is gamut-mapped, never clipped.** A measured indigo on silk
can sit outside sRGB. `gamutMapDetail` gives the mapped value *and* the ΔE00 cost, which is
recorded — because ADR-0031 requires the language "closest digital reference", and a number is
what makes that phrase honest rather than decorative.

**How the gate proves a committed derived value still agrees with the engine — the destination
half of E-001.** For the **latest published version**, the gate recomputes every derived value
from the entry's `xyz` with the *current* engine and compares. If `srgbToXyz`, an OKLab matrix
or the adaptation transform moves, the comparison fails and the message names the remedy
E-001's memory note already prescribes: rebuild and publish a new version, do not edit the
published one. For **superseded versions** the engine comparison is skipped — we cannot run an
engine we no longer have — and only the checksum is verified. **The gate prints that it skipped
them on every run**, following gate 9's "NOT CHECKED HERE" precedent rather than implying
coverage by being green.

---

### D3 — Checksums: canonical form, SHA-256, two levels, injected hasher

**What is checksummed.** Both levels, for different jobs:

- **Per entry** — `digest(canonicalize(entry))`. This is what lets a mismatch *name the entry*.
  A version-level digest alone turns a SEV1 into a manhunt.
- **Per version (root)** — `digest("irodora-corpus-v1\n" + sorted("<slug> <entryDigest>\n"))`.
  Domain-separated and order-independent. This is the value that goes in every cache key and
  resolves `ReproducibilityEnvelope.corpus` (E-006).

**How the digest is made stable.** Not over raw file bytes. `.gitattributes` normalises to LF
so raw bytes would *mostly* work — but then a reformat would be indistinguishable from
tampering, and *"there is no benign explanation for immutable content differing from its
recorded checksum"* has to stay true. So: **canonical form**, RFC 8785-shaped — keys sorted by
code unit, no insignificant whitespace, JavaScript's own shortest-round-trip number formatting,
UTF-8. Kanji are emitted as characters, not `\u` escapes, and the hasher encodes UTF-8 itself.
`content/colors/` and `content/palettes/` are already in `.prettierignore`; `content/versions/`
joins them, as generated output the generator owns.

**Which primitive, and why the seam.** SHA-256, injected:
`verifyBundle(bundle, expectedRootDigest, digestOf)` where `digestOf: (canonical: string) =>
string`. The gate script and, later, `apps/api` pass `createHash('sha256')` from `node:crypto`.
This keeps `packages/corpus/src` pure (D1) **and** avoids hand-writing SHA-256, which would be
homegrown crypto in a colour product for no benefit.

**"Verified at load", implemented so it is actually verification.** `loadPublishedVersion`
recomputes and **throws** on mismatch. There is no warn mode and no way to load unverified
content. Crucially, **`expectedRootDigest` is not read from the bundle being verified** — it
comes from `content/versions/index.json`, an append-only ledger of `{label, checksum, engine,
publishedAt, entryCount}`. A file checked against a checksum stored inside itself is not
checked.

**What this catches, and what it honestly does not.** It catches any edit to a published entry,
a reformat that changed a value, a restored backup, a swapped file. It does **not** catch an
editor who changes an entry *and* both digests in one commit — that is a two-file diff caught
by review, and in production by the audit-logged admin publish path (F-061/F-062). The gate
prints this in one line rather than letting a green run imply otherwise, and ADR-0046 says it
too.

---

### D4 — Editorial identity: a roster id, not a name

The spec's entry has `verifiedBy` and no author at all, so criterion 4 — *author and reviewer
must differ* — is currently unenforceable. Minimal honest addition to `provenance`:

```jsonc
"authoredBy": "ed-004",     // required
"authoredAt": "2026-08-11", // required
"verifiedBy": "ed-002",     // required at status verified|published — now a roster id
"verifiedAt": "2026-08-13"
```

Both are **ids into `content/editors.json`**, a roster of `{id, displayName, roles[], active}`.
A free-text comparison would pass `"A. Ranjan"` against `"Ashish Ranjan"` — the same person,
two strings — which is the check pretending to work. The gate resolves both ids against the
roster (an unknown id fails), asserts they differ, and asserts the reviewer holds a `reviewer`
role.

**This is an addition to the spec, recorded as one.** §1, §5 and §8 all change, and because it
adds a required field to a schema other features depend on it needs **ADR-0047**.

OQ-5 (Japanese editorial reviewer engagement model) is attached to F-012, not here. The roster
is the *mechanism*; OQ-5 decides who goes in it. F-011 is not blocked.

**The register cross-check, in scope because a binding document already claims it exists.**
[`licensing-and-provenance.md`](../../docs/content/licensing-and-provenance.md) §5 states:
*"The `content` gate cross-checks `provenance.source` against this register."* Today it does
not, and a document asserting a check that does not exist is the exact defect this repository
keeps catching. So: entries carry `provenance.sourceId` matching an `ID` in the register table,
and `provenance.source` must equal that row's `Source` cell. The gate parses the markdown table
and **treats an unparseable table as a failure, never as an absence of constraint**
[[a-gate-that-errors-is-failing-open]]. The register stays a human-reviewed governed document —
generating it would remove the human control that is its whole purpose. With zero registered
sources today, any entry citing a source fails: the failing-closed direction.

**FR-21's "no silent blanks" gets a mechanism, not a promise.** An optional field is either a
value or `null`, and every `null` needs a matching entry in `entry.unknowns`:

```jsonc
"unknowns": { "taxonomy.material": "no dyeing record survives for this name" }
```

A `null` without a reason fails; a reason without a `null` fails. Same shape as the design
system's `uncheckedReason`, which exists because an unchecked token was otherwise
indistinguishable from a passing one.

---

### D5 — Making a gate with zero entries discriminate

**The problem, stated plainly:** F-011 ships the gate, F-012 ships the entries. A gate that
passes because there is nothing to check is failing open, and every gate activated in this
repository so far was watched fail on a real mutation first.

**1. The gate fails on an empty world it did not expect.** `verify-engine-purity.mjs` sets the
precedent — a check that silently passes over an empty set has either lost its data or is
looking in the wrong place, and both are failures. Gate 11 asserts it located `content/colors/`,
`content/editors.json`, the register table and the fixture corpora, and fails if any is missing.

**2. The rule set runs against fixtures every time, so the number of rules exercised is never
zero.** The gate loads the fixture corpora and asserts the valid one passes and each invalid
one fails *with the expected message*.

**3. Fixtures live where they cannot be mistaken for corpus content.**

```
packages/corpus/test/fixtures/
  README.md          first line says nothing here is corpus content
  valid/             a complete, PASSING decoy corpus — 4 entries, 1 palette,
                     1 published version, a roster and a register fixture
  invalid/<rule>/    one directory per gate-charter bullet
```

Three independent reasons they cannot be confused: they are under `packages/`, not `content/`;
the corpus scan globs `content/colors/**` and `content/palettes/**` only; and **every fixture
slug begins `fixture-`, with the gate failing if a `fixture-` slug ever appears under
`content/`**. A convention plus a check, not a convention.

**4. `scripts/verify-content-proof.mjs` — the discrimination proof, its own unconditional CI
step** (precedent: "Gate 9 — contrast mutation proof"). It mutates the **valid decoy corpus** —
one that genuinely passes before each mutation — and asserts the gate exits 1 *and names the
right entry and field*. Baseline asserted green before and after every mutation
[[a-decoy-that-is-not-broken-proves-nothing]], and the proof stays runnable so it cannot rot
into a mutation that stopped discriminating
[[a-decoy-written-against-old-values-quietly-stops-discriminating]].

| # | Mutation on the valid decoy | Charter bullet |
|---|---|---|
| 1 | delete `provenance.derivation` | required field missing |
| 2 | delete `sourceLicence` | NFR-20 / ADR-0007 |
| 3 | blank `verifiedBy` on a `published` entry | verified without a reviewer |
| 4 | set `authoredBy` = `verifiedBy` | author and reviewer identical |
| 5 | two roster ids that are the same person by display name | the check the id scheme exists for |
| 6 | `classification: "historical"` with `sourceType: "editorial"` | our curation marked historical (criterion 2) |
| 7 | `classification: "historical"` with no dated primary source | historical without a date |
| 8 | change one hex digit in a published derived value | derived inconsistent with `xyz` — **E-001 destination** |
| 9 | change `xyz` without regenerating | same check, other direction |
| 10 | perturb an OKLab matrix element in the engine, rerun | E-001 as it will actually arrive |
| 11 | remove the `anchor` role from the palette | palette without an anchor |
| 12 | point a relation at a missing slug | dangling relation |
| 13 | edit a published entry, leave the ledger alone | checksum mismatch |
| 14 | duplicate a slug across two files | duplicate slug |
| 15 | `sourceId` absent from the register | licensing §5 cross-check |
| 16 | reorder keys and reformat an entry | **must stay GREEN** — canonicalisation working |
| 17 | a `null` with no `unknowns` reason | FR-21, no silent blanks |
| 18 | a `fixture-` slug placed under `content/colors/` | fixtures cannot become content |

Case 16 is the one that must stay green. A proof where every mutation is red cannot distinguish
a working gate from a gate that fails on everything.

**5. The CI condition is removed**, so gate 11 runs on every commit from the moment it is active.

---

### D6 — File layout

```
content/
  colors/<slug>.json        authored source entry — draft|review|verified. No derived values.
  palettes/<slug>.json      authored palette
  editors.json              the identity roster
  versions/<label>.json     GENERATED, immutable once published: entries + derived + digests
  versions/index.json       append-only ledger: label → {checksum, engine, publishedAt, count}
```

The alternative — a directory per version holding a full copy of every entry — makes
immutability a property of files, which is attractive, and was rejected because publishing a
one-entry correction would produce a 200-file diff in which the real change is invisible. A
single generated bundle plus a ledger gives the same immutability property with a reviewable
diff. **ADR-0046**, because F-012, F-016 and F-061 all build on it.

---

## Increments

Each leaves the build green and is verifiable alone.

| # | Increment | Verified by |
|---|---|---|
| 0 | This plan committed; `feature_list.json` gains `plan` and the attested entry | `state` |
| 1 | **Boundary first.** ESLint portability override for `packages/corpus/src/**`; guard #11 | `lint`, `verify:guards` |
| 2 | `classification.ts`, `workflow.ts`, `errors.ts`; `CORPUS_SCHEMA_VERSION → '1.0.0'` | `typecheck`, `test`, `build` |
| 3 | `entry.ts` — `parseEntry`, unknown keys rejected, `unknowns`, every required field | `test` |
| 4 | `palette.ts` — roles, ranks, weights, the anchor rule | `test` |
| 5 | `canonical.ts` + `digest.ts` + the golden digest fixture and the FIPS 180-4 hasher check | `test` |
| 6 | `corpus.ts` + `register.ts` — duplicate slugs, relations, roster, register cross-check | `test` |
| 7 | `srgbToHex` into `@irodora/color-spaces`; `design-tokens.toHex` delegates; `derive.ts` | `test`, `color-golden`, `contrast` |
| 8 | `version.ts` + `load.ts` + `scripts/generate-corpus.mjs` — bundle, ledger, verify-at-load | `test` |
| 9 | `scripts/verify-content.mjs` — the gate itself | run it |
| 10 | Fixture corpora + `scripts/verify-content-proof.mjs`; **watch all 18 cases** | run it |
| 11 | Activate gate 11 in `gates.json`; unconditional CI step + proof step | `state`, `verify:mirror` |
| 12 | ADR-0046/0047, spec + licensing edits, effects, memory notes, `progress.md` | `state` |

---

## Files to touch

```
packages/corpus/src/{index,classification,workflow,entry,palette,derive,canonical,
                     digest,version,load,register,corpus,errors}.ts   — new
packages/corpus/test/*.test.ts                                        — new
packages/corpus/test/fixtures/**                                      — new; NOT corpus content
packages/corpus/golden/canonical-digest.fixture.json                  — fixed inputs → fixed SHA-256
packages/corpus/package.json         — deps: color-core, color-spaces; scripts: generate
packages/color-spaces/src/rgb.ts     — add srgbToHex (the engine owns sRGB encoding)
packages/color-spaces/src/index.ts   — export it
packages/design-tokens/src/derive.ts — toHex delegates to srgbToHex; output byte-identical
scripts/verify-content.mjs           — new, gate 11
scripts/verify-content-proof.mjs     — new, the mutation proof
scripts/generate-corpus.mjs          — new: derive → publish → --check
scripts/verify-guards.mjs            — guard #11
eslint.config.mjs                    — packages/corpus/src/** portability override
.prettierignore                      — content/versions/
content/editors.json                 — the roster
content/versions/index.json          — the ledger, empty
.github/workflows/ci.yml             — gate 11 unconditional; add the proof step
.harness/verification/gates.json     — content → active, activatedAt, honest description
.harness/state/effects.json          — E-001, E-006 rationale; new E-013, E-014
.harness/memory/effects/*.md         — two updated, two new
.harness/memory/index.md             — lines for the new notes
.harness/state/feature_list.json     — plan field; attested entry; the two follow-up features
docs/content/color-corpus-spec.md    — §1 required list, authoredBy/At, sourceId, unknowns,
                                       §3 derived-in-bundle, §6 layout, §8 gate charter
docs/content/licensing-and-provenance.md — §5 ID column semantics
docs/adr/0046-published-corpus-is-an-immutable-generated-bundle.md   — new
docs/adr/0047-editorial-identity-is-a-roster-id-not-a-name.md        — new
```

---

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| **A derived value is committed against a specific engine** | every entry's `lab/lch/oklch/rgb/hex` | **E-001, destination half — the one this feature owes.** `gate:content` recomputes from `xyz` with the live engine and fails naming the entry. Proof case 10 perturbs an OKLab matrix and watches it go red. E-001's rationale and memory note stop saying "half-guarded" |
| **A corpus publish mints a version** | caches, envelopes, the F-016 catalog | **E-006.** `guard: gate:content` becomes real rather than promised: bundle immutability, ledger agreement, verify-at-load |
| **`parseEntry` is the schema every entry must satisfy** | `content/colors/**`, `content/palettes/**`, the F-016 wire projection, the spec | **New E-013**, guard `gate:content`. Caught only because the gate re-parses *every* entry rather than trusting a stored validity flag |
| **`canonicalize` decides what a checksum means** | every digest ever recorded, in files and later in Postgres | **New E-014**, guard `gate:content` + `packages/corpus/golden/canonical-digest.fixture.json`. The subtle one: changing canonicalisation invalidates every stored digest with **no import edge to the data**, and with zero entries only a committed golden digest can catch it |
| **`@irodora/corpus` becomes importable from `packages/color-naming` (F-013)** | NFR-3 | The ESLint override + guard #11, built in increment 1. The *transitive* case — an engine package depending on a package that declares a runtime dependency — is **not** covered and is recorded as a proposed feature, because `verify-engine-purity.mjs` allows any `@irodora/*` specifier without following the edge |
| **`srgbToHex` moves into the engine; `design-tokens.toHex` delegates** | `packages/design-tokens` generated output | **E-007.** `packages/design-tokens/test/emit.test.ts` byte-compares generated files and gate 9 recomputes every hex, so any behavioural difference goes red immediately. **Fallback if it does:** revert, leave `design-tokens` untouched, accept one duplicate formatter, and record it |
| **Gate 11's CI step becomes unconditional** | CI | `verify-gate-mirror.mjs`. **Finding:** that check reads `run:` and not `if:`, so a conditional step on an active gate is invisible to gate 0. Fixed for gate 11 here; the general case is recorded as a proposed feature |

Each new link needs its `.harness/memory/effects/*.md` note and an `index.md` line, or gate 0
fails — which is the mechanism working.

---

## Test plan

**Golden — is this correct against reality?**

- `packages/corpus/golden/canonical-digest.fixture.json`: fixed canonical inputs → fixed
  SHA-256 hex, each entry stating that the expected value was produced by `node:crypto` over
  the stated string. Its job is to fail if `canonicalize` ever changes (E-014).
- The SHA-256 injection checked against the **FIPS 180-4 published vectors** (`"abc"` →
  `ba7816bf…`), cited. We are not implementing SHA-256; we are proving the thing injected *is*
  SHA-256.
- The derived-value path checked against **cited datasets that already exist** in
  `packages/color-spaces/golden`: three fixture entries whose `xyz` comes from a published
  reference and whose expected `lab`/`oklch`/`hex` come from that same source, not from our own
  output. A derivation test comparing our generator to our engine is a test of self-agreement.

**Property (`fast-check`) — is this consistent everywhere?**

- `canonicalize` is invariant under key permutation, whitespace and indentation; and *changes*
  when any single character of any value changes.
- `parse → serialise → parse` is a fixed point.
- Two runs over the same corpus produce identical digests — no `Date`, no `Math.random`, no
  iteration-order dependence.
- Every derived `hex` round-trips into the entry's gamut-mapped sRGB.

**Conformance.** None applies: no port is introduced. The `DigestFn` seam *will* have a second
implementation the day a browser needs a synchronous verify, and a conformance case is owed
**then**. Recorded, not built.

**E2E.** None. The corpus has no surface until F-018.

**Negative — with decoys, never empty fixtures** [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]:

- The 18-case mutation table, each asserting the baseline green first and last, and each
  asserting the *message names the right entry and field* — not merely that the exit code was 1.
- `loadPublishedVersion` against a bundle with one flipped byte: throws. Against a bundle whose
  ledger entry is missing: throws. Verifying a bundle using a checksum taken from itself: **not
  expressible**, with a `@ts-expect-error` compile-fail test saying so.
- Gate 11 with `content/colors/` empty: exits 0 **and prints "0 authored entries"** beside the
  fixture rule count, so nobody can read the green as coverage.
- Gate 11 with the fixture directory deleted: exits 1. A gate that lost its own test data must
  not pass.

---

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-gate-mirror.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:golden && pnpm build
pnpm test:content                          # gate 11 — activating here
node scripts/verify-content-proof.mjs      # the 18 mutations
pnpm test:contrast && pnpm test:cvd        # blocking; increment 7 touches design-tokens
```

**Evidence to capture:** the pass line for every gate above; the full mutation table with each
case's exit code and the message it produced, including case 16 staying green; the authored-entry
count (`0`) printed beside the fixture rule count; `gates.json`'s `content` entry moving to
`active` with `activatedAt`; and an explicit **Not run** list. **Gate 11 is not declared active
until every one of the 18 cases has been watched**, which is the standard every other active
gate here was held to.

---

## Risks and open questions

- **The gate checks nothing real until F-012.** The fixtures are what make it discriminating and
  the mutation proof is what makes that claim checkable. This must appear in the gate's own
  output on every run, not only here.
- **Immutability is enforced against accident and detected — not prevented — against intent.** A
  committer who edits an entry *and* the ledger passes. The two-file diff and review are the
  control; the audit-logged publish path arrives with F-061/F-062. ADR-0046 says so rather than
  letting "immutable" imply more than it delivers.
- **The register cross-check parses a markdown table.** Brittle by nature; mitigated by failing
  closed on an unparseable table and fixture tests over both a good and a malformed one.
- **The roster proves two ids differ. It does not prove a person read the entry.** F-012 already
  carries that as an attested obligation, and F-011 must not appear to discharge it.
- **`sourceLicence` becoming required may pinch real F-012 entries** whose licence is genuinely
  "public domain, our own measurement". `sourceLicence: "n/a"` must not be acceptable; the
  `unknowns` mechanism forces a stated reason instead.
- **Windows/UTF-8.** Kanji in fixtures and canonical forms: read and write UTF-8 explicitly at
  both ends [[powershell-51-round-trips-utf8-into-mojibake]]. A mojibaked fixture would produce
  a stable-but-wrong digest, which is the worst failure available here.
- **No `OQ-*` blocks this feature.** OQ-4 (seed size) and OQ-5 (Japanese reviewer) attach to
  F-012 and concern content, not schema.
- **Attested criterion, declared now rather than discovered at the end.** Criterion 2 reads
  *"Five classifications enforced and displayed; our own curation cannot be marked historical"*.
  **"Enforced" is gated** — the parser rejects any other value, and mutations 6 and 7 cover the
  historical claim. **"Displayed" cannot be proven by anything this feature builds**: there is no
  surface until F-018. Declared in `feature_list.json` as an outstanding attested obligation,
  with the criterion string matching `acceptance` verbatim because gate 0 enforces that.

---

## Out of scope

- **Real corpus entries and palettes — F-012.** Not one colour ships here.
- **Rule weights and harmony rules in `content/rules/` — F-029** (E-009, `guard: none`, honestly
  recorded there).
- **Serving the corpus: routes, caching, the wire projection — F-016.** F-011 ships a loader
  that verifies; wiring it into the API boot path is F-016's obligation, and the gate says so
  rather than implying the API verifies today.
- **The admin publish UI and its audit log — F-061; the editorial workflow UI — F-062.** F-011
  defines the state machine and the identity rule; nothing drives them through a screen.
- **Database tables for corpus content** — data-model §3 is the target shape, not this
  feature's deliverable.
- **Colour naming and nearest-match over the corpus — F-013.**
- **A JSON Schema in `content/schemas/` for editor autocomplete.** Useful for F-012 authors,
  required by no acceptance criterion, and a second source of truth if done carelessly.
  Recorded as a follow-up.
- **Making `verify-engine-purity.mjs` follow `@irodora/*` dependency edges.** Genuinely
  valuable — it is what protects F-013 from a transitive runtime dependency — but it is a change
  to a repository-wide guard, not to this feature's subject. **Recorded as a proposed feature.**
- **Teaching gate 0's CI-mirror check to notice conditional steps.** Gate 11's own condition is
  removed here because criterion 6 requires the gate to actually run. The general defect is
  **recorded as a proposed feature**, not fixed under this number.
- **`content/locales/` and translation workflow** — i18n features.
- **Legal review of the register's contents** — governance, and it happens before a version
  ships, not before the schema exists.
