/**
 * Figures (F-235, criterion 4; FR-61).
 *
 * - **Every figure names what it is and where it was computed**, aloud: `figureName` always carries
 *   the quantity, the value, its unit and the space, and an empty name is refused.
 * - **What is printed is what the drawing prints**: `figureText` is the digits and a unit symbol.
 * - **A delta's sign is U+2212**, the minus at the width of its plus — not a hyphen.
 * - **`FigureValue` is tabular, selectable and named in full.**
 * - **The `ragged-figure` rule reports proportional digits**, with a planted subject as the decoy.
 * - **A bilingual line is one node**, its Japanese run in the Japanese face.
 */

import { render, screen } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { nativeFamilies, nativeNumericFeature, type Theme } from '@irodora/design-tokens';
import {
  Bilingual,
  figureName,
  figureText,
  FigureValue,
  MINUS,
  signed,
  Text,
  ThemeProvider,
  type Figure,
} from '../src/index.js';
import {
  carriesFigure,
  checkSubject,
  flattenStyle,
  raggedFigures,
  type TestNode,
} from '../src/testing/index.js';

const DELTA_E: Figure = {
  kind: 'measure',
  value: 2.4,
  places: 1,
  quantity: 'ΔE00',
  space: 'CIEDE2000',
};
const HUE: Figure = {
  kind: 'measure',
  value: -0.4,
  places: 1,
  signed: true,
  quantity: 'Δh',
  unit: '°',
  space: 'OKLCh',
};

describe('a figure names what it is and where it was computed', () => {
  it('prints what the drawing prints, and says the rest', () => {
    expect(figureText(DELTA_E)).toBe('2.4');
    expect(figureName(DELTA_E)).toBe('ΔE00 2.4, CIEDE2000');
    expect(figureText(HUE)).toBe(`${MINUS}0.4°`);
    expect(figureName(HUE)).toBe(`Δh ${MINUS}0.4°, OKLCh`);
  });

  it('prints a share as a whole percent, and names what it is a share of', () => {
    const share: Figure = { kind: 'share', fraction: 0.842, of: 'Wardrobe coverage' };
    expect(figureText(share)).toBe('84%');
    expect(figureName(share)).toBe('Wardrobe coverage 84%');
    expect(() => figureText({ kind: 'share', fraction: 1.2, of: 'x' })).toThrow(RangeError);
  });

  it('names what a count counts', () => {
    expect(figureName({ kind: 'count', value: 12, noun: 'pairings' })).toBe('12 pairings');
    expect(figureText({ kind: 'count', value: 3, signed: true, noun: 'kept' })).toBe('+3');
  });

  it('refuses an empty name: a figure whose space is blank tells nobody anything', () => {
    expect(() => figureName({ ...DELTA_E, space: ' ' })).toThrow(/space is empty/u);
    expect(() => figureName({ ...DELTA_E, quantity: '' })).toThrow(/quantity is empty/u);
    expect(() => figureName({ kind: 'count', value: 1, noun: '' })).toThrow(/noun is empty/u);
  });

  it('signs a delta with U+2212, at the width of its plus', () => {
    expect(signed(-0.8, 1)).toBe('−0.8');
    expect(signed(0.3, 1)).toBe('+0.3');
    expect(signed(0, 1)).toBe('0.0');
    // DECOY: the hyphen-minus a `toFixed` alone would print.
    expect(signed(-0.8, 1)).not.toBe((-0.8).toFixed(1));
    // An unsigned negative measure still prints the true minus.
    expect(figureText({ ...DELTA_E, value: -3.4 })).toBe(`${MINUS}3.4`);
  });
});

describe('FigureValue is tabular, selectable and named in full', () => {
  it('sets the digits tabular and selectable, with the whole name for a screen reader', () => {
    render(
      <ThemeProvider theme="dark">
        <FigureValue figure={HUE} size="label" color="foreground" testID="f" />
      </ThemeProvider>,
    );
    const node = screen.getByTestId('f');
    expect(flattenStyle(node.props['style'])['fontVariant']).toContain(nativeNumericFeature);
    expect(node.props['selectable']).toBe(true);
    expect(node.props['accessibilityLabel']).toBe(`Δh ${MINUS}0.4°, OKLCh`);
  });
});

describe('the ragged-figure rule', () => {
  const tree = (node: React.JSX.Element): TestNode => {
    const rendered = render(<ThemeProvider theme="dark">{node}</ThemeProvider>);
    const json = rendered.toJSON() as TestNode;
    rendered.unmount();
    return json;
  };

  it('reports a figure in proportional digits, and passes the same figure set tabular', () => {
    const subject = (numeric: boolean) => ({
      name: 'Figure',
      kind: 'static' as const,
      render: (_state: string, theme: Theme) => {
        const rendered = render(
          <ThemeProvider theme={theme}>
            <Text size="label" color="foreground" numeric={numeric}>
              4.2
            </Text>
          </ThemeProvider>,
        );
        const json = rendered.toJSON() as TestNode;
        rendered.unmount();
        return json;
      },
    });
    const ragged = (numeric: boolean): number =>
      checkSubject(subject(numeric), ['light', 'dark']).filter((f) => f.rule === 'ragged-figure')
        .length;
    // DECOY first: the planted proportional figure is reported, in both themes.
    expect(ragged(false)).toBe(2);
    expect(ragged(true)).toBe(0);
  });

  it('does not count a name with digits, or prose, as a figure', () => {
    expect(carriesFigure('CIELAB (D65)')).toBe(false);
    expect(carriesFigure('ΔE00')).toBe(false);
    expect(carriesFigure('IRO-ED-001')).toBe(false);
    expect(carriesFigure('ΔE00 0.42')).toBe(true);
    // Japanese prose has no spaces; it is counted in kana and kanji (20 ≈ eight words).
    expect(
      carriesFigure(
        'この端末は色を提供していません。Android 12 以降は提供します。iOS は提供しないため、ここでは上のテーマからお選びください。',
      ),
    ).toBe(false);
    // A numeral bound to a Japanese counter is a word, as "two" is in English.
    expect(carriesFigure('この2色は見分けにくいです')).toBe(false);
    expect(carriesFigure('赤が弱い（1型）')).toBe(false);
    expect(carriesFigure('名前・16進数・言葉で探す')).toBe(false);
    // DECOY: a value after a Japanese word, or set apart from it, is still a figure.
    expect(carriesFigure('網羅率84%')).toBe(true);
    expect(carriesFigure('色差 2.4')).toBe(true);
    expect(raggedFigures(tree(<RNText>Hex #5B6B78</RNText>), nativeNumericFeature)).toStrictEqual([
      'Hex #5B6B78',
    ]);
  });
});

describe('a bilingual line is one node', () => {
  it('sets the Japanese after the bullet, in the Japanese face, inside the one line', () => {
    render(
      <ThemeProvider theme="dark">
        <Bilingual text="Compare" ja="比較" size="title" color="foreground" testID="b" />
      </ThemeProvider>,
    );
    const japanese = screen.getByText(' • 比較');
    expect(flattenStyle(japanese.props['style'])['fontFamily']).toBe(nativeFamilies.jp);
    let inside = false;
    for (let n = japanese.parent; n !== null; n = n.parent)
      if (n === screen.getByTestId('b')) inside = true;
    expect(inside).toBe(true);
  });

  it('is the text alone without a Japanese name', () => {
    render(
      <ThemeProvider theme="dark">
        <Bilingual text="New palette" size="label" color="foreground" />
      </ThemeProvider>,
    );
    expect(screen.queryByText(/•/u)).toBeNull();
  });
});
