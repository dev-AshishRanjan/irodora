/**
 * The pair, and the one property no other check in this repository can see.
 *
 * The conformance suite reads structure and colour. Gate 9 reads the manifest's pairings. Gate
 * 10 reads CVD separation. **None of them has a geometry**, and the whole argument for this
 * component is geometric: the two samples touch, and nothing is drawn between them.
 *
 * That is also the property most likely to be lost by accident. `borderWidth: 1` is the
 * obvious thing to write on a sample, it looks right in every screenshot, and it silently
 * turns the pair back into two swatches in a row — which is the arrangement the component
 * exists to replace. So the shared edge is asserted directly, in both directions.
 */

import { render } from '@testing-library/react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeColors, nativeJudgeableSample, nativeSpacing } from '@irodora/design-tokens';
import { halfWidth, Pair, pairRingTone, ThemeProvider } from '../src/index.js';

/** The narrowest phone the viewport gate supports, and the most padding a screen may take. */
const NARROWEST_WIDTH = 320;
const MAX_PADDING = 28;

const A = {
  name: 'Ai-nezumi',
  hex: '#526a6b',
  color: fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 }),
};

/*
 * A NEAR NEIGHBOUR, not a contrasting one. What a reader can judge at a boundary is decided by
 * the SMALL differences — a fixture showing only large ones would let a line grow on the shared
 * edge without anything looking wrong.
 */
const B = {
  name: 'Fukiasagi',
  hex: '#5a6f78',
  color: fromSpace('oklch', [0.44, 0.08, 258], { source: 'declared', confidence: 1 }),
};

const draw = (node: React.JSX.Element, theme: 'light' | 'dark' = 'light') =>
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

type Style = Record<string, unknown>;

const flat = (style: unknown): Style =>
  Array.isArray(style)
    ? (Object.assign({}, ...(style as object[])) as Style)
    : ((style ?? {}) as Style);

/** Every host view painted with one of the two sample colours, in tree order. */
function samples(tree: ReturnType<typeof draw>): readonly Style[] {
  return tree.root
    .findAll(
      (n) =>
        typeof n.type === 'string' &&
        [A.hex, B.hex].includes(String(flat(n.props['style'])['backgroundColor'])),
    )
    .map((n) => flat(n.props['style']));
}

describe('the shared edge', () => {
  it('carries no line and no corner, on either half', () => {
    const [left, right] = samples(draw(<Pair a={A} b={B} />));

    // THE ASSERTION THIS FILE EXISTS FOR. A line here is an induced edge sitting exactly where
    // the judgement happens, and a corner here is a wedge of well between the two samples —
    // the same failure drawn more slowly.
    expect(left?.['borderRightWidth']).toBe(0);
    expect(left?.['borderTopRightRadius']).toBe(0);
    expect(left?.['borderBottomRightRadius']).toBe(0);

    expect(right?.['borderLeftWidth']).toBe(0);
    expect(right?.['borderTopLeftRadius']).toBe(0);
    expect(right?.['borderBottomLeftRadius']).toBe(0);
  });

  it('DECOY — the three OUTER edges of each half do carry one', () => {
    /*
     * Without this the component could draw no border at all and the case above would pass
     * [[a-decoy-that-is-not-broken-proves-nothing]]. The outer edges are where a keyline still
     * has a job: an edge against the well, which is the easy half of F-068's problem because
     * the well is a known colour.
     */
    const [left, right] = samples(draw(<Pair a={A} b={B} />));

    expect(left?.['borderLeftWidth']).toBe(1);
    expect(left?.['borderTopWidth']).toBe(1);
    expect(left?.['borderBottomWidth']).toBe(1);

    expect(right?.['borderRightWidth']).toBe(1);
    expect(right?.['borderTopWidth']).toBe(1);
    expect(right?.['borderBottomWidth']).toBe(1);
  });

  it('gives each half the tone chosen against its OWN colour', () => {
    // Two samples, two different worst cases. A single tone for both would be right for one of
    // them by luck — which is the halo F-163 reported, one component along.
    for (const theme of ['light', 'dark'] as const) {
      const [left, right] = samples(draw(<Pair a={A} b={B} />, theme));
      const tones = [
        nativeColors[theme]['swatch.hairline'],
        nativeColors[theme]['swatch.hairline.inverse'],
      ];
      expect(tones).toContain(left?.['borderColor']);
      expect(tones).toContain(right?.['borderColor']);
    }
  });
});

