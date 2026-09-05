/**
 * The mark and the wordmark (F-141).
 *
 * ## What is worth asserting about a mark, and what is not
 *
 * Most of a mark is judgement, and no test closes that. Three things are not judgement, because
 * [`BRAND.md` §7](../../../docs/design/BRAND.md#7-the-mark) states them as requirements:
 *
 * 1. It works in **one colour** — *"a mark that depends on colour to be recognisable is
 *    disqualified from this product"*.
 * 2. It works at **16 px**.
 * 3. It is an **arrangement** — relationship, adjacency, interval — which in this mark is one
 *    measured equality, and so is the one part of the *design* a test can hold.
 *
 * The rest is recorded as an attested criterion rather than pretended away.
 */

import { render } from '@testing-library/react-native';
import { nativeColors } from '@irodora/design-tokens';
import {
  Mark,
  MARK,
  MARK_MIN_SIZE,
  markBounds,
  markStrokes,
  markSvg,
  narrowestFeature,
  pathOf,
  ThemeProvider,
  Wordmark,
} from '../src/index.js';

const draw = (node: React.JSX.Element, theme: 'light' | 'dark' = 'light') =>
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

/** Every distinct `fill="…"` in an SVG document. The CVD question, reduced to counting. */
function fills(svg: string): string[] {
  const found = [...svg.matchAll(/fill="([^"]+)"/gu)]
    .map((m) => m[1])
    .filter((v): v is string => v !== undefined);
  return [...new Set(found)];
}

/**
 * One stroke's four corners, narrowed.
 *
 * `markStrokes()` returns `readonly` arrays and `noUncheckedIndexedAccess` is on, so indexing
 * yields `T | undefined`. Asserting the shape here rather than adding `!` at a dozen call sites
 * means a stroke that LOST a corner fails as a length assertion with a number in it, instead of
 * as a confusing `undefined` dereference three lines later.
 */
function corners(i: number): {
  topLeft: readonly [number, number];
  topRight: readonly [number, number];
  bottomRight: readonly [number, number];
  bottomLeft: readonly [number, number];
} {
  const stroke = markStrokes()[i];
  if (stroke === undefined) throw new Error(`the mark lost stroke ${String(i)}`);
  expect(stroke).toHaveLength(4);
  const [topLeft, topRight, bottomRight, bottomLeft] = stroke;
  if (
    topLeft === undefined ||
    topRight === undefined ||
    bottomRight === undefined ||
    bottomLeft === undefined
  )
    throw new Error('a stroke lost a corner');
  return { topLeft, topRight, bottomRight, bottomLeft };
}

describe('the mark is one quantity used three times (F-165)', () => {
  /*
   * THE DESIGN, AS AN ASSERTION.
   *
   * The stroke's thickness, the gap between strokes and each stroke's horizontal shear are the
   * SAME number. That is what makes this an arrangement rather than three shapes near each
   * other, and it is the whole idea the mark was approved as. A later edit that moved one
   * stroke "to look better" would leave something that still reads as a mark and has stopped
   * being this one.
   *
   * It is also what puts every edge at 45°, which is the only slant a raster grid draws without
   * softening — so the aesthetic claim and the manufacturing one are the same claim.
   */
  it('makes the thickness, the gap and the shear one number', () => {
    const first = corners(0);
    const second = corners(1);

    const thickness = first.bottomLeft[1] - first.topLeft[1];
    const gap = second.topLeft[1] - first.bottomLeft[1];
    const shear = first.topLeft[0] - first.bottomLeft[0];

    expect(thickness).toBe(MARK.interval);
    expect(gap).toBe(MARK.interval);
    expect(shear).toBe(MARK.interval);
  });

  it('slants at exactly 45°, which is what keeps its edges hard', () => {
    // Shear over thickness. At 1 the edge advances one pixel per pixel row at every size the
    // generator will build, so no edge ever lands between pixels.
    const { topLeft, bottomLeft } = corners(0);
    const run = topLeft[0] - bottomLeft[0];
    const rise = bottomLeft[1] - topLeft[1];
    expect(run / rise).toBe(1);
  });

  it('draws three strokes, because 彡 is three', () => {
    expect(markStrokes()).toHaveLength(MARK.strokes);
    expect(MARK.strokes).toBe(3);
  });

  it('is three identical strokes — only the height differs', () => {
    const shape = (i: number) => {
      const c = corners(i);
      return [
        c.topRight[0] - c.topLeft[0],
        c.bottomRight[0] - c.bottomLeft[0],
        c.bottomLeft[1] - c.topLeft[1],
        c.topLeft[0] - c.bottomLeft[0],
      ];
    };
    expect(shape(1)).toEqual(shape(0));
    expect(shape(2)).toEqual(shape(0));
  });

  it('sits centred in its grid, so a caller can size it without cropping', () => {
    const box = markBounds();
    // Equal margin on both axes, and the ink is square.
    expect(box.x).toBe(MARK.grid - (box.x + box.width));
    expect(box.y).toBe(MARK.grid - (box.y + box.height));
    expect(box.width).toBe(box.height);
  });
});

