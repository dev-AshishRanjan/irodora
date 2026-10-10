/**
 * The CVD preview's guard (F-240, ADR-0131 D10): a tree rendered in a preview mode is the Standard
 * tree with every colour simulated by the engine, and nothing else changed.
 *
 * The two trees are walked together. At every node:
 *
 * - **every painted value is `simulatePaint` of the Standard one** — the token layer, the samples,
 *   SVG paints and gradient stops alike. A component that paints a raw hex past `paint`, derives an
 *   edge from the painted palette, or simulates with another model is named here;
 * - **every other prop, every string and the structure are identical** — the preview never changes
 *   a printed hex, an accessible name or a layout.
 *
 * Colours are compared without case: react-native-svg hands paints back as lowercase hex.
 */

import { simulatePaint, type PreviewMode } from '@irodora/design-tokens';
import { colourValues, flattenStyle, type TestNode } from './tree.js';

/**
 * Props that are not compared as written:
 * - `fill`, `stroke` and `gradient` carry colour, and are read through `colourValues`;
 * - `jestInlineStyle` is the test renderer's mirror of `style`, which is compared.
 */
const SKIPPED_PROPS = new Set(['fill', 'stroke', 'gradient', 'jestInlineStyle']);

/** The colours `colourValues` reads from `style`; any other `…Color` key is compared here. */
const READ_STYLE_COLOURS = new Set([
  'color',
  'backgroundColor',
  'borderColor',
  'tintColor',
  'shadowColor',
  'fill',
  'stroke',
]);

/** A colour written inside a `boxShadow` string. */
const SHADOW_COLOUR = /rgba\([^)]*\)|#[0-9a-f]{6}(?:[0-9a-f]{2})?\b/giu;

/** A colour by its name: `color`, or any `…Color` — `borderTopColor`, `placeholderTextColor`. */
const isColourKey = (key: string): boolean => /color$/iu.test(key);

/** Props that hold an identifier or a reference to one, on any node and on SVG nodes. */
const ID_PROPS = new Set([
  'nativeID',
  'aria-labelledby',
  'aria-describedby',
  'accessibilityLabelledBy',
]);
const SVG_ID_PROPS = new Set(['name', 'clipPath', 'mask']);

/**
 * React's generated ids (`_r_1c_`), wherever else they surface in a prop, are made anew by every
 * render; they are compared as one id.
 */
const sameIds = (text: string): string => text.replace(/_r_[0-9a-z]+_/gu, '_r_·_');

const isNode = (c: TestNode | string): c is TestNode => typeof c !== 'string';

/** A child as a reader of a finding needs it: its text, or the element it is. */
const label = (c: TestNode | string | undefined): string =>
  c === undefined ? 'nothing' : typeof c === 'string' ? `"${c}"` : `<${c.type}>`;

/** A prop as compared: functions are identities a render makes anew, so only their presence counts. */
function comparable(value: unknown): string {
  if (typeof value === 'function') return 'function';
  try {
    return value === undefined ? 'undefined' : sameIds(JSON.stringify(value));
  } catch {
    return 'unserialisable';
  }
}

/** A style without its colours: the rest must not move. */
function shape(style: unknown): string {
  const flat = flattenStyle(style);
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(flat)
        .filter(
          ([key]) => !isColourKey(key) && key !== 'fill' && key !== 'stroke' && key !== 'boxShadow',
        )
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

/**
 * The colours a node carries that `colourValues` does not read: `style`'s other `…Color` keys and
 * the props named for a colour (`placeholderTextColor`). Each is still paint, so each is simulated.
 */
function otherColours(node: TestNode): readonly { readonly key: string; readonly value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(flattenStyle(node.props['style'])))
    if (isColourKey(key) && !READ_STYLE_COLOURS.has(key) && typeof value === 'string')
      out.push({ key: `style.${key}`, value });
  for (const [key, value] of Object.entries(node.props))
    if (key !== 'style' && isColourKey(key) && typeof value === 'string') out.push({ key, value });
  return out;
}

/**
 * Every way `preview` is not `standard` simulated in `mode`, each naming the node's path. Empty
 * means the preview painted exactly what the engine says, and changed nothing else.
 */
