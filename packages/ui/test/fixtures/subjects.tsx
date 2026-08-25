/**
 * The subjects the harness is measured against.
 *
 * One compliant, four broken — each broken in **exactly one** way, so a failing assertion
 * names a defect rather than a fixture. A negative test needs a decoy, not an empty fixture
 * [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], and a decoy that is not actually
 * broken proves nothing [[a-decoy-that-is-not-broken-proves-nothing]] — so every one of these
 * is asserted to fail the specific check it targets *and* the compliant one is asserted to
 * pass, in the same table.
 *
 * These are fixtures, not components. They live in `test/` and are never exported from the
 * package. When the colour-literal lint lands (increment 8) this file is allowlisted **by
 * explicit path**, never by glob — a glob would exempt whatever else drifts into `test/`.
 */

import { Pressable, Text, TextInput, View, type ViewProps } from 'react-native';
import { nativeColors } from '@irodora/design-tokens';

/**
 * `className` as a prop the type system here does not know about.
 *
 * Uniwind augments React Native's props through a `.d.ts` its METRO plugin generates. Metro
 * does not run under `tsc` or under jest — which is the very split these two fixtures exist
 * to demonstrate — so the augmentation is absent and `<View className=… />` does not compile.
 *
 * Threaded through a typed object instead: the rendered tree carries the attribute, which is
 * all the conformance suite looks at, and nothing pretends the type exists.
 */
const withClassName = (className: string): ViewProps => ({ className }) as ViewProps;

const t = nativeColors.light;

/**
 * Everything the harness asks for: tokens for every colour, a real accessible name that is
 * not the component's own type, role and state on the pressable, a declared tap target, and
 * text large enough for the token it uses.
 */
export function CompliantSwatch(): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ai-nezumi, muted indigo-grey. Hex 526A6B."
      accessibilityState={{ disabled: false }}
      style={{ minWidth: 44, minHeight: 44, backgroundColor: t.background }}
      onPress={() => undefined}
    >
      <View style={{ backgroundColor: t['swatch.well'] }}>
        <Text style={{ fontSize: 22, color: t.foreground }}>Ai-nezumi</Text>
        <Text style={{ fontSize: 19, color: t['foreground.3'] }}>#526A6B</Text>
      </View>
    </Pressable>
  );
}

/** DECOY 1 — a hand-typed hex. Resolves to no token; the literal check must catch it. */
export function LiteralColour(): React.JSX.Element {
  return (
    <View>
      <Text style={{ fontSize: 22, color: '#8A8A8A' }}>Ai-nezumi</Text>
    </View>
  );
}

/**
 * DECOY 2 — `foreground.3` at 13 px.
 *
 * **This is the shape that exists in production right now**, at `apps/mobile/app/index.tsx`:
 * a `largeText` token, restricted by the manifest to >= 18.66 px, on a caption. It is
 * reproduced here so the check keeps being exercised after the real defect is fixed.
 */
export function SmallTextOnLargeTextToken(): React.JSX.Element {
  return (
    <View>
      <Text style={{ fontSize: 13, color: t['foreground.3'] }}>#526A6B</Text>
    </View>
  );
}

/**
 * DECOY 3 — the same defect, reached by INHERITANCE.
 *
 * The inner node declares no `fontSize` at all; it inherits 13 px from the wrapping `<Text>`.
 * A walk that reads each node's own style sees `undefined` and reports nothing. This decoy is
 * the reason `resolveTextNodes` models the inheritance chain instead of reading flat styles,
 * and it is the one a naive implementation passes.
 */
export function InheritedSmallText(): React.JSX.Element {
  return (
    <Text style={{ fontSize: 13 }}>
      <Text style={{ color: t['foreground.3'] }}>#526A6B</Text>
    </Text>
  );
}

/**
 * NOT a decoy — the false-positive guard, and it is load-bearing.
 *
 * `foreground.3` inherited at **22 px**, which is above the large-text floor and therefore
 * legitimate. Remove the inheritance model and the inner node falls back to React Native's
 * default of 14 px, which is *below* the floor — so a naive walk reports a violation that is
 * not there.
 *
 * This is the counterpart to `InheritedSmallText`, and the pair is what makes the model
 * testable in both directions. Without it, deleting the inheritance model still passes the
 * "catches the inherited case" assertion, because 14 px happens to be below the floor too —
 * the check would be right by accident [[a-decoy-that-is-not-broken-proves-nothing]].
 */
export function InheritedLargeText(): React.JSX.Element {
  return (
    <Text style={{ fontSize: 22 }}>
      <Text style={{ color: t['foreground.3'] }}>Ai-nezumi</Text>
    </Text>
  );
}

/** DECOY 4 — a pressable with no accessible name and no role. An empty box to a screen reader. */
export function UnlabelledPressable(): React.JSX.Element {
  return (
    <Pressable style={{ minWidth: 44, minHeight: 44 }} onPress={() => undefined}>
      <View style={{ backgroundColor: t['swatch.well'] }} />
    </Pressable>
  );
}

/**
 * DECOY 4b — a `TextInput` with no accessible name (F-020).
 *
 * Pairs with the `TextInput` exemption from the `no-role` rule. The exemption is meant to
 * remove exactly ONE check, because the platform supplies exactly one thing — so this fixture
 * must still be reported for `no-name`. Without it, "TextInput is exempt from no-role" and
 * "TextInput is exempt" are indistinguishable from the outside, and the second is how an
 * exemption quietly becomes a hole.
 */
export function UnlabelledTextInput(): React.JSX.Element {
  return (
    <TextInput
      style={{ minWidth: 44, minHeight: 44, backgroundColor: t['surface.2'], color: t.foreground }}
      value=""
      onChangeText={() => undefined}
    />
  );
}

