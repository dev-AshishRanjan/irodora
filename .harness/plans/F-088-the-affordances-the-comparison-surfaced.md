# Plan: F-088 — Text gains the affordances the HeroUI comparison surfaced, and the wrapper policy is written down

| | |
|---|---|
| **Feature** | F-088 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9, NFR-11 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` · `@irodora/design-tokens` · `apps/mobile` · `docs/design` |
| **Decision** | [ADR-0062](../../docs/adr/0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md) |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-24 |

---

## Intent

This feature was written as *"rebuild Text, Icon, Status and Surface as HeroUI wrappers"*.
Reading HeroUI's equivalents against ours found **no behaviour to inherit**, and re-scoping it
was a recorded decision rather than a quiet narrowing.

| Ours | HeroUI | What wrapping would buy |
|---|---|---|
| `Text` | `Text` / `Text.Heading` | `accessibilityRole="header"` and `dynamicTypeRamp` — **both native React Native `Text` props** |
| `Surface` | `Surface` | Variants matching our levels, **plus** a `ThemeBackground`/`GlassView` blur layer that would stay permanently disabled |
| `Icon` | *none* | — |
| `Status` | *none* | `Alert` is a banner, not an inline status, and cannot carry ADR-0044's three channels |

`Button` genuinely gained and was rebuilt in F-087. These four are a `<Text>` and a `<View>`
with tokens; there is no press behaviour, focus return or dismissal to take.

The Surface case is the sharpest: **a blur tints what it surrounds**, which is the exact
simultaneous-contrast hazard `swatch.well` exists to prevent. Adopting it would mean carrying a
code path we must never let run, next to a colour sample.

But the comparison was not wasted — it surfaced **two real gaps in our own `Text`**. To a user,
done looks like a screen reader announcing the home screen's title as a heading, and iOS
scaling each type step along the right Dynamic Type curve.

## Approach

**Reused.** `nativeType` already carries every step's size, and `Text` already derives its
large-text constraint from the manifest rather than listing token names. The Dynamic Type
mapping follows that existing shape rather than inventing a second one.

**New.**

- `nativeDynamicTypeRamp` in `@irodora/design-tokens`: our scale's step sizes matched to
  **Apple's published ramp sizes** for the default content size category, nearest-size, with a
  stated tie-break. Cited like a golden dataset, because that is what it is — someone else's
  published numbers.
- A `heading` prop on `Text`.
- [`.harness/rules/frontend/heroui-wrappers.md`](../rules/frontend/heroui-wrappers.md): when a
  component sits on HeroUI and when it does not.

**Why nearest SIZE and not nearest name.** `dynamicTypeRamp` selects the *scaling curve*, not a
semantic label. Our `body` is 15 px and Apple's `body` is 17; matching by name would scale our
body text along a curve calibrated for a larger size. Matching by size preserves the intended
appearance at the default setting and scales proportionally from there — which is what A7's
200 % requirement actually needs.

**Increments.** Each leaves the build green.

1. `nativeDynamicTypeRamp` and its test, alone — including a test that pins the current
   mapping, so a change to the type scale shows up as a diff someone reads.
2. `Text` gains `heading` and `dynamicTypeRamp`; conformance asserts the role reaches the tree.
3. `Home`'s title becomes a heading — a real consumer, so the prop is not a feature nothing
   uses.
4. The recorded reasons: a rule file, a note at the top of each of the three components that
   stays on React Native, and the heading requirement in `ACCESSIBILITY.md`.

## Files to touch

```
docs/design/design-system.manifest.json  — nothing. The scale is unchanged; only a derivation is added
packages/design-tokens/src/typography.ts — NEW or extended; the Apple ramp and the nearest-size match
packages/design-tokens/src/emit/react-native.ts — emit nativeDynamicTypeRamp
packages/design-tokens/test/typography.test.ts  — the mapping, pinned
packages/ui/src/Text.tsx                 — heading + dynamicTypeRamp
packages/ui/src/Icon.tsx                 — why it stays on RN
packages/ui/src/Status.tsx               — why it stays on RN
packages/ui/src/Surface.tsx              — why it stays on RN, and the blur hazard specifically
packages/ui/test/conformance.test.tsx    — the heading assertion
apps/mobile/src/screens/Home.tsx         — the title is a heading
.harness/rules/frontend/heroui-wrappers.md — NEW; the policy
docs/design/ACCESSIBILITY.md             — the heading requirement this implements
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| `Text` gains two props | every screen; the conformance registry | Existing — the suite renders every registered subject in both themes, and `checkSubject` fails a state that renders nothing |
| A new emitted token module export | `generate-design-tokens.mjs`, the freshness check | Existing — `--check` fails on a stale artefact |
| A derived mapping from the type scale | changes to `typography.scale` in the manifest silently change every ramp | **MUST BE BUILT** — the pinned mapping test in increment 1 is what turns that into a visible diff |

No new effect-graph link: this adds no shared contract. `E-020` already covers `@irodora/ui`'s
relationship to the gates, and nothing here changes it.

## Test plan

- **Unit:** the nearest-size match — every step maps to a ramp; the tie at `xs` (11.5 px, equidistant
  from `caption1` and `caption2`) resolves by the stated rule and not by object key order.
- **Pinned:** the full step → ramp table asserted literally, so a scale change is a diff rather
  than a silent re-derivation.
- **Conformance:** `Text` with `heading` renders `accessibilityRole="header"`; without it, does
  not. Both directions, because a component that always sets the role is as wrong as one that
  never does.
- **Golden:** none. Apple's ramp sizes are cited published values, not measurements of ours.
- **Negative:** a `heading` that is not announced — asserted by reading the rendered node rather
  than by trusting the prop was passed.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm test:a11y && pnpm test:contrast
pnpm build
```

Contrast and CVD are unaffected — no token value changes — but they run because `Text` is the
component that carries the largeText constraint, and "unaffected" is a claim worth checking
rather than asserting.

## Risks and open questions

- **`dynamicTypeRamp` is iOS-only.** Android ignores it, and the existing
  `maxFontSizeMultiplier={2}` remains the mechanism there. Stating that is the point: this
  improves one platform and changes nothing on the other, and a report that implied both would
  be overstating.
- **The rendered tree cannot prove a screen reader announces a heading.** It proves the role is
  on the node. The announcement is a device attestation, and F-017 already owes one for
  VoiceOver and TalkBack.
- No `OQ-*` blocks this.

## Out of scope

- **Wrapping any of the four in HeroUI.** Decided against above, with reasons recorded.
- **Wrappers for components no screen consumes** — dialog, bottom sheet, select, menu, tabs,
  toast, slider, search field. Each R2 feature brings the ones it consumes.
- **A rule that every screen must have a heading.** `ACCESSIBILITY.md` gains the requirement
  that a heading is *announced as one*; making "every screen has at least one" a blocking check
  is a separate decision, with one screen to test it against.