export function previewMismatches(
  standard: TestNode,
  preview: TestNode,
  mode: PreviewMode,
): readonly string[] {
  const out: string[] = [];
  /*
   * IDENTIFIERS ARE COMPARED BY WHERE THEY POINT, NOT AS WRITTEN. Every render generates its ids
   * afresh (\`useId\`), and components fold them into clip-path names and accessibility relations
   * (\`mark-cutsrs\`, \`_r_1__desc\`). Each tree's ids are numbered in order of first appearance, so
   * a reference that still points at the same element in the same place compares equal.
   */
  const ordinals = [new Map<string, number>(), new Map<string, number>()] as const;
  const ordinal = (tree: 0 | 1, id: unknown): string => {
    if (typeof id !== 'string') return comparable(id);
    const seen = ordinals[tree];
    let n = seen.get(id);
    if (n === undefined) {
      n = seen.size;
      seen.set(id, n);
    }
    return `#${String(n)}`;
  };
  const isId = (node: TestNode, key: string): boolean =>
    ID_PROPS.has(key) || (node.type.startsWith('RNSVG') && SVG_ID_PROPS.has(key));
  const walk = (a: TestNode, b: TestNode, path: readonly string[]): void => {
    const here = path.concat(a.type).join('>');
    if (a.type !== b.type) {
      out.push(`${here}: became ${b.type}`);
      return;
    }

    // Colours: each painted value is the engine's simulation of the Standard one.
    const ca = colourValues(a);
    const cb = colourValues(b);
    if (ca.length !== cb.length)
      out.push(
        `${here}: paints ${String(cb.length)} colours where Standard paints ${String(ca.length)}`,
      );
    else
      ca.forEach((paint, i) => {
        const other = cb[i];
        if (other?.property !== paint.property) {
          out.push(
            `${here}: paints ${other?.property ?? 'nothing'} where Standard paints ${paint.property}`,
          );
          return;
        }
        const expected = simulatePaint(paint.value, mode);
        if (other.value.toLowerCase() !== expected.toLowerCase())
          out.push(
            `${here}.${paint.property}: ${other.value} where the engine gives ${expected} (Standard ${paint.value})`,
          );
      });

    // The other colours, the same way.
    const oa = otherColours(a);
    const ob = otherColours(b);
    oa.forEach(({ key, value }) => {
      const other = ob.find((o) => o.key === key);
      const expected = value === 'transparent' ? value : simulatePaint(value, mode);
      if (other?.value.toLowerCase() !== expected.toLowerCase())
        out.push(
          `${here}.${key}: ${other?.value ?? 'nothing'} where the engine gives ${expected} (Standard ${value})`,
        );
    });

    // A shadow is paint too: the colours inside `boxShadow` are simulated, the geometry is not.
    const sa = flattenStyle(a.props['style'])['boxShadow'];
    const sb = flattenStyle(b.props['style'])['boxShadow'];
    if (sa !== undefined || sb !== undefined) {
      const expected =
        typeof sa === 'string' ? sa.replace(SHADOW_COLOUR, (c) => simulatePaint(c, mode)) : sa;
      if (comparable(sb).toLowerCase() !== comparable(expected).toLowerCase())
        out.push(
          `${here}.style.boxShadow: ${comparable(sb)} where the engine gives ${comparable(expected)}`,
        );
    }

    // Everything else: unchanged.
    const keys = new Set([...Object.keys(a.props), ...Object.keys(b.props)]);
    for (const key of keys) {
      if (SKIPPED_PROPS.has(key) || (key !== 'style' && isColourKey(key))) continue;
      const same =
        key === 'style'
          ? shape(a.props[key]) === shape(b.props[key])
          : isId(a, key)
            ? ordinal(0, a.props[key]) === ordinal(1, b.props[key])
            : comparable(a.props[key]) === comparable(b.props[key]);
      if (!same)
        out.push(
          `${here}.${key}: ${comparable(b.props[key]).slice(0, 120)} where Standard has ${comparable(a.props[key]).slice(0, 120)}`,
        );
    }

    const ka = a.children ?? [];
    const kb = b.children ?? [];
    if (ka.length !== kb.length) {
      out.push(`${here}: ${String(kb.length)} children where Standard has ${String(ka.length)}`);
      return;
    }
    ka.forEach((child, i) => {
      const other = kb[i];
      if (typeof child === 'string' || other === undefined || typeof other === 'string') {
        if (child !== other)
          out.push(`${here}: ${label(other)} where Standard has ${label(child)}`);
        return;
      }
      if (isNode(child)) walk(child, other, path.concat(a.type));
    });
  };
  walk(standard, preview, []);
  return out;
}
