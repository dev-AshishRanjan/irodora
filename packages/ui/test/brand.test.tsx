/**
 * The mark and the wordmark (F-141, F-165).
 *
 * ## What is worth asserting about a mark, and what is not
 *
 * Most of a mark is judgement, and no test closes that. Three things are not judgement, because
 * [`BRAND.md` §7](../../../docs/design/BRAND.md#7-the-mark) states them as requirements:
 *
 * 1. It **does not depend on colour to be recognisable** — *"a mark that depends on colour to be
 *    recognisable is disqualified from this product"*.
 * 2. It works at **16 px**.
 * 3. It is an **arrangement** — relationship, adjacency, interval — which in this mark is one
 *    measured equality, and so is the one part of the *design* a test can hold.
 *
 * The rest is recorded as an attested criterion rather than pretended away.
 *
 * ## The CVD check changed shape with the mark, and got stronger
 *
 * It used to count fills and require exactly one. That was a true statement about a monochrome
 * mark and the wrong statement about the requirement: the brief is about **recognisability**,
 * not about ink. The icon now carries five corpus colours (ADR-0093), and the honest check is
 * that its silhouette is the same whether it is drawn in five colours or one — which is what
 * "does not depend on colour" means, and which counting fills could never have said.
 */

import { render } from '@testing-library/react-native';
import { nativeColors } from '@irodora/design-tokens';
import {
  EYE_RADIUS,
  Mark,
  MARK,
  MARK_MIN_SIZE,
  markDiscs,
  markReach,
  markSvg,
  narrowestFeature,
  PETAL_RADIUS,
  svgNumber,
  ThemeProvider,
  Wordmark,
} from '../src/index.js';

const draw = (node: React.JSX.Element, theme: 'light' | 'dark' = 'light') =>
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

/** Every distinct `fill="…"` in an SVG document. */
function fills(svg: string): string[] {
  const found = [...svg.matchAll(/fill="([^"]+)"/gu)]
    .map((m) => m[1])
    .filter((v): v is string => v !== undefined);
  return [...new Set(found)];
}

/** Every disc in an SVG document, as its geometry alone — the silhouette, with no colour in it. */
function silhouette(svg: string): string[] {
  return [...svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/gu)].map(
    (m) => `${String(m[1])},${String(m[2])},${String(m[3])}`,
  );
}

/** The gap between two discs, edge to edge. */
const gapBetween = (
  a: { cx: number; cy: number; r: number },
  b: { cx: number; cy: number; r: number },
): number => Math.hypot(a.cx - b.cx, a.cy - b.cy) - a.r - b.r;

/** One disc, narrowed. `noUncheckedIndexedAccess` is on, so indexing yields `T | undefined`. */
function disc(i: number): { cx: number; cy: number; r: number; role: 'eye' | 'petal' } {
  const d = markDiscs()[i];
  if (d === undefined) throw new Error(`the mark lost disc ${String(i)}`);
  return d;
}

describe('the mark is one quantity used twice (F-165)', () => {
  /*
   * THE DESIGN, AS AN ASSERTION.
   *
   * The gap between two neighbouring petals and the gap between a petal and the eye are the SAME
   * number, and they are the same by CONSTRUCTION rather than by coincidence: both radii are
   * solved from the interval rather than chosen beside it. A later edit that nudged a radius "to
   * look better" would leave something that still reads as a blossom and has stopped being this
   * mark.
   */
  it('separates every disc by the same interval', () => {
    const eye = disc(0);
    const first = disc(1);
    const second = disc(2);

    expect(gapBetween(first, second)).toBeCloseTo(MARK.interval, 10);
    expect(gapBetween(eye, first)).toBeCloseTo(MARK.interval, 10);
  });

  it('solves the radii from the interval rather than stating them', () => {
    // If either were written down, this would be restating a literal. Both come out of the
    // chord between two petal centres, which is why the two gaps above cannot drift apart.
    expect(PETAL_RADIUS).toBeCloseTo(
      (2 * MARK.orbit * Math.sin(Math.PI / MARK.petals) - MARK.interval) / 2,
      10,
    );
    expect(EYE_RADIUS).toBeCloseTo(MARK.orbit - PETAL_RADIUS - MARK.interval, 10);
  });

  it('draws five petals around one eye, because a plum blossom is five', () => {
    const discs = markDiscs();
    expect(discs).toHaveLength(MARK.petals + 1);
    expect(discs.filter((d) => d.role === 'petal')).toHaveLength(5);
    expect(discs.filter((d) => d.role === 'eye')).toHaveLength(1);
  });

  it('points a petal straight up, which is the only orientation choice in it', () => {
    // A blossom rotated off its axis looks like a mistake nobody meant, and every kamon makes
    // the same choice.
    const first = disc(1);
    expect(first.cx).toBeCloseTo(MARK.grid / 2, 10);
    expect(first.cy).toBeCloseTo(MARK.grid / 2 - MARK.orbit, 10);
  });

  it('is five identical petals — only the position differs', () => {
    for (const d of markDiscs().filter((p) => p.role === 'petal'))
      expect(d.r).toBeCloseTo(PETAL_RADIUS, 10);
  });

  it('sits centred in its grid, so a caller can size it without cropping', () => {
    // Every disc is inside the grid, and the reach is symmetric about the centre by construction.
    expect(markReach()).toBeLessThan(MARK.grid / 2);
    for (const d of markDiscs()) {
      expect(Math.hypot(d.cx - MARK.grid / 2, d.cy - MARK.grid / 2) + d.r).toBeLessThanOrEqual(
        markReach() + 1e-9,
      );
    }
  });
});

