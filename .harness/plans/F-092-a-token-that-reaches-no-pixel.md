# Plan: F-092 — A design token that reaches no component fails a check

| | |
|---|---|
| **Feature** | F-092 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `scripts` · `packages/design-tokens` · `.harness/verification` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-25 |

---

## Intent

The manifest emits **21 exported bindings** and dozens of named tokens into
`packages/design-tokens/src/generated/`. Every one of them is byte-compared against the
manifest by `emit.test.ts` and by `generate-design-tokens.mjs --check`, so we know the
emitted value is *correct*. **Nothing anywhere asks whether it is used.**

That is the gap F-019 found by hand with `nativeNumericFeature` — emitted, exported, and
reaching no component until someone happened to look — and the gap F-094 found again with
`apps/mobile/global.css`, an artefact whose freshness nothing compared.

**Done, to a reviewer:** a token nobody paints is either read by a component or written down
as unreached, with a reason, in a file that is printed on every run.

## Approach

### The shape already exists, one level down

[ADR-0054](../../docs/adr/0054-react-native-core-primitives-and-ui-stays-a-package.md) gave
`a11y-scope.mjs` the rule for *components*: every component is consumed by a real screen or
registered, and anything outside the closure fails. **This is the same computation over token
values**, and the hard part is the same one — the escape hatch, because some tokens
legitimately have no consumer yet.

So it goes beside `a11y-scope.mjs` in gate 8, runs before the suite, and answers the question
the suite cannot.

### What counts as a reader, and why `testing/` does not

| zone | counts as a reader |
|---|---|
| `packages/ui/src/*.tsx`, `theme.tsx` | **yes** |
| `apps/mobile/src/**`, `apps/mobile/app/**` | **yes** |
| `packages/ui/src/testing/**` | **no** — this is the conformance checker |
| `**/test/**`, `*.test.*` | **no** |
| `packages/design-tokens/**` | **no** — the emitter reading its own output is not reach |

Excluding `testing/` is what gives acceptance criterion 2 its teeth: *"a token whose only
reader is its own emitter test is reported by name"*. A value that exists so a **check** can
enforce it is a real thing, but it is not a painted pixel, and the difference should be
written down rather than inferred.

### Reach is transitive through values, never through keys

`Surface.tsx` reads `nativeElevation`, whose values are `background`, `surface.1`,
`surface.2`, `surface.3`. Those four tokens *are* reached — through a map, not a literal. So
a binding read by a component marks any token name **among its values** reached.

**Keys are the opposite case and must not propagate.** `theme.tsx` reads `nativeColors`,
whose keys are all 33 colour tokens; if keys propagated, one import would mark the entire
palette reached and the check would be worth nothing. Values, never keys.

### Granularity: named tokens at leaf level, everything else at binding level

Checked by name: **colour tokens** (33, union of both themes) · **radius steps** (7) ·
**type steps** (7) · **status kinds** (3) · **all 21 exported bindings**. Seventy-one names.

`nativeSpacing` is an array with no names and `nativeMotion.forbidden` is prose; both are
checked at binding level only, and the check says so rather than implying a leaf-level
guarantee it does not give.

### The declaration is a file, because the artefact is generated

`retired-ok:` is an inline marker because the prose it exempts is hand-written.
`src/generated/native.ts` is rewritten by a generator, so an inline marker there would be
erased on the next run. The declaration therefore lives in
**`.harness/verification/unreached-tokens.json`**, beside `retired-surface.json`,
`discharged-claims.json` and `advisories.json`, and keeps their shape exactly:

- every entry carries a **`why`** and a **citation** (an ADR or a feature id);
- **the reasons are printed on every run**, not only on failure — an exemption nobody reads
  is an exemption nobody weighs;
- **a declaration for a token that IS reached fails.** Both directions, the same rule the
  source register (E-021) and the taxonomy vocabulary (E-028) carry: a dead exemption is how
  a live one gets waved through later.

## What the first run reports (measured, before writing the check)

A prototype scan over the real tree, with the closure applied:

| group | unreached | the honest reason |
|---|---|---|
| `COLOR` `RADIUS` `SPACING` `TAP_TARGET` | 4 | **the web target.** Only reader is `emit.test.ts`. There is no web surface (ADR-0051); the target exists so the two cannot drift when there is (ADR-0020) |
| `TEXT_TOKENS` `nativeSmallTextSizes` `nativeLargeTextMinPx` | 3 | read only by a type test or by `conformance.ts` — they exist to constrain, not to paint |
| `backdrop` + 4 composites, `border` + 4 composites, `ring` | 11 | no dialog, no bottom sheet, no focus ring built yet |
| `chart.1`–`chart.5` | 5 | no chart built yet |
| `nativeMotion` | 1 | **nothing in the product animates.** `verify-motion.mjs` guards the rule from the manifest side |
| `nativeRadius.lg` `.xl`, `display.2` | 3 | scale steps no surface has needed |
| **`nativeSpacing`** | 1 | **a real finding — see below** |

**Corrected after building it: 34, not 27.** Three things the prototype scan got wrong, each
of which made the real check sharper:

