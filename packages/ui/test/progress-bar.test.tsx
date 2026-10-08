/**
 * The progress line (F-231; mockup 14, `14.splash.progress`).
 *
 * - **Its thickness is 14's**, recomputed from the inventory's reading, with the value it could have
 *   been as a decoy.
 * - **The value is a length drawn by a transform**, never a width keyed to the value and never a
 *   colour: the fill's ink is the same at every value.
 * - **Decorative unless named**, and when named it says the whole percentage done.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { nativeColors } from '@irodora/design-tokens';
import { PROGRESS_TRACK, ProgressBar, ThemeProvider } from '../src/index.js';
import { flattenStyle } from '../src/testing/index.js';

interface Element {
  readonly id: string;
  readonly raw?: Readonly<Record<string, number>>;
  readonly tokens: Readonly<Record<string, string>>;
}
interface Inventory {
  readonly elements: readonly Element[];
  readonly frame: {
    readonly screens: readonly { readonly id: string; readonly dpPerPx: number }[];
  };
}
const fourteen = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '14.json'), 'utf8'),
) as Inventory;
const progress = fourteen.elements.find((e) => e.id === '14.splash.progress');
if (progress === undefined) throw new Error('14.splash.progress');
const scale = fourteen.frame.screens.find((s) => s.id === '14.splash')?.dpPerPx ?? NaN;
const half = (v: number): number => Math.round(v * 2) / 2;

const draw = (node: React.JSX.Element, theme: 'dark' | 'light' = 'dark') =>
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

describe("the line is 14's", () => {
  it('is as thick as 14 draws it, to the half dp', () => {
    expect(half((progress.raw?.['trackPx'] ?? NaN) * scale)).toBe(PROGRESS_TRACK);
  });

  it("DECOY — the box F-220 first recorded, 5 px, is not 14's line", () => {
    // 5 px ran into the bar's anti-aliasing; at half maximum the line is 3.1.
    expect(half(5 * scale)).not.toBe(PROGRESS_TRACK);
  });

  it('binds the track to border.subtle and the fill to text.primary, as 14 does', () => {
    expect(progress.tokens).toMatchObject({ track: 'border.subtle', fill: 'text.primary' });
  });
});

describe('the value is a length, never a width or a colour', () => {
  const fillOf = (value: number, theme: 'dark' | 'light' = 'dark') => {
    const { getByTestId } = draw(<ProgressBar value={value} testID="line" />, theme);
    return flattenStyle(getByTestId('line.fill', { includeHiddenElements: true }).props['style']);
  };

  it('scales the fill from its leading edge by the value', () => {
    for (const value of [0, 0.25, 0.8, 1]) {
      const fill = fillOf(value);
      expect(fill['transform']).toStrictEqual([{ scaleX: value }]);
      expect(fill['transformOrigin']).toBe('left');
    }
  });

  it('DECOY — nothing about the fill but its scale moves with the value', () => {
    const unscaled = (style: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(style).filter(([key]) => key !== 'transform'));
    // A width keyed to the value, or an ink that changes with it, would differ here.
    expect(unscaled(fillOf(0.9))).toStrictEqual(unscaled(fillOf(0.2)));
    expect(fillOf(0.9)['transform']).not.toStrictEqual(fillOf(0.2)['transform']);
  });

  it('draws one ink for the fill and one for the track, in each theme', () => {
    for (const theme of ['dark', 'light'] as const) {
      const { getByTestId } = draw(<ProgressBar value={0.5} testID="line" />, theme);
      const track = flattenStyle(
        getByTestId('line', { includeHiddenElements: true }).props['style'],
      );
      const fill = flattenStyle(
        getByTestId('line.fill', { includeHiddenElements: true }).props['style'],
      );
      expect(track['backgroundColor']).toBe(nativeColors[theme].border);
      expect(fill['backgroundColor']).toBe(nativeColors[theme].foreground);
      expect(track['height']).toBe(PROGRESS_TRACK);
    }
  });

  it('refuses a value that is not a fraction rather than drawing past its track', () => {
    for (const bad of [-0.1, 1.2, Number.NaN])
      expect(() => draw(<ProgressBar value={bad} />)).toThrow(RangeError);
  });
});

describe('decorative unless named', () => {
  it('says nothing without a label', () => {
    const { getByTestId } = draw(<ProgressBar value={0.5} testID="line" />);
    const line = getByTestId('line', { includeHiddenElements: true });
    expect(line.props['accessibilityElementsHidden']).toBe(true);
    expect(line.props['importantForAccessibility']).toBe('no-hide-descendants');
  });

  it('with one, is a progressbar saying the whole percentage done, floored', () => {
    const { getByTestId } = draw(<ProgressBar value={0.999} label="Opening" testID="line" />);
    const line = getByTestId('line');
    expect(line.props['accessibilityRole']).toBe('progressbar');
    expect(line.props['accessibilityLabel']).toBe('Opening');
    // 0.999 is 99, never a 100 the line has not reached.
    expect(line.props['accessibilityValue']).toStrictEqual({ min: 0, max: 100, now: 99 });
  });
});