describe('it works at 16px', () => {
  /*
   * THE INTERVAL IS WHAT CLOSES FIRST. A blossom whose gaps have closed is one disc, so the gap
   * is the feature to measure — not a petal, which is twice as wide and would report a
   * comfortable number while the mark stopped being legible.
   */
  it('keeps its interval above a pixel floor at the smallest declared size', () => {
    expect(narrowestFeature(MARK_MIN_SIZE)).toBeGreaterThanOrEqual(2);
  });

  it('renders every disc at 16px', () => {
    const tree = draw(<Mark size={MARK_MIN_SIZE} label="Irodora" />);
    expect(tree.getByRole('image', { name: 'Irodora' })).toBeTruthy();
    expect(tree.UNSAFE_queryAllByType('RNSVGCircle' as never)).toHaveLength(MARK.petals + 1);
  });
});

describe('it does not depend on colour to be recognisable', () => {
  /*
   * NOT A SIMULATION, AND NOT A FILL COUNT EITHER.
   *
   * Running protan/deutan/tritan over a monochrome mark maps one colour to one colour and reports
   * that nothing was confused — true of any single-colour document, so it would pass whatever it
   * was given. That is simulation theatre.
   *
   * Counting fills was the previous answer and it was a true statement about the wrong thing: the
   * brief asks about RECOGNISABILITY, not about ink. What actually satisfies it is that the
   * silhouette is the same however the mark is filled — which is assertable, and which is what
   * these two cases do.
   */
  it('draws the same silhouette in five colours as in one', () => {
    const five = markSvg(['#AC473E', '#9F7850', '#4E8164', '#449AAC', '#507DB3']);
    const one = markSvg('#131110');

    expect(silhouette(five)).toEqual(silhouette(one));
    expect(silhouette(one)).toHaveLength(MARK.petals + 1);
    // And the colours really did differ, or the comparison above would be trivially true.
    expect(fills(five).length).toBeGreaterThan(fills(one).length);
  });

  it('REFUSES a silhouette that changed — the decoy, without which the comparison asserts nothing', () => {
    const one = markSvg('#131110');
    const moved = one.replace(/r="[\d.]+"/u, 'r="9"');
    expect(silhouette(moved)).not.toEqual(silhouette(one));
  });

  it('hard-codes no colour of its own', () => {
    // Every fill in the document came from the argument. A mark carrying a brand colour would
    // be one that depends on colour to be recognisable — the disqualifying case.
    for (const theme of ['light', 'dark'] as const) {
      const token = nativeColors[theme].foreground;
      expect(fills(markSvg(token))).toEqual([token]);
    }
  });

  it('stays one colour inside the app, whatever the icon does', () => {
    /*
     * ADR-0093's other half, and the one that protects the product's actual job: every surface
     * in the app is used to judge a garment colour, so a five-colour mark in a header would be
     * five colours competing with the one being read. `Mark` takes a single token and has no
     * way to express more.
     */
    const tree = draw(<Mark size={48} label="Irodora" />, 'dark');
    const drawn = new Set(
      tree.UNSAFE_queryAllByType('RNSVGCircle' as never).map((n) => String(n.props['fill'])),
    );
    expect(drawn.size).toBe(1);
  });

  it('the SVG and the component draw the same discs', () => {
    /*
     * Two renderers, one geometry (F-141, F-165). This is the assertion that keeps F-142's icon
     * from drifting away from the mark inside the app — and the radii are irrational, so both
     * round through the same formatter or they could never agree.
     */
    const svg = markSvg('#000000');
    const rendered = draw(<Mark size={48} label="Irodora" />);
    const drawn = rendered
      .UNSAFE_queryAllByType('RNSVGCircle' as never)
      .map((n) => `${String(n.props['cx'])},${String(n.props['cy'])},${String(n.props['r'])}`);

    for (const d of markDiscs()) {
      const key = `${svgNumber(d.cx)},${svgNumber(d.cy)},${svgNumber(d.r)}`;
      expect(silhouette(svg)).toContain(key);
      expect(drawn).toContain(key);
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
