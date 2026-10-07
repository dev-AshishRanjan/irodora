/**
 * The words beside a ΔE00 and its components (F-222, ADR-0125, FR-74).
 *
 * One table of bands in the engine; here, the words for each band in both languages — every band
 * said, every word free of a match or an identity.
 */

import { axisReading, DELTA_E00_BANDS } from '@irodora/color-difference';
import { t, MESSAGE_KEYS, type MessageKey } from '../src/i18n';
import {
  axisKey,
  BAND_KEYS,
  bandKey,
  CHROMA_KEYS,
  HUE_KEYS,
  LIGHTNESS_KEYS,
} from '../src/delta-readings';

const DELTA_KEYS = MESSAGE_KEYS.filter((k) => k.startsWith('delta.'));

/**
 * Whether a word claims a match or an identity (FR-74: a difference is described, never called a
 * match). English: match, identical, same. Japanese: 一致, マッチ, 合致, and 同 (同じ, 同一).
 */
const claimsIdentity = (text: string): boolean =>
  /\b(match\w*|identical\w*|same)\b/iu.test(text) || /一致|マッチ|合致|同/u.test(text);

describe('every band is said, in both languages', () => {
  it('maps every band of the table to a word, for the total and each component', () => {
    for (const { band } of DELTA_E00_BANDS) {
      for (const key of [
        BAND_KEYS[band],
        LIGHTNESS_KEYS.more[band],
        LIGHTNESS_KEYS.less[band],
        CHROMA_KEYS.more[band],
        CHROMA_KEYS.less[band],
        HUE_KEYS[band],
      ] satisfies MessageKey[])
        for (const locale of ['en', 'ja'] as const)
          expect(t(locale, key).length).toBeGreaterThan(0);
    }
  });

  it('declares exactly the words the maps read — none spare, none missing', () => {
    const read = new Set<string>([
      ...Object.values(BAND_KEYS),
      ...Object.values(LIGHTNESS_KEYS.more),
      ...Object.values(LIGHTNESS_KEYS.less),
      LIGHTNESS_KEYS.level,
      ...Object.values(CHROMA_KEYS.more),
      ...Object.values(CHROMA_KEYS.less),
      CHROMA_KEYS.level,
      ...Object.values(HUE_KEYS),
    ]);
    expect([...read].sort()).toStrictEqual([...DELTA_KEYS].sort());
    expect(DELTA_KEYS).toHaveLength(27);
  });

  it('says each word once per language: no two bands read alike', () => {
    for (const locale of ['en', 'ja'] as const) {
      const words = DELTA_KEYS.map((k) => t(locale, k));
      expect(new Set(words).size).toBe(words.length);
    }
  });
});

describe('no word claims a match or an identity (FR-74)', () => {
  it('holds every delta word in both languages', () => {
    const claims = DELTA_KEYS.flatMap((k) =>
      (['en', 'ja'] as const)
        .map((locale) => ({ key: k, locale, text: t(locale, k) }))
        .filter(({ text }) => claimsIdentity(text)),
    );
    expect(claims).toStrictEqual([]);
  });

  it('DECOY — the predicate catches the drawn claims and lets honest words through', () => {
    for (const drawn of [
      'Very Close Match',
      '(Identical Hue)',
      'the same colour',
      'マッチ',
      '一致',
      '同じ色',
    ])
      expect({ drawn, flagged: claimsIdentity(drawn) }).toStrictEqual({ drawn, flagged: true });
    for (const honest of ['Very Close', 'Slight Hue Shift', '非常に近い', '色相のずれ'])
      expect({ honest, flagged: claimsIdentity(honest) }).toStrictEqual({ honest, flagged: false });
  });
});

describe('a figure and its word', () => {
  it('bands a total as it is printed', () => {
    expect(bandKey(0.7999)).toBe('delta.band.close');
    expect(bandKey(0.794)).toBe('delta.band.veryClose');
    expect(bandKey(3.42)).toBe('delta.band.perceptible');
    expect(bandKey(7.1)).toBe('delta.band.clear');
  });

  it('reads a component by its band and the printed figure’s sign', () => {
    expect(axisKey('lightness', axisReading(-1.2, -0.5))).toBe('delta.lightness.less.veryClose');
    expect(axisKey('lightness', axisReading(2.4, 2))).toBe('delta.lightness.more.perceptible');
    expect(axisKey('chroma', axisReading(-6, -5.4))).toBe('delta.chroma.less.clear');
    expect(axisKey('chroma', axisReading(0, 0))).toBe('delta.chroma.level');
    expect(axisKey('hue', axisReading(1.1, 1.1))).toBe('delta.hue.close');
    expect(axisKey('hue', axisReading(0, 0))).toBe('delta.hue.level');
  });

  it('gives hue no direction: a turn either way is the same words', () => {
    expect(axisKey('hue', axisReading(-1.1, -1.1))).toBe(axisKey('hue', axisReading(1.1, 1.1)));
    // DECOY: lightness does take a direction, so the two calls above are not trivially equal.
    expect(axisKey('lightness', axisReading(-1.1, -1.1))).not.toBe(
      axisKey('lightness', axisReading(1.1, 1.1)),
    );
  });
});
