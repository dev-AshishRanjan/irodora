/**
 * The seasonal summary's words (F-223): every one of them, in both catalogues, is free of the
 * words NFR-22 puts outside the product — and the check is watched seeing a planted one, so a
 * clean result means the words are clean rather than that the check read nothing.
 */

import { MODIFIER_IDS, SEASON_IDS } from '@irodora/recommendation';
import { findProhibitedCopy } from '@irodora/store';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';
import { seasonLabelKey, SEASON_LABEL_KEYS } from '../src/profile/season';

const pairs = SEASON_IDS.flatMap((season) =>
  MODIFIER_IDS.map((modifier) => ({ season, modifier, key: seasonLabelKey(season, modifier) })),
);

describe('the seasonal summary words', () => {
  it('name every season and modifier pair the engine can produce, once', () => {
    expect(pairs).toHaveLength(SEASON_IDS.length * MODIFIER_IDS.length);
    expect(new Set(pairs.map((p) => p.key)).size).toBe(pairs.length);
    expect(Object.keys(SEASON_LABEL_KEYS).sort()).toEqual([...SEASON_IDS].sort());
  });

  it('are distinct and non-empty in each language', () => {
    for (const catalogue of [en, ja]) {
      const words = pairs.map((p) => catalogue[p.key]);
      expect(words.every((w) => w.trim().length > 0)).toBe(true);
      expect(new Set(words).size).toBe(words.length);
    }
  });

  it('carry no NFR-22 word in either language', () => {
    for (const { key } of pairs) {
      expect(findProhibitedCopy(en[key], `en ${key}`)).toHaveLength(0);
      expect(findProhibitedCopy(ja[key], `ja ${key}`)).toHaveLength(0);
    }
  });

  it('would be refused with a planted word — the check sees what it is pointed at', () => {
    const { key } = pairs[0] ?? { key: seasonLabelKey('autumn', 'muted') };
    expect(findProhibitedCopy(`Fair-Skinned ${en[key]}`, 'decoy').map((f) => f.id)).toContain(
      'skin',
    );
    expect(findProhibitedCopy(`イエベ${ja[key]}`, 'decoy').map((f) => f.id)).toContain('skin');
  });

  it('describe the ranges, not the person — no label reads as a sentence about somebody', () => {
    for (const { key } of pairs) {
      expect(en[key]).not.toMatch(/\byou\b|\byour\b|\bare\b/iu);
      expect(ja[key]).not.toMatch(/あなた|です/u);
    }
  });
});
