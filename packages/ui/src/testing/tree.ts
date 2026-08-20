/**
 * Walking a rendered React Native tree, with the inheritance model that makes the answers
 * correct rather than merely available.
 *
 * ## What a naive walk gets wrong
 *
 * React Native's `<Text>` **inherits text style from an ancestor `<Text>`** — `fontSize`,
 * `color`, `fontWeight`, `fontFamily` — and **does not inherit through a `<View>`**. So this,
 * which is the ordinary way to write a caption:
 *
 * ```tsx
 * <Text style={{ fontSize: 13 }}>
 *   <Text style={{ color: theme['foreground.3'] }}>#526A6B</Text>
 * </Text>
 * ```
 *
 * renders `foreground.3` at **13 px** while the inner node declares no size at all. A walk
 * that reads each node's own style sees `fontSize: undefined` and reports nothing — and the
 * small-text check, whose entire job is to catch that pairing, silently passes.
 *
 * The inheritance is therefore modelled here, once, rather than in each check.
 *
 * ## The boundary, stated because a green run must not imply more than it proves
 *
 * This is a **render tree, not a layout**. There is no Yoga pass, so nothing here can see
 * clipping, overflow, occlusion, or the measured size of a tap target. What it can see is
 * what a component *declares*. That is a necessary condition for accessibility, never a
 * sufficient one, and the device half stays attested (ADR-0055).
 */

import type { Theme } from '@irodora/design-tokens';
import { resolveColor, type ColorResolution } from './tokens.js';

/**
 * React Native's default font size when nothing in the chain sets one.
 *
 * Stated as a constant because it is load-bearing: an unstyled `<Text>` is 14 px, which is
 * below the 18.66 px large-text floor, so "no fontSize declared" is not "no size to check".
 */
export const RN_DEFAULT_FONT_SIZE = 14;

/**
 * The subset of a flattened text style the checks reason about.
 *
 * Every field is `T | undefined` and **required**, rather than optional. Under
 * `exactOptionalPropertyTypes` those are different types, and the required form is the one
 * that models inheritance correctly: "this node did not set a colour" is a value that must be
 * carried down the chain, not a key that might be missing.
 */
export interface TextStyle {
  readonly fontSize: number | undefined;
  readonly color: string | undefined;
  readonly fontWeight: string | undefined;
}

/** No style in the chain. A View resets to this — it does not merge. */
const EMPTY_TEXT_STYLE: TextStyle = {
  fontSize: undefined,
  color: undefined,
  fontWeight: undefined,
};

/** RN accepts `fontWeight` as a string or a number; anything else is not a weight. */
const weightOrUndefined = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined;

/** A rendered text node, with its style resolved through the inheritance chain. */
export interface ResolvedTextNode {
  /** The visible string. Empty when the node only wraps other nodes. */
  readonly text: string;
  /** Effective size in points, after inheritance and the platform default. */
  readonly fontSize: number;
  /** Whether any ancestor or the node itself declared a size, as opposed to defaulting. */
  readonly fontSizeDeclared: boolean;
  readonly color: string | undefined;
  readonly colorResolution: ColorResolution;
  readonly fontWeight: string | undefined;
  /** Disabling font scaling breaks Dynamic Type; the suite forbids it. */
  readonly allowFontScaling: boolean;
  readonly maxFontSizeMultiplier: number | undefined;
  /** Ancestor host types, outermost first — for a message someone can act on. */
  readonly path: readonly string[];
}

/** A rendered node that responds to touch. */
export interface ResolvedPressableNode {
  readonly accessibilityRole: string | undefined;
  readonly accessibilityLabel: string | undefined;
  readonly accessibilityHint: string | undefined;
  readonly accessibilityState: Readonly<Record<string, unknown>> | undefined;
  readonly disabled: boolean;
  readonly style: Readonly<Record<string, unknown>>;
  readonly path: readonly string[];
}

/**
 * A node of a react-test-renderer JSON tree.
 *
 * Typed structurally rather than imported: `react-test-renderer`'s own types are deprecated
 * in React 19, and the shape we depend on is three fields wide.
 */
export interface TestNode {
  readonly type: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children: readonly (TestNode | string)[] | null;
}

const isNode = (v: TestNode | string): v is TestNode => typeof v !== 'string';

/** Flatten RN's `style` — an object, an array, or a nested array — into one object. */
export function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    const out: Record<string, unknown> = {};
    for (const s of style) Object.assign(out, flattenStyle(s));
    return out;
  }
  if (typeof style === 'object' && style !== null) return { ...(style as Record<string, unknown>) };
  return {};
}

const numberOrUndefined = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const stringOrUndefined = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;

/**
 * Every rendered text node, with style resolved through the `<Text>` inheritance chain.
 *
 * Nodes that only wrap other text are still returned, with `text: ''`. A caller that wants
 * only visible strings filters; a caller checking that no node uses a forbidden pairing wants
 * all of them, because the pairing can be declared on the wrapper.
 */
