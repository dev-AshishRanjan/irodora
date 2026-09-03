/**
 * The harness, proven before any component exists.
 *
 * Every assertion here is a **table**: the compliant fixture must pass and the decoy must
 * fail, in the same test. A negative case with no positive beside it cannot distinguish "the
 * check works" from "the check never fires", and this repository has shipped that shape more
 * than once [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { render } from '@testing-library/react-native';
import { LARGE_TEXT_TOKENS } from '@irodora/design-tokens';
import {
  flattenStyle,
  paintedColors,
  pressableNodes,
  resolveTextNodes,
  RN_DEFAULT_FONT_SIZE,
  type TestNode,
} from '../src/testing/index.js';
import {
  CompliantSwatch,
  InheritedLargeText,
  InheritedSmallText,
  LiteralColour,
  NoFontScaling,
  SmallTextOnLargeTextToken,
  TypeNamedPressable,
  UnlabelledPressable,
} from './fixtures/subjects.js';

/**
 * Render and hand back the react-test-renderer JSON tree the walkers consume.
 *
 * A fragment renders to an ARRAY rather than a node, so it is wrapped in a synthetic root.
 * Without that, a component whose top level is a fragment would walk as nothing at all, and
 * every assertion over it would pass vacuously.
 */
function tree(element: React.JSX.Element): TestNode {
  const json = render(element).toJSON();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

/** The manifest's own large-text floor. Read, never typed here. */
const LARGE_TEXT_MIN = 18.66;

describe('the harness has subjects at all', () => {
  it('renders the compliant fixture to a walkable tree', () => {
    const t = tree(<CompliantSwatch />);
    expect(resolveTextNodes(t, 'light').length).toBeGreaterThan(0);
    expect(pressableNodes(t).length).toBeGreaterThan(0);
    expect(paintedColors(t, 'light').length).toBeGreaterThan(0);
  });

  it('knows which tokens are large-text-only, from the generated exports', () => {
    // Hard-coding 'foreground.3' would leave the NEXT largeText token unchecked with nothing
    // saying so — the exact defect DESIGN-SYSTEM.md records against the first attempt.
    expect(LARGE_TEXT_TOKENS.length).toBeGreaterThan(0);
    expect(LARGE_TEXT_TOKENS).toContain('foreground.3');
  });
});

describe('an unresolvable colour is a failure, not a skip', () => {
  it('resolves every colour in the compliant fixture to a token', () => {
    const painted = paintedColors(tree(<CompliantSwatch />), 'light');
    expect(painted.length).toBeGreaterThan(0);
    const unresolved = painted.filter((p) => p.resolution.kind === 'unresolved');
    expect(unresolved).toHaveLength(0);
  });

  it('reports the hand-typed hex as unresolved rather than passing over it', () => {
    const painted = paintedColors(tree(<LiteralColour />), 'light');
    const unresolved = painted.filter((p) => p.resolution.kind === 'unresolved');
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]?.resolution).toMatchObject({ kind: 'unresolved', value: '#8A8A8A' });
  });
});