describe('it works at 16px', () => {
  /*
   * THE INTERVAL IS WHAT CLOSES FIRST. A mark whose gap has closed up is one rectangle, so the
   * gap is the feature to measure — not the field, which is nearly twice as wide and would
   * report a comfortable number while the mark stopped being legible.
   */
  it('keeps its interval above a pixel floor at the smallest declared size', () => {
    expect(narrowestFeature(MARK_MIN_SIZE)).toBeGreaterThanOrEqual(2);
  });

  it('renders every stroke at 16px', () => {
    const tree = draw(<Mark size={MARK_MIN_SIZE} label="Irodora" />);
    const node = tree.getByRole('image', { name: 'Irodora' });
    // Down through the Svg to the polygons: the component is a labelled View wrapping one Svg.
    const strokes = tree.UNSAFE_queryAllByType('RNSVGPath' as never);
    expect(node).toBeTruthy();
    expect(strokes).toHaveLength(MARK.strokes);
  });
});

describe('it works in one colour, which is the CVD guarantee', () => {
  /*
   * NOT A SIMULATION, AND THE DIFFERENCE MATTERS.
   *
   * Running protan/deutan/tritan over this mark would map one colour to one colour and report
   * that nothing was confused — true, and true of any single-colour document, so it would pass
   * whatever it was given. That is simulation theatre: a check that cannot fail.
   *
   * The property that actually satisfies the brief is that there is only ONE colour to map. So
   * that is what is counted, and the decoy below is what makes the count mean something.
   */
  it('emits exactly one fill, and it is the colour the caller passed', () => {
    const svg = markSvg('#F6F4F1');
    expect(fills(svg)).toEqual(['#F6F4F1']);
  });

  it('REFUSES a two-colour mark — the decoy, without which the count asserts nothing', () => {
    const twoTone = markSvg('#F6F4F1').replace('fill="#F6F4F1"/><path', 'fill="#49AB79"/><path');
    expect(fills(twoTone).length).toBeGreaterThan(1);
    // The check the real case relies on: it distinguishes. If this passed with one fill, the
    // assertion above would hold for any document at all.
    expect(fills(twoTone)).not.toEqual(['#F6F4F1']);
  });

  it('hard-codes no colour of its own', () => {
    // Every fill in the document came from the argument. A mark carrying a brand colour would
    // be one that depends on colour to be recognisable — the disqualifying case.
    for (const theme of ['light', 'dark'] as const) {
      const token = nativeColors[theme].foreground;
      expect(fills(markSvg(token))).toEqual([token]);
    }
  });

  it('the SVG and the component draw the same path', () => {
    /*
     * Two renderers, one geometry (F-141, F-165). This is the assertion that keeps F-142's icon
     * from drifting away from the mark inside the app — and it got stronger when the component
     * stopped drawing `View`s: both now emit the SAME `points` string from the same formatter,
     * so there is no longer a second way to express the shape.
     */
    const svg = markSvg('#000000');
    const rendered = draw(<Mark size={48} label="Irodora" />);
    const drawn = rendered
      .UNSAFE_queryAllByType('RNSVGPath' as never)
      .map((n) => String(n.props['d']));

    for (const stroke of markStrokes()) {
      expect(svg).toContain(`d="${pathOf(stroke)}"`);
      expect(drawn).toContain(pathOf(stroke));
    }
  });
});

describe('the lockup', () => {
  it('sets the name beside the mark', () => {
    const tree = draw(<Wordmark />);
    expect(tree.getByText('Irodora')).toBeTruthy();
  });

  it('announces the name once, not twice', () => {
    // The word is real text, so the mark beside it is decorative. A labelled mark in a lockup
    // makes a screen reader say the product name twice.
    const tree = draw(<Wordmark />);
    expect(tree.queryAllByLabelText('Irodora')).toHaveLength(0);
  });

  it('renders in both themes', () => {
    for (const theme of ['light', 'dark'] as const)
      expect(draw(<Wordmark />, theme).getByText('Irodora')).toBeTruthy();
  });
});
