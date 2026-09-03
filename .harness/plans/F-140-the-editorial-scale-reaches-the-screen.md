# Plan: F-140 — The editorial scale the manifest already specifies reaches the screen

| | |
|---|---|
| **Feature** | F-140 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-25, NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` · `@irodora/design-tokens` · `apps/mobile` · `scripts/` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

The design system specifies an editorial product — type from 72px to 10px, spacing to 96 —
and the application renders 22px-to-10px with a largest gap of 20. This feature makes the
scale reach the screen and makes it **impossible to bypass**: layout is stated as a step name,
never as a number, and the gate that let this happen starts failing instead of warning.

To a user: every screen gains the rhythm and the type contrast the system was designed around.
This is not the redesign — F-145 through F-152 are. It is the substrate they all compose with,
and doing it first is what stops seventeen screens being converted twice.

## Approach

**Reused:** `nativeSpacing`, `nativeType`, `nativeRadius`, `nativeElevation` from
`@irodora/design-tokens` — all already emitted, gate-checked against the manifest, and byte-
compared by `emit.test.ts`. `useTheme()` from `@irodora/ui`. The conformance registry in
`packages/ui/test/conformance.test.tsx` and the subject fixtures beside it. `verify-token-
reach.mjs` and `verify-spacing-scale.mjs` are extended, not replaced — both already read the
manifest rather than carrying a copy, which is the property that makes them worth extending.

**New:**

`packages/ui/src/layout.tsx` — four primitives whose spacing props are **step names, not
numbers**:

```ts
type SpacingStep = keyof typeof nativeSpacing;   // 'xs' | 'sm' | … | 'xl5'

<Screen  scroll title gap padding />   // the page root; replaces the ScrollView idiom
<Section title eyebrow gap />          // an editorial block with a real heading
<Stack   gap align />                  // vertical flow
<Row     gap align justify wrap />     // horizontal flow
```

`SpacingStep` is the whole mechanism. A screen cannot express `gap: 8` through these
primitives because the prop does not accept a number — the same move ADR-0005 makes for
provenance and F-139 makes for empty states: **the careless version is unbuildable** rather
than discouraged.

**Changed:** `Surface`'s `padding?: number` becomes `padding?: SpacingStep`. It is the current
leak — a tokenised component with an untokenised prop — and every one of its call sites passes
a literal today.

**Increments**, each leaving the build green:

1. `layout.tsx` + its unit tests + registry subjects. Nothing consumes it yet.
2. `Surface.padding` narrowed to `SpacingStep`; its call sites updated. `typecheck` is the
   proof that none were missed.
3. Screens converted to the primitives, in dependency order — leaf screens first, `Home` last.
   One commit per group so a regression bisects to a screen.
4. The gates tightened, and `unreached-tokens.json` given `closedBy`.

## Files to touch

```
packages/ui/src/layout.tsx              — NEW: Screen, Section, Stack, Row
packages/ui/src/index.ts                — export them and SpacingStep
packages/ui/src/Surface.tsx             — padding: number -> SpacingStep
packages/ui/test/fixtures/subjects.tsx  — subjects for the four primitives
packages/ui/test/conformance.test.tsx   — register them
packages/ui/test/layout.test.tsx        — NEW: the type refusals, proven
apps/mobile/src/screens/*.tsx           — 17 screens: scaffolding -> primitives
scripts/verify-spacing-scale.mjs        — unused editorial step: warn -> fail
scripts/verify-token-reach.mjs          — require closedBy; validate it
.harness/verification/unreached-tokens.json — closedBy on every entry
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `Surface.padding` type narrows | every `<Surface>` call site (11) | `typecheck` — a literal stops compiling |
| New exports from `@irodora/ui` | `a11y-scope.mjs` requires a registry subject | gate 8, already blocking |
| `unreached-tokens.json` gains a required field | `verify-token-reach.mjs` | the script itself, extended in this feature |
| Screens restructured | conformance subjects render screens | gate 8 + gate 9, already blocking |

**The one that needs care:** `verify-spacing-scale.mjs` moving from warn to fail changes a
gate's verdict on code this feature does not touch. That is the point of it — but it means the
gate must go red *before* the screens are converted and green after, and the plan's increment
order has to make that observable rather than accidental. Increment 4 is last for exactly that
reason. Recorded as an effect on E-0NN at trace time.

## Test plan

- **Unit:** each primitive renders the step it was given; `Screen` composes scroll and
  non-scroll variants; `Section` renders its eyebrow only when given one.
- **Negative, with a decoy:** `@ts-expect-error` on `gap={8}`, `padding={12}` and an unknown
  step name for all four primitives **and** for `Surface` — plus a decoy asserting that a
  valid step name still compiles, because a type that rejected every prop would satisfy the
  refusals and be worse than the gap it closed. Then the union is widened to `number` and
  `typecheck` must go red on the now-unused directives. This is F-139's proof shape and it is
  the only thing that shows the refusal is real rather than incidental.
- **Conformance:** four new subjects, `static` kind, rendered in both themes and both scripts.
- **Gate mutation:** `verify-spacing-scale.mjs --prove` must fail on an injected unused
  editorial step; `verify-token-reach.mjs --prove` must fail on a `closedBy` naming a `done`
  feature and on one naming no feature at all.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:a11y && pnpm test:contrast
node scripts/verify-spacing-scale.mjs --prove
node scripts/verify-token-reach.mjs --prove
```

## Risks and open questions

**`display.1` (72px) and `xl4`/`xl5` (56/96) may not be honestly reachable in this feature.**
They are hero values, and the surfaces that want them are F-146 (Home) and F-147 (Atlas).
Painting them somewhere merely to satisfy a check would be the exact failure ADR-0080 names in
its own "honest limit" section — reach is a floor, not a design review.

**Resolution, decided now rather than discovered later:** whichever of them F-140 cannot reach
honestly stays declared, with `closedBy` naming F-146 or F-147. The feature's acceptance
criterion 3 is then met in the form the ADR actually intends — every editorial step is either
*used* or *owned by a named feature* — and the notes record exactly which was which. Inventing
a use is not an option; silently dropping the criterion is not either.

## Out of scope

The redesign. No screen changes what it *says* or which controls it offers — this feature
changes how layout is *expressed*, and the visual consequence is rhythm and type contrast, not
new composition. Home keeps its ten buttons; F-145 and F-146 are where they stop being a list.
