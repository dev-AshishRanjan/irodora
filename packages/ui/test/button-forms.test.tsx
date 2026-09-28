/**
 * Button is board 00's buttons (F-232): the primary pill, the outlined secondary with no fill, and
 * the icon-only forms on a plate (ADR-0115), each drawn at its size and reaching the target through
 * its hit area (ADR-0114).
 *
 * The defaults are not typed in and left: they are recomputed here from the inventories, as
 * ADR-0113 recomputes the caption, so a re-recorded element that moves one fails this test instead
 * of leaving a stale constant.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { Platform, Text as RNText } from 'react-native';
import { nativeColors, nativeRadius } from '@irodora/design-tokens';
import {
  Button,
  BUTTON_HEIGHT,
  FOCUS_RING,
  GLYPH_IN_PLATE,
  Glyph,
  hitArea,
  ICON_PLATE,
  Text,
  ThemeProvider,
} from '../src/index.js';
import { flattenStyle, tapTargetReach } from '../src/testing/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');

interface Element {
  readonly id: string;
  readonly parent: string | null;
  readonly component: string | null;
  readonly icon?: string | null;
  readonly box: { readonly w: number; readonly h: number };
  readonly dp: { readonly h: number } | null;
  readonly tokens?: Readonly<Record<string, string>>;
  readonly copy?: unknown;
  readonly raw?: Readonly<Record<string, number>>;
}

const elements: readonly Element[] = readdirSync(INVENTORY)
  .filter((f) => /^\d\d\.json$/u.test(f))
  .flatMap((f) => {
    const inv = JSON.parse(readFileSync(join(INVENTORY, f), 'utf8')) as {
      elements?: readonly Element[];
    };
    return inv.elements ?? [];
  });
const byId = new Map(elements.map((e) => [e.id, e]));
const labelled = (e: Element): boolean =>
  (e.copy !== null && e.copy !== undefined) ||
  elements.some((k) => k.parent === e.id && k.copy !== null && k.copy !== undefined);
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const half = (v: number): number => Math.round(v * 2) / 2;

/** The camera spans x 3 → 21 on the 24-unit icon grid (`CAMERA_BODY` in Glyph.tsx). */
const CAMERA_GRID_SHARE = 18 / 24;

describe('the defaults are the inventories’, recomputed', () => {
  it('BUTTON_HEIGHT is the median labelled pill button a scaled screen draws', () => {
    const heights = elements
      .filter(
        (e) =>
          e.component === 'ui:Button' &&
          e.tokens?.['radius'] === 'pill' &&
          e.dp !== null &&
          labelled(e),
      )
      .map((e) => e.dp?.h ?? NaN);
    expect(heights).toHaveLength(8);
    expect(half(median(heights))).toBe(BUTTON_HEIGHT);
  });

  it('ICON_PLATE is 00’s plate-to-pill ratio, times that height', () => {
    const ratios = elements
      .filter(
        (e) =>
          e.id.startsWith('00.') &&
          e.component === 'ui:Button' &&
          typeof e.icon === 'string' &&
          !labelled(e),
      )
      .map((e) => {
        const column = e.id.startsWith('00.buttons.')
          ? '00.buttons.primary'
          : '00.controls.primary';
        return e.box.h / (byId.get(column)?.box.h ?? NaN);
      });
    expect(ratios).toHaveLength(12);
    expect(half(median(ratios) * BUTTON_HEIGHT)).toBe(ICON_PLATE);
  });

  it('GLYPH_IN_PLATE is calibrated on 00’s three camera plates', () => {
    const shares = elements
      .filter(
        (e) => e.id.startsWith('00.') && e.icon === 'camera' && e.raw?.['glyphPx'] !== undefined,
      )
      .map((e) => (e.raw?.['glyphPx'] ?? NaN) / CAMERA_GRID_SHARE / e.box.h);
    expect(shares).toHaveLength(3);
    expect(Math.round(median(shares) * 100) / 100).toBe(GLYPH_IN_PLATE);
  });
});

/** The host view of the button with this testID, its style flattened. */
function hostOf(testID: string): {
  readonly style: Record<string, unknown>;
  readonly hitSlop: unknown;
} {
  const hosts = screen.getAllByTestId(testID, { includeHiddenElements: true });
  const host = hosts.find((h) => typeof h.type === 'string') ?? hosts[0];
  const props = (host?.props ?? {}) as { style?: unknown; hitSlop?: unknown };
  return { style: flattenStyle(props.style), hitSlop: props.hitSlop };
}

const dark = nativeColors.dark;

