/**
 * The switch is the size `15` draws it (F-232, delivering F-285's first criterion), and the target
 * is in its hit area (ADR-0114).
 *
 * The drawn size is recomputed from the inventory, so the constant cannot drift from the drawing.
 * The decoy is the old track: 68 × 44, raised to be the target, which is not what any mockup draws.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { nativeColors } from '@irodora/design-tokens';
import { FOCUS_RING, Switch, SWITCH_THUMB, SWITCH_TRACK, ThemeProvider } from '../src/index.js';
import { flattenStyle, tapTargetReach } from '../src/testing/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');

interface Element {
  readonly id: string;
  readonly component: string | null;
  readonly dp: { readonly w: number; readonly h: number } | null;
  readonly raw?: Readonly<Record<string, number>>;
}
const fifteen = JSON.parse(readFileSync(join(INVENTORY, '15.json'), 'utf8')) as {
  readonly frame: { readonly screens: readonly { readonly dpPerPx: number }[] };
  readonly elements: readonly Element[];
};
const switches = fifteen.elements.filter((e) => e.component === 'ui:Switch');
const half = (v: number): number => Math.round(v * 2) / 2;
const same = (xs: readonly number[]): number => {
  expect(new Set(xs).size).toBe(1);
  return xs[0] ?? NaN;
};

describe('the drawn size is 15’s, recomputed', () => {
  it('reads 15’s three switches', () => {
    expect(switches.map((e) => e.id)).toStrictEqual([
      '15.engine.tabular.switch',
      '15.engine.haptics.switch',
      '15.engine.provenance.switch',
    ]);
  });

  it('draws the track at 15’s size', () => {
    expect({
      width: same(switches.map((e) => e.dp?.w ?? NaN)),
      height: same(switches.map((e) => e.dp?.h ?? NaN)),
    }).toStrictEqual(SWITCH_TRACK);
  });

  it('draws the thumb at 15’s size', () => {
    const dpPerPx = fifteen.frame.screens[0]?.dpPerPx ?? NaN;
    expect(half(same(switches.map((e) => e.raw?.['thumbPx'] ?? NaN)) * dpPerPx)).toBe(SWITCH_THUMB);
  });

  it('DECOY — the old 68 × 44 track is not what 15 draws', () => {
    expect({ width: 68, height: 44 }).not.toStrictEqual(SWITCH_TRACK);
  });
});

const dark = nativeColors.dark;

function draw(checked: boolean, focused = false) {
  render(
    <ThemeProvider theme="dark">
      <Switch
        label="Tabular figures"
        checked={checked}
        onCheckedChange={() => undefined}
        focused={focused}
        testID="s"
      />
    </ThemeProvider>,
  );
  const hosts = screen.getAllByTestId('s', { includeHiddenElements: true });
  const host = hosts.find((h) => typeof h.type === 'string') ?? hosts[0];
  const all = (host?.findAll((n) => typeof n.type === 'string') ?? []).map((n) =>
    flattenStyle((n.props as { style?: unknown }).style),
  );
  return {
    track: flattenStyle((host?.props as { style?: unknown } | undefined)?.style),
    hitSlop: (host?.props as { hitSlop?: never } | undefined)?.hitSlop,
    all,
  };
}

describe('the switch as drawn', () => {
  it('draws the track at its size and reaches 44 through the hit area', () => {
    const { track, hitSlop } = draw(true);
    expect([track['width'], track['height']]).toStrictEqual([
      SWITCH_TRACK.width,
      SWITCH_TRACK.height,
    ]);
    expect(tapTargetReach(track, hitSlop)).toStrictEqual({ width: 44, height: 44 });
  });

  it('reaches Material’s 48 on Android, with the track unchanged', () => {
    const replaced = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      const { track, hitSlop } = draw(true);
      expect(track['height']).toBe(SWITCH_TRACK.height);
      expect(tapTargetReach(track, hitSlop)).toStrictEqual({ width: 48, height: 48 });
    } finally {
      replaced.restore();
    }
  });

  it('draws on as 15 does: a white track under a thumb in the card’s surface.1', () => {
    const { track, all } = draw(true);
    expect(track['backgroundColor']).toBe(dark.accent);
    expect(
      all.some((s) => s['backgroundColor'] === dark['surface.1'] && s['width'] === SWITCH_THUMB),
    ).toBe(true);
  });

  it('draws off as 00 does: a surface.3 track under a white thumb', () => {
    const { track, all } = draw(false);
    expect(track['backgroundColor']).toBe(dark['surface.3']);
    expect(
      all.some((s) => s['backgroundColor'] === dark.accent && s['width'] === SWITCH_THUMB),
    ).toBe(true);
  });

  it('draws focus as a ring outside the track, and none without it', () => {
    const ringed = draw(true, true).all.filter((s) => s['borderColor'] === dark.ring);
    expect(ringed).toHaveLength(1);
    expect(ringed[0]?.['borderWidth']).toBe(FOCUS_RING);
    expect(Number(ringed[0]?.['top'])).toBeLessThan(0);
  });

  it('DECOY — unfocused, nothing is drawn in ring', () => {
    expect(draw(true).all.filter((s) => s['borderColor'] === dark.ring)).toHaveLength(0);
  });
});