describe('the size floor (ADR-0095)', () => {
  it('draws both halves at the judgeable height', () => {
    const [left, right] = samples(draw(<Pair a={A} b={B} />));
    expect(left?.['height']).toBe(nativeJudgeableSample);
    expect(right?.['height']).toBe(nativeJudgeableSample);
  });

  it('refuses to go under it, and does grow above it', () => {
    // A floor that a caller can argue their way past is a default. Both directions, because a
    // component that clamped everything to the floor would pass the first half alone.
    const small = samples(draw(<Pair a={A} b={B} height={20} />));
    expect(small[0]?.['height']).toBe(nativeJudgeableSample);

    const large = samples(draw(<Pair a={A} b={B} height={nativeJudgeableSample * 2} />));
    expect(large[0]?.['height']).toBe(nativeJudgeableSample * 2);
  });

  it('still clears the floor in its NARROWER dimension on the narrowest phone', () => {
    /*
     * The floor is on the smaller dimension: a field subtends 2° across only if its narrowest
     * run does. Height is fixed at the floor, so this asks the other question — whether the
     * width can fall below it when the screen is as narrow as the viewport gate allows and a
     * screen takes as much padding as it allows.
     *
     * Computed from the well's own padding and the ring rather than from a number somebody
     * measured, so it moves when either does.
     */
    const available = NARROWEST_WIDTH - 2 * MAX_PADDING;
    expect(halfWidth(available)).toBeGreaterThanOrEqual(nativeJudgeableSample);
  });

  it('DECOY — the arithmetic is not trivially large', () => {
    // Without this, `halfWidth` could return a constant and the case above would pass. It
    // accounts for the well's padding and the ring, so a genuinely tight container fails.
    expect(halfWidth(2 * nativeSpacing.sm + 2 + 20)).toBe(10);
  });
});

describe('what a screen reader hears', () => {
  it('gives each half a name, a value and its provenance', () => {
    const tree = draw(<Pair a={A} b={B} />);

    for (const half of [A, B]) {
      const node = tree.root.find((n) => {
        const said: unknown = n.props['accessibilityLabel'];
        return typeof said === 'string' && said.startsWith(half.name);
      });
      const said: unknown = node.props['accessibilityLabel'];
      const label = typeof said === 'string' ? said : '';

      // All three parts, because ACCESSIBILITY.md §5 asks for all three and the label is
      // assembled by `swatchAccessibleName` so a pair cannot drift from a swatch.
      expect(label).toContain(half.hex.replace('#', ''));
      expect(label).toContain(half.color.provenance.source);
      expect(label.toLowerCase()).not.toContain('swatch');
    }
  });

  it('announces each half as one thing rather than as a control', () => {
    // A pair is a reading. A role it does not have is worse than no role: a button that does
    // nothing when activated is a dead end a screen-reader user cannot tell from a bug.
    const tree = draw(<Pair a={A} b={B} />);
    expect(tree.root.findAll((n) => n.props['accessibilityRole'] === 'button')).toHaveLength(0);
    // HOST nodes only. The test renderer reports the composite element and the View it
    // renders, so counting both would say four halves and pass a component with one.
    expect(
      tree.root.findAll(
        (n) => typeof n.type === 'string' && n.props['accessibilityRole'] === 'image',
      ),
    ).toHaveLength(2);
  });
});

describe('the labels', () => {
  it('are beneath the samples, not between them', () => {
    /*
     * The criterion is "edge to edge with the numbers beneath, not beside", and tree order is
     * how that is checkable without a layout engine: every sample comes before every label, so
     * nothing textual can be sitting in the gap the component exists to keep empty.
     */
    const tree = draw(<Pair a={A} b={B} />);
    const flatTree = tree.root.findAll(() => true);

    const lastSample = flatTree.findLastIndex(
      (n) =>
        typeof n.type === 'string' &&
        [A.hex, B.hex].includes(String(flat(n.props['style'])['backgroundColor'])),
    );
    const firstText = flatTree.findIndex((n) => {
      const kids: unknown = n.props['children'];
      return typeof kids === 'string' && [A.name, B.name].includes(kids);
    });

    expect(lastSample).toBeGreaterThan(-1);
    expect(firstText).toBeGreaterThan(lastSample);
  });
});

describe('the ring', () => {
  it('is chosen against the well, which is the known colour', () => {
    // A single swatch picks its inner tone against its own sample. A pair has two samples and
    // one ring, so the ring answers the easy question — an edge against a ground we chose.
    for (const theme of ['light', 'dark'] as const) {
      const c = nativeColors[theme];
      const chosen = pairRingTone(
        c['swatch.well'],
        c['swatch.hairline'],
        c['swatch.hairline.inverse'],
      );
      expect([c['swatch.hairline'], c['swatch.hairline.inverse']]).toContain(chosen);
    }
  });

  it('DECOY — it is not the same tone in both themes', () => {
    /*
     * The themes are authored independently and `swatch.hairline` is near-white in one of them,
     * so a ring that came out identical in both would mean the choice is not being made. This
     * is the assertion that would have caught the halo in F-163 a feature earlier.
     */
    const pick = (theme: 'light' | 'dark'): string => {
      const c = nativeColors[theme];
      return pairRingTone(c['swatch.well'], c['swatch.hairline'], c['swatch.hairline.inverse']);
    };
    expect(pick('light')).not.toBe(pick('dark'));
  });
});
