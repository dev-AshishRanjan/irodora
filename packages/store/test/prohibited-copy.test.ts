/**
 * NFR-22 over copy (F-223): the words a personal-colour label must never carry, in both languages,
 * watched failing on decoys — and watched NOT failing on the near-misses a careless rule would
 * catch, without which "it caught my decoy" is indistinguishable from "it fires on everything"
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { describe, expect, it } from 'vitest';
import { copyWords, findProhibitedCopy, PROHIBITED_COPY_JA } from '../src/index.js';

describe('findProhibitedCopy', () => {
  const decoys: [string, string][] = [
    ['Warm Complexion', 'complexion'],
    ['Fair-Skinned Autumn', 'skin'],
    ['イエベ秋', 'skin'],
    ['ブルベ夏', 'skin'],
    ['肌映えカラー', 'skin'],
    ['Beauty Winter', 'attractiveness'],
    ['年齢に合う色', 'age'],
  ];
  it.each(decoys)('refuses %s, naming the word and where it was', (text, id) => {
    const found = findProhibitedCopy(text, 'decoy');
    expect(found.map((f) => f.id)).toContain(id);
    expect(found.every((f) => f.where === 'decoy' && f.match.length > 0 && f.why.length > 0)).toBe(
      true,
    );
  });

  const nearMisses = [
    'Autumn Muted',
    'Deep Winter',
    'Vintage Spring',
    'Bright Summer, well managed',
    'ソフトオータム',
    'オータム・ミュート',
    'スプリング・ブライト',
  ];
  it.each(nearMisses)('leaves %s alone', (text) => {
    expect(findProhibitedCopy(text, 'near-miss')).toEqual([]);
  });

  it('tokenises copy the way the identifier scan does', () => {
    expect(copyWords('Fair-Skinned Autumn')).toEqual(['fair', 'skinned', 'autumn']);
    expect(copyWords('seasonalLabel')).toEqual(['seasonal', 'label']);
  });

  it('names every Japanese term once, each with its reason', () => {
    const terms = PROHIBITED_COPY_JA.map((t) => t.term);
    expect(new Set(terms).size).toBe(terms.length);
    for (const t of PROHIBITED_COPY_JA) expect(t.why.length).toBeGreaterThan(10);
  });
});