describe('the labelled forms', () => {
  it('draws the primary at its drawn height, filled with the accent, reaching the target', () => {
    render(
      <ThemeProvider theme="dark">
        <Button label="Save" height={35.5} testID="p" />
      </ThemeProvider>,
    );
    const { style, hitSlop } = hostOf('p');
    expect(style['height']).toBe(35.5);
    expect(style['backgroundColor']).toBe(dark.accent);
    expect(style['borderRadius']).toBe(nativeRadius.pill);
    expect(hitSlop).toStrictEqual(hitArea(44, 35.5));
    expect(tapTargetReach(style, hitSlop as never)).toStrictEqual({ width: 44, height: 44 });
  });

  it('defaults to BUTTON_HEIGHT and a pill', () => {
    render(
      <ThemeProvider theme="dark">
        <Button label="Save" testID="d" />
      </ThemeProvider>,
    );
    expect(hostOf('d').style['height']).toBe(BUTTON_HEIGHT);
  });

  it('draws the secondary as an outline with NO fill (00.buttons.secondary)', () => {
    render(
      <ThemeProvider theme="dark">
        <Button label="Hold" variant="secondary" testID="s" />
      </ThemeProvider>,
    );
    const { style } = hostOf('s');
    expect(style['backgroundColor']).toBe('transparent');
    expect(style['borderWidth']).toBe(1);
    expect(style['borderColor']).toBe(dark['border.strong']);
  });

  it('takes a screen’s corner', () => {
    render(
      <ThemeProvider theme="dark">
        <Button label="Save" radius="md" testID="m" />
      </ThemeProvider>,
    );
    expect(hostOf('m').style['borderRadius']).toBe(nativeRadius.md);
  });

  it('sets its label through Text, in body at 500 on the primary and 400 on the secondary', () => {
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider theme="dark">
        <Button label="Save" />
        <Button label="Hold" variant="secondary" />
      </ThemeProvider>,
    );
    const labels = UNSAFE_getAllByType(Text).map(
      (t) => t.props as { weight?: number; color?: string },
    );
    expect(labels.map((l) => [l.weight, l.color])).toStrictEqual([
      [500, 'accent.foreground'],
      [400, 'foreground'],
    ]);
    const weights = UNSAFE_getAllByType(RNText).map(
      (t) => flattenStyle((t.props as { style?: unknown }).style)['fontWeight'],
    );
    expect(weights).toStrictEqual(['500', '400']);
  });

  it('reaches Material’s 48 on Android, with the drawn height unchanged', () => {
    const replaced = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      render(
        <ThemeProvider theme="dark">
          <Button label="Save" testID="a" />
        </ThemeProvider>,
      );
      const { style, hitSlop } = hostOf('a');
      expect(style['height']).toBe(BUTTON_HEIGHT);
      expect(tapTargetReach(style, hitSlop as never)).toStrictEqual({ width: 48, height: 48 });
    } finally {
      replaced.restore();
    }
  });
});

describe('the icon-only forms (ADR-0115)', () => {
  it('draws 00’s square plate in surface.2, at its size, with the glyph in proportion', () => {
    const { UNSAFE_getByType } = render(
      <ThemeProvider theme="dark">
        <Button icon="camera" label="Measure a colour" testID="i" />
      </ThemeProvider>,
    );
    const { style, hitSlop } = hostOf('i');
    expect([style['width'], style['height']]).toStrictEqual([ICON_PLATE, ICON_PLATE]);
    expect(style['backgroundColor']).toBe(dark['surface.2']);
    expect(style['borderRadius']).toBe(nativeRadius.sm);
    expect(tapTargetReach(style, hitSlop as never)).toStrictEqual({ width: 44, height: 44 });
    expect((UNSAFE_getByType(Glyph).props as { size: number }).size).toBe(
      ICON_PLATE * GLYPH_IN_PLATE,
    );
  });

  it('draws the second row round, and 13’s lock outlined in border', () => {
    render(
      <ThemeProvider theme="dark">
        <Button icon="palette" label="Open palettes" shape="circle" testID="r" />
        <Button icon="lock" label="Lock this slot" plate="outlined" size={21} testID="o" />
      </ThemeProvider>,
    );
    expect(hostOf('r').style['borderRadius']).toBe(nativeRadius.pill);
    const outlined = hostOf('o').style;
    expect(outlined['backgroundColor']).toBe('transparent');
    expect(outlined['borderColor']).toBe(dark.border);
    expect(outlined['width']).toBe(21);
  });

  it('refuses mixing the forms', () => {
    // @ts-expect-error — an icon-only button has no variant: its plate is its form.
    const mixed = <Button icon="camera" label="Measure" variant="secondary" />;
    // @ts-expect-error — a labelled button has no plate.
    const plated = <Button label="Save" plate="outlined" />;
    // @ts-expect-error — an icon-only button still needs its name.
    const unnamed = <Button icon="camera" />;
    // DECOY — each form alone compiles.
    const fine = [
      <Button key="a" icon="camera" label="Measure" />,
      <Button key="b" label="Save" />,
    ];
    expect([mixed, plated, unnamed, ...fine]).toHaveLength(5);
  });
});

describe('focus is a ring outside the box (E-151)', () => {
  it.each(['primary', 'secondary'] as const)(
    'draws the %s’s focus in ring, and none without it',
    (variant) => {
      render(
        <ThemeProvider theme="dark">
          <Button label="Save" variant={variant} focused testID="f" />
          <Button label="Save" variant={variant} testID="n" />
        </ThemeProvider>,
      );
      const rings = (id: string) =>
        screen
          .getAllByTestId(id, { includeHiddenElements: true })
          .flatMap((h) => h.findAll((n) => typeof n.type === 'string'))
          .map((n) => flattenStyle((n.props as { style?: unknown }).style))
          .filter((s) => s['borderColor'] === dark.ring);
      const [ring] = rings('f');
      expect(ring?.['borderWidth']).toBe(FOCUS_RING);
      expect(ring?.['position']).toBe('absolute');
      expect(Number(ring?.['top'])).toBeLessThan(0);
      // DECOY — unfocused, nothing is drawn in ring.
      expect(rings('n')).toHaveLength(0);
    },
  );
});

describe('Text sets a weight on the sans only', () => {
  it('refuses a weight on the single-cut serif, and compiles one on the sans', () => {
    const serif = (
      <Text
        size="title"
        face="serif"
        color="foreground"
        // @ts-expect-error — Gelasio ships one cut (ADR-0112); a platform would fake the weight.
        weight={500}
      >
        Irodora
      </Text>
    );
    const sans = (
      <Text size="body" color="foreground" weight={500}>
        Save
      </Text>
    );
    expect([serif, sans]).toHaveLength(2);
  });
});
