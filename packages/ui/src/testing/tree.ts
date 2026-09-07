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
  /**
   * React Native's *other* role prop, and the one every HeroUI primitive uses (F-156).
   *
   * `role` and `accessibilityRole` are both React Native props and both reach the same platform
   * attribute. They are **not the same vocabulary**, which is why this is carried beside
   * `accessibilityRole` rather than folded into it:
   *
   * | | `AccessibilityRole` | `Role` |
   * |---|---|---|
   * | a draggable value | `adjustable` | `slider` |
   * | a section heading | `header` | `heading` |
   * | a search field | `search` | `searchbox` |
   * | a landmark region | — | `region`, `group`, `tabpanel` |
   *
   * Verified against `react-native/Libraries/Components/View/ViewAccessibility.js` at 0.86.2:
   * `AccessibilityRole` has `adjustable` and no `slider`; `Role` has `slider` and no
   * `adjustable`.
   *
   * **And `AccessibilityRole` ends in `| string`.** So `accessibilityRole="slider"` compiles,
   * announces nothing, and looks exactly like a fix — which is what would have happened if the
   * `no-role` rule had kept reading one prop and four HeroUI wrappers had been "corrected" to
   * satisfy it. Reading both is the accurate answer; translating between them is not something
   * this file can do honestly, because in 0.86 the mapping lives in the native layer rather
   * than in any JavaScript table we could cite.
   */
  readonly role: string | undefined;
  /** The host component this rendered to — `TextInput`, `View`, … See `pressableNodes`. */
  readonly hostType: string;
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
 * Every node that responds to a person.
 *
 * Detected by BEHAVIOUR rather than by host type, because `Pressable`, `TouchableOpacity` and
 * a `View` with `onStartShouldSetResponder` all render to host types that differ across
 * platforms and versions. A component is interactive if it *behaves* interactively, and that is
 * the property the accessibility rules attach to.
 *
 * **`onChangeText` is here because a text field is not pressable** (F-018). Until `SearchField`
 * there was no interactive control in this library that was not a button or a swatch, so
 * "responds" and "responds to a press" were the same set and nothing distinguished them. A
 * search field declaring `kind: "interactive"` was reported as *"nothing in the tree
 * responds"* — which would have pushed it to claim a kind it does not have, and the kind is the
 * one lever a component has over its own required states.
 *
 * The name stays `pressableNodes` for its callers; what changed is the definition, and the
 * accessibility rules downstream — role, name, tap target, disabled and busy — apply to a text
 * field exactly as they apply to a button.
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
      // A text field responds to typing, not to a press. See the note above.
      typeof p['onChangeText'] === 'function' ||
      /*
       * AN ADJUSTABLE CONTROL RESPONDS TO A DRAG, and F-156 is the second time this definition
       * was too narrow. F-018 widened it for the text field — *"a text field is not
       * pressable"* — and a slider is not pressable either: the thumb is moved through a
       * `GestureDetector`, so it carries no `onPress`, no `onResponderRelease` and nothing else
       * this list knew to look for. The first registered `Slider` was reported as *"declares
       * kind interactive but nothing in the tree responds"*, which was the suite saying,
       * accurately, that it had checked none of the accessibility rules on it.
       *
       * `accessibilityValue` is the declaration itself: a node that reports a value in a range
       * is a thing a person sets. It is also narrow — a static readout has a label, not a
       * value — so this admits controls rather than everything with a number on it.
       */
      (typeof p['accessibilityValue'] === 'object' && p['accessibilityValue'] !== null) ||
      p['accessible'] === true;
    if (interactive) {
      const state = p['accessibilityState'];
      out.push({
        accessibilityRole: stringOrUndefined(p['accessibilityRole']),
        role: stringOrUndefined(p['role']),
        /*
         * The HOST type (F-020).
         *
         * A `Pressable` renders to a plain view and announces as nothing at all unless a role
         * is declared — which is why `no-role` exists. A `TextInput` is a different case: the
         * platform types it as a text field on both iOS and Android without being told, and
         * neither RN role list has a member that means "a field you type into" (`Role` has
         * `searchbox` and no `textbox`; `AccessibilityRole`'s nearest is `text`, which means
         * STATIC text — a worse announcement than none).
         *
         * So the host type is carried, and the rule reads it. The alternative was to declare
         * a role we know to be wrong in order to satisfy a checker, which is the shape where
         * the check starts governing the code instead of the other way round.
         */
        hostType: node.type,
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
  const PROPS = [
    'color',
    'backgroundColor',
    'borderColor',
    'tintColor',
    'shadowColor',
    'fill',
    'stroke',
  ] as const;

  /**
   * An SVG element's paint, as if it had been written in `style`.
   *
   * ## It arrives parsed, not as the string that was written
   *
   * `<Path stroke="#131110" />` renders to
   * `{"stroke": {"type": 0, "payload": 4279439632}}` — react-native-svg resolves the colour into
   * an ARGB integer before the tree is built, and `4279439632` is `0xFF131110`. So a scan
   * looking for a string finds nothing, which is how the first version of this reported a
   * component whose every shape is stroked as painting no colour at all.
   *
   * `type: 0` is a solid colour. Anything else is a gradient or a pattern, which has no single
   * value to resolve against a token and is skipped rather than guessed at.
   *
   * `none` and `null` are dropped for the reason `transparent` is below: they say *do not paint
   * this*, and asking which token the absence of a colour is would report every deliberately
   * unfilled shape as a literal.
   */
  const svgPaint = (node: TestNode): Record<string, unknown> => {
    const out: Record<string, unknown> = {};

    /*
     * A TSPAN'S FILL IS THE LIBRARY'S, NOT THE AUTHOR'S.
     *
     * `SvgXml` parses the content of a `<text>` into a `TSpan` child and gives that child a
     * hard `#000000` default — it does not inherit from the `<text>` element above it, from an
     * enclosing group, or from a `fill` on the `<svg>` root. All three were tried: wrapping
     * the content in an explicit `<tspan fill>` produced a NESTED tspan with the same black,
     * and declaring a token default on the root changed nothing.
     *
     * The colour a person sees is on the `RNSVGText` node, which this scan reads. The exported
     * artefact — which is what a card IS — is an SVG string whose fills are correct and where
     * ordinary inheritance applies.
     *
     * So this is a defect in what the parser REPORTS rather than in what the product paints,
     * and excluding the one node type it fabricates is narrower than the alternative:
     * contorting a shared, exported artefact to satisfy a preview renderer.
     */
    if (node.type === 'RNSVGTSpan') return out;
    for (const property of ['fill', 'stroke'] as const) {
      const raw: unknown = node.props[property];

      const asString = stringOrUndefined(raw);
      if (asString !== undefined) {
        if (asString !== 'none') out[property] = asString;
        continue;
      }

      if (raw === null || typeof raw !== 'object') continue;
      const paint = raw as { readonly type?: unknown; readonly payload?: unknown };
      if (paint.type !== 0 || typeof paint.payload !== 'number') continue;

      // Alpha is dropped: the token registry is keyed by `#rrggbb`, and an SVG paint's opacity
      // is a separate prop this scan does not read.
      out[property] = `#${(paint.payload & 0xffffff).toString(16).padStart(6, '0')}`;
    }
    return out;
  };

  const walk = (node: TestNode, path: readonly string[]): void => {
    const here = path.concat(node.type);
    /*
     * SVG PAINTS THROUGH PROPS, NOT THROUGH `style`.
     *
     * `<Path stroke="#131110" />` is a colour on the screen and it is not in `style`, so this
     * scan could not see it — and a component whose only colour is a stroke was reported as
     * painting NOTHING. F-162's navigation glyphs are exactly that shape, and without this the
     * product would have gained a colour surface that no gate measures.
     *
     * The same failure family as [[a-new-engine-can-make-an-old-gate-blind]]: the checker was
     * correct about the technology it was written against, and a new one arrived that expresses
     * the same thing differently. `fill` and `stroke` are read from props and merged with the
     * style, so everything downstream — the literal check, the token resolution, the contrast
     * pairing — treats them as the colours they are.
     */
    const style = { ...svgPaint(node), ...flattenStyle(node.props['style']) };
    for (const property of PROPS) {
      const value = stringOrUndefined(style[property]);
      if (value === undefined) continue;
      /*
       * `transparent` PAINTS NOTHING, so there is nothing to resolve and nothing to measure
       * the contrast of. Asking which token the absence of a colour is would report every
       * deliberately see-through surface as a literal.
       *
       * It went unnoticed until F-023 for a small reason worth recording: `Icon` has set it on
       * its triangle glyph since F-003, and the only registered subject that renders an Icon is
       * `Status`, which is registered with `kind="bad"` — the CROSS glyph. The transparent
       * branch had never once been rendered through this suite.
       *
       * Narrow on purpose: this skips one keyword, and `LiteralColour` still proves a real
       * hand-typed hex is reported.
       */
      if (value.toLowerCase() === 'transparent') continue;
      out.push({ property, resolution: resolveColor(value, theme), path: here });
    }
    for (const child of node.children ?? []) if (isNode(child)) walk(child, here);
  };

  walk(root, []);
  return out;
}

/** A foreground drawn over a ground, as it actually appears in a rendered tree. */
export interface RenderedPair {
  /** The text's colour, resolved. */
  readonly foreground: ColorResolution;
  /** The nearest ancestor that painted a background, resolved. */
  readonly background: ColorResolution;
  /** Effective size in points, after inheritance and the platform default. */
  readonly fontSize: number;
  readonly fontWeight: string | undefined;
  /** The visible string, so a finding names something a person can point at. */
  readonly text: string;
  /** Ancestor host types, outermost first. */
  readonly path: readonly string[];
}

/**
 * Every foreground-over-ground pair a tree actually draws (F-171).
 *
 * ## What this exists to see, and why nothing saw it before
 *
 * Gate 9 checks the pairings the **manifest declares** — every `pairsWith` combination, in both
 * themes, against WCAG and APCA and eleven CVD severities. It is thorough about its subject and
 * its subject is a JSON file.
 *
 * The conformance suite checks that every colour a component paints **resolves to a token**. It
 * is thorough about its subject and its subject is one colour at a time.
 *
 * **Neither of them looks at a pair on a screen.** A component may put `foreground.3` on
 * `surface.3` — both tokens, both individually fine, a combination the manifest never declared
 * and therefore a combination no gate has ever measured. That is the gap the reporter was
 * standing in front of when they said the contrast was wrong in many places while every gate was
 * green.
 *
 * ## The ground is inherited, and the walk is the whole difficulty
 *
 * A `Text` almost never paints its own background. Its ground is the nearest ancestor that
 * painted one — which may be several levels up, and which changes as the walk descends. Carrying
 * it down is the only way to know what a given string is actually drawn on.
 *
 * `fallback` is what a node with no painted ancestor sits on. For a screen that is the page; for
 * a component rendered bare in a conformance suite it is whatever the app would put behind it,
 * which the caller states rather than this guessing.
 */
export function renderedPairs(
  root: TestNode,
  theme: Theme,
  fallback: string,
): readonly RenderedPair[] {
  const out: RenderedPair[] = [];

  const walk = (
    node: TestNode,
    inherited: TextStyle,
    ground: string,
    path: readonly string[],
  ): void => {
    const isText = node.type === 'Text';
    const style = flattenStyle(node.props['style']);
    const here = path.concat(node.type);

    // The same inheritance rule `resolveTextNodes` uses: text style crosses `Text` and nothing
    // else. A View resets it, which is what makes a naive walk wrong in the safe-looking
    // direction.
    const nextInherited: TextStyle = isText
      ? {
          fontSize: numberOrUndefined(style['fontSize']) ?? inherited.fontSize,
          color: stringOrUndefined(style['color']) ?? inherited.color,
          fontWeight: weightOrUndefined(style['fontWeight']) ?? inherited.fontWeight,
        }
      : EMPTY_TEXT_STYLE;

    /*
     * THE GROUND DESCENDS THROUGH EVERYTHING, unlike the text style. A background painted on a
     * wrapper is behind every string under it however many Views intervene — and a translucent
     * one is deliberately NOT composited here: this reports what is painted, and what a
     * translucent token means over each of its grounds is gate 9's arithmetic rather than a
     * second implementation of it.
     */
    const painted = stringOrUndefined(style['backgroundColor']);
    const nextGround = painted !== undefined && painted !== 'transparent' ? painted : ground;

    if (isText) {
      const text = (node.children ?? []).filter((c): c is string => typeof c === 'string').join('');
      const color = nextInherited.color;
      // A string with no colour has not been drawn in anything this can measure — the platform
      // default is not a token and reporting it as a pair would invent a finding.
      if (text !== '' && color !== undefined)
        out.push({
          foreground: resolveColor(color, theme),
          background: resolveColor(nextGround, theme),
          fontSize: nextInherited.fontSize ?? RN_DEFAULT_FONT_SIZE,
          fontWeight: nextInherited.fontWeight,
          text,
          path: here,
        });
    }

    for (const child of node.children ?? [])
      if (isNode(child)) walk(child, nextInherited, nextGround, here);
  };

  walk(root, EMPTY_TEXT_STYLE, fallback, []);
  return out;
}