/**
 * DECOY 5 — an accessible name that is the component's own type.
 *
 * "swatch" is what ACCESSIBILITY.md §5 exists to forbid: it satisfies every "has a label"
 * check while telling a screen-reader user nothing they could not already infer. Included
 * because `accessibilityLabel !== undefined` is the assertion most likely to be written.
 */
export function TypeNamedPressable(): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="swatch"
      style={{ minWidth: 44, minHeight: 44 }}
      onPress={() => undefined}
    >
      <View style={{ backgroundColor: t['swatch.well'] }} />
    </Pressable>
  );
}

/** DECOY 6 — font scaling disabled. Dynamic Type to 200 % becomes impossible. */
export function NoFontScaling(): React.JSX.Element {
  return (
    <Text allowFontScaling={false} style={{ fontSize: 22, color: t.foreground }}>
      Ai-nezumi
    </Text>
  );
}

/**
 * DECOY 7 — declares every state and renders the same tree for all of them.
 *
 * This is the one the conformance suite exists for. It has a role, a real accessible name, a
 * declared tap target, tokens for every colour — it passes every other check in the suite —
 * and its `disabled` state is byte-identical to its `default`. A state defined in name only
 * is the failure a checklist review never catches, because the checklist item is ticked.
 */
export function BadStates(): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Save this palette"
      style={{ minWidth: 44, minHeight: 44, backgroundColor: t['surface.2'] }}
      onPress={() => undefined}
    >
      <Text style={{ fontSize: 22, color: t.foreground }}>Save</Text>
    </Pressable>
  );
}

/** DECOY 8 — a pressable whose accessible name is its own type. See `TypeNamedPressable`. */
export function GenericName(): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Swatch"
      style={{ minWidth: 44, minHeight: 44, backgroundColor: t['swatch.well'] }}
      onPress={() => undefined}
    >
      <Text style={{ fontSize: 22, color: t.foreground }}>Ai-nezumi</Text>
    </Pressable>
  );
}

/**
 * DECOY 9 — a status colour sitting directly beside a colour sample.
 *
 * Simultaneous contrast: the red chip changes how the fabric reads, and the person is looking
 * at the fabric to decide something about it. Every component here is individually correct;
 * the COMPOSITION is the defect, which is why only a rendered tree can see it.
 */
export function StatusBesideSample({
  theme = 'light',
}: {
  readonly theme?: 'light' | 'dark';
}): React.JSX.Element {
  // Theme-parameterised, unlike the other fixtures: this check resolves colours AGAINST a
  // theme, so a fixture hard-coding light-theme values would silently resolve to nothing in
  // dark and the dark case would pass by finding no status token at all.
  const c = nativeColors[theme];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.background }}>
      <View style={{ width: 72, height: 72, backgroundColor: '#526A6B' }} />
      <View style={{ width: 12, height: 12, backgroundColor: c['status.bad'] }} />
    </View>
  );
}

/**
 * NOT a decoy — the pair that proves the rule is narrow enough to be useful.
 *
 * The SAME status colour beside the SAME sample, with the mandated `swatch.well` as their
 * shared ground. Without this, the rule could be "flag any status colour near anything" and
 * would pass every negative test while being useless — and it would be switched off within a
 * week, which is worse than no rule at all.
 */
export function StatusBesideSampleInWell({
  theme = 'light',
}: {
  readonly theme?: 'light' | 'dark';
}): React.JSX.Element {
  const c = nativeColors[theme];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c['swatch.well'] }}>
      <View style={{ width: 72, height: 72, backgroundColor: '#526A6B' }} />
      <View style={{ width: 12, height: 12, backgroundColor: c['status.bad'] }} />
    </View>
  );
}

/**
 * A component styled the way HeroUI styles itself: everything through `className`, nothing
 * the rendered tree can show.
 *
 * **This is not a hypothetical.** It is the exact tree the F-087 spike got back from a real
 * `heroui-native` Button under this harness:
 *
 * ```json
 * { "className": "button__root button__root--variant-primary",
 *   "style": [{ "borderCurve": "continuous" }, { "transform": [{ "scale": 1 }] }] }
 * ```
 *
 * Uniwind resolves those classes in its Metro plugin, and jest never runs Metro. Every colour
 * check in the suite then iterates over an empty list and reports nothing — which reads
 * exactly like a component whose every colour resolved
 * [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]].
 */
export function ColourOnlyInClassName(): React.JSX.Element {
  return (
    <View
      accessibilityRole="button"
      accessibilityLabel="Measure this colour"
      // Writable here because the className ban is scoped to `packages/ui/src/**` — a
      // fixture that lint refuses to let us write is a decoy we could never check
      // [[a-decoy-that-is-not-broken-proves-nothing]]. Lint is the primary defence in src;
      // this proves the conformance BACKSTOP fires for what lint cannot see — a class
      // assembled at runtime, or a third-party component's own classes.
      {...withClassName('bg-accent text-accent-foreground')}
      style={{ borderCurve: 'continuous' }}
    />
  );
}

/**
 * The control for `ColourOnlyInClassName`: the same tree, with the colour passed the way
 * ADR-0062 requires — a resolved token through `style`.
 *
 * A decoy proves a rule fires; a control proves the rule is the reason. Without this the
 * `colour-invisible` test would pass for a component that failed for some other reason, and
 * nobody would notice the rule had never been what fired.
 */
export function ColourInStyle(): React.JSX.Element {
  const c = nativeColors.dark;
  return (
    <View
      accessibilityRole="button"
      accessibilityLabel="Measure this colour"
      {...withClassName('rounded-3xl px-4')}
      style={{ backgroundColor: c.inverse, borderCurve: 'continuous' }}
    />
  );
}
