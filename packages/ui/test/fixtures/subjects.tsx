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

import { Pressable, Text, View } from 'react-native';
import { nativeColors } from '@irodora/design-tokens';

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
