/**
 * The colour-vision preview reaches every palette through `ThemeProvider` (F-240, ADR-0131).
 *
 * - **Standard is the identity**, object for object: nothing that reads the theme today sees it
 *   move until a mode is chosen.
 * - **A mode paints the declared palette through the engine**, and keeps the declared one beside it
 *   as `source`, so what is derived from colours is derived from the app as it is.
 * - **A nested provider inherits the mode**, and the runtime device palette is simulated like any
 *   declared one.
 */

import { Text as NativeText } from 'react-native';
import { render } from '@testing-library/react-native';
import { nativeColors, simulatePaint, simulatePalette } from '@irodora/design-tokens';
import {
  ThemeProvider,
  useTheme,
  useVisionPreview,
  VISION_MODES,
  VisionPreviewProvider,
  type ThemeColors,
  type ThemeValue,
  type VisionMode,
} from '../src/index.js';

/** Render a provider tree and hand back what `useTheme()` saw inside it. */
function themeIn(tree: (probe: React.JSX.Element) => React.JSX.Element): ThemeValue {
  let seen: ThemeValue | undefined;
  function Probe(): React.JSX.Element {
    seen = useTheme();
    return <NativeText>probe</NativeText>;
  }
  const rendered = render(tree(<Probe />));
  rendered.unmount();
  if (seen === undefined) throw new Error('the probe never rendered');
  return seen;
}

const SAMPLE = '#B5495B';

describe('Standard is the identity', () => {
  it('outside any preview, the mode is standard and the palette is the declared object', () => {
    const theme = themeIn((probe) => <ThemeProvider theme="dark">{probe}</ThemeProvider>);
    expect(theme.vision).toBe('standard');
    expect(theme.colors).toBe(nativeColors.dark);
    expect(theme.source).toBe(nativeColors.dark);
    expect(theme.paint(SAMPLE)).toBe(SAMPLE);
  });

  it('and so it is inside a Standard preview', () => {
    const theme = themeIn((probe) => (
      <VisionPreviewProvider mode="standard">
        <ThemeProvider theme="light">{probe}</ThemeProvider>
      </VisionPreviewProvider>
    ));
    expect(theme.colors).toBe(nativeColors.light);
  });

  it('reads the mode from its own context, standard by default', () => {
    let seen: VisionMode | undefined;
    function Probe(): React.JSX.Element {
      seen = useVisionPreview();
      return <NativeText>probe</NativeText>;
    }
    render(<Probe />).unmount();
    expect(seen).toBe('standard');
    expect(VISION_MODES).toStrictEqual(['standard', 'protanopia', 'deuteranopia', 'tritanopia']);
  });
});

describe('a mode paints through the engine, and keeps the declared palette beside it', () => {
  it.each(['protanopia', 'deuteranopia', 'tritanopia'] as const)(
    '%s: colors is the simulated palette, source the declared one, paint the same simulation',
    (mode) => {
      const theme = themeIn((probe) => (
        <VisionPreviewProvider mode={mode}>
          <ThemeProvider theme="dark">{probe}</ThemeProvider>
        </VisionPreviewProvider>
      ));
      expect(theme.vision).toBe(mode);
      expect(theme.source).toBe(nativeColors.dark);
      expect(theme.colors).toBe(simulatePalette(nativeColors.dark, mode));
      expect(theme.paint(SAMPLE)).toBe(simulatePaint(SAMPLE, mode));
      // DECOY — the mode did something: a chromatic token and a sample both moved.
      expect(theme.colors).not.toBe(nativeColors.dark);
      expect(theme.colors['status.ok']).not.toBe(nativeColors.dark['status.ok']);
      expect(theme.paint(SAMPLE)).not.toBe(SAMPLE);
    },
  );

  it('a nested provider inherits the mode — the suite forces palettes by nesting', () => {
    const theme = themeIn((probe) => (
      <VisionPreviewProvider mode="deuteranopia">
        <ThemeProvider theme="dark">
          <ThemeProvider theme="light">{probe}</ThemeProvider>
        </ThemeProvider>
      </VisionPreviewProvider>
    ));
    expect(theme.name).toBe('light');
    expect(theme.colors).toBe(simulatePalette(nativeColors.light, 'deuteranopia'));
  });

  it('simulates the runtime device palette like any declared one', () => {
    // Typed as the app types its seeded palette (appearance.tsx): a runtime palette has no literal.
    const seeded = Object.fromEntries(
      Object.entries(nativeColors.dark).map(([token, value]) => [
        token,
        token === 'accent' ? '#2E8B57' : value,
      ]),
    ) as ThemeColors;
    const theme = themeIn((probe) => (
      <VisionPreviewProvider mode="protanopia">
        <ThemeProvider palette={{ name: 'device', mode: 'dark', colors: seeded }}>
          {probe}
        </ThemeProvider>
      </VisionPreviewProvider>
    ));
    expect(theme.source).toBe(seeded);
    expect(theme.colors.accent).toBe(simulatePaint('#2E8B57', 'protanopia'));
  });
});