- **Comments were counting as reads.** A literal is matched inside any quote character
  including a backtick, and this repository comments heavily by policy — so every JSDoc
  example was a consumer. Found by the proof, not by reading it. Stripping comments added
  `LARGE_TEXT_TOKENS`, `foreground.3` and `display.1` to the list, and `foreground.3` is the
  most interesting name on it: the token whose entire purpose is to be restricted is painted
  by nothing, and every mention of it in the reader zone is prose about why it is dangerous.
- **`nativeRadius.pill` is a read.** The prototype looked only for quoted literals and
  reported every radius step in the product as unreached.
- **`xs` is a radius step and a type step**, and 22 `size="xs"` literals were marking the
  radius reached. A name in two groups is now resolvable only from an owner- or prop-scoped
  read.

### `nativeSpacing` is the finding, and it is bigger than this feature

The scale is `4, 8, 14, 20, 28, 40, 56, 96`. It is emitted, exported, and **imported by
nothing**. Meanwhile 69 hand-written padding/margin/gap declarations across `packages/ui/src`
and `apps/mobile/src` use `1, 2, 4, 6, 8, 12, 16, 20` — and **36 of the 69 use a value the
scale does not contain**.

This is not a substitution I can make inside F-092: it changes layout on every screen, and
five of the eight values in use are not decisions the manifest ever made. Golden rule 5 says
a known break is fixed now or **recorded as a feature**, never left unrecorded — so it is
filed, and `nativeSpacing`'s declaration **cites the feature id**. That is the escape hatch
working the way it is supposed to: the reason is not a soothing sentence, it is a pointer to
the work.

## Files to touch

```
scripts/verify-token-reach.mjs                    — NEW: the check, with --prove
.harness/verification/unreached-tokens.json       — NEW: the declarations
package.json                                       — test:a11y runs it; verify:tokens:reach* scripts
.github/workflows/ci.yml                           — the proof step
docs/adr/0071-a-token-with-no-reader-is-a-decision-nobody-applied.md — NEW
.harness/state/effects.json + memory/effects/      — E-029
.harness/state/feature_list.json                   — F-092 done, the spacing feature filed
.harness/state/progress.md
```

No file in `packages/`, `apps/` or `content/` changes. This feature adds a check and writes
down what it finds; it does not move a pixel.

## Anticipated effects

| Change | Propagates to | Guard |
|---|---|---|
| **A new manifest token** | must gain a reader or a declaration | `gate:a11y` — the new check. **New link.** |
| **Deleting the last consumer of a token** | the token becomes unreached | `gate:a11y` — the case criterion 3 proves |
| **A declaration for a token that gains a reader** | the declaration is now dead | `gate:a11y` — the reverse direction |
| **Renaming an export in `src/generated/`** | the reader scan by identifier | `gate:typecheck` first, then this |

## Test plan

`--prove`, run in CI, scanning **in-memory overrides** rather than the working tree — this
session has already left a mutated manifest behind once, and a proof that edits `packages/`
is a proof that can fail dirty.

1. **Baseline clean, asserted first** — the real tree reports nothing undeclared. A plant
   against an already-red baseline proves nothing.
2. **Remove a real consumer** (criterion 3): drop the `nativeNumericFeature` import from the
   real `Text.tsx` source and assert the check names **`nativeNumericFeature`** — F-019's
   exact defect, replayed.
3. **Remove a colour literal**: drop `'border.strong'` from `Button.tsx` and assert it is
   *not* reported, because four other components still read it — then drop it from all five
   and assert it **is**. The second half is the decoy: a check that fires while a reader
   remains is a check that gets switched off.
4. **A stale declaration fails**: declare a token that is read, assert the check reports the
   declaration.
5. **A declaration with no `why` or no citation fails.**
6. **Every plant asserts that the value it meant to change actually changed** — a mutation
   that silently no-ops is a test that passes for the wrong reason.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-token-reach.mjs && node scripts/verify-token-reach.mjs --prove
node scripts/gate.mjs typecheck && node scripts/gate.mjs lint && pnpm test:a11y
```

`test` stays red repo-wide for the Node 22 reason F-093 made visible and F-083 owns.

## Risks and open questions

- **A reader found by string literal is a heuristic**, not a type. A component that builds a
  token name by concatenation reads a token this cannot see, and would be reported as
  unreached — a false positive, the failure mode that gets checks deleted. No such
  construction exists today; the check says this in its own header so the next person knows
  which way it errs.
- **The allowlist starts at 27 entries.** That is large, and it is the point: it is a
  readable inventory of what the design system has drawn and the product has not yet built.
  If it grows without anyone reading it, the citations are what makes that visible.
- **Leaf-level does not reach `nativeMotion.durations.micro`.** Stated, not implied.
- No `OQ-*` blocks this feature.

## Out of scope

Moving the 69 hardcoded spacing values onto the scale — filed as its own feature · the CSS
and Tailwind targets, which have no reader zone to scan because there is no web surface ·
icon tokens, which are names in `STATUS_PAIRING` rather than emitted values · any change to
what the manifest declares.
