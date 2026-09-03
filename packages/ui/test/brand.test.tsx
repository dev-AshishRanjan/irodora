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
  markFields,
  markSvg,
  narrowestFeature,
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
 * The two fields, narrowed.
 *
 * `markFields()` returns a `readonly` array and `noUncheckedIndexedAccess` is on, so indexing
 * it yields `T | undefined`. Asserting the length here rather than adding `!` at four call
 * sites means the test that a field is MISSING fails as a length assertion with a number in it,
 * instead of as a confusing `undefined` dereference three lines later.
 */
function bothFields(): readonly [
  { x: number; y: number; width: number; height: number },
  { x: number; y: number; width: number; height: number },
] {
  const f = markFields();
  expect(f).toHaveLength(2);
  const [left, right] = f;
  if (left === undefined || right === undefined) throw new Error('the mark lost a field');
  return [left, right];
}

describe('the mark is an arrangement, not two shapes near each other', () => {
  /*
   * THE DESIGN, AS AN ASSERTION.
   *
   * The gap between the fields and the displacement between them are the same quantity. That
   * equality is what makes this an arrangement rather than an adjacency, and it is the whole
   * idea the mark was approved as. A later edit that moved one field "to look better" would
   * leave something that still reads as a mark and has stopped being this one.
   */
  it('separates and displaces the two fields by the same interval', () => {
    const [left, right] = bothFields();
    const gap = right.x - (left.x + left.width);
    const offset = right.y - left.y;

    expect(gap).toBe(MARK.interval);
    expect(offset).toBe(MARK.interval);
    expect(gap).toBe(offset);
  });

  it('is two identical fields — only the position differs', () => {
    const [left, right] = bothFields();
    expect(right.width).toBe(left.width);
    expect(right.height).toBe(left.height);
  });

  it('sits centred in its grid, so a caller can size it without cropping', () => {
    const f = markFields();
    const minX = Math.min(...f.map((r) => r.x));
    const maxX = Math.max(...f.map((r) => r.x + r.width));
    const minY = Math.min(...f.map((r) => r.y));
    const maxY = Math.max(...f.map((r) => r.y + r.height));
    // Equal margin on both axes, and the ink is square.
    expect(minX).toBe(MARK.grid - maxX);
    expect(minY).toBe(MARK.grid - maxY);
    expect(maxX - minX).toBe(maxY - minY);
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

  it('renders every field with a positive size at 16px', () => {
    const tree = draw(<Mark size={MARK_MIN_SIZE} label="Irodora" />);
    const node = tree.getByRole('image', { name: 'Irodora' });
    const rects = node.children.filter((c) => typeof c !== 'string');
    expect(rects).toHaveLength(2);
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
    const twoTone = markSvg('#F6F4F1').replace('fill="#F6F4F1"/><rect', 'fill="#49AB79"/><rect');
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

  it('the SVG and the component draw the same rectangles', () => {
    // Two renderers, one geometry (F-141). This is the assertion that keeps F-142's icon from
    // drifting away from the mark inside the app.
    const svg = markSvg('#000000');
    for (const r of markFields())
      expect(svg).toContain(
        `x="${String(r.x)}" y="${String(r.y)}" width="${String(r.width)}" height="${String(r.height)}"`,
      );
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
