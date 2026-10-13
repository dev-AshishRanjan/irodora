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

import {
  nativeElevation,
  nativeFamilies,
  nativeTapTarget,
  type Theme,
} from '@irodora/design-tokens';
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
  /**
   * The hit area beyond the drawn box (F-232, ADR-0114): a number for every side, or per side.
   * `Pressable` hands it to its host view, which is where this is read.
   */
  readonly hitSlop: number | Readonly<Record<string, unknown>> | undefined;
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
/**
 * Every `accessibilityState` in the tree, pressable or not.
 *
 * ## Why this is separate from `pressableNodes` (F-186)
 *
 * A state is not always announced on the control. A **group** announces its own unavailability
 * once, on the container — `role="radiogroup"` with `busy` — rather than four times, once per
 * option, because saying one fact four times is three repetitions.
 *
 * `pressableNodes` cannot see that: a radio group's root is a `View`. So the conformance
 * check asks THIS whether a state was announced anywhere, and asks `pressableNodes` whether
 * there was anything to announce it about. Two questions, two walks.
 */
export function announcedStates(root: TestNode): readonly Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (node: TestNode): void => {
    const state: unknown = node.props['accessibilityState'];
    if (state !== null && typeof state === 'object') out.push(state as Record<string, unknown>);
    for (const child of node.children ?? []) if (typeof child !== 'string') walk(child);
  };
  walk(root);
  return out;
}

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
        hitSlop:
          typeof p['hitSlop'] === 'number'
            ? p['hitSlop']
            : typeof p['hitSlop'] === 'object' && p['hitSlop'] !== null
              ? (p['hitSlop'] as Readonly<Record<string, unknown>>)
              : undefined,
        path: here,
      });
    }
    for (const child of node.children ?? []) if (isNode(child)) walk(child, here);
  };

  walk(root, []);
  return out;
}

/** The colour properties a node can paint, in `style` or, for SVG, in props. */
const COLOUR_PROPS = [
  'color',
  'backgroundColor',
  'borderColor',
  'tintColor',
  'shadowColor',
  'fill',
  'stroke',
] as const;

/**
 * A gradient's stops, as painted colours (F-232).
 *
 * `<LinearGradient><Stop stopColor="#5DA9E5" /></LinearGradient>` renders to ONE node whose
 * `gradient` prop is `[offset, argb, offset, argb, …]`, each colour a signed 32-bit integer. The
 * `Stop` elements themselves are gone. Without this a gradient track would be colour no gate
 * measures, and a hand-typed stop would pass the colour-literal rule by being invisible to it:
 * the same blindness `svgPaint` below closed for strokes.
 */
function gradientStops(node: TestNode): readonly string[] {
  const raw: unknown = node.props['gradient'];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (let i = 1; i < raw.length; i += 2) {
    const argb: unknown = raw[i];
    if (typeof argb !== 'number') continue;
    const word = argb >>> 0;
    const alpha = (word >>> 24) & 0xff;
    const hex = `#${(word & 0xffffff).toString(16).padStart(6, '0')}`;
    // A translucent stop keeps its alpha (F-232's review), so it resolves as the colour it is.
    out.push(
      alpha === 0xff
        ? hex
        : `rgba(${String((word >>> 16) & 0xff)}, ${String((word >>> 8) & 0xff)}, ${String(word & 0xff)}, ${String(Math.round((alpha / 255) * 1000) / 1000)})`,
    );
  }
  return out;
}

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
function svgPaint(node: TestNode): Record<string, unknown> {
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
}

/**
 * The colours ONE node paints, as written: no token resolution and no descent.
 *
 * Extracted from `paintedColors` (F-240) so the CVD preview sweep can compare a node's paint, as
 * written, with the engine's simulation of the same node in Standard — one reader of SVG props,
 * gradient stops and `style`, never two that could drift.
 */