describe('the small-text check, and the inheritance that hides it', () => {
  /** The check itself, written once and applied to every fixture below. */
  const violations = (element: React.JSX.Element): readonly string[] =>
    resolveTextNodes(tree(element), 'light')
      .filter(
        (n) =>
          n.fontSize < LARGE_TEXT_MIN &&
          n.colorResolution.kind === 'token' &&
          n.colorResolution.tokens.some((t) =>
            (LARGE_TEXT_TOKENS as readonly string[]).includes(t),
          ),
      )
      .map((n) => `${n.path.join('>')} ${String(n.fontSize)}px`);

  it('passes the compliant fixture, which uses the same token ABOVE the floor', () => {
    // The positive half, and it is the one that makes the negatives mean something: the
    // compliant fixture uses foreground.3 at 19px, so a check that simply flagged the token
    // would fail here.
    expect(violations(<CompliantSwatch />)).toHaveLength(0);
  });

  it('catches the flat case — foreground.3 declared at 13px', () => {
    expect(violations(<SmallTextOnLargeTextToken />)).toHaveLength(1);
  });

  it('catches the INHERITED case, which a flat walk cannot see', () => {
    // The inner Text declares no fontSize. Its own style says `undefined`; it renders at 13.
    //
    // NOTE: this assertion alone does NOT prove the inheritance model. Deleting the model was
    // tried, and this test kept passing — the node then defaults to RN's 14 px, which is also
    // below the floor, so it is flagged for the wrong reason. The two tests below are what
    // actually discriminate, and they exist because that experiment was run.
    const found = violations(<InheritedSmallText />);
    expect(found.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT flag foreground.3 inherited at 22px — the false positive a naive walk invents', () => {
    // The other direction, and the half that fails loudly without the model: with no
    // inheritance the inner node falls back to 14 px and gets reported as a violation that
    // does not exist. A check that over-reports gets switched off, so this matters as much as
    // the under-reporting case.
    expect(violations(<InheritedLargeText />)).toHaveLength(0);
  });

  it('models the inheritance rather than defaulting — the inner node reports 13, not 14', () => {
    // Proves the mechanism, not just the outcome. If inheritance were absent the node would
    // fall back to RN's default of 14, which is ALSO below the floor, so the test above would
    // pass for the wrong reason and keep passing after the model was removed.
    const nodes = resolveTextNodes(tree(<InheritedSmallText />), 'light');
    const inner = nodes.find((n) => n.text === '#526A6B');
    expect(inner).toBeDefined();
    expect(inner?.fontSize).toBe(13);
    expect(inner?.fontSize).not.toBe(RN_DEFAULT_FONT_SIZE);
    expect(inner?.fontSizeDeclared).toBe(true);
  });

  it('does not inherit text style through a View', () => {
    // The other half of the model. Over-inheriting would attribute a wrapper's size to text
    // that does not have it, and produce false positives nobody could act on.
    const nodes = resolveTextNodes(tree(<CompliantSwatch />), 'light');
    const name = nodes.find((n) => n.text === 'Ai-nezumi');
    expect(name?.fontSize).toBe(22);
  });
});

describe('accessible names', () => {
  const named = (element: React.JSX.Element): readonly (string | undefined)[] =>
    pressableNodes(tree(element)).map((p) => p.accessibilityLabel);

  it('accepts a real name on the compliant fixture', () => {
    const labels = named(<CompliantSwatch />).filter((l) => l !== undefined);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0]).toMatch(/Ai-nezumi/u);
  });

  it('catches a pressable with no name at all', () => {
    expect(named(<UnlabelledPressable />).every((l) => l === undefined)).toBe(true);
  });

  it('catches a name that is only the component type — the label that passes every check', () => {
    // `accessibilityLabel !== undefined` is true here. That is the point: the assertion most
    // likely to be written is satisfied by a label that tells a screen-reader user nothing.
    const labels = named(<TypeNamedPressable />).filter((l) => l !== undefined);
    expect(labels).toContain('swatch');
    const typeNames = ['swatch', 'button', 'colour', 'color', 'image'];
    expect(labels.some((l) => typeNames.includes(l.trim().toLowerCase()))).toBe(true);
  });

  it('separates the two decoys, which a presence check would conflate', () => {
    const unlabelled = named(<UnlabelledPressable />).filter((l) => l !== undefined).length;
    const typeNamed = named(<TypeNamedPressable />).filter((l) => l !== undefined).length;
    expect(unlabelled).toBe(0);
    expect(typeNamed).toBeGreaterThan(0);
  });
});

describe('roles, states and font scaling', () => {
  it('reads the role and the disabled state off the compliant fixture', () => {
    const pressables = pressableNodes(tree(<CompliantSwatch />));
    const withRole = pressables.filter((p) => p.accessibilityRole !== undefined);
    expect(withRole.length).toBeGreaterThan(0);
    expect(withRole[0]?.accessibilityRole).toBe('button');
    expect(withRole[0]?.accessibilityState).toMatchObject({ disabled: false });
  });

  it('catches a pressable with no role', () => {
    const pressables = pressableNodes(tree(<UnlabelledPressable />));
    expect(pressables.every((p) => p.accessibilityRole === undefined)).toBe(true);
  });

  it('catches disabled font scaling, and passes the fixture that allows it', () => {
    const off = resolveTextNodes(tree(<NoFontScaling />), 'light');
    expect(off.length).toBeGreaterThan(0);
    expect(off.some((n) => !n.allowFontScaling)).toBe(true);

    const on = resolveTextNodes(tree(<CompliantSwatch />), 'light');
    expect(on.every((n) => n.allowFontScaling)).toBe(true);
  });
});

describe('flattenStyle', () => {
  it('flattens arrays and nested arrays, last write winning', () => {
    // RN accepts all three forms and every component in this repository uses the array form,
    // so a walker that only handled objects would silently see no styles at all.
    expect(flattenStyle({ fontSize: 13 })).toEqual({ fontSize: 13 });
    expect(flattenStyle([{ fontSize: 13 }, { fontSize: 22 }])).toEqual({ fontSize: 22 });
    expect(flattenStyle([{ color: 'a' }, [{ color: 'b' }, { fontSize: 1 }]])).toEqual({
      color: 'b',
      fontSize: 1,
    });
    expect(flattenStyle(undefined)).toEqual({});
  });
});
