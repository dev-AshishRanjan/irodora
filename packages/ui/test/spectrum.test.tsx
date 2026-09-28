/**
 * `00`'s two icons drawn in hue (ADR-0110, F-232): the colour wheel and the palette.
 *
 * Their stops are minted tokens (`glyph.wheel.1–8`, `glyph.palette.1–8`), and the colour is laid over
 * the glyph's own area, so the one-ink silhouette F-228 registered is unchanged: it is what every
 * other caller draws, and what the glyph is in greyscale. A control that draws either icon passes
 * the stops itself, so a surface never names a hue.
 */

import { render } from '@testing-library/react-native';
import { Path } from 'react-native-svg';
import { nativeColors } from '@irodora/design-tokens';
import {
  Button,
  Glyph,
  glyphSpectrum,
  SPECTRUM_GLYPHS,
  SPECTRUM_STOPS,
  ThemeProvider,
} from '../src/index.js';
import { paintedColors, type TestNode } from '../src/testing/index.js';

const dark = nativeColors.dark;
const INK = '#F2F2F2';

describe('which glyphs take a spectrum, and from which tokens', () => {
  it('resolves eight stops, in order, for the wheel and the palette', () => {
    for (const [name, tokens] of Object.entries(SPECTRUM_GLYPHS)) {
      expect(tokens).toHaveLength(SPECTRUM_STOPS);
      expect(tokens.map((t, i) => t.endsWith(`.${String(i + 1)}`))).not.toContain(false);
      expect(glyphSpectrum(name as keyof typeof SPECTRUM_GLYPHS, dark)).toStrictEqual(
        tokens.map((t) => dark[t]),
      );
    }
  });

  it('DECOY — gives every other glyph none', () => {
    expect(glyphSpectrum('camera', dark)).toBeUndefined();
    expect(glyphSpectrum('palette', dark)).toBeUndefined();
  });
});

/** The fills of every path a glyph draws, in order. */
const fills = (node: React.JSX.Element): string[] =>
  render(node)
    .UNSAFE_queryAllByType(Path)
    .map((p) => String((p.props as { fill?: unknown }).fill));

describe('the colour is laid over the silhouette, which is unchanged', () => {
  it('draws the wheel as eight hue wedges with the palette in ink over them', () => {
    const stops = glyphSpectrum('colour-wheel', dark) ?? [];
    const drawn = fills(<Glyph name="colour-wheel" color={INK} spectrum={stops} />);
    // the clip's own path draws nothing; then the eight wedges; then the palette, in ink
    expect(drawn.filter((f) => stops.includes(f))).toStrictEqual([...stops]);
    expect(drawn.at(-1)).toBe(INK);
  });

  it('draws the palette as eight hue wedges and nothing in ink', () => {
    const stops = glyphSpectrum('palette-solid', dark) ?? [];
    const drawn = fills(<Glyph name="palette-solid" color={INK} spectrum={stops} />);
    expect(drawn.filter((f) => stops.includes(f))).toStrictEqual([...stops]);
    expect(drawn).not.toContain(INK);
  });

  it('DECOY — without a spectrum, each is its one-ink silhouette, as F-228 registered it', () => {
    for (const name of ['colour-wheel', 'palette-solid'] as const)
      expect(fills(<Glyph name={name} color={INK} />)).toStrictEqual([INK]);
  });

  it('ignores a spectrum on a glyph drawn in one ink', () => {
    expect(fills(<Glyph name="camera" color={INK} spectrum={['#FF0000']} />)).not.toContain(
      '#FF0000',
    );
  });
});

describe('a control draws the hue itself, and every stop is a token', () => {
  it('paints the wheel’s eight minted stops when a button draws it', () => {
    const { toJSON } = render(
      <ThemeProvider theme="dark">
        <Button icon="colour-wheel" label="Open the colour wheel" shape="circle" />
      </ThemeProvider>,
    );
    const painted = paintedColors(toJSON() as TestNode, 'dark')
      .filter((c) => c.property === 'fill' && c.resolution.kind === 'token')
      .flatMap((c) => (c.resolution.kind === 'token' ? c.resolution.tokens : []))
      .filter((t) => t.startsWith('glyph.wheel.'));
    expect(new Set(painted).size).toBe(SPECTRUM_STOPS);
  });
});