export function resolveTextNodes(root: TestNode, theme: Theme): readonly ResolvedTextNode[] {
  const out: ResolvedTextNode[] = [];

  const walk = (
    node: TestNode,
    inherited: TextStyle,
    inheritedDeclared: boolean,
    inheritedScaling: { allow: boolean; max: number | undefined },
    path: readonly string[],
  ): void => {
    const isText = node.type === 'Text';
    const style = flattenStyle(node.props['style']);
    const here = path.concat(node.type);

    // Text style inherits ONLY through Text. Crossing a View resets it, which is exactly the
    // rule that makes a naive walk wrong in the safe-looking direction: a caption whose size
    // sits on the wrapper and whose colour sits on the inner node would be seen as neither.
    const nextInherited: TextStyle = isText
      ? {
          fontSize: numberOrUndefined(style['fontSize']) ?? inherited.fontSize,
          color: stringOrUndefined(style['color']) ?? inherited.color,
          fontWeight: weightOrUndefined(style['fontWeight']) ?? inherited.fontWeight,
        }
      : EMPTY_TEXT_STYLE;
    const nextDeclared = isText
      ? inheritedDeclared || numberOrUndefined(style['fontSize']) !== undefined
      : false;

    const allow =
      node.props['allowFontScaling'] === false ? false : isText ? inheritedScaling.allow : true;
    const max =
      numberOrUndefined(node.props['maxFontSizeMultiplier']) ??
      (isText ? inheritedScaling.max : undefined);
    const nextScaling = { allow, max };

    if (isText) {
      const text = (node.children ?? []).filter((c): c is string => typeof c === 'string').join('');
      const color = nextInherited.color;
      out.push({
        text,
        fontSize: nextInherited.fontSize ?? RN_DEFAULT_FONT_SIZE,
        fontSizeDeclared: nextDeclared,
        color,
        colorResolution: resolveColor(color, theme),
        fontWeight: nextInherited.fontWeight,
        allowFontScaling: allow,
        maxFontSizeMultiplier: max,
        path: here,
      });
    }

    for (const child of node.children ?? [])
      if (isNode(child)) walk(child, nextInherited, nextDeclared, nextScaling, here);
  };

  walk(root, EMPTY_TEXT_STYLE, false, { allow: true, max: undefined }, []);
  return out;
}

/**
 * Every node that responds to touch.
 *
 * Detected by the presence of a press handler rather than by host type, because `Pressable`,
 * `TouchableOpacity` and a `View` with `onStartShouldSetResponder` all render to host types
 * that differ across platforms and versions. A component is interactive if it *behaves*
 * interactively, and that is the property the accessibility rules attach to.
 */
export function pressableNodes(root: TestNode): readonly ResolvedPressableNode[] {
  const out: ResolvedPressableNode[] = [];

  const walk = (node: TestNode, path: readonly string[]): void => {
    const here = path.concat(node.type);
    const p = node.props;
    const interactive =
      typeof p['onClick'] === 'function' ||
      typeof p['onPress'] === 'function' ||
      typeof p['onResponderRelease'] === 'function' ||
      p['accessible'] === true;
    if (interactive) {
      const state = p['accessibilityState'];
      out.push({
        accessibilityRole: stringOrUndefined(p['accessibilityRole']),
        accessibilityLabel: stringOrUndefined(p['accessibilityLabel']),
        accessibilityHint: stringOrUndefined(p['accessibilityHint']),
        accessibilityState:
          typeof state === 'object' && state !== null
            ? (state as Readonly<Record<string, unknown>>)
            : undefined,
        disabled:
          p['accessibilityState'] !== undefined &&
          (state as { disabled?: unknown } | null)?.disabled === true,
        style: flattenStyle(p['style']),
        path: here,
      });
    }
    for (const child of node.children ?? []) if (isNode(child)) walk(child, here);
  };

  walk(root, []);
  return out;
}

/** Every colour any node paints, with where it came from. Used by the colour-literal check. */
export function paintedColors(
  root: TestNode,
  theme: Theme,
): readonly {
  readonly property: string;
  readonly resolution: ColorResolution;
  readonly path: readonly string[];
}[] {
  const out: { property: string; resolution: ColorResolution; path: readonly string[] }[] = [];
  const PROPS = ['color', 'backgroundColor', 'borderColor', 'tintColor', 'shadowColor'] as const;

  const walk = (node: TestNode, path: readonly string[]): void => {
    const here = path.concat(node.type);
    const style = flattenStyle(node.props['style']);
    for (const property of PROPS) {
      const value = stringOrUndefined(style[property]);
      if (value === undefined) continue;
      out.push({ property, resolution: resolveColor(value, theme), path: here });
    }
    for (const child of node.children ?? []) if (isNode(child)) walk(child, here);
  };

  walk(root, []);
  return out;
}
