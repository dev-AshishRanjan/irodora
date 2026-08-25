# ADR-0071 — A token with no reader is a decision nobody applied

## Status

Accepted

## Date

2026-08-25

## Context

`docs/design/design-system.manifest.json` emits 21 exported bindings and 71 named values into
`packages/design-tokens/src/generated/`. Every one of them is checked twice: `emit.test.ts`
byte-compares four of the five artefacts against the manifest, and
`generate-design-tokens.mjs --check` compares all five (F-094 closed the gap on the fifth).

So we know each emitted value is **correct**. Nothing anywhere asked whether it was **used**.

That gap has cost us twice already. F-019 found `nativeNumericFeature` by hand — emitted,
exported, and reaching no component — and the only reason anyone noticed is that someone
happened to read the file. F-094 found the same shape at the artefact level with
`apps/mobile/global.css`, which every test agreed with and nothing compared.

[ADR-0054](0054-react-native-core-primitives-and-ui-stays-a-package.md) already settled the
identical question one level up, for components:

> Every component is either consumed by a real screen or registered in the conformance
> registry, and the scope reporter prints any that are neither and fails.

A component nobody renders and a token nobody paints are the same defect. Only one of them
was being reported.

## Decision

**Every value emitted from the design manifest is either read by a component or declared
unreached with a reason.** `scripts/verify-token-reach.mjs` runs in gate 8 beside
`a11y-scope.mjs` and fails on anything that is neither.

Four things make it a check rather than a lint rule with an allowlist.

### `testing/` is not a reader

`packages/ui/src/testing/conformance.ts` is the conformance checker. A token read only there
exists so a **check** can enforce it — a real purpose, and not a painted pixel. Excluding that
directory is what gives *"a token whose only reader is its own emitter test is reported by
name"* any meaning at all; including it would have quietly absorbed four of the findings.

### Reach is transitive through object values, never through keys or array elements

`Surface.tsx` reads `nativeElevation`, whose values are `background`, `surface.1`, `surface.2`,
`surface.3`. Those four are reached through a map, not a literal — `surface.1` appears nowhere
in the codebase as a string — so the closure has to propagate.

**Keys must not.** `theme.tsx` reads `nativeColors`, whose keys are all 33 colour tokens; one
import would otherwise mark the entire palette reached.

**Array elements must not either**, and that is the subtle one. `Text.tsx` reads
`nativeLargeTextSizes` to ask *is this size large text?* Propagating through it would mark
`display.1` and `display.2` reached on the strength of a question nobody answers with them.
**An object is looked up; a list is looked in.**

### Comments are not code

Found by the proof rather than by reading. `border.strong` was removed from all five components
that use it and the check still called it reached, because `Button.tsx` mentions
`` `border.strong` `` in a comment explaining why it does *not* pair. Backticks are one of the
quote characters a literal read is matched by, so **every JSDoc example in this repository was
counting as a consumer** — and this codebase comments heavily, by policy.

Stripping comments turned three more tokens honest, including `foreground.3`, whose every
mention in the reader zone is prose about why it is dangerous.

### The escape hatch is a file that prints itself

`.harness/verification/unreached-tokens.json`, in the shape of `retired-surface.json`: every
entry carries a `why` and a citation, **the whole list prints on every run** rather than only on
a failure, and **a declaration for a token that IS read fails**. Both directions, the rule the
source register (E-021) and the taxonomy vocabulary (E-028) already carry.

An inline `retired-ok:` marker was not available: `src/generated/native.ts` is rewritten by a
generator, so a marker in it would be erased on the next run.

## Consequences

**The allowlist starts at 34 entries, and that is the point.** It is a readable inventory of
what the design system has drawn and the product has not yet built — no chart, no dialog or
bottom sheet, no animation, no display type on any screen, and a `Status` component that
conforms and that no screen renders. Each entry names the feature that will consume it.

**One entry is a defect, not an exemption.** `nativeSpacing` is emitted, exported and imported
by nothing, while 69 hand-written padding/margin/gap declarations use eight values of which
**five are not on the scale** and three are not even multiples of the declared `base: 4`. That
is filed as F-095 and the declaration cites it. An escape hatch whose reason is a pointer to
work is working; one whose reason is a soothing sentence is not.

**A reader is found by string literal, which is a heuristic, not a type.** A component that
built a token name by concatenation would read a token this cannot see, and it would be reported
as unreached — a false positive, the failure mode that gets a check deleted. No such
construction exists today. If one appears, the answer is to stop constructing token names.

**Two granularities, and the check says which.** Named tokens are answered at leaf level;
`nativeSpacing` is an array with no names and `nativeMotion.forbidden` is prose, so both are
answered only at binding level. `nativeMotion.durations.micro` is not individually checked, and
the header says so rather than implying coverage it does not have.

**The generated modules are imported, not parsed.** Their value syntax is already valid
JavaScript, so stripping `export type` lines and `as const` leaves something a `data:` URL can
import — with a cross-check that every `export const` in the file came back and that every
manifest colour token was emitted, because a parser that under-reads would make this check pass
over a surface it never saw.

## Alternatives considered

**A lint rule on unused exports.** ESLint sees `packages/design-tokens` exporting a binding that
`packages/ui` imports and is satisfied. It cannot see that the manifest's `chart.3` reaches no
pixel, because nothing about that is an unused export — the export is used, by a re-export.

**Deleting the unreached tokens.** Right for dead code, wrong here. `COLOR`, `RADIUS`, `SPACING`
and `TAP_TARGET` are the web target, and they exist so web and mobile cannot drift the day a web
surface exists ([ADR-0020](0020-design-tokens-are-oklch-native.md)); deleting them removes the
guarantee, not the dead code. The five-step chart ramp exists because a data series must be
distinguishable without hue, and deciding that under deadline is how a rainbow palette ships.

**Declaring the exemptions in the manifest**, beside the `uncheckedReason` field colour tokens
already carry. Symmetric and appealing, but it only reaches colour tokens — `nativeSpacing` and
`nativeMotion` are not manifest tokens — and it would have put the F-095 finding inside the file
whose contents are the thing being checked.

**Counting `testing/` as a reader.** Simpler, and it would have made the first run nearly green.
It would also have made acceptance criterion 2 unsatisfiable by construction.
