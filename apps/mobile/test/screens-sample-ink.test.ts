/**
 * Gate 9 over the corpus (F-233, criterion 3; ADR-0116): whatever corpus colour a sample is, the
 * text set on it clears 4.5:1 and its edge clears 3:1, in every palette.
 *
 * Picked up by `test:contrast` (the `screens` path pattern), so it is gate 9's, not only gate 5's.
 *
 * ## The decoy is the census
 *
 * The set of entries on which NEITHER of C8's inks clears 4.5:1 is pinned per palette, as
 * `mockups/tools/sample-census.mjs` prints it. That proves the move is exercised rather than
 * assumed, and a corpus or palette change that moves the set fails here, where a person sees it.
 * The contrast is measured with `wcagContrast`, not read back from the function that chose it.
 */

import { wcagContrast } from '@irodora/color-difference';
import { nativeColors, THEMES } from '@irodora/design-tokens';
import { inkOnSample, sampleEdge, sampleInk } from '@irodora/ui';
import { allEntries } from '../src/corpus';

const rgbOf = (hex: string): readonly [number, number, number] => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const contrast = (a: string, b: string): number => wcagContrast(rgbOf(a), rgbOf(b));

/** Where neither ink clears 4.5:1 — `sample-census.mjs`, corpus 2026.09.3. */
const NEITHER_INK: Readonly<Record<(typeof THEMES)[number], readonly string[]>> = {
  dark: [
    'fuka-moya',
    'fuyu-tsuchi',
    'natsu-kage',
    'numa-omote',
    'sabi-do',
    'sabi-suna',
    'yoru-kawa',
  ],
  light: [
    'aki-batake',
    'fuka-moya',
    'fuyu-tsuchi',
    'hai-suna',
    'natsu-kage',
    'numa-omote',
    'sabi-do',
    'sabi-suna',
    'yoru-kawa',
  ],
  'slate.dark': [
    'aki-batake',
    'asa-bukuro',
    'asa-nawa',
    'fuka-moya',
    'fuyu-tsuchi',
    'fuyu-umi',
    'hai-suna',
    'ja-mon',
    'kumori-nami',
    'nami-ma',
    'natsu-kage',
    'numa-omote',
    'oki-nagi',
    'sabi-do',
    'sabi-suna',
    'sugi-kage',
    'togi-ishi',
    'tsuchi-gawara',
    'yoru-kawa',
  ],
  'obsidian.dark': ['fuka-moya', 'fuyu-tsuchi', 'natsu-kage', 'sabi-do', 'sabi-suna', 'yoru-kawa'],
};

const entries = allEntries().map((e) => ({ slug: e.entry.slug, hex: e.derived.hex }));

/** 32-bit FNV-1a, as hex: a digest with no dependency, the same on every engine. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** What the sample family draws against every corpus colour, digested per palette. */
const DRAWN_DIGEST: Readonly<Record<(typeof THEMES)[number], string>> = {
  dark: 'dd709c9b',
  light: 'af77eeac',
  'slate.dark': '6e8072e4',
  'obsidian.dark': '1b56efa4',
};

describe('every corpus colour, as a sample, in every palette', () => {
  it('is the corpus the census counted', () => {
    expect(entries).toHaveLength(120);
  });

  it.each(THEMES)('%s: the text on it clears 4.5:1', (theme) => {
    const colors = nativeColors[theme];
    for (const { slug, hex } of entries)
      expect([slug, contrast(sampleInk(hex, colors).hex, hex) >= 4.5]).toStrictEqual([slug, true]);
  });

  it.each(THEMES)('%s: its edge clears 3:1, with the keyline drawn and without', (theme) => {
    const colors = nativeColors[theme];
    for (const { slug, hex } of entries)
      for (const keyline of [true, false])
        expect([
          slug,
          keyline,
          contrast(sampleEdge(hex, colors, keyline).hex, hex) >= 3,
        ]).toStrictEqual([slug, keyline, true]);
  });

  it.each(THEMES)(
    '%s: draws exactly the pinned colours (ADR-0116: a drift shows here)',
    (theme) => {
      // `onSample` runs at render on Hermes and here on Node. Every value it draws against the corpus
      // is folded into one digest per palette, so a change to the search, the tokens or the corpus
      // that moves any ink or line fails here, where a person sees it, and not only on a device.
      const colors = nativeColors[theme];
      const drawn = entries
        .map(
          ({ hex }) =>
            `${hex}:${sampleInk(hex, colors).hex}:${sampleEdge(hex, colors, true).hex}:${sampleEdge(hex, colors, false).hex}`,
        )
        .join('|');
      expect(fnv1a(drawn)).toBe(DRAWN_DIGEST[theme]);
    },
  );

  it.each(THEMES)(
    '%s: DECOY — the inks C8 names fail on the pinned set, and only there',
    (theme) => {
      const colors = nativeColors[theme];
      const neither = entries
        .filter(({ hex }) => !inkOnSample(hex, colors).passes)
        .map((e) => e.slug);
      expect(neither).toStrictEqual(NEITHER_INK[theme]);
      // And exactly those are the ones that move.
      const moved = entries.filter(({ hex }) => sampleInk(hex, colors).moved).map((e) => e.slug);
      expect(moved).toStrictEqual(NEITHER_INK[theme]);
    },
  );
});
