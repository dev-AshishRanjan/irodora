/**
 * What is drawn against a colour sample (F-233, criterion 3; ADR-0116).
 *
 * - `sampleInk` is C8's choice wherever one ink passes, and the smaller E3 move where neither does.
 * - `sampleEdge` keeps the README keyline where it edges the sample, and where an element draws no
 *   keyline, draws nothing unless the sample would lose its edge.
 * - `Text on={sample}` sets its text in that ink; a token and a sample together do not compile.
 * - The conformance rule `sample-ink` measures text on a declared sample, whatever chose its ink.
 *
 * Every positive has a decoy: `#87795D` is a mid-tone neither ink clears, and `#E8E4DA` is one the
 * dark ink passes unmoved in every palette.
 */

import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { fromSpace } from '@irodora/color-core';
import { wcagContrast } from '@irodora/color-difference';
import { nativeColors, paintedOver, THEMES, type Theme } from '@irodora/design-tokens';
import {
  inkOnSample,
  sampleEdge,
  sampleInk,
  Text,
  ThemeProvider,
  type Sample,
} from '../src/index.js';
import {
  checkSubject,
  flattenStyle,
  type ConformanceSubject,
  type TestNode,
} from '../src/testing/index.js';

const rgbOf = (hex: string): readonly [number, number, number] => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const contrast = (a: string, b: string): number => wcagContrast(rgbOf(a), rgbOf(b));

const MID = '#87795D';
const PASSES = '#E8E4DA';
const sample = (hex: string): Sample => ({
  hex,
  color: fromSpace('srgb', rgbOf(hex), { source: 'declared', confidence: 1 }),
});

describe('sampleInk: C8, and E3 only where C8 cannot', () => {
  it.each(THEMES)('%s: takes the ink inkOnSample takes wherever it passes', (theme) => {
    const colors = nativeColors[theme];
    const chosen = inkOnSample(PASSES, colors);
    expect(chosen.passes).toBe(true);
    expect(sampleInk(PASSES, colors)).toMatchObject({
      ink: chosen.ink,
      hex: colors[chosen.ink].toUpperCase(),
      moved: false,
    });
  });

  it.each(THEMES)('%s: moves an ink on a mid-tone neither clears, to 4.5:1', (theme) => {
    const colors = nativeColors[theme];
    // DECOY: what C8 alone would draw fails here.
    expect(inkOnSample(MID, colors).passes).toBe(false);
    const ink = sampleInk(MID, colors);
    expect(ink.moved).toBe(true);
    expect(contrast(ink.hex, MID)).toBeGreaterThanOrEqual(4.5);
  });

  it('remembers a result per palette and sample', () => {
    expect(sampleInk(MID, nativeColors.dark)).toBe(sampleInk(MID.toLowerCase(), nativeColors.dark));
    expect(sampleInk(MID, nativeColors.dark)).not.toBe(sampleInk(MID, nativeColors.light));
  });
});

describe('sampleEdge: the README keyline, moved only where it must', () => {
  const colors = nativeColors.dark;
  const keyline = paintedOver(colors['swatch.keyline'], colors['swatch.well']);

  it('draws the keyline unmoved against a sample it already edges', () => {
    expect(sampleEdge('#F0EDE6', colors, true)).toMatchObject({ hex: keyline, moved: false });
  });

  it('moves it against a sample of its own lightness, to 3:1', () => {
    const edge = sampleEdge(keyline, colors, true);
    expect(edge.moved).toBe(true);
    expect(contrast(edge.hex, keyline)).toBeGreaterThanOrEqual(3);
  });

  it('with no keyline drawn, shows nothing where the sample holds its own edge', () => {
    // The line is the well itself: it is there, and it cannot be seen.
    expect(sampleEdge('#F0EDE6', colors, false)).toMatchObject({
      hex: colors['swatch.well'].toUpperCase(),
      moved: false,
    });
  });

  it('DECOY: with no keyline drawn, a sample near the well still gets one', () => {
    const edge = sampleEdge('#2A2D34', colors, false);
    expect(edge.moved).toBe(true);
    expect(contrast(edge.hex, '#2A2D34')).toBeGreaterThanOrEqual(3);
  });
});

describe('Text on={sample}', () => {
  const inkOf = (theme: Theme, hex: string): unknown => {
    const rendered = render(
      <ThemeProvider theme={theme}>
        <Text size="body" on={sample(hex)}>
          Kuri-iro
        </Text>
      </ThemeProvider>,
    );
    const style: unknown = rendered.getByText('Kuri-iro').props['style'];
    rendered.unmount();
    return flattenStyle(style)['color'];
  };

  it.each(THEMES)('%s: sets the text in the ink sampleInk chooses', (theme) => {
    expect(inkOf(theme, MID)).toBe(sampleInk(MID, nativeColors[theme]).hex);
    expect(inkOf(theme, PASSES)).toBe(sampleInk(PASSES, nativeColors[theme]).hex);
  });

  it('refuses a token and a sample together, and a bare hex', () => {
    const both = (
      // @ts-expect-error — a token on a sample is the pairing nothing declares
      <Text size="body" color="foreground" on={sample(MID)}>
        x
      </Text>
    );
    const bare = (
      // @ts-expect-error — a sample carries its provenance by type (ADR-0005)
      <Text size="body" on={{ hex: MID }}>
        x
      </Text>
    );
    // The decoy: each form alone compiles.
    const token = (
      <Text size="body" color="foreground">
        x
      </Text>
    );
    const on = (
      <Text size="body" on={sample(MID)}>
        x
      </Text>
    );
    expect([both, bare, token, on]).toHaveLength(4);
  });
});

describe('the conformance rule sample-ink', () => {
  const subject = (text: (theme: Theme) => React.JSX.Element): ConformanceSubject => ({
    name: 'OnSample',
    kind: 'static',
    sampleValues: [MID],
    render: (_state, theme) => {
      const rendered = render(
        <ThemeProvider theme={theme}>
          <View style={{ backgroundColor: MID, width: 120, height: 80 }}>{text(theme)}</View>
        </ThemeProvider>,
      );
      const json = rendered.toJSON() as TestNode;
      rendered.unmount();
      return json;
    },
  });
  const findings = (s: ConformanceSubject, rule: string): number =>
    checkSubject(s, THEMES).filter((f) => f.rule === rule).length;

  it('is silent for text set with on={sample}, and its moved ink is no colour literal', () => {
    const s = subject(() => (
      <Text size="body" on={sample(MID)}>
        Kuri-iro
      </Text>
    ));
    expect(findings(s, 'sample-ink')).toBe(0);
    expect(findings(s, 'colour-literal')).toBe(0);
  });

  it('DECOY: reports a token ink that fails on the sample, in every palette', () => {
    const s = subject(() => (
      <Text size="body" color="foreground">
        Kuri-iro
      </Text>
    ));
    expect(findings(s, 'sample-ink')).toBe(THEMES.length);
  });

  it('leaves a ground that is no declared sample to the colour-literal rule', () => {
    // The same failing ink as the decoy above: only the declaration differs.
    const undeclared: ConformanceSubject = {
      ...subject(() => (
        <Text size="body" color="foreground">
          Kuri-iro
        </Text>
      )),
      sampleValues: [],
    };
    expect(findings(undeclared, 'sample-ink')).toBe(0);
    expect(findings(undeclared, 'colour-literal')).toBeGreaterThan(0);
  });
});
