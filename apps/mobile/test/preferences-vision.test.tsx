/**
 * Preferences' section 2: the colour-vision preview `15` draws (F-240, ADR-0131).
 *
 * - **15's pills, at 15's height**: recomputed from `15`'s own boxes, with the chosen box — taller by
 *   its edge — as the decoy.
 * - **15's card, at 15's inset, under 15's heading** (F-240's review, S2): the padding recomputed from
 *   the card's four insets and snapped to the manifest's scale; the heading above the card, at 500.
 * - **One radio group in 15's order**, under 15's numbered heading; the chosen pill is the mode in
 *   force, and each pill chooses its mode.
 * - **The route hands the screen the app's preview**: the mode and its chooser, from `useVision`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider, type VisionMode } from '@irodora/ui';
import { Preferences, VISION_CARD_PADDING, VISION_PILL_HEIGHT } from '../src/screens/Preferences';
import { en } from '../src/i18n/en';

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const FIFTEEN = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '15.json'), 'utf8'),
) as {
  readonly elements: readonly {
    readonly id: string;
    readonly dp: {
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
    } | null;
  }[];
};
const SCALE = (
  JSON.parse(
    readFileSync(
      join(__dirname, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
      'utf8',
    ),
  ) as { readonly spacing: { readonly scale: Readonly<Record<string, number>> } }
).spacing.scale;
const ROUTE = readFileSync(
  join(__dirname, '..', 'app', '(tabs)', 'profile', 'preferences.tsx'),
  'utf8',
);

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};

describe('15’s pills, at 15’s height', () => {
  const pill = (id: string): number =>
    FIFTEEN.elements.find((e) => e.id === `15.cvd.${id}`)?.dp?.h ?? NaN;

  it('is the median of 15’s three unchosen pills', () => {
    const unchosen = ['protanopia', 'deuteranopia', 'tritanopia'].map(pill);
    expect(Math.round(median(unchosen) * 2) / 2).toBe(VISION_PILL_HEIGHT);
  });

  it('DECOY — the chosen box is taller by its edge, and is not the height', () => {
    expect(pill('standard')).not.toBe(VISION_PILL_HEIGHT);
  });
});

describe('15’s card, at 15’s inset', () => {
  const box = (id: string) => {
    const dp = FIFTEEN.elements.find((e) => e.id === id)?.dp;
    if (dp === null || dp === undefined) throw new Error(`${id} has no box`);
    return dp;
  };
  /** R9 §2: the nearest step of the scale; on a tie, the smaller. */
  const snap = (dp: number): string =>
    Object.entries(SCALE)
      .sort(([, a], [, b]) => Math.abs(a - dp) - Math.abs(b - dp) || a - b)
      .map(([step]) => step)[0] ?? '';
  const card = box('15.section-2');
  const first = box('15.cvd.standard');
  const last = box('15.cvd.tritanopia');
  const below = box('15.cvd.badge');
  const insets = [
    first.x - card.x,
    first.y - card.y,
    card.x + card.w - (last.x + last.w),
    card.y + card.h - (below.y + below.h),
  ];

  it('snaps the median of the card’s four insets to the scale', () => {
    expect(snap(median(insets))).toBe(VISION_CARD_PADDING);
  });

  it('DECOY — every inset is nearer sm than md, so the median is not carrying an outlier', () => {
    for (const inset of insets) expect(snap(inset)).toBe(VISION_CARD_PADDING);
    expect(snap(16)).not.toBe(VISION_CARD_PADDING);
  });
});

describe('the section chooses the preview', () => {
  const draw = (vision: VisionMode, chosen: VisionMode[] = []): void => {
    render(
      <ThemeProvider theme="dark">
        <Preferences
          store={{ listPreferences: () => [], resetPreferences: () => undefined }}
          vision={vision}
          onChooseVision={(mode) => chosen.push(mode)}
        />
      </ThemeProvider>,
    );
  };
  const LABELS: readonly string[] = [
    en['vision.mode.standard'],
    en['vision.mode.protanopia'],
    en['vision.mode.deuteranopia'],
    en['vision.mode.tritanopia'],
  ];

  it('heads the card with 15’s numbered heading, above it and at 500', () => {
    draw('standard');
    const heading = screen.getByText(en['settings.accessibility']);
    expect(heading.props['accessibilityRole']).toBe('header');
    expect(StyleSheet.flatten(heading.props['style'])).toMatchObject({ fontWeight: '500' });
    // 15 draws the heading outside the card (`parent: null`); the card holds the pills alone.
    const card = screen.getByTestId('vision.card');
    expect(within(card).queryByText(en['settings.accessibility'])).toBeNull();
    // DECOY — the card does hold the pills, so the query above can see inside it.
    expect(within(card).getByLabelText(en['vision.mode.standard'])).toBeTruthy();
  });

  it('draws the four modes in 15’s order, as one radio group', () => {
    draw('standard');
    const group = screen.getByLabelText(en['vision.label']);
    expect(group).toBeTruthy();
    const radios = screen
      .getAllByRole('radio')
      .map((r) => String(r.props['accessibilityLabel']))
      .filter((label) => LABELS.includes(label));
    expect(radios).toStrictEqual(LABELS);
  });

  it.each([
    ['standard', en['vision.mode.standard']],
    ['tritanopia', en['vision.mode.tritanopia']],
  ] as const)('shows %s as the chosen pill when it is in force', (mode, label) => {
    draw(mode);
    expect(screen.getByLabelText(label).props['accessibilityState']).toMatchObject({
      selected: true,
    });
    // DECOY — and no other mode is chosen.
    for (const other of LABELS.filter((l) => l !== label))
      expect(screen.getByLabelText(other).props['accessibilityState']).toMatchObject({
        selected: false,
      });
  });

  it('chooses the mode a pill names', () => {
    const chosen: VisionMode[] = [];
    draw('standard', chosen);
    fireEvent.press(screen.getByLabelText(en['vision.mode.deuteranopia']));
    fireEvent.press(screen.getByLabelText(en['vision.mode.tritanopia']));
    expect(chosen).toStrictEqual(['deuteranopia', 'tritanopia']);
  });
});

describe('the route hands the screen the app’s preview', () => {
  it('reads useVision and passes the mode and its chooser', () => {
    expect(ROUTE).toMatch(/const vision = useVision\(\);/u);
    expect(ROUTE).toMatch(/vision=\{vision\.vision\}/u);
    expect(ROUTE).toMatch(/onChooseVision=\{vision\.choose\}/u);
  });
});