export function colourValues(
  node: TestNode,
): readonly { readonly property: string; readonly value: string }[] {
  const out: { property: string; value: string }[] = [];
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
  for (const property of COLOUR_PROPS) {
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
    out.push({ property, value });
  }
  for (const stop of gradientStops(node)) out.push({ property: 'stopColor', value: stop });
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
  const walk = (node: TestNode, path: readonly string[]): void => {
    /*
     * A CLIP IS GEOMETRY, NEVER PAINT (F-232). react-native-svg gives a `ClipPath` and its shapes a
     * default black fill, and nothing of it reaches the screen: it only says where the shapes that
     * use it are drawn. Reading it would report a colour no person can see.
     */
    if (node.type === 'RNSVGClipPath') return;
    const here = path.concat(node.type);
    for (const { property, value } of colourValues(node))
      out.push({ property, resolution: resolveColor(value, theme), path: here });
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

/** A node asking for a share of a height its parent does not have. */
export interface FlexChainFinding {
  /** Node types from the subject root down to the offender, so a report can be located. */
  readonly path: readonly string[];
  /** What the offender asked for. */
  readonly flex: number;
  /** The parent that could not give it — its type, and why it is not definite. */
  readonly parent: string;
}

/**
 * Whether a style gives its box a height that does not depend on its children.
 *
 * `flex` counts because a flex child of a definite parent is itself definite; the recursion
 * terminates at the subject root, which is treated as definite because on a device it is
 * mounted in a full-height host.
 */
function hasDefiniteHeight(style: Readonly<Record<string, unknown>>): boolean {
  const flex = style['flex'];
  const grow = style['flexGrow'];
  if (typeof flex === 'number' && flex > 0) return true;
  if (typeof grow === 'number' && grow > 0) return true;
  if (style['height'] !== undefined) return true;
  if (style['minHeight'] !== undefined) return true;
  if (style['aspectRatio'] !== undefined) return true;
  if (style['flexBasis'] !== undefined && style['flexBasis'] !== 'auto') return true;
  if (
    style['position'] === 'absolute' &&
    style['top'] !== undefined &&
    style['bottom'] !== undefined
  )
    return true;
  return false;
}

/** Whether this container distributes its main axis along the width. */
function laysOutInARow(style: Readonly<Record<string, unknown>>): boolean {
  const direction = style['flexDirection'];
  return direction === 'row' || direction === 'row-reverse';
}

/**
 * Nodes asking for a share of a height their parent does not have (F-213, NFR-25).
 *
 * ## The shape this exists for
 *
 * ```
 * Screen   <View style={{ flex: 1 }}>            definite
 *   Appear   <Animated.View>                     auto — its height comes from its content
 *     Atlas    <FlatList style={{ flex: 1 }}>    a share of nothing
 * ```
 *
 * F-211 shipped exactly that, and **every gate in the repository was green** — including a
 * conformance sweep over 72 subjects in 8 conditions. jest has no layout engine, so a
 * zero-height list still renders all 120 of its rows into the tree and every assertion about
 * them passes [[a-test-tree-has-no-height]].
 *
 * ## The rule is about the PARENT, and about its direction
 *
 * `flex` distributes the parent's MAIN axis. In a column that is height, and a parent whose
 * height is auto has nothing to distribute — the child resolves to zero. In a ROW it is width,
 * and a row's width is definite by default, so `flex: 1` there is ordinary and correct.
 *
 * Without the direction test this fires on every `Row`, and **a check that fires on correct
 * code is a check somebody switches off.**
 *
 * ## What it cannot see, and the list is the honest part
 *
 * - A height that arrives at runtime — `onLayout`, a measurement, a percentage.
 * - **Overflow.** A perfectly anchored chain can still push its content off the screen.
 * - The box of anything a native list draws. The rows are in the tree; their frame is not.
 * - Any screen absent from the registry, because this reads a rendered tree and nothing else.
 *
 * It catches the common shape. That is worth having, and it is not the same claim as "layout
 * is checked".
 */
export function brokenFlexChains(root: TestNode): readonly FlexChainFinding[] {
  const out: FlexChainFinding[] = [];

  const walk = (
    node: TestNode,
    parent: TestNode | null,
    parentStyle: Readonly<Record<string, unknown>>,
    path: readonly string[],
  ): void => {
    const style = flattenStyle(node.props['style']);
    const here = [...path, node.type];
    const flex = style['flex'] ?? style['flexGrow'];

    /*
     * `parent === null` is the subject root. It is not reported: on a device the root is
     * mounted in a full-height host, and treating it as auto would make every screen a finding
     * — which is the failure mode that turns a gate into noise.
     */
    if (
      typeof flex === 'number' &&
      flex > 0 &&
      parent !== null &&
      !laysOutInARow(parentStyle) &&
      !hasDefiniteHeight(parentStyle)
    )
      out.push({ path: here, flex, parent: parent.type });

    for (const child of node.children ?? []) if (isNode(child)) walk(child, node, style, here);
  };

  walk(root, null, {}, []);
  return out;
}

/*
 * ============================================================================== FIGURES (F-235)
 *
 * Moved here from `apps/mobile/test/screens.test.tsx`'s FR-48 block, where F-226's review shaped
 * them, so the conformance suite can hold every registered component to "every figure is tabular"
 * (criterion 4) and the screens' sweep reads the same definition rather than a copy of it.
 */

/**
 * Digits that are part of a NAME, not a quantity: a standard space or unit (D65, ΔE00, WCAG 2.2,
 * sRGB, Display-P3) or a hyphenated identifier (IRO-ED-001, F-019). Nobody reads "65" in D65 as a
 * figure.
 */
const NAMED_DIGITS =
  /ΔE00|\b(?:CIEDE2000|CIE\s?(?:1931|1976|94|76)|D65|D50|sRGB|Display-P3|WCAG\s?\d(?:\.\d)?)\b|\b[A-Za-z]+(?:-[A-Za-z]+)*-\d+\b/gu;

/**
 * Running prose: eight or more words. A figure in a sentence is read, not scanned down a column.
 *
 * Japanese writes no spaces between words, so a sentence there is one long run and the word count
 * says nothing. It is counted in kana and kanji instead: a Japanese word averages two to three
 * characters, so twenty is about eight words (found by F-235, when the rule first ran over the
 * Japanese sweep and read Preferences' "Android 12 以降は…" sentence as a column of figures).
 */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
const isProse = (s: string): boolean =>
  (s.match(/\p{L}{2,}/gu) ?? []).length >= 8 || (s.match(CJK) ?? []).length >= 20;

/**
 * A numeral bound to a Japanese counter — 2色 (two colours), 1型 (type 1), 16進数 (hexadecimal),
 * 1つ以上 (one or more) — is part of a word, as "two" is in English: nobody scans it down a column.
 * Only a numeral FOLLOWED by kana or kanji is a counter; a value after a word (網羅率84%) is still
 * a figure (F-235, when the rule first ran over the Japanese sweep).
 */
const COUNTER = /\d+(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/gu;

/** Whether a string CARRIES a figure: any digit left once names and counters are removed, outside prose. */
export function carriesFigure(s: string): boolean {
  const rest = s.replace(NAMED_DIGITS, '').replace(COUNTER, '');
  return /\d/u.test(rest) && !isProse(rest);
}

/** The nodes that own a figure-carrying string: the element, because `numeric` lives on it. */
export function figureNodes(node: TestNode, out: TestNode[] = []): TestNode[] {
  if ((node.children ?? []).some((c) => typeof c === 'string' && carriesFigure(c))) out.push(node);
  for (const child of node.children ?? []) if (typeof child !== 'string') figureNodes(child, out);
  return out;
}

/**
 * The nodes set in tabular digits: their font variant carries the manifest's numeric feature — or
 * they are set in the mono (ADR-0130), every glyph of which shares one advance, so its figures are
 * equal-width by what the face is rather than by a feature asked of it.
 */
export function tabularNodes(node: TestNode, feature: string, out: TestNode[] = []): TestNode[] {
  const style = flattenStyle(node.props['style']);
  const variant = style['fontVariant'];
  if (
    (Array.isArray(variant) && (variant as unknown[]).includes(feature)) ||
    style['fontFamily'] === nativeFamilies.mono
  )
    out.push(node);
  for (const child of node.children ?? [])
    if (typeof child !== 'string') tabularNodes(child, feature, out);
  return out;
}

/** Every figure-carrying string on a tree that is NOT set in tabular digits. */
export function raggedFigures(node: TestNode, feature: string): readonly string[] {
  const tabular = new Set(tabularNodes(node, feature));
  return figureNodes(node)
    .filter((n) => !tabular.has(n))
    .flatMap((n) => (n.children ?? []).filter((c): c is string => typeof c === 'string'));
}

/*
 * --- THE NOTHING THE STATES REPLACE (F-236, ADR-0129 §4) -----------------------------------------
 *
 * A screen whose panel has nothing to show is meant to say so with an empty state. Two ways of
 * showing nothing slip past every other check here: a panel drawn with nothing in it has no text
 * to fault and no colour out of place, and a "0" in place of "nothing" is a figure like any other.
 */

/**
 * The grounds a panel is painted with: every elevation above the page's own (ADR-0044). Read from
 * the manifest's levels, so a level added there is covered here.
 */
const PANEL_GROUNDS: ReadonlySet<string> = new Set(
  Object.entries(nativeElevation)
    .filter(([level]) => level !== '0')
    .map(([, token]) => token),
);

/** A box painted as a panel, with nothing in it a person can perceive. */
export interface BlankPanel {
  readonly token: string;
  readonly path: readonly string[];
}

/**
 * Host types that are content by being drawn: a picture, a field, or an SVG element that draws
 * something. An SVG container (`RNSVGSvgView`, a group, a clip path) is content only through what
 * it holds — an empty `<Svg>` draws nothing (F-236's review, S3).
 */
const CONTENT_TYPES =
  /^(?:Image|TextInput|RNSVG(?:Path|Circle|Rect|Ellipse|Line|Polygon|Polyline|Text|TSpan|Image|Use))$/u;

/** Whether a node carries an accessible name. */
const named = (node: TestNode): boolean => {
  const name = node.props['accessibilityLabel'] ?? node.props['aria-label'];
  return typeof name === 'string' && name.trim() !== '';
};

/** Whether a subtree carries anything a person can perceive: text, a name, a picture or a field. */
function perceivable(node: TestNode): boolean {
  if (named(node)) return true;
  if (CONTENT_TYPES.test(node.type)) return true;
  return (node.children ?? []).some((c) =>
    typeof c === 'string' ? c.trim() !== '' : perceivable(c),
  );
}

/**
 * Whether a painted box is a MARK rather than a panel. A panel holds a line of text with its
 * padding, so it is sized by what it holds. A box drawn smaller than the tap target in either
 * direction (a rule, a track, a knob, a handle) or laid over something else (a selection frame, an
 * indicator) cannot hold one: it is painted to be seen as itself. The tap target is the bound
 * because it is the smallest box the system draws to be read or touched (F-236's review, S3: any
 * set size had been exempt, so an empty panel 160 dp tall passed).
 */
const isMark = (style: Readonly<Record<string, unknown>>): boolean => {
  const below = (v: unknown): boolean => typeof v === 'number' && v < nativeTapTarget;
  return below(style['height']) || below(style['width']) || style['position'] === 'absolute';
};

/**
 * Every panel-painted box with no text, accessible name or picture anywhere beneath it — the
 * outermost of each, since everything inside a blank panel is blank too.
 *
 * **A box inside a named element is part of it.** A sample inside a named `Swatch` is announced by
 * the swatch, and its colour can equal a surface token by coincidence: a generated companion lands
 * on `#FFFFFF`, light `surface.1` (F-236's review, M3). So the walk does not descend into a named
 * element. An earlier draft exempted every box painted a declared sample hex instead, which blinded
 * the light pass to a blank `surface.1` panel on any subject that declared `#FFFFFF`.
 */
export function blankPanels(root: TestNode, theme: Theme): readonly BlankPanel[] {
  const out: BlankPanel[] = [];
  const walk = (node: TestNode, path: readonly string[]): void => {
    if (named(node)) return;
    const here = path.concat(node.type);
    const style = flattenStyle(node.props['style']);
    const ground = style['backgroundColor'];
    const resolution = resolveColor(typeof ground === 'string' ? ground : undefined, theme);
    const token =
      resolution.kind === 'token' && !isMark(style)
        ? resolution.tokens.find((t) => PANEL_GROUNDS.has(t))
        : undefined;
    if (token !== undefined && !perceivable(node)) {
      out.push({ token, path: here });
      return;
    }
    for (const child of node.children ?? []) if (isNode(child)) walk(child, here);
  };
  walk(root, []);
  return out;
}

/**
 * A zero standing for "nothing": a paragraph that is, whole, a zero — alone, or with a percent sign
 * or words or a counter after it, and optionally a full stop: "0", "0%", "0 pieces", "0 garments in
 * your wardrobe.", "0件". A zero inside a reading is not one: "Showing 0 / 120", "0 of 12",
 * "#20232A", "0.00", "0.42".
 *
 * **A labelled zero is read as a value** (F-236's review, S3). "New outfits this would add: 0" is a
 * computed answer — buying this adds nothing — and "In your wardrobe: 0" is a tally of nothing, and
 * the two have one form. A rule that refused both would refuse an answer, so a labelled tally of
 * stored things is the screen's to handle and a reviewer's to see; ADR-0129 records the limit.
 */
const BARE_ZERO = /^[0０]\s*(?:[%％]|\p{L}+(?:\s\p{L}+)*)?[.。]?$/u;

/** All the text of a subtree, in order, as one paragraph renders it. */
const paragraph = (node: TestNode): string =>
  (node.children ?? []).map((c) => (typeof c === 'string' ? c : paragraph(c))).join('');

/**
 * Every paragraph that is a bare zero. A paragraph is an outermost `Text`: React Native sets a
 * nested `Text` inline, so "0" and " pieces" in two nodes read as one sentence, and are judged as one.
 */
export function bareZeros(root: TestNode): readonly string[] {
  const out: string[] = [];
  const walk = (node: TestNode): void => {
    if (node.type === 'Text') {
      const text = paragraph(node).trim();
      if (BARE_ZERO.test(text)) out.push(text);
      return;
    }
    for (const child of node.children ?? []) if (isNode(child)) walk(child);
  };
  walk(root);
  return out;
}

/** One piece of text a person reads on a rendered tree (F-221). */
export interface RenderedText {
  /**
   * `paragraph`: an outermost `Text`, nested text included. `line`: two or more paragraphs set side
   * by side in a row, joined with a space. `name`: an accessible name, hint or value.
   */
  readonly kind: 'paragraph' | 'line' | 'name';
  readonly text: string;
  readonly path: readonly string[];
}

const ACCESSIBLE_TEXT_PROPS = ['accessibilityLabel', 'aria-label', 'accessibilityHint'] as const;

/** Every paragraph in a subtree, outermost `Text`s only, in order. */
/**
 * The words an SVG text element draws (F-221's review, M9): its string children and the `content`
 * react-native-svg gives each span. The colour card composes a line this way, beyond `Text`.
 */
const svgWords = (node: TestNode): string =>
  [
    typeof node.props['content'] === 'string' ? node.props['content'] : '',
    ...(node.children ?? []).map((c) => (typeof c === 'string' ? c : svgWords(c))),
  ].join('');

function paragraphsOf(node: TestNode): string[] {
  if (node.type === 'Text' || node.type === 'RNSVGText') {
    const words = node.type === 'Text' ? paragraph(node) : svgWords(node);
    const text = words.replace(/\s+/gu, ' ').trim();
    return text === '' ? [] : [text];
  }
  return (node.children ?? []).flatMap((c) => (isNode(c) ? paragraphsOf(c) : []));
}

/**
 * Every text a person reads on a rendered tree, in the three forms a claim can take (F-221,
 * ADR-0134 D3).
 *
 * **A claim is composed on the screen, not in the source.** A figure and its label are written in
 * two `Text`s, so a lint that reads source lines sees the figure and the word apart, while a person
 * reads the two as one claim. A LINE is how they meet here. Under a host laid out in a row, the
 * children's top lines are one line, read in visual order (a `row-reverse` reads backwards): each
 * child gives its FIRST paragraph, so a figure beside a label stacked over its note reads as the
 * figure and the label (F-221's review, S5), and the note stays apart. A child with no text, an icon
 * between them, neither joins nor breaks the line.
 *
 * Text drawn inside an SVG (`RNSVGText`, its spans' `content`) is read as a paragraph too, which is
 * how the colour card composes its line (M9).
 *
 * WHAT IT CANNOT SEE: wrapping. jest has no layout, so a row too narrow for its line, which a device
 * would wrap, is still read as one line here, and two paragraphs a device sets side by side through
 * absolute positioning are not. The fidelity run reads the device's own text for that (D3); a phone's
 * accessibility tree does not carry SVG text, so there the colour card's line is read here alone.
 */
export function renderedTexts(root: TestNode): readonly RenderedText[] {
  const out: RenderedText[] = [];
  const walk = (node: TestNode, path: readonly string[]): void => {
    const here = path.concat(node.type);

    for (const prop of ACCESSIBLE_TEXT_PROPS) {
      const value = node.props[prop];
      if (typeof value === 'string' && value.trim() !== '')
        out.push({ kind: 'name', text: value.trim(), path: here });
    }
    const value = node.props['accessibilityValue'];
    if (typeof value === 'object' && value !== null) {
      const text = (value as Record<string, unknown>)['text'];
      if (typeof text === 'string' && text.trim() !== '')
        out.push({ kind: 'name', text: text.trim(), path: here });
    }

    if (node.type === 'Text' || node.type === 'RNSVGText') {
      for (const text of paragraphsOf(node)) out.push({ kind: 'paragraph', text, path: here });
      return;
    }

    const direction = flattenStyle(node.props['style'])['flexDirection'];
    if (direction === 'row' || direction === 'row-reverse') {
      const children = (node.children ?? []).filter(isNode);
      const ordered = direction === 'row-reverse' ? [...children].reverse() : children;
      const tops = ordered
        .map((child) => paragraphsOf(child)[0])
        .filter((top): top is string => top !== undefined);
      if (tops.length >= 2) out.push({ kind: 'line', text: tops.join(' '), path: here });
    }

    for (const child of node.children ?? []) if (isNode(child)) walk(child, here);
  };
  walk(root, []);
  return out;
}

/**
 * Whether a subtree draws something a person can see: text, an accessible name, a picture, a field,
 * or any paint (F-221, ADR-0134 D1). A `testID` proves only that a node claims to be an element;
 * this is what the inventory sweep asks of the node it lands on, so an empty `View` with the right
 * id is still "not drawn".
 */
export function drawsSomething(node: TestNode): boolean {
  if (perceivable(node)) return true;
  const paints = (n: TestNode): boolean =>
    n.type !== 'RNSVGClipPath' &&
    (colourValues(n).length > 0 || (n.children ?? []).some((c) => isNode(c) && paints(c)));
  return paints(node);
}
